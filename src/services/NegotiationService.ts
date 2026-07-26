import { Product, Customer, SystemSettings } from '../types';
import {
  firestoreService,
  FirestoreNegotiation,
  FirestoreOffer,
  FirestorePricingRule,
  FirestoreDiscountRule,
  NegotiationStatus,
} from './FirestoreService';

export interface ValidationRuleResult {
  valid: boolean;
  requiresApproval: boolean;
  violations: string[];
  adjustedUnitPrice: number;
  discountPercent: number;
}

export interface PriceCalculationResult {
  announcedUnitPrice: number;
  offeredUnitPrice: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  freightCost: number;
  finalTotal: number;
}

class NegotiationService {
  /**
   * Start a new negotiation for a customer and product
   */
  public async startNegotiation(
    customer: Customer,
    product: Product,
    quantity: number = 1,
    requestedUnitPrice?: number,
    paymentMethod: string = 'PIX à Vista',
    freightType: string = 'CIF'
  ): Promise<FirestoreNegotiation> {
    const proposalNumber = `PROP-${Math.floor(100000 + Math.random() * 900000)}`;

    // Validate stock
    if (product.stockQty <= 0) {
      throw new Error(`Produto ${product.name} está sem estoque no momento.`);
    }

    const qty = Math.min(quantity, product.stockQty);
    const offeredUnitPrice = requestedUnitPrice || product.listPrice;

    // Validate pricing & discount rules
    const validation = this.validateRules(product, qty, offeredUnitPrice, paymentMethod);

    const priceCalc = this.calculatePrices(product, qty, validation.discountPercent);

    const negotiation: FirestoreNegotiation = {
      id: `neg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      proposalNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unit: product.unit,
      announcedPrice: product.listPrice,
      minPrice: product.minPrice,
      idealPrice: product.idealPrice,
      offeredUnitPrice: priceCalc.offeredUnitPrice,
      discountPercent: priceCalc.discountPercent,
      freightCost: priceCalc.freightCost,
      freightType: freightType || product.freightType,
      paymentMethod,
      totalValue: priceCalc.finalTotal,
      status: validation.requiresApproval ? 'Aguardando Aprovação' : 'Negociando',
      requiresOwnerApproval: validation.requiresApproval,
      approvalReason: validation.violations.length > 0 ? validation.violations.join(' | ') : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestoreService.saveNegotiation(negotiation);

    // Record initial offer in offers collection
    const initialOffer: FirestoreOffer = {
      id: `off-${Date.now()}`,
      negotiationId: negotiation.id,
      sender: 'aguia',
      offeredUnitPrice: priceCalc.offeredUnitPrice,
      quantity: qty,
      discountPercent: priceCalc.discountPercent,
      totalValue: priceCalc.finalTotal,
      note: 'Início da negociação automática ÁGUIA',
      createdAt: new Date().toISOString(),
    };

    await firestoreService.addOffer(initialOffer);

    // Save initial pricing & discount rules in Firestore
    await this.ensureRulesInFirestore(product);

    return negotiation;
  }

  /**
   * Calculate full breakdown of prices, discounts, freight, and totals
   */
  public calculatePrices(
    product: Product,
    quantity: number,
    discountPercent: number = 0
  ): PriceCalculationResult {
    const announcedUnitPrice = product.listPrice;
    const boundedDiscount = Math.min(Math.max(0, discountPercent), product.maxDiscountPercent);

    const offeredUnitPrice = Math.max(
      product.minPrice,
      announcedUnitPrice * (1 - boundedDiscount / 100)
    );

    const subtotal = announcedUnitPrice * quantity;
    const finalTotalBeforeFreight = offeredUnitPrice * quantity;
    const discountAmount = subtotal - finalTotalBeforeFreight;

    // Freight calculation rule
    let freightCost = 0;
    if (product.freightType === 'FOB') {
      freightCost = quantity * 12; // Standard R$ 12 freight rate per unit
    } else if (product.freightType === 'CIF') {
      freightCost = 0; // Included
    } else {
      freightCost = 50; // Fixed estimate for "A combinar"
    }

    const finalTotal = finalTotalBeforeFreight + freightCost;

    return {
      announcedUnitPrice,
      offeredUnitPrice,
      quantity,
      subtotal,
      discountAmount,
      discountPercent: boundedDiscount,
      freightCost,
      finalTotal,
    };
  }

  /**
   * Calculate discount percentage from offered unit price
   */
  public calculateDiscounts(product: Product, offeredUnitPrice: number): number {
    if (product.listPrice <= 0) return 0;
    const rawDiscount = ((product.listPrice - offeredUnitPrice) / product.listPrice) * 100;
    return Math.max(0, parseFloat(rawDiscount.toFixed(2)));
  }

  /**
   * Validate negotiation rules against product limits
   */
  public validateRules(
    product: Product,
    quantity: number,
    offeredUnitPrice: number,
    paymentMethod: string
  ): ValidationRuleResult {
    const violations: string[] = [];
    let requiresApproval = false;

    // Rule 1: Stock Check
    if (quantity > product.stockQty) {
      violations.push(`Quantidade (${quantity} ${product.unit}) excede estoque disponível (${product.stockQty} ${product.unit})`);
      requiresApproval = true;
    }

    // Rule 2: Minimum Price Limit Check (CRITICAL)
    if (offeredUnitPrice < product.minPrice) {
      violations.push(
        `Preço ofertado (R$ ${offeredUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está abaixo do Preço Mínimo cadastrado (R$ ${product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
      );
      requiresApproval = true;
    }

    // Rule 3: Max Discount Percent Check
    const discountPercent = this.calculateDiscounts(product, offeredUnitPrice);
    if (discountPercent > product.maxDiscountPercent) {
      violations.push(
        `Desconto solicitado (${discountPercent}%) excede o Desconto Máximo permitido (${product.maxDiscountPercent}%)`
      );
      requiresApproval = true;
    }

    // Rule 4: Payment Terms Check
    if (product.paymentTerms && product.paymentTerms.length > 0) {
      const isAllowedPayment = product.paymentTerms.some((term) =>
        term.toLowerCase().includes(paymentMethod.toLowerCase())
      );
      if (!isAllowedPayment) {
        violations.push(`Forma de pagamento "${paymentMethod}" requer autorização especial do proprietário`);
        requiresApproval = true;
      }
    }

    // Adjusted safe unit price (never below minPrice for AI auto-acceptance)
    const adjustedUnitPrice = Math.max(offeredUnitPrice, product.minPrice);

    return {
      valid: violations.length === 0,
      requiresApproval,
      violations,
      adjustedUnitPrice,
      discountPercent,
    };
  }

  /**
   * Generate formal proposal automatically
   */
  public async generateProposal(
    customer: Customer,
    product: Product,
    quantity: number,
    unitAgreedPrice: number,
    paymentMethod: string = 'PIX à Vista',
    freightType: string = 'CIF'
  ): Promise<FirestoreNegotiation> {
    const validation = this.validateRules(product, quantity, unitAgreedPrice, paymentMethod);
    const priceCalc = this.calculatePrices(product, quantity, validation.discountPercent);

    const proposalNumber = `PROP-${Math.floor(100000 + Math.random() * 900000)}`;

    const negotiation: FirestoreNegotiation = {
      id: `neg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      proposalNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      announcedPrice: product.listPrice,
      minPrice: product.minPrice,
      idealPrice: product.idealPrice,
      offeredUnitPrice: priceCalc.offeredUnitPrice,
      discountPercent: priceCalc.discountPercent,
      freightCost: priceCalc.freightCost,
      freightType,
      paymentMethod,
      totalValue: priceCalc.finalTotal,
      status: validation.requiresApproval ? 'Aguardando Aprovação' : 'Aprovada',
      requiresOwnerApproval: validation.requiresApproval,
      approvalReason: validation.violations.length > 0 ? validation.violations.join(' | ') : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestoreService.saveNegotiation(negotiation);
    return negotiation;
  }

  /**
   * Request manual approval from owner for out-of-bounds negotiations
   */
  public async requestApproval(negotiationId: string, reason: string): Promise<FirestoreNegotiation | null> {
    const list = await firestoreService.getNegotiations();
    const neg = list.find((n) => n.id === negotiationId);

    if (!neg) return null;

    neg.status = 'Aguardando Aprovação';
    neg.requiresOwnerApproval = true;
    neg.approvalReason = reason;
    neg.updatedAt = new Date().toISOString();

    await firestoreService.saveNegotiation(neg);
    return neg;
  }

  /**
   * Finalize a negotiation with status
   */
  public async finalizeNegotiation(
    negotiationId: string,
    status: NegotiationStatus
  ): Promise<FirestoreNegotiation | null> {
    const list = await firestoreService.getNegotiations();
    const neg = list.find((n) => n.id === negotiationId);

    if (!neg) return null;

    neg.status = status;
    neg.updatedAt = new Date().toISOString();

    await firestoreService.saveNegotiation(neg);
    return neg;
  }

  /**
   * Ensure pricing and discount rules exist in Firestore for a product
   */
  private async ensureRulesInFirestore(product: Product): Promise<void> {
    const pricingRule: FirestorePricingRule = {
      id: `prules-${product.id}`,
      productId: product.id,
      announcedPrice: product.listPrice,
      minPrice: product.minPrice,
      idealPrice: product.idealPrice,
      minMarginPercent: 15, // 15% standard minimum margin
      minQuantity: 1,
      maxQuantity: product.stockQty,
      createdAt: new Date().toISOString(),
    };

    const discountRule: FirestoreDiscountRule = {
      id: `drules-${product.id}`,
      productId: product.id,
      maxDiscountPercent: product.maxDiscountPercent,
      requiresApprovalAbovePercent: product.maxDiscountPercent,
      bulkDiscountThreshold: 10, // 10 units for bulk discount
      bulkDiscountPercent: Math.min(product.maxDiscountPercent, 5),
      createdAt: new Date().toISOString(),
    };

    await firestoreService.savePricingRule(pricingRule);
    await firestoreService.saveDiscountRule(discountRule);
  }
}

export const negotiationService = new NegotiationService();
