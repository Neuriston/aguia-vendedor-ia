import { Customer, Product, CustomerMessage, Proposal } from '../types';

export type CustomerLifecycleStatus = 'Cliente Novo' | 'Cliente Frequente' | 'Cliente VIP' | 'Cliente Inativo';

export interface CustomerMemory {
  phone: string;
  name: string;
  city?: string;
  state?: string;
  company?: string;
  cpfCnpj?: string;

  // Products memory
  consultedProducts: string[];
  purchasedProducts: string[];
  favoriteProducts: string[];
  usualPurchaseQuantity?: string;

  // Commercial memory
  lastNegotiatedPrice?: number;
  lastDiscountGranted?: number;
  preferredPaymentMethod?: string;
  deliveryAddress?: string;
  notes?: string;

  // Timestamps and Stats
  firstContactDate: string;
  lastConversationDate: string;
  lastPurchaseDate?: string;
  ordersCount: number;
  totalSpentAmount: number;
  status: CustomerLifecycleStatus;
}

export interface ConversationMemoryEntry {
  id: string;
  phone: string;
  timestamp: string;
  userPrompt: string;
  aiReply: string;
  detectedObjection?: string;
  interestProduct?: string;
  negotiationOutcome?: string;
}

export interface PurchaseHistoryEntry {
  id: string;
  proposalNumber: string;
  phone: string;
  customerName: string;
  itemsSummary: string;
  totalValue: number;
  paymentMethod: string;
  freightType: string;
  purchaseDate: string;
}

export interface CustomerPreferences {
  phone: string;
  likesToNegotiate: boolean;
  asksForDiscountFrequently: boolean;
  buysInBulk: boolean;
  prefersPix: boolean;
  prefersBoleto: boolean;
  needsDelivery: boolean;
  picksUpAtFarm: boolean;
  preferredProductCategory?: string;
}

class MemoryService {
  private customerMemoryKey = 'aguia_customer_memory';
  private conversationMemoryKey = 'aguia_conversation_memory';
  private purchaseHistoryKey = 'aguia_purchase_history';
  private preferencesKey = 'aguia_preferences';

  /**
   * Get or initialize customer memory by phone number
   */
  public getMemoryByPhone(phone: string, fallbackName: string = 'Cliente WhatsApp'): CustomerMemory {
    const memories = this.getAllCustomerMemories();
    const cleanPhone = this.cleanPhone(phone);
    const existing = memories.find((m) => this.cleanPhone(m.phone) === cleanPhone);

    if (existing) return existing;

    const newMemory: CustomerMemory = {
      phone: phone,
      name: fallbackName,
      consultedProducts: [],
      purchasedProducts: [],
      favoriteProducts: [],
      firstContactDate: new Date().toISOString(),
      lastConversationDate: new Date().toISOString(),
      ordersCount: 0,
      totalSpentAmount: 0,
      status: 'Cliente Novo',
    };

    this.saveCustomerMemory(newMemory);
    return newMemory;
  }

  /**
   * Update and save customer memory
   */
  public saveCustomerMemory(memory: CustomerMemory): void {
    const memories = this.getAllCustomerMemories();
    const cleanPhone = this.cleanPhone(memory.phone);
    const index = memories.findIndex((m) => this.cleanPhone(m.phone) === cleanPhone);

    // Calculate customer status lifecycle
    if (memory.totalSpentAmount > 50000 || memory.ordersCount >= 5) {
      memory.status = 'Cliente VIP';
    } else if (memory.ordersCount >= 2) {
      memory.status = 'Cliente Frequente';
    } else {
      memory.status = 'Cliente Novo';
    }

    if (index >= 0) {
      memories[index] = { ...memories[index], ...memory, lastConversationDate: new Date().toISOString() };
    } else {
      memories.unshift(memory);
    }

    localStorage.setItem(this.customerMemoryKey, JSON.stringify(memories));
  }

