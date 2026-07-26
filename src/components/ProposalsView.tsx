import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  DollarSign,
  User,
  Calendar,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  Send,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Ban,
  Tag,
  Truck,
  ShieldAlert,
  MapPin,
  Store,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { Proposal, SystemSettings } from '../types';
import { ProposalModal } from './ProposalModal';
import { orderService, CounterProposalInput } from '../services/OrderService';
import { deliveryService } from '../services/DeliveryService';
import { productService } from '../services/ProductService';
import { firestoreService, FirestoreOrder, FirestoreApproval, OrderStatus } from '../services/FirestoreService';

interface ProposalsViewProps {
  proposals: Proposal[];
  setProposals: React.Dispatch<React.SetStateAction<Proposal[]>>;
  settings: SystemSettings;
  darkMode: boolean;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  setProposals,
  settings,
  darkMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [selectedProposalForModal, setSelectedProposalForModal] = useState<Proposal | null>(null);

  // Firestore Orders & Approvals State
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [approvals, setApprovals] = useState<FirestoreApproval[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Counter-Proposal Modal State
  const [counterModalApproval, setCounterModalApproval] = useState<FirestoreApproval | null>(null);
  const [counterUnitPrice, setCounterUnitPrice] = useState<number>(0);
  const [counterDiscountPercent, setCounterDiscountPercent] = useState<number>(0);
  const [counterFreightCost, setCounterFreightCost] = useState<number>(0);
  const [counterPaymentMethod, setCounterPaymentMethod] = useState<string>('PIX à Vista');
  const [counterNote, setCounterNote] = useState<string>('');

  const statuses: string[] = [
    'Todas',
    'Aguardando Aprovação',
    'Negociando',
    'Aprovado',
    'Confirmado pelo Cliente',
    'Finalizado',
    'Recusado',
    'Cancelado',
  ];

  const loadOrdersAndApprovals = async () => {
    setLoading(true);
    try {
      const fetchedOrders = await firestoreService.getOrders();
      const fetchedApprovals = await firestoreService.getApprovals();
      setOrders(fetchedOrders);
      setApprovals(fetchedApprovals);
    } catch (e) {
      console.error('Erro ao carregar pedidos e aprovações:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersAndApprovals();
  }, []);

  const handleApprove = async (approval: FirestoreApproval) => {
    await orderService.approveOrder(approval.orderId);
    await loadOrdersAndApprovals();
  };

  const handleRefuse = async (approval: FirestoreApproval) => {
    await orderService.refuseOrder(approval.orderId, 'Proprietário', 'Não aprovado pelo proprietário');
    await loadOrdersAndApprovals();
  };

  const handleOpenCounterModal = (approval: FirestoreApproval) => {
    setCounterModalApproval(approval);
    setCounterUnitPrice(approval.negotiatedUnitPrice);
    setCounterDiscountPercent(approval.discountPercent);
    setCounterFreightCost(approval.freightCost);
    setCounterPaymentMethod(approval.paymentMethod);
    setCounterNote('');
  };

  const handleSendCounterProposal = async () => {
    if (!counterModalApproval) return;

    const input: CounterProposalInput = {
      newUnitPrice: counterUnitPrice,
      newDiscountPercent: counterDiscountPercent,
      newFreightCost: counterFreightCost,
      newPaymentMethod: counterPaymentMethod,
      note: counterNote,
    };

    await orderService.createCounterProposal(counterModalApproval.orderId, input);
    setCounterModalApproval(null);
    await loadOrdersAndApprovals();
  };

  const handleConfirmOrder = async (orderId: string) => {
    await orderService.confirmOrder(orderId);
    await loadOrdersAndApprovals();
  };

  const handleFinalizeOrder = async (orderId: string) => {
    await orderService.finalizeOrder(orderId);
    await loadOrdersAndApprovals();
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Deseja realmente cancelar este pedido e liberar o estoque reservado?')) {
      await orderService.cancelOrder(orderId, 'Cancelado pelo proprietário no painel');
      await loadOrdersAndApprovals();
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    await orderService.confirmPayment(orderId, 'Proprietário');
    await loadOrdersAndApprovals();
  };

  const handleRefusePayment = async (orderId: string) => {
    const reason = prompt('Motivo da recusa do comprovante:', 'Comprovante não localizado ou valor incorreto');
    if (reason) {
      await orderService.refusePaymentProof(orderId, reason, 'Proprietário');
      await loadOrdersAndApprovals();
    }
  };

  const handleSimulateAttachProof = async (orderId: string) => {
    await orderService.attachPaymentProof(
      orderId,
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
      'media-receipt-simulated-101'
    );
    await loadOrdersAndApprovals();
  };

  const handleSetModality = async (orderId: string, modality: 'Retirada no local' | 'Entrega') => {
    await deliveryService.setModality(orderId, {
      modality,
      receiverName: 'João da Silva',
      receiverPhone: '+55 (65) 99876-1234',
      deliveryCity: 'Rondonópolis',
      deliveryState: 'MT',
      deliveryAddress: 'Rodovia MT-130, Km 42 - Fazenda Boa Esperança',
      deliveryReference: 'Próximo ao Silo Central',
      deliveryDate: '25/07/2026',
      freightCost: 150,
    });
    await loadOrdersAndApprovals();
  };

  const handleUpdateFulfillmentStatus = async (orderId: string, status: OrderStatus) => {
    await deliveryService.updateFulfillmentStatus(orderId, status, 'Proprietário');
    await loadOrdersAndApprovals();
  };

  const handleConfirmDeliveryAndFinalize = async (orderId: string) => {
    await deliveryService.confirmDelivery(orderId, 'Proprietário');
    await deliveryService.finalizeOrder(orderId, 'Proprietário');
    await loadOrdersAndApprovals();
  };

  const handleConfirmPickupAndFinalize = async (orderId: string) => {
    await deliveryService.confirmPickup(orderId, 'Proprietário');
    await deliveryService.finalizeOrder(orderId, 'Proprietário');
    await loadOrdersAndApprovals();
  };

  // Test Scenario 1: Delivery Flow
  const handleRunFullDeliveryScenario = async () => {
    const allProducts = await firestoreService.getProducts();
    const corn = allProducts.find((p) => p.name.toLowerCase().includes('milho')) || allProducts[0];
    
    const order = await orderService.createOrder({
      customer: {
        id: 'cust-sim-delivery',
        name: 'Carlos Eduardo (Produtor MT)',
        phone: '+55 (65) 99876-0001',
        email: 'carlos@fazenda.com.br',
        city: 'Rondonópolis',
        state: 'MT',
        interestedProducts: [corn.id],
        status: 'Em Negociação',
        leadTemperature: 'Quente',
        notes: 'Fazenda Boa Vista',
        totalSpent: 0,
        frequentBuyer: false,
        lastInteraction: new Date().toISOString(),
        messages: [],
        createdAt: new Date().toISOString(),
      },
      product: corn,
      quantity: 100,
      unitPrice: corn.minPrice || corn.listPrice,
      paymentMethod: 'PIX à vista',
      freightType: 'CIF',
      deliveryCity: 'Rondonópolis',
      deliveryAddress: 'Rodovia MT-130, Km 42 - Fazenda Boa Vista',
    });

    await orderService.confirmOrder(order.id);
    await orderService.confirmPayment(order.id, 'Proprietário (Teste Auto)');

    await deliveryService.setModality(order.id, {
      modality: 'Entrega',
      receiverName: 'Carlos Eduardo',
      receiverPhone: '+55 (65) 99876-0001',
      deliveryCity: 'Rondonópolis',
      deliveryState: 'MT',
      deliveryAddress: 'Rodovia MT-130, Km 42 - Fazenda Boa Vista',
      deliveryReference: 'Ao lado do Armazém 3',
      deliveryDate: '24/07/2026',
      freightCost: 180,
    });

    await deliveryService.updateFulfillmentStatus(order.id, 'Aguardando Preparação');
    await deliveryService.updateFulfillmentStatus(order.id, 'Saiu para Entrega');
    await deliveryService.confirmDelivery(order.id, 'Proprietário');
    await deliveryService.finalizeOrder(order.id, 'Proprietário');

    await loadOrdersAndApprovals();
    alert('✅ Teste de Entrega Completo Executado com Sucesso!\n\nCliente compra 100 sacas de milho -> Pedido confirmado -> Pagamento confirmado -> Cliente escolhe entrega -> Endereço confirmado -> Frete validado -> Pedido preparado -> Saiu para entrega -> Entrega confirmada -> Pedido finalizado.');
  };

  // Test Scenario 2: Pickup Flow
  const handleRunFullPickupScenario = async () => {
    const allProducts = await firestoreService.getProducts();
    const product = allProducts[0];

    const order = await orderService.createOrder({
      customer: {
        id: 'cust-sim-pickup',
        name: 'Roberto Mendes (Retirada)',
        phone: '+55 (65) 99876-0002',
        email: 'roberto@agromt.com.br',
        city: 'Cuiabá',
        state: 'MT',
        interestedProducts: [product.id],
        status: 'Em Negociação',
        leadTemperature: 'Morno',
        notes: 'Cliente para retirada no depósito',
        totalSpent: 0,
        frequentBuyer: false,
        lastInteraction: new Date().toISOString(),
        messages: [],
        createdAt: new Date().toISOString(),
      },
      product,
      quantity: 50,
      unitPrice: product.listPrice,
      paymentMethod: 'PIX à vista',
      freightType: 'FOB',
    });

    await orderService.confirmOrder(order.id);
    await orderService.confirmPayment(order.id, 'Proprietário (Teste Auto)');

    await deliveryService.setModality(order.id, {
      modality: 'Retirada no local',
      pickupAddress: product.pickupAddress || 'Av. das Indústrias, 1500 - Distrito Industrial, Cuiabá - MT',
      pickupDate: '23/07/2026',
      pickupTime: '09:00 às 16:00',
      pickupResponsible: 'Sérgio (Encarregado Depósito)',
      pickupInstructions: 'Apresentar documento e nota de autorização na balança.',
    });

    await deliveryService.updateFulfillmentStatus(order.id, 'Aguardando Preparação');
    await deliveryService.updateFulfillmentStatus(order.id, 'Pronto para Retirada');
    await deliveryService.confirmPickup(order.id, 'Proprietário');
    await deliveryService.finalizeOrder(order.id, 'Proprietário');

    await loadOrdersAndApprovals();
    alert('✅ Teste de Retirada Completo Executado com Sucesso!\n\nCliente compra -> Escolhe retirada -> ÁGUIA informa local e horário cadastrados -> Retirada confirmada -> Pedido finalizado.');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const pendingApprovals = approvals.filter((a) => a.status === 'Aguardando Aprovação');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Todas' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <PackageCheck className="h-3.5 w-3.5" />
              Gestão de Pedidos e Aprovação Inteligente
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Pedidos & Central de Aprovações
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Acompanhe a conversão automática do ÁGUIA e autorize solicitações fora da alçada configurada.
          </p>
        </div>

        <button
          onClick={loadOrdersAndApprovals}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Lista
        </button>
      </div>

      {/* SECTION 1: SOLICITAÇÕES DE APROVAÇÃO PENDENTES ("APROVAÇÃO NECESSÁRIA") */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-amber-500/30 pb-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse" />
            <h3 className="text-base font-extrabold text-amber-500">
              SOLICITAÇÕES DE APROVAÇÃO PENDENTES ({pendingApprovals.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {pendingApprovals.map((appr) => (
              <div
                key={appr.id}
                className={`p-6 rounded-2xl border-2 transition-all shadow-lg ${
                  darkMode
                    ? 'bg-[#181512] border-amber-500/40 text-gray-100'
                    : 'bg-amber-50/50 border-amber-300 text-slate-900'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-amber-500/20 gap-3">
                  <div>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-block mb-1">
                      APROVAÇÃO NECESSÁRIA
                    </span>
                    <h4 className="text-lg font-bold">
                      Cliente: {appr.customerName} ({appr.customerPhone})
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">MOTIVO DO ACIONAMENTO</span>
                    <span className="text-xs font-semibold text-amber-400">
                      {appr.approvalReason}
                    </span>
                  </div>
                </div>

                {/* Details Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 py-4 border-b border-amber-500/10 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Produto</span>
                    <span className="font-bold text-slate-200">{appr.productName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Quantidade</span>
                    <span className="font-bold text-slate-200">{appr.quantity} {appr.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Preço Tabela</span>
                    <span className="font-bold text-slate-400 line-through">
                      {formatCurrency(appr.originalPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Preço Negociado</span>
                    <span className="font-extrabold text-amber-400">
                      {formatCurrency(appr.negotiatedUnitPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Desconto</span>
                    <span className="font-bold text-emerald-400">{appr.discountPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Frete</span>
                    <span className="font-bold text-slate-200">{formatCurrency(appr.freightCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Pagamento</span>
                    <span className="font-bold text-slate-200">{appr.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">VALOR TOTAL</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {formatCurrency(appr.totalValue)}
                    </span>
                  </div>
                </div>

                {/* 3 Action Buttons */}
                <div className="pt-4 flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={() => handleApprove(appr)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    [ APROVAR ]
                  </button>

                  <button
                    onClick={() => handleRefuse(appr)}
                    className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    [ RECUSAR ]
                  </button>

                  <button
                    onClick={() => handleOpenCounterModal(appr)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Send className="h-4 w-4" />
                    [ FAZER CONTRAPROPOSTA ]
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: GESTÃO DE PEDIDOS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nº do pedido, cliente ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                darkMode
                  ? 'bg-[#181B24] border-[#2A2F3D] text-gray-200 focus:border-emerald-500'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
              }`}
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-emerald-500 text-white font-bold'
                    : darkMode
                    ? 'bg-[#181B24] text-slate-400 border border-[#2A2F3D] hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table / Cards */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/30">
          <div>
            <h3 className="font-bold text-xs text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Simulação & Testes Rápidos dos Fluxos de Entrega, Retirada e Finalização
            </h3>
            <p className="text-[11px] text-slate-400">
              Execute cenários completos automatizados conforme especificação técnica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFullDeliveryScenario}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Truck className="h-3.5 w-3.5" />
              🧪 Testar Fluxo de Entrega Completo
            </button>
            <button
              onClick={handleRunFullPickupScenario}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <Store className="h-3.5 w-3.5" />
              🧪 Testar Fluxo de Retirada Completo
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
            }`}
          >
            <PackageCheck className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">Nenhum pedido encontrado</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Os pedidos negociados pelo ÁGUIA aparecerão automaticamente nesta lista.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((ord) => {
              return (
                <div
                  key={ord.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all hover:border-emerald-500/40 shadow-sm ${
                    darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202533]">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-emerald-500">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'Confirmado pelo Cliente' || ord.status === 'Finalizado'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : ord.status === 'Aprovado'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : ord.status === 'Aguardando Aprovação'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : ord.status === 'Recusado' || ord.status === 'Cancelado'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    {/* Customer & Location */}
                    <div className="mt-3 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {ord.customerName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {ord.deliveryCity} • Tel: {ord.customerPhone}
                      </p>
                    </div>

                    {/* Item Details */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#181B24] border border-slate-200 dark:border-[#2A2F3D] space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {ord.productName}
                        </span>
                        <span className="font-extrabold text-emerald-500">
                          {formatCurrency(ord.totalValue)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {ord.quantity} {ord.unit} x {formatCurrency(ord.unitPrice)} | Frete: {formatCurrency(ord.freightCost)} ({ord.freightType})
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Forma de Pagamento: {ord.paymentMethod}
                      </p>
                    </div>

                    {/* Payment Status Box */}
                    <div className="mt-3 p-3 rounded-xl border bg-slate-900/60 border-[#2A2F3D] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Status Financeiro:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.paymentStatus === 'Pagamento Confirmado'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : ord.paymentStatus === 'Comprovante Recebido' || ord.paymentStatus === 'Aguardando Conferência'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              : ord.paymentStatus === 'Pagamento Recusado'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {ord.paymentStatus || 'Aguardando Pagamento'}
                        </span>
                      </div>

                      {ord.paymentProofUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <img
                            src={ord.paymentProofUrl}
                            alt="Comprovante"
                            className="h-10 w-10 object-cover rounded-lg border border-slate-700"
                          />
                          <div className="text-[10px] text-slate-300">
                            <span className="font-bold text-amber-400 block">Comprovante de Pagamento Anexado</span>
                            <a
                              href={ord.paymentProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 underline"
                            >
                              Ver Comprovante em Alta Resolução
                            </a>
                          </div>
                        </div>
                      )}

                      {ord.paymentConfirmedBy && (
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          Conferido por: {ord.paymentConfirmedBy} em{' '}
                          {ord.paymentConfirmedAt ? new Date(ord.paymentConfirmedAt).toLocaleString('pt-BR') : ''}
                        </p>
                      )}

                      {ord.paymentRefusedReason && (
                        <p className="text-[10px] text-red-400 font-semibold">
                          Motivo Recusa: {ord.paymentRefusedReason}
                        </p>
                      )}

                      {/* Payment Owner Action Buttons */}
                      {ord.paymentStatus !== 'Pagamento Confirmado' && ord.status !== 'Cancelado' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleConfirmPayment(ord.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            CONFIRMAR PAGAMENTO
                          </button>

                          {ord.paymentStatus === 'Comprovante Recebido' && (
                            <button
                              onClick={() => handleRefusePayment(ord.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold text-[10px] transition-colors flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              RECUSAR COMPROVANTE
                            </button>
                          )}

                          {!ord.paymentProofUrl && (
                            <button
                              onClick={() => handleSimulateAttachProof(ord.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] transition-colors"
                              title="Simular recebimento de comprovante via WhatsApp"
                            >
                              + Anexar Comprovante Teste
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Fulfillment Box (Entrega & Retirada) */}
                    <div className="mt-3 p-3 rounded-xl border bg-slate-900/80 border-[#2A2F3D] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          {ord.modality === 'Retirada no local' ? (
                            <Store className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <Truck className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          Modalidade: {ord.modality || 'Entrega'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSetModality(ord.id, 'Entrega')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                              (!ord.modality || ord.modality === 'Entrega')
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Entrega
                          </button>
                          <button
                            onClick={() => handleSetModality(ord.id, 'Retirada no local')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                              ord.modality === 'Retirada no local'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Retirada
                          </button>
                        </div>
                      </div>

                      {/* Details Display */}
                      {ord.modality === 'Retirada no local' ? (
                        <div className="text-[10px] text-slate-300 space-y-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
                          <p><strong className="text-blue-400">Local Cadastrado:</strong> {ord.pickupAddress || 'Depósito Principal'}</p>
                          <p><strong className="text-slate-400">Data & Horário:</strong> {ord.pickupDate || 'A combinar'} • {ord.pickupTime || '08:00 às 17:00'}</p>
                          <p><strong className="text-slate-400">Responsável:</strong> {ord.pickupResponsible || 'Equipe de Expedição'}</p>
                          {ord.pickupInstructions && (
                            <p className="text-slate-400 text-[9px] italic">Orientações: {ord.pickupInstructions}</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-300 space-y-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
                          <p><strong className="text-emerald-400">Endereço de Entrega:</strong> {ord.deliveryAddress}, {ord.deliveryCity} - {ord.deliveryState || 'MT'}</p>
                          <p><strong className="text-slate-400">Recebedor:</strong> {ord.receiverName || ord.customerName} ({ord.receiverPhone || ord.customerPhone})</p>
                          <p><strong className="text-slate-400">Frete:</strong> {ord.freightStatus === 'FRETE AGUARDANDO APROVAÇÃO' ? (
                            <span className="text-amber-400 font-bold">FRETE AGUARDANDO APROVAÇÃO</span>
                          ) : (
                            <span>{formatCurrency(ord.freightCost)} ({ord.freightType})</span>
                          )}</p>
                        </div>
                      )}

                      {/* Fulfillment Step Buttons */}
                      {ord.status !== 'Finalizado' && ord.status !== 'Cancelado' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleUpdateFulfillmentStatus(ord.id, 'Aguardando Preparação')}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] transition-colors"
                          >
                            Aguardando Preparação
                          </button>

                          {ord.modality === 'Retirada no local' ? (
                            <>
                              <button
                                onClick={() => handleUpdateFulfillmentStatus(ord.id, 'Pronto para Retirada')}
                                className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 font-semibold text-[10px] transition-colors"
                              >
                                Pronto p/ Retirada
                              </button>
                              <button
                                onClick={() => handleConfirmPickupAndFinalize(ord.id)}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] transition-colors flex items-center gap-1 shadow"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                CONFIRMAR RETIRADA & FINALIZAR
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateFulfillmentStatus(ord.id, 'Saiu para Entrega')}
                                className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 font-semibold text-[10px] transition-colors"
                              >
                                Saiu p/ Entrega
                              </button>
                              <button
                                onClick={() => handleConfirmDeliveryAndFinalize(ord.id)}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] transition-colors flex items-center gap-1 shadow"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                CONFIRMAR ENTREGA & FINALIZAR
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {ord.completedAt && (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold space-y-0.5">
                          <p className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            PEDIDO FINALIZADO
                          </p>
                          <p className="text-[9px] text-slate-300">Concluído em {new Date(ord.completedAt).toLocaleString('pt-BR')} por {ord.completedBy || 'Proprietário'} via {ord.completionModality || ord.modality}</p>
                        </div>
                      )}
                    </div>

                    {ord.reservedStock > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Estoque Reservado: {ord.reservedStock} {ord.unit}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1F2430] flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      Subtotal: {formatCurrency(ord.subtotal)}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {ord.status === 'Aprovado' && (
                        <button
                          onClick={() => handleConfirmOrder(ord.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors"
                        >
                          Confirmar Venda
                        </button>
                      )}

                      {ord.status === 'Confirmado pelo Cliente' && (
                        <button
                          onClick={() => handleFinalizeOrder(ord.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors"
                        >
                          Finalizar
                        </button>
                      )}

                      {ord.status !== 'Finalizado' && ord.status !== 'Cancelado' && (
                        <button
                          onClick={() => handleCancelOrder(ord.id)}
                          className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold transition-colors"
                          title="Cancelar Pedido"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTRAPROPOSTA MODAL */}
      {counterModalApproval && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
              darkMode ? 'bg-[#12151E] border-[#2A2F3D] text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-[#202533]">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                Elaborar Contraproposta do Proprietário
              </h3>
              <button
                onClick={() => setCounterModalApproval(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Cliente: <span className="font-bold text-slate-200">{counterModalApproval.customerName}</span> | Produto:{' '}
              <span className="font-bold text-slate-200">{counterModalApproval.productName}</span> ({counterModalApproval.quantity} {counterModalApproval.unit})
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Novo Preço Unitário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={counterUnitPrice}
                  onChange={(e) => setCounterUnitPrice(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Novo Desconto (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={counterDiscountPercent}
                    onChange={(e) => setCounterDiscountPercent(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Novo Valor de Frete (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={counterFreightCost}
                    onChange={(e) => setCounterFreightCost(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nova Condição de Pagamento
                </label>
                <input
                  type="text"
                  value={counterPaymentMethod}
                  onChange={(e) => setCounterPaymentMethod(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Observações para o ÁGUIA apresentar ao cliente
                </label>
                <textarea
                  rows={2}
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  placeholder="Ex: 'Preço válido somente para pagamento em PIX com faturamento nesta semana.'"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-[#202533]">
              <button
                onClick={() => setCounterModalApproval(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendCounterProposal}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Enviar Contraproposta ao Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
