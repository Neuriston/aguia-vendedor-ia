export type ProductCategory =
  | 'Grãos e Sementes'
  | 'Maquinários e Veículos'
  | 'Fertilizantes e Químicos'
  | 'Pecuária e Animais'
  | 'Peças e Equipamentos'
  | 'Irrigação e Outros';

export type CustomerStatus =
  | 'Novo Prospect'
  | 'Em Negociação'
  | 'Proposta Enviada'
  | 'Venda Fechada'
  | 'Desistiu'
  | 'Cliente Frequente';

export type LeadTemperature = 'Frio' | 'Morno' | 'Quente' | 'Recorrente' | 'VIP';

export type FollowUpTriggerType =
  | 'AguardandoResposta'
  | 'OrcamentoPendente'
  | 'ClienteSumido'
  | 'RecompraRecorrente';

export type ProposalStatus =
  | 'Rascunho'
  | 'Aguardando Cliente'
  | 'Aprovada pela IA'
  | 'Aguardando Dono'
  | 'Fechada/Aprovada'
  | 'Rejeitada';

export type ProductStatus = 'Ativo' | 'Pausado' | 'Sem estoque';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  shortDescription?: string;
  description: string; // Descrição completa
  photos: string[];
  videos?: string[];
  stockQty: number;
  minStockThreshold?: number;
  unit: string; // e.g., 'saca 60kg', 'tonelada', 'cabeça', 'unidade', 'litro', 'caixa'
  weight?: string; // Peso
  brand?: string; // Marca
  model?: string; // Modelo
  listPrice: number; // Preço anunciado
  minPrice: number; // Preço mínimo (limite IA)
  idealPrice: number; // Preço ideal
  maxDiscountPercent: number; // Desconto máximo %
  city: string;
  state: string;
  pickupAddress?: string; // Endereço de retirada
  deliveryAvailable?: boolean; // Entrega disponível
  deliveryRadiusKm?: number; // Raio de entrega (km)
  freightType: 'CIF' | 'FOB' | 'A combinar' | 'Frete Grátis acima de X tons';
  freightDetails?: string;
  deliveryTime?: string; // Tempo de entrega
  paymentTerms: string[]; // e.g. ['PIX à vista', 'Boleto Safra 30/60/90', 'Financiamento Agro']
  guaranteeDetails: string;
  notes?: string;
  status?: ProductStatus;
  crossSellProductIds?: string[]; // Recommended cross-sell items
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'location' | 'contact';

export interface CustomerMessage {
  id: string;
  sender: 'customer' | 'ai' | 'owner';
  text: string;
  timestamp: string;
  type?: MessageType;
  mediaId?: string;
  mediaUrl?: string;
  transcription?: string;
  fileName?: string;
  fileSize?: number;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  offerAmount?: number;
  proposalId?: string;
  salesTacticUsed?: string; // e.g. 'SPIN Selling', 'Quebra de Objeção', 'AIDA', 'Cross Selling'
  aiNegotiationMeta?: {
    analyzedPrice?: number;
    acceptable?: boolean;
    reasoning?: string;
    counterOffer?: number;
    alertOwnerTriggered?: boolean;
    leadTemperature?: LeadTemperature;
    detectedObjection?: string;
    crossSellRecommendation?: string;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  farmName?: string;
  cpfCnpj?: string;
  company?: string;
  interestedProducts: string[]; // Product IDs
  status: CustomerStatus;
  leadTemperature: LeadTemperature;
  notes: string;
  objectionsHistory?: string[];
  totalSpent: number;
  frequentBuyer: boolean;
  lastBuyDate?: string;
  lastInteraction: string;
  humanTakeover?: boolean; // When true, owner handles customer manually and AI pauses auto-reply for this conversation
  messages: CustomerMessage[];
  createdAt: string;
}

export interface FollowUpTask {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  triggerType: FollowUpTriggerType;
  productName: string;
  scheduledMessage: string;
  status: 'Pendente' | 'Enviado' | 'Respondido';
  dueDate: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unitListPrice: number;
    unitAgreedPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discountTotal: number;
  freightCost: number;
  finalTotal: number;
  paymentMethod: string;
  freightMethod: string;
  deliveryEstimateDays: number;
  status: ProposalStatus;
  validUntil: string;
  aiNotes?: string;
  createdAt: string;
  closedAt?: string;
}

export interface OwnerNotification {
  id: string;
  type: 'proposal_ready' | 'sale_approved' | 'vip_client' | 'high_value_deal' | 'manual_approval_needed' | 'followup_due';
  title: string;
  description: string;
  customerId?: string;
  customerName?: string;
  proposalId?: string;
  value?: number;
  read: boolean;
  createdAt: string;
}

export type PaymentStatus =
  | 'Aguardando Pagamento'
  | 'Comprovante Recebido'
  | 'Aguardando Conferência'
  | 'Pagamento Confirmado'
  | 'Pagamento Recusado'
  | 'Cancelado';

export interface PixSettings {
  keyType: 'CNPJ' | 'CPF' | 'E-mail' | 'Telefone' | 'Chave Aleatória';
  pixKey: string;
  receiverName: string;
  institution: string;
  instructions: string;
}

export interface SystemSettings {
  companyName: string;
  ownerName: string;
  ownerPhone: string;
  companyLocation: string;
  aiTone: 'Consultor Experiente' | 'Técnico Agrônomo Directo' | 'Comercial Amigável';
  minNotifyAmount: number; // Avisar dono se negociação for acima de X reais
  autoApproveWithinMinPrice: boolean;
  welcomeMessage: string;
  autoFollowUpEnabled: boolean;
  automaticSalesActive?: boolean;
  acceptedPaymentMethods: string[];
  pixSettings: PixSettings;
}
