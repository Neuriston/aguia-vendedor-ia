import { CustomerMessage, Product } from '../types';
import {
  firestoreService,
  FirestoreSalesLearning,
  FirestoreOrder,
} from './FirestoreService';
import { memoryService, CustomerMemory } from './MemoryService';

export interface ConversationAnalysisResult {
  productSearched?: string;
  questionsAsked: string[];
  objectionsDetected: string[];
  discountsRequested: boolean;
  negotiatedTerms?: string;
  outcome: 'Venda Fechada' | 'Pedido em Negociação' | 'Cliente Inativo/Desistiu' | 'Dúvida Respondida';
  confidence: 'Alta' | 'Média' | 'Baixa';
  source: 'confirmada' | 'observada' | 'inferencia';
}

export interface SaleLearningInput {
  phone: string;
  productId: string;
  productName: string;
  quantity: number;
  finalPrice: number;
  discountPercent: number;
  paymentMethod: string;
  objectionsOvercome: string[];
  winningArguments: string[];
  durationMinutes?: number;
}

export interface DropLearningInput {
  phone: string;
  productId?: string;
  productName?: string;
  dropReason: 'preço' | 'frete' | 'sem_estoque' | 'prazo_entrega' | 'avaliando' | 'sem_resposta' | 'outro';
  evidenceDetails: string;
}