  /**
   * Record conversation memory entry
   */
  public recordConversationMemory(
    phone: string,
    entry: Omit<ConversationMemoryEntry, 'id' | 'phone' | 'timestamp'>
  ): void {
    const conversations = this.getAllConversationMemories();
    const newEntry: ConversationMemoryEntry = {
      id: `convmem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      phone,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    conversations.unshift(newEntry);
    if (conversations.length > 500) conversations.pop(); // keep last 500 records

    localStorage.setItem(this.conversationMemoryKey, JSON.stringify(conversations));

    // Update preferences automatically from conversation insights
    this.updatePreferencesFromConversation(phone, entry);
  }

  /**
   * Record purchase history entry
   */
  public recordPurchaseHistory(purchase: Omit<PurchaseHistoryEntry, 'id' | 'purchaseDate'>): void {
    const purchases = this.getAllPurchaseHistory();
    const newPurchase: PurchaseHistoryEntry = {
      id: `purch-${Date.now()}`,
      purchaseDate: new Date().toISOString(),
      ...purchase,
    };

    purchases.unshift(newPurchase);
    localStorage.setItem(this.purchaseHistoryKey, JSON.stringify(purchases));

    // Update customer memory stats
    const mem = this.getMemoryByPhone(purchase.phone, purchase.customerName);
    mem.ordersCount += 1;
    mem.totalSpentAmount += purchase.totalValue;
    mem.lastPurchaseDate = newPurchase.purchaseDate;
    if (purchase.itemsSummary) {
      const itemsList = purchase.itemsSummary.split(',').map((i) => i.trim());
      itemsList.forEach((item) => {
        if (!mem.purchasedProducts.includes(item)) {
          mem.purchasedProducts.push(item);
        }
      });
    }
    this.saveCustomerMemory(mem);
  }

  /**
   * Get customer preferences
   */
  public getPreferences(phone: string): CustomerPreferences {
    const prefs = this.getAllPreferences();
    const cleanPhone = this.cleanPhone(phone);
    const existing = prefs.find((p) => this.cleanPhone(p.phone) === cleanPhone);

    if (existing) return existing;

    const defaultPrefs: CustomerPreferences = {
      phone,
      likesToNegotiate: true,
      asksForDiscountFrequently: false,
      buysInBulk: false,
      prefersPix: false,
      prefersBoleto: false,
      needsDelivery: true,
      picksUpAtFarm: false,
    };

    this.savePreferences(defaultPrefs);
    return defaultPrefs;
  }

  public savePreferences(pref: CustomerPreferences): void {
    const prefs = this.getAllPreferences();
    const cleanPhone = this.cleanPhone(pref.phone);
    const index = prefs.findIndex((p) => this.cleanPhone(p.phone) === cleanPhone);

    if (index >= 0) {
      prefs[index] = pref;
    } else {
      prefs.unshift(pref);
    }

    localStorage.setItem(this.preferencesKey, JSON.stringify(prefs));
  }

  /**
   * Build complete structured Memory Context to be injected into Gemini prompt
   */
  public buildMemoryContextForGemini(phone: string, customerName: string): string {
    const memory = this.getMemoryByPhone(phone, customerName);
    const preferences = this.getPreferences(phone);
    const conversations = this.getConversationHistoryForPhone(phone).slice(0, 5); // last 5 turns
    const purchases = this.getPurchaseHistoryForPhone(phone);

    const memorySummary = `
==================================================
MEMÓRIA INTELIGENTE DO CLIENTE (ÁGUIA MEMORY ENGINE)
==================================================
Identificador Telefone: ${memory.phone}
Nome do Cliente: ${memory.name}
Status do Cliente: ${memory.status} (Total gasto: R$ ${memory.totalSpentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pedidos: ${memory.ordersCount})
Primeiro Contato: ${new Date(memory.firstContactDate).toLocaleDateString('pt-BR')}
Última Compra: ${memory.lastPurchaseDate ? new Date(memory.lastPurchaseDate).toLocaleDateString('pt-BR') : 'Nenhuma compra fechada ainda'}

PRODUTOS CONSULTADOS ANTERIORMENTE: ${memory.consultedProducts.length ? memory.consultedProducts.join(', ') : 'Nenhum registrado'}
PRODUTOS JÁ COMPRADOS: ${memory.purchasedProducts.length ? memory.purchasedProducts.join(', ') : 'Nenhum'}
PRODUTOS FAVORITOS: ${memory.favoriteProducts.length ? memory.favoriteProducts.join(', ') : 'Não informado'}

PREFERÊNCIAS E COMPORTAMENTO IDENTIFICADOS PELA IA:
• Gostos e Negociação: ${preferences.likesToNegotiate ? 'Gosta de negociar valores e condições' : 'Prefere preço direto de tabela'}
• Frequência de Descontos: ${preferences.asksForDiscountFrequently ? 'Pede desconto frequentemente (utilizar limite mínimo cadastrado com cuidado)' : 'Aceita preço justo de tabela'}
• Volume de Compras: ${preferences.buysInBulk ? 'Compra em grande quantidade (Saca/Tonelada/Carga fechada)' : 'Compra quantidades moderadas'}
• Pagamento Preferido: ${preferences.prefersPix ? 'PIX à Vista' : preferences.prefersBoleto ? 'Boleto Safra / Prazo' : 'Flexível'}
• Logística e Frete: ${preferences.needsDelivery ? 'Exige entrega na propriedade (Frete CIF/FOB)' : preferences.picksUpAtFarm ? 'Retira na fazenda/unidade' : 'A combinar'}

HISTÓRICO RECENTE DE INTERAÇÕES COM O VENDEDOR ÁGUIA:
${conversations.length > 0 ? conversations.map((c, i) => `${i + 1}) Pergunta do Cliente: "${c.userPrompt}"\n   Resposta ÁGUIA: "${c.aiReply}"\n   Objeção Detectada: ${c.detectedObjection || 'Nenhuma'}`).join('\n\n') : 'Primeiro atendimento via WhatsApp.'}

HISTÓRICO DE COMPRAS ANTERIORES:
${purchases.length > 0 ? purchases.map((p) => `- Pedido #${p.proposalNumber}: R$ ${p.totalValue.toLocaleString('pt-BR')} (${p.itemsSummary}) em ${new Date(p.purchaseDate).toLocaleDateString('pt-BR')}`).join('\n') : 'Sem histórico prévio de compras.'}
==================================================
`;

    return memorySummary;
  }

  // --- Private Helper Methods ---

  private getAllCustomerMemories(): CustomerMemory[] {
    try {
      const raw = localStorage.getItem(this.customerMemoryKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getAllConversationMemories(): ConversationMemoryEntry[] {
    try {
      const raw = localStorage.getItem(this.conversationMemoryKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getAllPurchaseHistory(): PurchaseHistoryEntry[] {
    try {
      const raw = localStorage.getItem(this.purchaseHistoryKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getAllPreferences(): CustomerPreferences[] {
    try {
      const raw = localStorage.getItem(this.preferencesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getConversationHistoryForPhone(phone: string): ConversationMemoryEntry[] {
    const clean = this.cleanPhone(phone);
    return this.getAllConversationMemories().filter((c) => this.cleanPhone(c.phone) === clean);
  }

  private getPurchaseHistoryForPhone(phone: string): PurchaseHistoryEntry[] {
    const clean = this.cleanPhone(phone);
    return this.getAllPurchaseHistory().filter((p) => this.cleanPhone(p.phone) === clean);
  }

  private cleanPhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  private updatePreferencesFromConversation(
    phone: string,
    entry: Omit<ConversationMemoryEntry, 'id' | 'phone' | 'timestamp'>
  ): void {
    const prefs = this.getPreferences(phone);
    const promptLower = entry.userPrompt.toLowerCase();

    if (promptLower.includes('desconto') || promptLower.includes('menor preço') || promptLower.includes('barato')) {
      prefs.asksForDiscountFrequently = true;
      prefs.likesToNegotiate = true;
    }

    if (promptLower.includes('pix') || promptLower.includes('à vista')) {
      prefs.prefersPix = true;
    }

    if (promptLower.includes('boleto') || promptLower.includes('prazo') || promptLower.includes('safra')) {
      prefs.prefersBoleto = true;
    }

    if (promptLower.includes('entrega') || promptLower.includes('frete') || promptLower.includes('fazenda')) {
      prefs.needsDelivery = true;
    }

    if (promptLower.includes('retirar') || promptLower.includes('busco')) {
      prefs.picksUpAtFarm = true;
    }

    if (promptLower.includes('tonelada') || promptLower.includes('caminhão') || promptLower.includes('carreta')) {
      prefs.buysInBulk = true;
    }

    this.savePreferences(prefs);
  }
}

export const memoryService = new MemoryService();
