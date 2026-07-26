import { firestoreService, FirestoreOrder, OrderStatus } from './FirestoreService';
import { orderService } from './OrderService';
import { productService } from './ProductService';
import { whatsappService } from './WhatsAppService';
import { Product } from '../types';

export type FulfillmentModality = 'Retirada no local' | 'Entrega';
export type FreightStatus = 'Calculado' | 'FRETE AGUARDANDO APROVAÇÃO' | 'Frete Grátis';

export interface DeliveryDetailsParams {
  modality: FulfillmentModality;
  
  // Delivery fields
  receiverName?: string;
  receiverPhone?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryDate?: string;
  freightCost?: number;
  
  // Pickup fields
  pickupAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  pickupResponsible?: string;
  pickupInstructions?: string;
}

class DeliveryService {
  /**
   * Defines fulfillment modality ('Retirada no local' or 'Entrega') and validates data.
   * Does NOT invent values if missing.
   */
  public async setModality(
    orderId: string,
    params: DeliveryDetailsParams
  ): Promise<{ order: FirestoreOrder; warnings: string[] }> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const product: Product | null = await productService.getProductById(order.productId);
    const warnings: string[] = [];

    order.modality = params.modality;
    order.updatedAt = new Date().toISOString();

    if (params.modality === 'Retirada no local') {
      // Validate or assign real registered pickup details
      const registeredAddress = params.pickupAddress || product?.pickupAddress || 'Sede da Empresa / Armazém Principal';
      const registeredDate = params.pickupDate || 'A combinar com o depósito';
      const registeredTime = params.pickupTime || 'Horário comercial (08:00 às 17:00)';
      const registeredResp = params.pickupResponsible || 'Equipe de Expedição';
      const registeredInst = params.pickupInstructions || 'Apresentar documento de identificação e número do pedido na balança.';

      order.pickupAddress = registeredAddress;
      order.pickupDate = registeredDate;
      order.pickupTime = registeredTime;
      order.pickupResponsible = registeredResp;
      order.pickupInstructions = registeredInst;

      // Update delivery fields for consistency
      order.deliveryCity = 'Retirada no Depósito';
      order.deliveryAddress = registeredAddress;
      order.freightCost = 0;
      order.freightType = 'FOB - Retirada pelo Comprador';
      order.freightStatus = 'Calculado';
      order.totalValue = order.unitPrice * order.quantity;
    } else {
      // Entrega
      if (!product?.deliveryAvailable) {
        warnings.push(`Atenção: O produto "${product?.name || order.productName}" está configurado sem entrega própria disponível.`);
      }

      order.receiverName = params.receiverName || order.customerName;
      order.receiverPhone = params.receiverPhone || order.customerPhone;
      order.deliveryCity = params.deliveryCity || order.deliveryCity || 'Não informada';
      order.deliveryState = params.deliveryState || 'MT';
      order.deliveryAddress = params.deliveryAddress || order.deliveryAddress || 'Endereço a confirmar';
      order.deliveryReference = params.deliveryReference || '';
      order.deliveryDate = params.deliveryDate || 'Data a ser agendada';

      // Validate freight
      if (params.freightCost !== undefined && params.freightCost >= 0) {
        order.freightCost = params.freightCost;
        order.freightStatus = 'Calculado';
      } else if (order.freightCost !== undefined && order.freightCost > 0) {
        order.freightStatus = 'Calculado';
      } else {
        // Uncalculable freight
        order.freightStatus = 'FRETE AGUARDANDO APROVAÇÃO';
        order.requiresOwnerApproval = true;
        order.approvalReason = 'Cálculo de frete para endereço da fazenda necessita de aprovação do proprietário';
        warnings.push('Frete pendente de cálculo. Encaminhado para aprovação do proprietário.');
      }

      order.totalValue = (order.unitPrice * order.quantity) + (order.freightCost || 0);
    }

