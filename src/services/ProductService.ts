import { Product, ProductCategory, ProductStatus } from '../types';
import {
  firestoreService,
  FirestoreCategory,
  FirestoreInventoryRecord,
  FirestoreProductMedia,
} from './FirestoreService';

export interface ProductSearchParams {
  query?: string;
  category?: ProductCategory | string;
  codeOrId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  stockQty: number;
  minStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

class ProductService {
  private aiKnowledgeCache: Map<string, string> = new Map();

  /**
   * Search / Query products with rapid filtering by Name, Category, Code, City, Price, Availability
   */
  public async searchProducts(params: ProductSearchParams = {}): Promise<Product[]> {
    const products = await firestoreService.getProducts();

    return products.filter((p) => {
      // Filter active / available
      if (params.onlyAvailable && (!p.active || p.stockQty <= 0 || p.status === 'Sem estoque' || p.status === 'Pausado')) {
        return false;
      }

      // Filter query text (Name, Brand, Model, Description)
      if (params.query && params.query.trim().length > 0) {
        const q = params.query.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchModel = (p.model || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchCode = p.id.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchModel && !matchDesc && !matchCode) {
          return false;
        }
      }

      // Filter by Code / ID
      if (params.codeOrId && !p.id.toLowerCase().includes(params.codeOrId.toLowerCase())) {
        return false;
      }

      // Filter by Category
      if (params.category && params.category !== 'Todas' && p.category !== params.category) {
        return false;
      }

      // Filter by City
      if (params.city && !p.city.toLowerCase().includes(params.city.toLowerCase())) {
        return false;
      }

      // Filter by Price range
      if (params.minPrice !== undefined && p.listPrice < params.minPrice) {
        return false;
      }
      if (params.maxPrice !== undefined && p.listPrice > params.maxPrice) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get single product by ID
   */
  public async getProductById(productId: string): Promise<Product | null> {
    const products = await firestoreService.getProducts();
    return products.find((p) => p.id === productId) || null;
  }

  /**
   * Cadastrar Produto (Owner Only)
   */
  public async createProduct(
    productData: Omit<Product, 'id' | 'createdAt'>,
    isOwner: boolean = true
  ): Promise<Product> {
    if (!isOwner) {
      throw new Error('Apenas o proprietário tem permissão para cadastrar produtos.');
    }

    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newProduct: Product = {
      ...productData,
      id,
      active: productData.active ?? true,
      status: productData.stockQty <= 0 ? 'Sem estoque' : productData.status || 'Ativo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to Firestore products collection
    await firestoreService.saveProduct(newProduct);

    // 2. Sync category counts in Firestore categories collection
    await this.updateCategoryRecord(newProduct.category);

    // 3. Save initial inventory record in Firestore inventory collection
    await this.syncInventoryRecord(newProduct, 'ENTRADA', newProduct.stockQty);

    // 4. Save photos/videos in Firestore product_media collection
    await this.syncProductMedia(newProduct);

    // 5. Automatically sync with Gemini AI Knowledge Base & Cache
    await this.syncProductWithAI(newProduct);

    return newProduct;
  }

  /**
   * Editar Produto (Owner Only)
   */
  public async updateProduct(
    productId: string,
    updatedFields: Partial<Product>,
    isOwner: boolean = true
  ): Promise<Product> {
    if (!isOwner) {
      throw new Error('Apenas o proprietário tem permissão para editar produtos.');
    }

    const existing = await this.getProductById(productId);
    if (!existing) {
      throw new Error(`Produto #${productId} não encontrado.`);
    }

    const updatedProduct: Product = {
      ...existing,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    // Auto-update status if stock changed
    if (updatedProduct.stockQty <= 0) {
      updatedProduct.status = 'Sem estoque';
    } else if (existing.stockQty <= 0 && updatedProduct.stockQty > 0) {
      updatedProduct.status = 'Ativo';
    }

    // 1. Save to Firestore
    await firestoreService.saveProduct(updatedProduct);

    // 2. Sync inventory record
    if (updatedFields.stockQty !== undefined && updatedFields.stockQty !== existing.stockQty) {
      const diff = updatedFields.stockQty - existing.stockQty;
      await this.syncInventoryRecord(
        updatedProduct,
        diff >= 0 ? 'ENTRADA' : 'SAIDA_VENDA',
        Math.abs(diff)
      );
    }

    // 3. Sync media
    if (updatedFields.photos || updatedFields.videos) {
      await this.syncProductMedia(updatedProduct);
    }

    // 4. Update Gemini AI Knowledge Base & Cache
    await this.syncProductWithAI(updatedProduct);

    return updatedProduct;
  }

  /**
   * Excluir Produto (Owner Only)
   */
  public async deleteProduct(productId: string, isOwner: boolean = true): Promise<boolean> {
    if (!isOwner) {
      throw new Error('Apenas o proprietário tem permissão para excluir produtos.');
    }

    const existing = await this.getProductById(productId);
    if (!existing) return false;

    await firestoreService.deleteProduct(productId);
    this.aiKnowledgeCache.delete(productId);
    return true;
  }

  /**
   * Atualizar Estoque Automático (Sales or Returns)
   * Prevents sales without stock and alerts low stock.
   */
  public async updateStockOnSale(
    productId: string,
    quantitySold: number
  ): Promise<{ success: boolean; newStock: number; alert?: InventoryAlert }> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error(`Produto #${productId} não encontrado.`);
    }

    if (product.stockQty < quantitySold) {
      throw new Error(
        `Estoque insuficiente para ${product.name}. Solicitado: ${quantitySold} ${product.unit}, Disponível: ${product.stockQty} ${product.unit}.`
      );
    }

    const newStock = product.stockQty - quantitySold;
    const newStatus: ProductStatus = newStock === 0 ? 'Sem estoque' : product.status || 'Ativo';

    await this.updateProduct(productId, { stockQty: newStock, status: newStatus }, true);

    const minThreshold = product.minStockThreshold || 10;
    const alert: InventoryAlert = {
      productId,
      productName: product.name,
      stockQty: newStock,
      minStockThreshold: minThreshold,
      isLowStock: newStock > 0 && newStock <= minThreshold,
      isOutOfStock: newStock === 0,
    };

    return { success: true, newStock, alert };
  }

  /**
   * Get Stock Alerts across catalog
   */
  public async getInventoryAlerts(): Promise<InventoryAlert[]> {
    const products = await firestoreService.getProducts();
    const alerts: InventoryAlert[] = [];

    for (const p of products) {
      const minThreshold = p.minStockThreshold || 10;
      if (p.stockQty <= minThreshold) {
        alerts.push({
          productId: p.id,
          productName: p.name,
          stockQty: p.stockQty,
          minStockThreshold: minThreshold,
          isLowStock: p.stockQty > 0 && p.stockQty <= minThreshold,
          isOutOfStock: p.stockQty === 0,
        });
      }
    }

    return alerts;
  }

  /**
   * Sync product with Gemini AI Memory / Context Base & Cache
   */
  public async syncProductWithAI(product: Product): Promise<string> {
    const aiContext = `
==================================================
FICHA TÉCNICA E REGRAS DO PRODUTO PARA O GEMINI
==================================================
ID do Produto: ${product.id}
Nome Comercial: ${product.name}
Categoria: ${product.category}
Marca: ${product.brand || 'N/I'} | Modelo: ${product.model || 'N/I'}
Descrição Resumida: ${product.shortDescription || product.name}
Descrição Completa: ${product.description}

DISPONIBILIDADE E ESTOQUE EM TEMPO REAL:
• Quantidade em Estoque: ${product.stockQty} ${product.unit}
• Status Atual: ${product.status || (product.stockQty > 0 ? 'Ativo' : 'Sem estoque')}
• Endereço de Retirada: ${product.pickupAddress || `${product.city} - ${product.state}`}

PREÇOS E MARGENS PARA NEGOCIAÇÃO:
• Preço Anunciado (Tabela): R$ ${product.listPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ${product.unit}
• Preço Mínimo Autorizado (Limite Absoluto): R$ ${product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ${product.unit}
• Preço Ideal Meta: R$ ${product.idealPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ${product.unit}
• Desconto Máximo Direto: ${product.maxDiscountPercent}%

ENTREGA, FRETE E GARANTIA:
• Entrega Disponível: ${product.deliveryAvailable ? `Sim (Raio de ${product.deliveryRadiusKm || 100} km)` : 'Retirada na Unidade'}
• Modalidade de Frete: ${product.freightType} ${product.freightDetails ? `(${product.freightDetails})` : ''}
• Tempo Estimado de Entrega: ${product.deliveryTime || '2 a 5 dias úteis após confirmação'}
• Garantia do Produto: ${product.guaranteeDetails}
• Condições de Pagamento Permitidas: ${product.paymentTerms ? product.paymentTerms.join(', ') : 'PIX à Vista, Boleto Safra'}
• Observações Adicionais: ${product.notes || 'Nenhuma'}
==================================================
`;

    this.aiKnowledgeCache.set(product.id, aiContext);
    return aiContext;
  }

  /**
   * Get compiled AI knowledge context for all active products
   */
  public async getCompiledAIKnowledgeBase(): Promise<string> {
    const products = await firestoreService.getProducts();
    const activeProducts = products.filter((p) => p.active);

    const contexts = await Promise.all(
      activeProducts.map((p) => this.syncProductWithAI(p))
    );

    return contexts.join('\n\n');
  }

  // --- Private Helper Methods ---

  private async updateCategoryRecord(categoryName: ProductCategory): Promise<void> {
    const categories = await firestoreService.getCategories();
    const products = await firestoreService.getProducts();
    const count = products.filter((p) => p.category === categoryName).length;

    const existingCat = categories.find((c) => c.name === categoryName);
    const catRecord: FirestoreCategory = {
      id: existingCat?.id || `cat-${Date.now()}`,
      name: categoryName,
      productCount: count,
      active: true,
      createdAt: existingCat?.createdAt || new Date().toISOString(),
    };

    await firestoreService.saveCategory(catRecord);
  }

  private async syncInventoryRecord(
    product: Product,
    movementType: 'ENTRADA' | 'SAIDA_VENDA' | 'AJUSTE_MANUAL',
    movementQty: number
  ): Promise<void> {
    const minThreshold = product.minStockThreshold || 10;
    const status =
      product.stockQty === 0
        ? 'Sem Estoque'
        : product.stockQty <= minThreshold
        ? 'Estoque Baixo'
        : 'Em Estoque';

    const invRecord: FirestoreInventoryRecord = {
      id: `inv-${product.id}`,
      productId: product.id,
      productName: product.name,
      stockQty: product.stockQty,
      minStockThreshold: minThreshold,
      status,
      lastMovementType: movementType,
      lastMovementQty: movementQty,
      updatedAt: new Date().toISOString(),
    };

    await firestoreService.saveInventoryRecord(invRecord);
  }

  private async syncProductMedia(product: Product): Promise<void> {
    if (product.photos) {
      for (let i = 0; i < product.photos.length; i++) {
        const photoUrl = product.photos[i];
        const mediaRecord: FirestoreProductMedia = {
          id: `media-img-${product.id}-${i}`,
          productId: product.id,
          type: 'image',
          url: photoUrl,
          isPrimary: i === 0,
          createdAt: new Date().toISOString(),
        };
        await firestoreService.addProductMedia(mediaRecord);
      }
    }

    if (product.videos) {
      for (let i = 0; i < product.videos.length; i++) {
        const videoUrl = product.videos[i];
        const mediaRecord: FirestoreProductMedia = {
          id: `media-vid-${product.id}-${i}`,
          productId: product.id,
          type: 'video',
          url: videoUrl,
          isPrimary: false,
          createdAt: new Date().toISOString(),
        };
        await firestoreService.addProductMedia(mediaRecord);
      }
    }
  }
}

export const productService = new ProductService();
