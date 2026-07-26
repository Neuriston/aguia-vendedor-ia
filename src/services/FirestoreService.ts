import { Customer, CustomerMessage, Proposal, Product, SystemSettings } from '../types';

export interface FirestoreConversation {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  status: 'Novo Prospect' | 'Em Negociação' | 'Proposta Enviada' | 'Fechada/Aprovada' | 'Aguardando Dono';
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
}

export interface FirestoreMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'aguia' | 'owner';
  text: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'location';
  mediaUrl?: string;
  proposalId?: string;
}

export type OrderStatus =
  | 'Negociando'
  | 'Aguardando Aprovação'
  | 'Aprovado'
  | 'Recusado'
  | 'Confirmado pelo Cliente'
  | 'Aguardando Preparação'
  | 'Pronto para Retirada'
  | 'Aguardando Entrega'
  | 'Saiu para Entrega'
  | 'Entregue'
  | 'Retirado'
  | 'Finalizado'
  | 'Cancelado';

export interface FirestoreOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  subtotal: number;
  total: number;
}

export interface FirestoreOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  conversationId?: string;
  negotiationId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  discountPercent: number;
  subtotal: number;
  freightCost: number;
  freightType: string;
  totalValue: number;
  paymentMethod: string;
  paymentStatus?: 'Aguardando Pagamento' | 'Comprovante Recebido' | 'Aguardando Conferência' | 'Pagamento Confirmado' | 'Pagamento Recusado' | 'Cancelado';
  paymentProofUrl?: string;
  paymentProofMediaId?: string;
  paymentConfirmedAt?: string;
  paymentConfirmedBy?: string;
  paymentRefusedReason?: string;
  deliveryCity: string;
  deliveryAddress: string;
  modality?: 'Retirada no local' | 'Entrega';
  receiverName?: string;
  receiverPhone?: string;
  deliveryState?: string;
  deliveryReference?: string;
  deliveryDate?: string;
  freightStatus?: 'Calculado' | 'FRETE AGUARDANDO APROVAÇÃO' | 'Frete Grátis';
  pickupAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  pickupResponsible?: string;
  pickupInstructions?: string;
  completedAt?: string;
  completedBy?: string;
  completionModality?: 'Retirada no local' | 'Entrega';
  notes?: string;
  status: OrderStatus;
  requiresOwnerApproval: boolean;
  approvalReason?: string;
  reservedStock: number;
  approvedBy?: string;
  approvedAt?: string;
  items?: FirestoreOrderItem[];
}

export interface FirestoreApproval {
  id: string;
  orderId: string;
  negotiationId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  originalPrice: number;
  negotiatedUnitPrice: number;
  discountPercent: number;
  freightCost: number;
  paymentMethod: string;
  totalValue: number;
  approvalReason: string;
  status: 'Aguardando Aprovação' | 'Aprovado' | 'Recusado' | 'Contraproposta';
  reviewedBy?: string;
  reviewedAt?: string;
  counterProposal?: {
    newUnitPrice?: number;
    newDiscountPercent?: number;
    newFreightCost?: number;
    newPaymentMethod?: string;
    note?: string;
  };
  createdAt: string;
}

export type NegotiationStatus =
  | 'Nova'
  | 'Negociando'
  | 'Aguardando Aprovação'
  | 'Aprovada'
  | 'Recusada'
  | 'Fechada'
  | 'Cancelada';

