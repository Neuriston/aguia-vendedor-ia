import { Customer, Product, CustomerMessage, SystemSettings, Proposal } from '../types';
import { firestoreService, FirestoreAILog } from './FirestoreService';
import { memoryService } from './MemoryService';
import { negotiationService } from './NegotiationService';
import { orderService } from './OrderService';
import { learningService } from './LearningService';

export interface GeminiResponse {
  reply: string;
  proposalGenerated: boolean;
  alertOwner: boolean;
  leadTemperature: 'Frio' | 'Morno' | 'Quente' | 'VIP';
  salesTacticUsed: string;
  detectedObjection?: string | null;
  crossSellRecommendation?: string | null;
  reasoning: string;
  proposalDetails?: {
    productName: string;
    unitPrice: number;
    quantity: number;
    totalValue: number;
    paymentMethod: string;
    freightType: string;
  } | null;
}

class GeminiService {
  private timeoutMs = 15000; // 15s timeout safeguard

  /**
   * Process customer message using Gemini AI with full context assembly and Memory Engine
   */
  public async generateSellerReply(
    customerMessage: string,
    customer: Customer,
    products: Product[],
    settings: SystemSettings,
    history: CustomerMessage[] = []
  ): Promise<GeminiResponse> {
    const startTime = Date.now();

    // 1. Retrieve & Assemble Customer Memory & Sales Learnings (Strict Privacy Isolation)
    const customerPhone = customer.phone;
    const memoryContext = memoryService.buildMemoryContextForGemini(customerPhone, customer.name);

    const activeProducts = products.filter((p) => p.active);
    const matchedMentionedProduct = activeProducts.find((p) =>
      customerMessage.toLowerCase().includes(p.name.toLowerCase())
    );

    const relevantLearnings = await learningService.getRelevantLearningsForContext(
      customerPhone,
      matchedMentionedProduct?.id
    );

    const combinedContext = `${memoryContext}\n${relevantLearnings}`;

    const payload = {
      customerMessage,
      customerMemoryContext: combinedContext,
      conversationHistory: history.slice(-10), // Send last 10 messages for memory context
      products: activeProducts,
      customer: {
        name: customer.name,
        phone: customer.phone,
        company: customer.farmName || customer.city || 'Propriedade Rural',
        city: customer.city,
        state: customer.state,
        notes: customer.notes || 'Cliente negociando via WhatsApp',
      },
      settings: {
        companyName: settings.companyName,
        ownerName: settings.ownerName,
        minNotifyAmount: settings.minNotifyAmount,
        automaticSalesActive: settings.automaticSalesActive,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Servidor Gemini retornou status ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const validatedData = this.validateResponse(data, activeProducts, customer);
      const latencyMs = Date.now() - startTime;

      // 2. Save Conversation Memory to Memory Engine
      memoryService.recordConversationMemory(customerPhone, {
        userPrompt: customerMessage,
        aiReply: validatedData.reply,
        detectedObjection: validatedData.detectedObjection || undefined,
        interestProduct: validatedData.proposalDetails?.productName,
        negotiationOutcome: validatedData.proposalGenerated ? 'Proposta/Pedido Gerado' : 'Em atendimento',
      });

      // Analyze conversation with LearningService
      const currentHistory: CustomerMessage[] = [
        ...history,
        { id: `m1-${Date.now()}`, text: customerMessage, sender: 'customer', timestamp: new Date().toISOString() },
        { id: `m2-${Date.now()}`, text: validatedData.reply, sender: 'ai', timestamp: new Date().toISOString() },
      ];

      await learningService.analyzeConversation(
        customerPhone,
        currentHistory,
        matchedMentionedProduct,
        validatedData.proposalGenerated ? 'Negociando' : undefined
      );

      // 3. If a proposal/order was generated, record in Order Engine, Negotiation Engine & Purchase History
      if (validatedData.proposalGenerated && validatedData.proposalDetails) {
        const details = validatedData.proposalDetails;
        const matchedProduct = activeProducts.find(
          (p) => p.name.toLowerCase() === details.productName.toLowerCase()
        ) || activeProducts[0];

        if (matchedProduct) {
          const negotiation = await negotiationService.generateProposal(
            customer,
            matchedProduct,
            details.quantity || 1,
            details.unitPrice || matchedProduct.listPrice,
            details.paymentMethod || 'PIX à Vista',
            details.freightType || matchedProduct.freightType
          );

          // Create Order automatically
          const createdOrder = await orderService.createOrder({
            customer,
            product: matchedProduct,
            quantity: details.quantity || 1,
            unitPrice: details.unitPrice || matchedProduct.listPrice,
            paymentMethod: details.paymentMethod || 'PIX à Vista',
            freightType: details.freightType || matchedProduct.freightType,
            conversationId: customer.id,
            negotiationId: negotiation.id,
          });

          if (validatedData.alertOwner || createdOrder.requiresOwnerApproval) {
            await negotiationService.requestApproval(
              negotiation.id,
              createdOrder.approvalReason || 'Preço ou condição requer autorização do proprietário'
            );
          }

          // Record Sale Learning
          const discountPct = Math.round(
            ((matchedProduct.listPrice - (details.unitPrice || matchedProduct.listPrice)) /
              matchedProduct.listPrice) *
              100
          );

          await learningService.recordSaleLearning({
            phone: customerPhone,
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            quantity: details.quantity || 1,
            finalPrice: details.totalValue || details.unitPrice * (details.quantity || 1),
            discountPercent: discountPct > 0 ? discountPct : 0,
            paymentMethod: details.paymentMethod || 'PIX à Vista',
            objectionsOvercome: validatedData.detectedObjection ? [validatedData.detectedObjection] : [],
            winningArguments: [validatedData.salesTacticUsed || 'Atendimento ÁGUIA'],
          });
        }

        memoryService.recordPurchaseHistory({
          proposalNumber: `PROP-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: customerPhone,
          customerName: customer.name,
          itemsSummary: `${validatedData.proposalDetails.quantity}x ${validatedData.proposalDetails.productName}`,
          totalValue: validatedData.proposalDetails.totalValue,
          paymentMethod: validatedData.proposalDetails.paymentMethod || 'A combinar',
          freightType: validatedData.proposalDetails.freightType || 'A combinar',
        });
      }

      // 4. Check if client is confirming an order explicitly on WhatsApp
      const confirmKeywords = ['confirmar', 'confirmo', 'pode fechar', 'aceito', 'fechado', 'pode emitir', 'comprar'];
      const msgLower = customerMessage.toLowerCase();
      if (confirmKeywords.some((kw) => msgLower.includes(kw))) {
        const existingOrders = await firestoreService.getOrders();
        const pendingOrder = existingOrders.find(
          (o) => o.customerId === customer.id && (o.status === 'Negociando' || o.status === 'Aprovado')
        );

        if (pendingOrder) {
          await orderService.confirmOrder(pendingOrder.id);
        }
      }

      // Estimate tokens
      const promptTokens = Math.ceil((JSON.stringify(payload).length + customerMessage.length) / 4);
      const responseTokens = Math.ceil((validatedData.reply?.length || 0) / 4);

      // Save to Firestore ai_logs collection
      const logEntry: FirestoreAILog = {
        id: `ailog-${Date.now()}`,
        timestamp: new Date().toISOString(),
        conversationId: customer.id,
        customerName: customer.name,
        userPrompt: customerMessage,
        aiResponse: validatedData.reply,
        leadTemperature: validatedData.leadTemperature || 'Morno',
        salesTactic: validatedData.salesTacticUsed || 'Atendimento Comercial',
        detectedObjection: validatedData.detectedObjection || undefined,
        proposalGenerated: validatedData.proposalGenerated || false,
        alertOwner: validatedData.alertOwner || false,
        latencyMs,
        tokenCountEstimated: promptTokens + responseTokens,
        status: 'SUCCESS',
      };

      await firestoreService.addAILog(logEntry);

      return validatedData;
    } catch (err: any) {
      console.warn('[GeminiService] Fallback devido a erro/timeout:', err);
      const latencyMs = Date.now() - startTime;

      // Intelligent Human Fallback Response from ÁGUIA Seller
      const fallbackReply = this.generateFallbackReply(customerMessage, activeProducts, settings, customer);

      const fallbackData: GeminiResponse = {
        reply: fallbackReply,
        proposalGenerated: false,
        alertOwner: false,
        leadTemperature: 'Morno',
        salesTacticUsed: 'Atendimento Direto com Tabela',
        reasoning: 'Resposta gerada via fallback seguro sem alucinação de preço',
      };

      // Record fallback in memory
      memoryService.recordConversationMemory(customerPhone, {
        userPrompt: customerMessage,
        aiReply: fallbackReply,
        negotiationOutcome: 'Fallback de Atendimento',
      });

      // Save error log to Firestore
      await firestoreService.addAILog({
        id: `ailog-${Date.now()}`,
        timestamp: new Date().toISOString(),
        conversationId: customer.id,
        customerName: customer.name,
        userPrompt: customerMessage,
        aiResponse: fallbackReply,
        leadTemperature: 'Morno',
        salesTactic: 'Fallback de Segurança',
        proposalGenerated: false,
        alertOwner: false,
        latencyMs,
        tokenCountEstimated: 120,
        status: err?.name === 'AbortError' ? 'TIMEOUT' : 'ERROR',
      });

      return fallbackData;
    }
  }

  /**
   * Validates that Gemini output strictly obeys product catalog bounds
   */
  private validateResponse(
    res: GeminiResponse,
    products: Product[],
    customer: Customer
  ): GeminiResponse {
    if (!res.reply || res.reply.trim().length === 0) {
      res.reply = `Olá ${customer.name}, sou o consultor de vendas da empresa. Como posso te ajudar com nossos produtos rurais hoje?`;
    }

    // Grounding check for proposals: ensure unit price is NOT below minPrice
    if (res.proposalGenerated && res.proposalDetails) {
      const match = products.find(
        (p) => p.name.toLowerCase() === res.proposalDetails?.productName?.toLowerCase()
      );

      if (match) {
        if (res.proposalDetails.unitPrice < match.minPrice) {
          console.warn(
            `[Grounding Safeguard] Preço R$ ${res.proposalDetails.unitPrice} abaixo do mínimo R$ ${match.minPrice}. Ajustando para o mínimo.`
          );
          res.proposalDetails.unitPrice = match.minPrice;
          res.proposalDetails.totalValue = match.minPrice * res.proposalDetails.quantity;
          res.alertOwner = true; // Alert owner because it reached min limit
        }
      }
    }

    return res;
  }

  /**
   * Human fallback reply guaranteed to never invent prices
   */
  private generateFallbackReply(
    msg: string,
    products: Product[],
    settings: SystemSettings,
    customer: Customer
  ): string {
    const text = msg.toLowerCase();

    // Check if customer mentions a product
    const matchedProduct = products.find(
      (p) => text.includes(p.name.toLowerCase()) || text.includes(p.category.toLowerCase())
    );

    if (matchedProduct) {
      return `Olá, ${customer.name}! Sou o vendedor da ${settings.companyName}. Em relação a ${matchedProduct.name}, temos a pronta entrega com preço de tabela de R$ ${matchedProduct.listPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ${matchedProduct.unit}. Temos ótimas condições de frete ${matchedProduct.freightType}. Qual a quantidade necessária para a sua fazenda?`;
    }

    return `Olá, ${customer.name}! Sou o consultor de vendas da ${settings.companyName}. Recebi sua mensagem sobre "${msg}". Trabalhamos com insumos e máquinas rurais com garantia oficial. Qual produto você gostaria de cotar hoje?`;
  }
}

export const geminiService = new GeminiService();