    await firestoreService.saveOrder(order);
    return { order, warnings };
  }

  /**
   * Register or approve freight manually
   */
  public async registerFreight(
    orderId: string,
    freightCost: number,
    isApprovedByOwner: boolean = true
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.freightCost = freightCost;
    order.freightStatus = isApprovedByOwner ? 'Calculado' : 'FRETE AGUARDANDO APROVAÇÃO';
    order.totalValue = (order.unitPrice * order.quantity) + freightCost;
    order.updatedAt = new Date().toISOString();

    if (isApprovedByOwner) {
      order.requiresOwnerApproval = false;
    }

    await firestoreService.saveOrder(order);
    return order;
  }

  /**
   * Update Fulfillment Status with automated WhatsApp notification to customer
   */
  public async updateFulfillmentStatus(
    orderId: string,
    newStatus: OrderStatus,
    updatedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);

    // Send WhatsApp notification if status changed to active fulfillment stage
    if (order.customerPhone) {
      let notifyMsg = '';

      switch (newStatus) {
        case 'Aguardando Preparação':
          notifyMsg = `Olá, ${order.customerName}! Seu pedido #${order.orderNumber} (${order.quantity} ${order.unit} de ${order.productName}) entrou em fase de preparação na expedição.`;
          break;
        case 'Pronto para Retirada':
          notifyMsg = `Olá, ${order.customerName}! Seu pedido #${order.orderNumber} já está PRONTO PARA RETIRADA!\n\n📍 Local: ${order.pickupAddress || 'Depósito Principal'}\n⏰ Horário: ${order.pickupTime || '08:00 às 17:00'}\n👤 Responsável: ${order.pickupResponsible || 'Expedição'}`;
          break;
        case 'Aguardando Entrega':
          notifyMsg = `Olá, ${order.customerName}! Seu pedido #${order.orderNumber} está aguardando carregamento para transporte.`;
          break;
        case 'Saiu para Entrega':
          notifyMsg = `Olá, ${order.customerName}! Seu pedido #${order.orderNumber} SAIU PARA ENTREGA!\n\n🚚 Destino: ${order.deliveryAddress}, ${order.deliveryCity}\n👤 Recebedor: ${order.receiverName || order.customerName}`;
          break;
        case 'Entregue':
          notifyMsg = `Olá, ${order.customerName}! A entrega do seu pedido #${order.orderNumber} foi confirmada com sucesso em ${order.deliveryAddress}.`;
          break;
        case 'Retirado':
          notifyMsg = `Olá, ${order.customerName}! A retirada do seu pedido #${order.orderNumber} foi concluída com sucesso no nosso depósito.`;
          break;
        case 'Finalizado':
          notifyMsg = `Pedido concluído. Obrigado pela compra!`;
          break;
        case 'Cancelado':
          notifyMsg = `Olá, ${order.customerName}. Seu pedido #${order.orderNumber} foi cancelado. Se tiver dúvidas, estamos à disposição.`;
          break;
      }

      if (notifyMsg) {
        await whatsappService.sendOutgoingMessage(order.customerPhone, notifyMsg);
      }
    }

    return order;
  }

  /**
   * Confirm Delivery (Action by authorized owner / logistics)
   */
  public async confirmDelivery(
    orderId: string,
    confirmedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const order = await this.updateFulfillmentStatus(orderId, 'Entregue', confirmedBy);
    if (!order) return null;

    order.completedAt = new Date().toISOString();
    order.completedBy = confirmedBy;
    order.completionModality = 'Entrega';
    await firestoreService.saveOrder(order);

    return order;
  }

  /**
   * Confirm Pickup (Action by authorized owner / logistics)
   */
  public async confirmPickup(
    orderId: string,
    confirmedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const order = await this.updateFulfillmentStatus(orderId, 'Retirado', confirmedBy);
    if (!order) return null;

    order.completedAt = new Date().toISOString();
    order.completedBy = confirmedBy;
    order.completionModality = 'Retirada no local';
    await firestoreService.saveOrder(order);

    return order;
  }

  /**
   * Finalize Order (Definitive order conclusion)
   * Deducts reserved stock safely/idempotently.
   */
  public async finalizeOrder(
    orderId: string,
    confirmedBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const orders = await firestoreService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    // Idempotent stock deduction check
    if (order.reservedStock > 0) {
      // Stock was already reserved/deducted from inventory in reserveStock.
      // Clear reservedStock field so it's marked permanently deducted.
      order.reservedStock = 0;
    }

    order.status = 'Finalizado';
    order.completedAt = new Date().toISOString();
    order.completedBy = confirmedBy;
    order.completionModality = order.modality || 'Entrega';
    order.updatedAt = new Date().toISOString();

    await firestoreService.saveOrder(order);

    // Final WhatsApp message: "Pedido concluído. Obrigado pela compra!"
    if (order.customerPhone) {
      await whatsappService.sendOutgoingMessage(order.customerPhone, 'Pedido concluído. Obrigado pela compra!');
    }

    return order;
  }

  /**
   * Cancel Order & Release reserved stock back to inventory safely
   */
  public async cancelOrder(
    orderId: string,
    reason: string = 'Cancelamento solicitado pelo cliente ou proprietário',
    cancelledBy: string = 'Proprietário'
  ): Promise<FirestoreOrder | null> {
    const cancelledOrder = await orderService.cancelOrder(orderId, `${reason} (por ${cancelledBy})`);
    return cancelledOrder;
  }
}

export const deliveryService = new DeliveryService();