export interface FirestoreNegotiation {
  id: string;
  proposalNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  announcedPrice: number;
  minPrice: number;
  idealPrice: number;
  offeredUnitPrice: number;
  discountPercent: number;
  freightCost: number;
  freightType: string;
  paymentMethod: string;
  totalValue: number;
  status: NegotiationStatus;
  requiresOwnerApproval: boolean;
  approvalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreOffer {
  id: string;
  negotiationId: string;
  sender: 'customer' | 'aguia' | 'owner';
  offeredUnitPrice: number;
  quantity: number;
  discountPercent: number;
  totalValue: number;
  note?: string;
  createdAt: string;
}

export interface FirestorePricingRule {
  id: string;
  productId: string;
  announcedPrice: number;
  minPrice: number;
  idealPrice: number;
  minMarginPercent: number;
  minQuantity: number;
  maxQuantity: number;
  createdAt: string;
}

export interface FirestoreDiscountRule {
  id: string;
  productId: string;
  maxDiscountPercent: number;
  requiresApprovalAbovePercent: number;
  bulkDiscountThreshold: number;
  bulkDiscountPercent: number;
  createdAt: string;
}

export interface FirestoreCategory {
  id: string;
  name: string;
  description?: string;
  productCount: number;
  active: boolean;
  createdAt: string;
}

export interface FirestoreInventoryRecord {
  id: string;
  productId: string;
  productName: string;
  stockQty: number;
  minStockThreshold: number;
  status: 'Em Estoque' | 'Estoque Baixo' | 'Sem Estoque';
  lastMovementType?: 'ENTRADA' | 'SAIDA_VENDA' | 'AJUSTE_MANUAL';
  lastMovementQty?: number;
  updatedAt: string;
}

export interface FirestoreProductMedia {
  id: string;
  productId: string;
  type: 'image' | 'video';
  url: string;
  filename?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface FirestoreSalesLearning {
  id: string;
  date: string;
  type: 'venda_sucesso' | 'perda_atendimento' | 'objecao_frequente' | 'sugestao_proprietario';
  productId?: string;
  productName?: string;
  context: string;
  outcome: string;
  confidence: 'Alta' | 'Média' | 'Baixa';
  source: 'confirmada' | 'observada' | 'inferencia';
  contributingFactors?: string[];
  dropReason?: string;
  ownerSuggestion?: string;
  phone?: string;
  createdAt: string;
}

export interface FirestoreAILog {
  id: string;
  timestamp: string;
  conversationId: string;
  customerName: string;
  userPrompt: string;
  aiResponse: string;
  leadTemperature: string;
  salesTactic: string;
  detectedObjection?: string;
  proposalGenerated: boolean;
  alertOwner: boolean;
  latencyMs: number;
  tokenCountEstimated: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
}

class FirestoreService {
  private conversationsKey = 'aguia_firestore_conversations';
  private messagesKey = 'aguia_firestore_messages';
  private ordersKey = 'aguia_firestore_orders';
  private aiLogsKey = 'aguia_firestore_ai_logs';
  private negotiationsKey = 'aguia_firestore_negotiations';
  private offersKey = 'aguia_firestore_offers';
  private pricingRulesKey = 'aguia_firestore_pricing_rules';
  private discountRulesKey = 'aguia_firestore_discount_rules';
  private productsKey = 'aguia_firestore_products';
  private categoriesKey = 'aguia_firestore_categories';
  private inventoryKey = 'aguia_firestore_inventory';
  private productMediaKey = 'aguia_firestore_product_media';

