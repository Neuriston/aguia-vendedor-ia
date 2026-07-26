import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  UserCheck,
  FileCheck2,
  Trash2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { OwnerNotification } from '../types';

interface NotificationsViewProps {
  notifications: OwnerNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<OwnerNotification[]>>;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  setNotifications,
  setActiveTab,
  darkMode,
}) => {
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    if (confirm('Tem certeza que deseja limpar todos os alertas do proprietário?')) {
      setNotifications([]);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Notificações Filtradas para o Proprietário
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Central de Avisos e Alertas Importantes
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            O Águia IA opera autonomamente e chama você APENAS quando há propostas comerciais prontas, vendas aprovadas, clientes VIP ou valores elevados.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Marcar Todas como Lidas
          </button>
          <button
            onClick={handleClearNotifications}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
            title="Limpar Histórico"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}>
            <Bell className="h-10 w-10 text-slate-500 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-slate-300">Nenhum alerta pendente</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              O vendedor virtual está atendendo normalmente sem interrupções desnecessárias.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            return (
              <div
                key={notif.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !notif.read
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : darkMode
                    ? 'bg-[#12151E] border-[#202533]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                          Novo Alerta
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {notif.description}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      {new Date(notif.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      if (notif.proposalId) {
                        setActiveTab('proposals');
                      } else {
                        setActiveTab('simulator');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-colors flex items-center space-x-1"
                  >
                    <span>Ver Negociação</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
