import { Product, Customer } from '../types';
import {
  firestoreService,
  FirestoreOrder,
  FirestoreOrderItem,
  FirestoreApproval,
  OrderStatus,
} from './FirestoreService';
import { productService } from './ProductService';
import { negotiationService } from './NegotiationService';

export interface CreateOrderParams {
  customer: Customer;
  product: Product;
  quantity: number;
  unitPrice?: number;
  paymentMethod?: string;
  freightType?: string;
  freightCost?: number;
  deliveryCity?: string;
  deliveryAddress?: string;
  conversationId?: string;
  negotiationId?: string;
  notes?: string;
}

export interface ValidationResult {
  valid: boolean;
  requiresApproval: boolean;
  violations: string[];
}

export interface CounterProposalInput {
  newUnitPrice?: number;
  newDiscountPercent?: number;
  newFreightCost?: number;
  newPaymentMethod?: string;
  note?: string;
}

class OrderService {
  /**
   * Create a new Order from negotiation or direct WhatsApp interaction
   */
  public async createOrder(params: CreateOrderParams): Promise<FirestoreOrder> {
    const {
      customer,
      product,
      quantity,
      unitPrice,
      paymentMethod = 'PIX à Vista',
      freightType = product.freightType || 'CIF',
      freightCost,
      deliveryCity = customer.city || 'Não informado',
      deliveryAddress = customer.notes || customer.city || 'A combinar',
      conversationId,
      negotiationId,
      notes,
    } = params;

    const orderNumber = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    const effectiveUnitPrice = unitPrice !== undefined ? unitPrice : product.listPrice;

    // Validate against owner configuration rules
    const validation = this.validateOrder(product, quantity, effectiveUnitPrice, paymentMethod, freightType);

    // Calculate totals
    const prices = negotiationService.calculatePrices(product, quantity, validation.violations.length > 0 ? 0 : undefined);
    const subtotal = product.listPrice * quantity;
    const discountAmount = Math.max(0, subtotal - (effectiveUnitPrice * quantity));
    const discountPercent = product.listPrice > 0 ? parseFloat(((discountAmount / subtotal) * 100).toFixed(2)) : 0;
    const effectiveFreightCost = freightCost !== undefined ? freightCost : prices.freightCost;
    const totalValue = (effectiveUnitPrice * quantity) + effectiveFreightCost;

    const initialStatus: OrderStatus = validation.requiresApproval
      ? 'Aguardando Aprovação'
      : 'Negociando';

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const order: FirestoreOrder = {
      id: orderId,
      orderNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      conversationId,
      negotiationId,
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      unitPrice: effectiveUnitPrice,
      discountAmount,
      discountPercent,
      subtotal,
      freightCost: effectiveFreightCost,
      freightType,
      totalValue,
      paymentMethod,
      paymentStatus: 'Aguardando Pagamento',
      deliveryCity,
      deliveryAddress,
      notes,
      status: initialStatus,
      requiresOwnerApproval: validation.requiresApproval,
      approvalReason: validation.violations.length > 0 ? validation.violations.join(' | ') : undefined,
      reservedStock: 0,
    };

    // Save order in Firestore orders collection
    await firestoreService.saveOrder(order);

    // Create item record in order_items collection
    const orderItem: FirestoreOrderItem = {
      id: `orditem-${Date.now()}`,
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      unitPrice: effectiveUnitPrice,
      quantity,
      discountAmount,
      subtotal,
      total: totalValue,
    };
    await firestoreService.saveOrderItem(orderItem);

    // If owner approval is required, create Approval Request record ("APROVAÇÃO NECESSÁRIA")
    if (validation.requiresApproval) {
      await this.requestApproval(
        order,
        product,
        validation.violations.join(' | ') || 'Condição de negociação fora das regras automáticas'
      );
    }

    return order;
  }

