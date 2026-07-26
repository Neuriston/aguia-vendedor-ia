import React, { useState } from 'react';
import {
  Clock,
  Send,
  Sparkles,
  UserCheck,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Bot,
  Zap,
  TrendingUp,
  FileCheck,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Customer, Product, Proposal, FollowUpTriggerType, OwnerNotification } from '../types';

interface FollowUpViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  products: Product[];
  proposals: Proposal[];
  setNotifications: React.Dispatch<React.SetStateAction<OwnerNotification[]>>;
  darkMode: boolean;
  onNavigateToSimulator?: (customerId: string) => void;
}

export const FollowUpView: React.FC<FollowUpViewProps> = ({
  customers,
  setCustomers,
  products,
  proposals,
  setNotifications,
  darkMode,
  onNavigateToSimulator,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FollowUpTriggerType | 'Todos'>('Todos');
  const [executingFollowUpId, setExecutingFollowUpId] = useState<string | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<{ customerId: string; text: string } | null>(null);

  // Group customers into follow-up categories based on status and dates
  const customersNeedingFollowUp = customers.map((c) => {
    let triggerType: FollowUpTriggerType = 'AguardandoResposta';
    let urgencyScore = 1;
    let suggestedMessage = '';

    if (c.status === 'Proposta Enviada') {
      triggerType = 'OrcamentoPendente';
      urgencyScore = 3;
      suggestedMessage = `Olá ${c.name}, tudo bem? Aqui é o consultor comercial da Águia Agro. Passei para saber se conseguiu analisar a proposta comercial que enviamos para a sua propriedade. Ficou com alguma dúvida sobre o frete ou prazos de pagamento?`;
    } else if (c.frequentBuyer && c.lastBuyDate) {
      triggerType = 'RecompraRecorrente';
      urgencyScore = 2;
      suggestedMessage = `Olá ${c.name}! Como estão os trabalhos na ${c.farmName || 'propriedade'}? Vi em nosso sistema que está chegando a época de planejamento de insumos. Estamos com lotes especiais de sementes e fertilizantes com preço travado de início de safra. Vamos garantir a sua cota?`;
    } else if (c.status === 'Em Negociação') {
      triggerType = 'AguardandoResposta';
      urgencyScore = 2;
      suggestedMessage = `Olá ${c.name}, bom dia! Gostaria de saber se tem alguma dúvida sobre a especificação e laudos técnicos do produto que estávamos conversando? Conseguimos segurar a condição comercial para o senhor até amanhã.`;
    } else {
      triggerType = 'ClienteSumido';
      urgencyScore = 1;
      suggestedMessage = `Olá ${c.name}, tudo bem? Aqui é o consultor da Águia Agro. Não tivemos mais retorno da sua consulta recente. Gostaria de saber se ainda tem interesse em negociar esse lote com condições facilitadas?`;
    }

    return {
      customer: c,
      triggerType,
      urgencyScore,
      suggestedMessage,
    };
  });

  const filteredItems = customersNeedingFollowUp.filter(
    (item) => selectedFilter === 'Todos' || item.triggerType === selectedFilter
  );

  const handleSendFollowUp = async (customerId: string, customMessage: string) => {
    setExecutingFollowUpId(customerId);

    try {
      // Simulate real AI transmission
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const now = new Date().toISOString();

      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            const newAiMsg = {
              id: `msg-followup-${Date.now()}`,
              sender: 'ai' as const,
              text: customMessage,
              timestamp: now,
              salesTacticUsed: 'Follow-up Automático de Reativação Comercial',
            };

            return {
              ...c,
              lastInteraction: now,
              messages: [...(c.messages || []), newAiMsg],
              status: c.status === 'Proposta Enviada' ? 'Proposta Enviada' : 'Em Negociação',
            };
          }
          return c;
        })
      );

      setLastSentMessage({ customerId, text: customMessage });

      // Trigger owner notification
      const targetCustomer = customers.find((c) => c.id === customerId);
      if (targetCustomer) {
        setNotifications((prev) => [
          {
            id: `notif-followup-${Date.now()}`,
            type: 'followup_due',
            title: `Follow-up enviado para ${targetCustomer.name}`,
            description: `A IA enviou automaticamente uma mensagem de acompanhamento para reativar o interesse do cliente em ${targetCustomer.city}.`,
            customerId,
            customerName: targetCustomer.name,
            read: false,
            createdAt: now,
          },
          ...prev,
        ]);
      }
    } finally {
      setExecutingFollowUpId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Módulo de Follow-up Inteligente
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Acompanhamento & Reativação de Clientes 24H
          </h2>
          <p className="text-xs text-slate-400">
            A IA monitora propostas pendentes, orçamentos sem resposta e períodos de recompra para agir no momento exato e fechar vendas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Automação Ativa: Rastreando {customers.length} Clientes</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Aguardando Retorno</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2">
            {customersNeedingFollowUp.filter((i) => i.triggerType === 'OrcamentoPendente' || i.triggerType === 'AguardandoResposta').length}
          </p>
          <p className="text-[10px] text-amber-500 font-medium mt-1">Propostas & Dúvidas Pendentes</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Oportunidade de Recompra</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2">
            {customersNeedingFollowUp.filter((i) => i.triggerType === 'RecompraRecorrente').length}
          </p>
          <p className="text-[10px] text-emerald-400 font-medium mt-1">Clientes Recorrentes de Safra</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Clientes Inativos (+5 dias)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2">
            {customersNeedingFollowUp.filter((i) => i.triggerType === 'ClienteSumido').length}
          </p>
          <p className="text-[10px] text-blue-400 font-medium mt-1">Prontos para Reativação</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Taxa de Conversão IA</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2">84.2%</p>
          <p className="text-[10px] text-cyan-400 font-medium mt-1">Sem pressão, foco em relacionamento</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-[#202533] pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'Todos', label: 'Todos os Follow-ups' },
          { id: 'OrcamentoPendente', label: '📄 Orçamentos Pendentes' },
          { id: 'AguardandoResposta', label: '📩 Aguardando Resposta' },
          { id: 'RecompraRecorrente', label: '🔄 Recompra Recorrente' },
          { id: 'ClienteSumido', label: '👻 Clientes Ausentes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === tab.id
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : darkMode
                ? 'bg-[#181B24] text-slate-400 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Follow-up Cards Queue */}
      <div className="space-y-4">
        {filteredItems.map(({ customer, triggerType, suggestedMessage }, index) => {
          const isExecuting = executingFollowUpId === customer.id;
          const isJustSent = lastSentMessage?.customerId === customer.id;

          const primaryProd = products.find((p) => customer.interestedProducts.includes(p.id)) || products[0];

          return (
            <div
              key={customer.id}
              className={`p-5 rounded-2xl border transition-all ${
                darkMode
                  ? 'bg-[#12151E] border-[#202533] hover:border-emerald-500/40'
                  : 'bg-white border-slate-200 hover:border-emerald-500/40 shadow-sm'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Customer & Context */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {customer.name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {customer.name}
                        </h3>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            customer.leadTemperature === 'VIP'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : customer.leadTemperature === 'Quente'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {customer.leadTemperature === 'VIP' ? '👑 VIP' : customer.leadTemperature === 'Quente' ? '🔥 Quente' : '☀️ Morno'}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {customer.city} / {customer.state}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="font-semibold text-slate-300">{customer.farmName || 'Propriedade Rural'}</span>
                        • {customer.phone}
                      </p>
                    </div>
                  </div>

                  {/* Trigger Badge */}
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#181B24] text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {triggerType === 'OrcamentoPendente'
                        ? '📄 Proposta Comercial Enviada (Aguardando Sinal Verde)'
                        : triggerType === 'RecompraRecorrente'
                        ? '🔄 Período de Recompra de Safra Identificado'
                        : triggerType === 'ClienteSumido'
                        ? '👻 Cliente Inativo há +5 dias'
                        : '📩 Dúvida Técnica ou Negociação Pendente'}
                    </span>

                    {primaryProd && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Produto: <span className="text-slate-200 font-bold">{primaryProd.name}</span>
                      </span>
                    )}
                  </div>

                  {/* AI Suggested Follow-up Draft */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181B26] border border-slate-200 dark:border-[#2B3142] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Bot className="h-3.5 w-3.5" />
                        Mensagem de Follow-up Personalizada pela IA:
                      </span>
                      <span>Sugerido hoje</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                      "{suggestedMessage}"
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-2.5 lg:w-56 flex-shrink-0">
                  {isJustSent ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Follow-up Enviado!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendFollowUp(customer.id, suggestedMessage)}
                      disabled={isExecuting}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-500/20"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Disparando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Disparar Mensagem IA</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => onNavigateToSimulator && onNavigateToSimulator(customer.id)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1 transition-colors ${
                      darkMode
                        ? 'border-[#2A2F3D] text-slate-300 hover:bg-[#181B24]'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Abrir Chat / Simulação</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
