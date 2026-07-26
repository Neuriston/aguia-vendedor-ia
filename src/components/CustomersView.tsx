import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  BrainCircuit,
  MessageSquare,
  FileText,
  Clock,
  Plus,
  UserCheck,
  Zap,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Customer, Product, CustomerStatus } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  products: Product[];
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  setCustomers,
  products,
  setActiveTab,
  darkMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [activeCustomerDetail, setActiveCustomerDetail] = useState<Customer | null>(null);

  const statuses: string[] = [
    'Todos',
    'Em Negociação',
    'Proposta Enviada',
    'Venda Fechada',
    'Cliente Frequente',
    'Novo Prospect',
  ];

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.farmName && c.farmName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'Todos' || c.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <BrainCircuit className="h-3 w-3" />
              Memória Ativa da IA
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Gestão de Clientes & Histórico Comercial
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            A IA armazena continuamente as preferências dos produtores rurais, orçamento solicitado, histórico de compras e padrão de negociação.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, fazenda, telefone ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
              darkMode
                ? 'bg-[#181B24] border-[#2A2F3D] text-gray-200 focus:border-emerald-500'
                : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === st
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

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((c) => {
          const interestedProds = products.filter((p) =>
            c.interestedProducts?.includes(p.id)
          );

          return (
            <div
              key={c.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all hover:border-emerald-500/40 ${
                darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {c.name}
                      </h3>
                      {c.farmName && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3 text-emerald-500" />
                          {c.farmName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.leadTemperature === 'VIP'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : c.leadTemperature === 'Quente'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : c.leadTemperature === 'Recorrente'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {c.leadTemperature === 'VIP'
                        ? '👑 VIP'
                        : c.leadTemperature === 'Quente'
                        ? '🔥 Quente'
                        : c.leadTemperature === 'Recorrente'
                        ? '🔄 Recorrente'
                        : '☀️ Morno'}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20">
                      {c.status}
                    </span>
                  </div>
                </div>

                {/* Location & Contact & Documents */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                  {c.cpfCnpj && (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-mono text-[11px] text-slate-300">Doc: {c.cpfCnpj}</span>
                      {c.company && <span className="text-slate-400">({c.company})</span>}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{c.city} - {c.state}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{c.phone}</span>
                  </div>
                </div>

                {/* AI Memory Summary Note */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#181B24] border border-slate-200 dark:border-[#2A2F3D]">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3" />
                    Memória Comercial Águia:
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                    {c.notes || 'Cliente cadastrado no sistema comercial.'}
                  </p>
                </div>

                {/* Products of interest */}
                {interestedProds.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Produtos de Interesse Mapeados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {interestedProds.map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-[#1F2430] flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  Total Comprado: <strong className="text-emerald-400">{formatCurrency(c.totalSpent)}</strong>
                </span>

                <button
                  onClick={() => {
                    setActiveCustomerDetail(c);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-semibold text-xs transition-colors flex items-center space-x-1"
                >
                  <span>Ver Detalhes</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Detail Modal */}
      {activeCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl p-6 border shadow-2xl space-y-5 my-8 ${
              darkMode
                ? 'bg-[#12151E] border-[#252C3D] text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#252C3D]">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                  {activeCustomerDetail.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold">{activeCustomerDetail.name}</h3>
                  <p className="text-xs text-slate-400">
                    {activeCustomerDetail.farmName} • {activeCustomerDetail.city}/{activeCustomerDetail.state}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveCustomerDetail(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            {/* AI Memory & Notes */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <h4 className="font-extrabold text-xs text-emerald-400 flex items-center gap-1.5">
                <BrainCircuit className="h-4 w-4" />
                MEMÓRIA E REGISTRO HISTÓRICO DA IA
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeCustomerDetail.notes}
              </p>
            </div>

            {/* Message History */}
            <div>
              <h4 className="font-bold text-xs mb-2">Histórico Recente de Interações com o Águia Vendedor IA</h4>
              <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-[#181B24] border border-[#2A2F3D]">
                {activeCustomerDetail.messages?.map((msg) => (
                  <div key={msg.id} className="text-xs p-2.5 rounded-lg bg-[#12151E] border border-[#202533]">
                    <div className="flex justify-between font-bold text-[10px] text-emerald-400 mb-1">
                      <span>{msg.sender === 'customer' ? activeCustomerDetail.name : 'Águia Vendedor IA'}</span>
                      <span>{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-[#252C3D] flex justify-end space-x-2">
              <button
                onClick={() => {
                  setActiveCustomerDetail(null);
                  setActiveTab('simulator');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
              >
                Simular Atendimento com este Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