  // Collection: products
  public async getProducts(): Promise<Product[]> {
    try {
      const raw = localStorage.getItem(this.productsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveProduct(product: Product): Promise<void> {
    const list = await this.getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    product.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = product;
    } else {
      list.unshift(product);
    }
    localStorage.setItem(this.productsKey, JSON.stringify(list));
  }

  public async deleteProduct(productId: string): Promise<void> {
    const list = await this.getProducts();
    const filtered = list.filter((p) => p.id !== productId);
    localStorage.setItem(this.productsKey, JSON.stringify(filtered));
  }

  // Collection: categories
  public async getCategories(): Promise<FirestoreCategory[]> {
    try {
      const raw = localStorage.getItem(this.categoriesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveCategory(cat: FirestoreCategory): Promise<void> {
    const list = await this.getCategories();
    const idx = list.findIndex((c) => c.id === cat.id);
    if (idx >= 0) {
      list[idx] = cat;
    } else {
      list.push(cat);
    }
    localStorage.setItem(this.categoriesKey, JSON.stringify(list));
  }

  // Collection: inventory
  public async getInventory(): Promise<FirestoreInventoryRecord[]> {
    try {
      const raw = localStorage.getItem(this.inventoryKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveInventoryRecord(record: FirestoreInventoryRecord): Promise<void> {
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.productId === record.productId);
    record.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(this.inventoryKey, JSON.stringify(list));
  }

  // Collection: product_media
  public async getProductMedia(productId?: string): Promise<FirestoreProductMedia[]> {
    try {
      const raw = localStorage.getItem(this.productMediaKey);
      const all: FirestoreProductMedia[] = raw ? JSON.parse(raw) : [];
      if (productId) {
        return all.filter((m) => m.productId === productId);
      }
      return all;
    } catch {
      return [];
    }
  }

  public async addProductMedia(media: FirestoreProductMedia): Promise<void> {
    const list = await this.getProductMedia();
    list.push(media);
    localStorage.setItem(this.productMediaKey, JSON.stringify(list));
  }

  // Collection: negotiations
  public async getNegotiations(): Promise<FirestoreNegotiation[]> {
    try {
      const raw = localStorage.getItem(this.negotiationsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveNegotiation(neg: FirestoreNegotiation): Promise<void> {
    const list = await this.getNegotiations();
    const idx = list.findIndex((n) => n.id === neg.id);
    neg.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = neg;
    } else {
      list.unshift(neg);
    }
    localStorage.setItem(this.negotiationsKey, JSON.stringify(list));
  }

  // Collection: offers
  public async getOffers(negotiationId: string): Promise<FirestoreOffer[]> {
    try {
      const raw = localStorage.getItem(this.offersKey);
      const all: FirestoreOffer[] = raw ? JSON.parse(raw) : [];
      return all.filter((o) => o.negotiationId === negotiationId);
    } catch {
      return [];
    }
  }

  public async addOffer(offer: FirestoreOffer): Promise<void> {
    try {
      const raw = localStorage.getItem(this.offersKey);
      const all: FirestoreOffer[] = raw ? JSON.parse(raw) : [];
      all.push(offer);
      localStorage.setItem(this.offersKey, JSON.stringify(all));
    } catch (e) {
      console.error('Erro ao salvar oferta no Firestore:', e);
    }
  }

  // Collection: pricing_rules
  public async getPricingRules(): Promise<FirestorePricingRule[]> {
    try {
      const raw = localStorage.getItem(this.pricingRulesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async savePricingRule(rule: FirestorePricingRule): Promise<void> {
    const list = await this.getPricingRules();
    const idx = list.findIndex((r) => r.productId === rule.productId);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.unshift(rule);
    }
    localStorage.setItem(this.pricingRulesKey, JSON.stringify(list));
  }

  // Collection: discount_rules
  public async getDiscountRules(): Promise<FirestoreDiscountRule[]> {
    try {
      const raw = localStorage.getItem(this.discountRulesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveDiscountRule(rule: FirestoreDiscountRule): Promise<void> {
    const list = await this.getDiscountRules();
    const idx = list.findIndex((r) => r.productId === rule.productId);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.unshift(rule);
    }
    localStorage.setItem(this.discountRulesKey, JSON.stringify(list));
  }

  // Collection: conversations
  public async getConversations(): Promise<FirestoreConversation[]> {
    try {
      const raw = localStorage.getItem(this.conversationsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveConversation(conv: FirestoreConversation): Promise<void> {
    const list = await this.getConversations();
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
    localStorage.setItem(this.conversationsKey, JSON.stringify(list));
  }

  // Collection: messages
  public async getMessages(conversationId: string): Promise<FirestoreMessage[]> {
    try {
      const raw = localStorage.getItem(this.messagesKey);
      const all: FirestoreMessage[] = raw ? JSON.parse(raw) : [];
      return all.filter((m) => m.conversationId === conversationId);
    } catch {
      return [];
    }
  }

  public async addMessage(msg: FirestoreMessage): Promise<void> {
    try {
      const raw = localStorage.getItem(this.messagesKey);
      const all: FirestoreMessage[] = raw ? JSON.parse(raw) : [];
      all.push(msg);
      localStorage.setItem(this.messagesKey, JSON.stringify(all));
    } catch (e) {
      console.error('Erro ao salvar mensagem no Firestore:', e);
    }
  }

  private orderItemsKey = 'aguia_firestore_order_items';
  private approvalsKey = 'aguia_firestore_approvals';
  private salesLearningsKey = 'aguia_firestore_sales_learnings';

  // Collection: sales_learnings
  public async getSalesLearnings(): Promise<FirestoreSalesLearning[]> {
    try {
      const raw = localStorage.getItem(this.salesLearningsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveSalesLearning(learning: FirestoreSalesLearning): Promise<void> {
    const list = await this.getSalesLearnings();
    const idx = list.findIndex((l) => l.id === learning.id);
    if (idx >= 0) {
      list[idx] = learning;
    } else {
      list.unshift(learning);
    }
    localStorage.setItem(this.salesLearningsKey, JSON.stringify(list));
  }

  // Collection: orders
  public async getOrders(): Promise<FirestoreOrder[]> {
    try {
      const raw = localStorage.getItem(this.ordersKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveOrder(order: FirestoreOrder): Promise<void> {
    const list = await this.getOrders();
    const idx = list.findIndex((o) => o.id === order.id);
    order.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = order;
    } else {
      list.unshift(order);
    }
    localStorage.setItem(this.ordersKey, JSON.stringify(list));
  }

  public async createOrder(order: FirestoreOrder): Promise<void> {
    await this.saveOrder(order);
  }

  // Collection: order_items
  public async getOrderItems(orderId?: string): Promise<FirestoreOrderItem[]> {
    try {
      const raw = localStorage.getItem(this.orderItemsKey);
      const all: FirestoreOrderItem[] = raw ? JSON.parse(raw) : [];
      if (orderId) {
        return all.filter((item) => item.orderId === orderId);
      }
      return all;
    } catch {
      return [];
    }
  }

  public async saveOrderItem(item: FirestoreOrderItem): Promise<void> {
    const list = await this.getOrderItems();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem(this.orderItemsKey, JSON.stringify(list));
  }

  // Collection: approvals
  public async getApprovals(): Promise<FirestoreApproval[]> {
    try {
      const raw = localStorage.getItem(this.approvalsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveApproval(approval: FirestoreApproval): Promise<void> {
    const list = await this.getApprovals();
    const idx = list.findIndex((a) => a.id === approval.id);
    if (idx >= 0) {
      list[idx] = approval;
    } else {
      list.unshift(approval);
    }
    localStorage.setItem(this.approvalsKey, JSON.stringify(list));
  }

  // Collection: ai_logs
  public async getAILogs(): Promise<FirestoreAILog[]> {
    try {
      const raw = localStorage.getItem(this.aiLogsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async addAILog(log: FirestoreAILog): Promise<void> {
    const list = await this.getAILogs();
    list.unshift(log);
    if (list.length > 100) list.pop();
    localStorage.setItem(this.aiLogsKey, JSON.stringify(list));
  }
}

export const firestoreService = new FirestoreService();