class LearningService {
  /**
   * Analyze conversation messages and extract commercial learning
   */
  public async analyzeConversation(
    phone: string,
    messages: CustomerMessage[],
    product?: Product,
    orderOutcome?: string
  ): Promise<ConversationAnalysisResult> {
    const userMsgs = messages.filter((m) => m.sender === 'customer');
    const aiMsgs = messages.filter((m) => m.sender === 'ai');

    const combinedUserText = userMsgs.map((m) => m.text).join(' ').toLowerCase();

    // 1. Detect Questions
    const questionsAsked: string[] = [];
    if (combinedUserText.includes('tem ') || combinedUserText.includes('disponível') || combinedUserText.includes('estoque')) {
      questionsAsked.push('Disponibilidade de estoque');
    }
    if (combinedUserText.includes('quanto') || combinedUserText.includes('preço') || combinedUserText.includes('valor')) {
      questionsAsked.push('Consulta de preço');
    }
    if (combinedUserText.includes('frete') || combinedUserText.includes('entrega') || combinedUserText.includes('cidade')) {
      questionsAsked.push('Regras e custo de entrega/frete');
    }
    if (combinedUserText.includes('garantia') || combinedUserText.includes('nota')) {
      questionsAsked.push('Garantia e procedência');
    }

    // 2. Detect Objections
    const objectionsDetected: string[] = [];
    if (combinedUserText.includes('caro') || combinedUserText.includes('alto') || combinedUserText.includes('achando puxado')) {
      objectionsDetected.push('Preço elevado');
    }
    if (combinedUserText.includes('frete caro') || combinedUserText.includes('muito longe')) {
      objectionsDetected.push('Custo/distância de frete');
    }
    if (combinedUserText.includes('demora') || combinedUserText.includes('prazo')) {
      objectionsDetected.push('Prazo de entrega longo');
    }
    if (combinedUserText.includes('outra marca') || combinedUserText.includes('concorrente')) {
      objectionsDetected.push('Comparativo com concorrente');
    }

    // 3. Detect Discount Request
    const discountsRequested =
      combinedUserText.includes('desconto') ||
      combinedUserText.includes('melhor preço') ||
      combinedUserText.includes('faz por quanto') ||
      combinedUserText.includes('à vista tem');

    // 4. Determine Outcome
    let outcome: ConversationAnalysisResult['outcome'] = 'Dúvida Respondida';
    if (orderOutcome === 'Confirmado pelo Cliente' || orderOutcome === 'Finalizado') {
      outcome = 'Venda Fechada';
    } else if (orderOutcome === 'Negociando' || orderOutcome === 'Aguardando Aprovação') {
      outcome = 'Pedido em Negociação';
    } else if (combinedUserText.includes('não quero') || combinedUserText.includes('cancelar') || combinedUserText.includes('comprei com outro')) {
      outcome = 'Cliente Inativo/Desistiu';
    }

    // 5. Source differentiation
    const source: ConversationAnalysisResult['source'] = orderOutcome
      ? 'confirmada'
      : discountsRequested || objectionsDetected.length > 0
      ? 'observada'
      : 'inferencia';

    const result: ConversationAnalysisResult = {
      productSearched: product?.name,
      questionsAsked,
      objectionsDetected,
      discountsRequested,
      outcome,
      confidence: userMsgs.length > 2 ? 'Alta' : 'Média',
      source,
    };

    // Update Customer Memory safely without replacing confirmed facts
    await this.updateCustomerMemoryFromLearning(phone, result, product);

    // Record in sales_learnings collection if objections or outcome are relevant
    if (objectionsDetected.length > 0 || outcome === 'Venda Fechada' || outcome === 'Cliente Inativo/Desistiu') {
      const learningRecord: FirestoreSalesLearning = {
        id: `learn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        date: new Date().toISOString(),
        type: outcome === 'Venda Fechada' ? 'venda_sucesso' : outcome === 'Cliente Inativo/Desistiu' ? 'perda_atendimento' : 'objecao_frequente',
        productId: product?.id,
        productName: product?.name,
        context: `Perguntas: ${questionsAsked.join(', ') || 'Gerais'} | Objeções: ${objectionsDetected.join(', ') || 'Nenhuma'}`,
        outcome: `Resultado: ${outcome}`,
        confidence: result.confidence,
        source: result.source,
        contributingFactors: questionsAsked.concat(objectionsDetected),
        phone,
        createdAt: new Date().toISOString(),
      };

      await firestoreService.saveSalesLearning(learningRecord);
    }

    return result;
  }

  /**
   * Record factors contributing to a successful sale closure
   */
  public async recordSaleLearning(input: SaleLearningInput): Promise<FirestoreSalesLearning> {
    const learning: FirestoreSalesLearning = {
      id: `learn-sale-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'venda_sucesso',
      productId: input.productId,
      productName: input.productName,
      context: `Venda de ${input.quantity} un de ${input.productName} por R$ ${input.finalPrice} (${input.paymentMethod})`,
      outcome: `Fechado com ${input.discountPercent}% de desconto`,
      confidence: 'Alta',
      source: 'confirmada',
      contributingFactors: [
        `Preço final: R$ ${input.finalPrice}`,
        `Desconto: ${input.discountPercent}%`,
        `Pagamento: ${input.paymentMethod}`,
        ...input.winningArguments.map((arg) => `Argumento forte: ${arg}`),
        ...input.objectionsOvercome.map((obj) => `Objeção superada: ${obj}`),
      ],
      phone: input.phone,
      createdAt: new Date().toISOString(),
    };

    await firestoreService.saveSalesLearning(learning);
    return learning;
  }

  /**
   * Record drop / lost sale learning based ONLY on explicit evidence
   */
  public async recordDropLearning(input: DropLearningInput): Promise<FirestoreSalesLearning> {
    const reasonLabels: Record<DropLearningInput['dropReason'], string> = {
      preço: 'Preço acima do orçamento',
      frete: 'Custo ou modalidade de frete desfavorável',
      sem_estoque: 'Produto indisponível no estoque',
      prazo_entrega: 'Prazo de entrega muito longo',
      avaliando: 'Cliente em fase de avaliação',
      sem_resposta: 'Cliente parou de responder',
      outro: 'Outro motivo pontual',
    };

    const learning: FirestoreSalesLearning = {
      id: `learn-drop-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'perda_atendimento',
      productId: input.productId,
      productName: input.productName,
      context: `Atendimento sem fechamento. Evidência: ${input.evidenceDetails}`,
      outcome: `Desistência / Não fechamento por: ${reasonLabels[input.dropReason]}`,
      confidence: input.evidenceDetails.length > 10 ? 'Alta' : 'Média',
      source: 'observada',
      dropReason: reasonLabels[input.dropReason],
      phone: input.phone,
      createdAt: new Date().toISOString(),
    };

    await firestoreService.saveSalesLearning(learning);
    return learning;
  }

  /**
   * Fetch strictly isolated and relevant learnings for a specific customer and product for Gemini context
   */
  public async getRelevantLearningsForContext(phone: string, productId?: string): Promise<string> {
    const allLearnings = await firestoreService.getSalesLearnings();

    // Filter relevant to this specific phone or product (Strict Privacy & Isolation)
    const filtered = allLearnings.filter(
      (l) => l.phone === phone || (productId && l.productId === productId)
    );

    if (filtered.length === 0) {
      return 'Nenhum histórico prévio de aprendizado registrado para este cliente/produto.';
    }

    const formatted = filtered
      .slice(0, 5) // top 5 most relevant
      .map(
        (l) =>
          `• [${l.date.split('T')[0]}] Tipo: ${l.type} | Confiança: ${l.confidence} | Fonte: ${l.source}\n  Contexto: ${l.context}\n  Resultado/Lição: ${l.outcome}`
      )
      .join('\n\n');

    return `
==================================================
APRENDIZADOS RELEVANTES DO ÁGUIA VENDEDOR (ISO DE PRIVACIDADE)
==================================================
${formatted}
==================================================
`;
  }

  /**
   * Identify pattern insights across conversations and generate suggestions for the OWNER
   * GUARANTEE: Never modifies commercial rules automatically.
   */
  public async generateOwnerSuggestions(): Promise<string[]> {
    const learnings = await firestoreService.getSalesLearnings();
    const suggestions: string[] = [];

    // Analyze high frequency objections
    const priceObjections = learnings.filter((l) => l.context.includes('Preço elevado') || l.dropReason?.includes('Preço'));
    if (priceObjections.length >= 3) {
      suggestions.push(
        `Sugestão Comercial: ${priceObjections.length} clientes contestaram o preço recentemente. Avalie ajustar a margem de desconto máximo autorizado.`
      );
    }

    const freightObjections = learnings.filter((l) => l.context.includes('frete') || l.dropReason?.includes('frete'));
    if (freightObjections.length >= 2) {
      suggestions.push(
        `Sugestão de Logística: Clientes solicitam frete grátis ou subsidiado para volumes maiores. Considere criar uma regra de frete CIF acima de X toneladas.`
      );
    }

    const stockRequests = learnings.filter((l) => l.type === 'perda_atendimento' && l.dropReason?.includes('estoque'));
    if (stockRequests.length >= 1) {
      suggestions.push(
        `Sugestão de Estoque: Há demanda de clientes por produtos que ficaram com estoque zerado.`
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        'Atendimento operando em alta eficiência. Nenhuma alteração nas regras comerciais sugerida no momento.'
      );
    }

    return suggestions;
  }

  /**
   * Get all sales learnings
   */
  public async getSalesLearnings(): Promise<FirestoreSalesLearning[]> {
    return firestoreService.getSalesLearnings();
  }

  // --- Private Helper ---
  private async updateCustomerMemoryFromLearning(
    phone: string,
    result: ConversationAnalysisResult,
    product?: Product
  ) {
    const mem = memoryService.getMemoryByPhone(phone);

    if (product) {
      if (!mem.consultedProducts.includes(product.name)) {
        mem.consultedProducts.push(product.name);
      }
    }

    if (result.discountsRequested) {
      const prefs = memoryService.getPreferences(phone);
      prefs.asksForDiscountFrequently = true;
      memoryService.savePreferences(prefs);
    }

    memoryService.saveCustomerMemory(mem);
  }
}

export const learningService = new LearningService();