  /**
   * Validate order parameters against owner defined product rules
   */
  public validateOrder(
    product: Product,
    quantity: number,
    unitPrice: number,
    paymentMethod: string,
    freightType?: string
  ): ValidationResult {
    const violations: string[] = [];

    // 1. Minimum Price Check
    if (unitPrice < product.minPrice) {
      violations.push(
        `Preço unitário R$ ${unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} abaixo do preço mínimo permitido R$ ${product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
    }

    // 2. Max Discount Check
    if (product.listPrice > 0) {
      const discountPercent = ((product.listPrice - unitPrice) / product.listPrice) * 100;
      if (discountPercent > product.maxDiscountPercent) {
        violations.push(
          `Desconto de ${discountPercent.toFixed(1)}% acima do máximo cadastrado (${product.maxDiscountPercent}%)`
        );
      }
    }

    // 3. Stock Shortage Check
    if (quantity > product.stockQty) {
      violations.push(
        `Quantidade solicitada (${quantity} ${product.unit}) excede estoque disponível (${product.stockQty} ${product.unit})`
      );
    }

    // 4. Payment Term Authorization Check
    if (product.paymentTerms && product.paymentTerms.length > 0) {
      const allowed = product.paymentTerms.some((p) =>
        p.toLowerCase().includes(paymentMethod.toLowerCase())
      );
      if (!allowed) {
        violations.push(`Forma de pagamento "${paymentMethod}" requer autorização especial`);
      }
    }

    // 5. Freight Type Check
    if (!freightType || freightType === 'A combinar') {
      violations.push('Frete não definido precisa de aprovação do proprietário');
    }

    return {
      valid: violations.length === 0,
      requiresApproval: violations.length > 0,
      violations,
    };
  }

  /**
   * Request manual approval from owner ("APROVAÇÃO NECESSÁRIA")
   */
  public async requestApproval(
    order: FirestoreOrder,
    product: Product,
    reason: string
  ): Promise<FirestoreApproval> {
    const approval: FirestoreApproval = {
      id: `appr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      orderId: order.id,
      negotiationId: order.negotiationId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      productId: order.productId,
      productName: order.productName,
      quantity: order.quantity,
      unit: order.unit,
      originalPrice: product.listPrice,
      negotiatedUnitPrice: order.unitPrice,
      discountPercent: order.discountPercent,
      freightCost: order.freightCost,
      paymentMethod: order.paymentMethod,
      totalValue: order.totalValue,
      approvalReason: reason,
      status: 'Aguardando Aprovação',
      createdAt: new Date().toISOString(),
    };

    await firestoreService.saveApproval(approval);
    return approval;
  }

  /**
   * Proprietário APROVAR pedido
   */
  public async approveOrder(orderId: string, reviewedBy: string = 'Proprietário'): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = 'Aprovado';
    order.requiresOwnerApproval = false;
    order.approvedBy = reviewedBy;
    order.approvedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);

    // Update approval record in approvals collection
    const approvals = await firestoreService.getApprovals();
    const approval = approvals.find((a) => a.orderId === orderId);
    if (approval) {
      approval.status = 'Aprovado';
      approval.reviewedBy = reviewedBy;
      approval.reviewedAt = new Date().toISOString();
      await firestoreService.saveApproval(approval);
    }

