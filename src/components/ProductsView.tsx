import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  MapPin,
  Truck,
  ShieldCheck,
  Tag,
  DollarSign,
  Video,
  X,
  FileText,
} from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface ProductsViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  darkMode: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  setProducts,
  darkMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Grãos e Sementes',
    photos: [
      'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600',
    ],
    videos: [],
    description: '',
    stockQty: 100,
    unit: 'saca 60kg',
    listPrice: 100,
    minPrice: 90,
    idealPrice: 95,
    maxDiscountPercent: 10,
    city: 'Rondonópolis',
    state: 'MT',
    freightType: 'CIF',
    freightDetails: 'Frete grátis para entregas na região',
    paymentTerms: ['À vista no PIX', 'Boleto Safra 30/60/90'],
    guaranteeDetails: 'Garantia oficial do fabricante e laudo técnico',
    notes: '',
    active: true,
  });

  const categories: string[] = [
    'Todas',
    'Grãos e Sementes',
    'Maquinários e Veículos',
    'Fertilizantes e Químicos',
    'Pecuária e Animais',
    'Peças e Equipamentos',
    'Irrigação e Outros',
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Grãos e Sementes',
      photos: [
        'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600',
      ],
      videos: [],
      description: '',
      stockQty: 100,
      unit: 'saca 60kg',
      listPrice: 100,
      minPrice: 90,
      idealPrice: 95,
      maxDiscountPercent: 10,
      city: 'Rondonópolis',
      state: 'MT',
      freightType: 'CIF',
      freightDetails: 'Frete grátis acima de 50 sacas',
      paymentTerms: ['À vista no PIX', 'Boleto Safra'],
      guaranteeDetails: 'Laudo técnico oficial de germinação/procedência',
      notes: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.listPrice || !formData.minPrice) return;

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? ({ ...p, ...formData } as Product)
            : p
        )
      );
    } else {
      const newProd: Product = {
        ...(formData as Product),
        id: `prod-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => [newProd, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto do catálogo da IA?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Treinamento Automático Ativo
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Catálogo de Produtos & Regras de Preço
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            A IA do Águia estuda automaticamente os produtos cadastrados aqui. O Preço Mínimo é o limite absoluto para aceitação de propostas.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Novo Produto Agro</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, descrição, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
              darkMode
                ? 'bg-[#181B24] border-[#2A2F3D] text-gray-200 focus:border-emerald-500'
                : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white font-bold'
                  : darkMode
                  ? 'bg-[#181B24] text-slate-400 border border-[#2A2F3D] hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => {
          return (
            <div
              key={p.id}
              className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all hover:border-emerald-500/40 shadow-sm ${
                darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
              }`}
            >
              {/* Product Card Image & Header */}
              <div>
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  <img
                    src={p.photos[0] || 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600'}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />

                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                      {p.category}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-colors"
                      title="Editar Produto"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {p.name}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {p.city}/{p.state}
                    </span>
                    <span className="font-bold text-emerald-500">
                      Estoque: {p.stockQty} {p.unit}
                    </span>
                  </div>

                  {/* Price Box Matrix */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181B24] border border-slate-200 dark:border-[#2A2F3D] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Preço Anunciado:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.listPrice)} / {p.unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-[#2A2F3D]">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Preço Mínimo IA:
                      </span>
                      <span className="font-black text-emerald-500 text-sm">
                        {formatCurrency(p.minPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Terms tags */}
                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                      Frete: {p.freightType}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                      Pagto: {p.paymentTerms[0] || 'A combinar'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer AI Status */}
              <div className="p-3 border-t border-slate-100 dark:border-[#1F2430] bg-slate-50/50 dark:bg-[#151924] flex items-center justify-between text-[10px]">
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Mapeado pela IA do Vendedor
                </span>
                <span className="text-slate-400">
                  Desc. Máx: {p.maxDiscountPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl p-6 border shadow-2xl space-y-5 my-8 ${
              darkMode
                ? 'bg-[#12151E] border-[#252C3D] text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#252C3D]">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                {editingProduct ? 'Editar Produto e Limite IA' : 'Cadastrar Produto para Treinamento da IA'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Semente de Soja Intacta 60kg"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Categoria *</label>
                  <select
                    value={formData.category || 'Grãos e Sementes'}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ProductCategory })
                    }
                    className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none focus:border-emerald-500"
                  >
                    <option value="Grãos e Sementes">Grãos e Sementes</option>
                    <option value="Maquinários e Veículos">Maquinários e Veículos</option>
                    <option value="Fertilizantes e Químicos">Fertilizantes e Químicos</option>
                    <option value="Pecuária e Animais">Pecuária e Animais</option>
                    <option value="Peças e Equipamentos">Peças e Equipamentos</option>
                    <option value="Irrigação e Outros">Irrigação e Outros</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold mb-1">Descrição Técnica para a IA *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Especifique características, laudos, taxa de germinação, safra, etc..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                />
              </div>

              {/* Stock and Unit */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Quantidade em Estoque</label>
                  <input
                    type="number"
                    value={formData.stockQty || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, stockQty: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Unidade de Medida</label>
                  <input
                    type="text"
                    placeholder="Ex: saca 60kg, tonelada, cabeça, unidade"
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Desconto Máximo (%)</label>
                  <input
                    type="number"
                    placeholder="Ex: 8"
                    value={formData.maxDiscountPercent || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscountPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Prices Section (Crucial for AI rules!) */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <h4 className="font-extrabold text-xs text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  REGRAS DE PREÇO E LIMITES DA IA
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-300">Preço Anunciado (Tabela) R$ *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.listPrice || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, listPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-emerald-400">Preço Mínimo (Piso IA) R$ *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.minPrice || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, minPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-emerald-500/50 outline-none focus:border-emerald-400 font-extrabold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-300">Preço Ideal R$</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.idealPrice || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, idealPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location and Freight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Estado</label>
                  <input
                    type="text"
                    placeholder="MT, GO, RS..."
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Tipo de Frete</label>
                  <select
                    value={formData.freightType || 'CIF'}
                    onChange={(e) =>
                      setFormData({ ...formData, freightType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none focus:border-emerald-500"
                  >
                    <option value="CIF">CIF (Frete Incluso)</option>
                    <option value="FOB">FOB (Retirada por conta do comprador)</option>
                    <option value="A combinar">A combinar</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#252C3D] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-800/20"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Salvar e Atualizar Conhecimento da IA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