    return order;
  }

  /**
   * Proprietário RECUSAR pedido
   */
  public async refuseOrder(
    orderId: string,
    reviewedBy: string = 'Proprietário',
    reason?: string
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = 'Recusado';
    order.requiresOwnerApproval = false;
    order.approvalReason = reason || 'Condição recusada pelo proprietário';
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);

    const approvals = await firestoreService.getApprovals();
    const approval = approvals.find((a) => a.orderId === orderId);
    if (approval) {
      approval.status = 'Recusado';
      approval.reviewedBy = reviewedBy;
      approval.reviewedAt = new Date().toISOString();
      await firestoreService.saveApproval(approval);
    }

    return order;
  }

  /**
   * Proprietário FAZER CONTRAPROPOSTA
   */
  public async createCounterProposal(
    orderId: string,
    counterInput: CounterProposalInput,
    reviewedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const newUnitPrice = counterInput.newUnitPrice !== undefined ? counterInput.newUnitPrice : order.unitPrice;
    const newFreightCost = counterInput.newFreightCost !== undefined ? counterInput.newFreightCost : order.freightCost;
    const newPaymentMethod = counterInput.newPaymentMethod || order.paymentMethod;

    const product = await productService.getProductById(order.productId);
    const listPrice = product ? product.listPrice : order.unitPrice;

    const subtotal = listPrice * order.quantity;
    const newDiscountAmount = Math.max(0, subtotal - (newUnitPrice * order.quantity));
    const newDiscountPercent = listPrice > 0 ? parseFloat(((newDiscountAmount / subtotal) * 100).toFixed(2)) : 0;
    const newTotalValue = (newUnitPrice * order.quantity) + newFreightCost;

    order.unitPrice = newUnitPrice;
    order.discountAmount = newDiscountAmount;
    order.discountPercent = newDiscountPercent;
    order.freightCost = newFreightCost;
    order.paymentMethod = newPaymentMethod;
    order.totalValue = newTotalValue;
    order.status = 'Negociando'; // Resumes negotiation on WhatsApp with counter-proposal
    order.requiresOwnerApproval = false;
    order.notes = counterInput.note ? `Contraproposta do Dono: ${counterInput.note}` : order.notes;
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);

    const approvals = await firestoreService.getApprovals();
    const approval = approvals.find((a) => a.orderId === orderId);
    if (approval) {
      approval.status = 'Contraproposta';
      approval.reviewedBy = reviewedBy;
      approval.reviewedAt = new Date().toISOString();
      approval.counterProposal = counterInput;
      await firestoreService.saveApproval(approval);
    }

    return order;
  }

  /**
   * Confirm Order upon positive client response on WhatsApp
   * Reserves stock to prevent duplicate sales.
   */
  public async confirmOrder(orderId: string): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    // Reserve stock automatically
    await this.reserveStock(orderId);

    order.status = 'Confirmado pelo Cliente';
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);
    return order;
  }

  /**
   * Reserve Stock for an order
   */
  public async reserveStock(orderId: string): Promise<boolean> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.reservedStock > 0) return false;

    try {
      await productService.updateStockOnSale(order.productId, order.quantity);
      order.reservedStock = order.quantity;
      await firestoreService.saveOrder(order);
      return true;
    } catch (e) {
      console.error('Erro ao reservar estoque do pedido:', e);
      return false;
    }
  }

  /**
   * Cancel Order & Release reserved stock back to inventory
   */
  public async cancelOrder(orderId: string, reason?: string): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    // Release reserved stock if reserved
    if (order.reservedStock > 0) {
      const product = await productService.getProductById(order.productId);
      if (product) {
        const releasedStock = product.stockQty + order.reservedStock;
        await productService.updateProduct(
          order.productId,
          { stockQty: releasedStock, status: 'Ativo' },
          true
        );
      }
      order.reservedStock = 0;
    }

    order.status = 'Cancelado';
    order.notes = reason ? `Cancelado: ${reason}` : order.notes;
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);
    return order;
  }

  /**
   * Finalize Order (Definitive completion)
   */
  public async finalizeOrder(orderId: string): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = 'Finalizado';
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);
    return order;
  }

  /**
   * Attach Payment Proof media (Receipt sent by customer)
   * Marks as 'Comprovante Recebido' / 'Aguardando Conferência'.
   * NOTE: Does NOT automatically mark as 'Pagamento Confirmado'.
   */
  public async attachPaymentProof(
    orderId: string,
    mediaUrl?: string,
    mediaId?: string
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.paymentStatus = 'Comprovante Recebido';
    order.paymentProofUrl = mediaUrl;
    order.paymentProofMediaId = mediaId;
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);
    return order;
  }

  /**
   * Owner confirms Payment after manual verification
   */
  public async confirmPayment(
    orderId: string,
    confirmedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.paymentStatus = 'Pagamento Confirmado';
    order.paymentConfirmedAt = new Date().toISOString();
    order.paymentConfirmedBy = confirmedBy;
    order.status = 'Finalizado';
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);
    return order;
  }

  /**
   * Owner refuses Payment Proof after manual verification
   */
  public async refusePaymentProof(
    orderId: string,
    reason: string = 'Comprovante divergente ou inválido',
    reviewedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.paymentStatus = 'Pagamento Recusado';
    order.paymentRefusedReason = reason;
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);
    return order;
  }
}

export const orderService = new OrderService();
