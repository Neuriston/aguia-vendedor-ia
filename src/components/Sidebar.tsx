import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  GraduationCap,
  Settings,
  Zap,
  ShieldCheck,
  ChevronRight,
  QrCode,
  LogOut,
  Lock,
} from 'lucide-react';
import { Product } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  products: Product[];
  darkMode: boolean;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  products,
  darkMode,
  onLogout,
}) => {
  const activeProductsCount = products.filter((p) => p.active).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Online',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold',
    },
    {
      id: 'conversations',
      label: 'Conversas (WhatsApp)',
      icon: MessageSquare,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'products',
      label: 'Produtos',
      icon: Package,
      badge: `${activeProductsCount}`,
      badgeColor: 'bg-slate-500/10 text-slate-400',
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'training',
      label: 'Treinamento da IA',
      icon: GraduationCap,
      badge: 'Auto',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    },
    {
      id: 'security',
      label: 'Segurança & Auditoria',
      icon: ShieldCheck,
      badge: 'Protegido',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp & Configuração',
      icon: QrCode,
      badge: 'API',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    },
  ];

  return (
    <aside
      className={`w-64 flex-shrink-0 border-r flex flex-col justify-between transition-colors ${
        darkMode ? 'bg-[#0F1117] border-[#1F2430] text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center space-x-3 border-b border-slate-200 dark:border-[#1F2430]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/20">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                ÁGUIA
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
                IA
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Vendedor WhatsApp Business
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? darkMode
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30'
                      : 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-gray-100 hover:bg-[#181B24]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                      isActive
                        ? darkMode
                          ? 'text-emerald-400'
                          : 'text-white'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      item.badgeColor || 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box & Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-[#1F2430] space-y-2">
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            darkMode
              ? 'bg-[#181B24] border-[#2A2F3D]'
              : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              WhatsApp Bot
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">Meta API</span>
          </div>

          <p className="text-xs font-semibold mb-1 text-slate-700 dark:text-slate-200">
            Vendedor Virtual
          </p>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Atendimento 100% focado em vender seus produtos no WhatsApp.
          </p>

          <button
            onClick={() => setActiveTab('conversations')}
            className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm"
          >
            <span>Abrir Conversas</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair do Painel</span>
          </button>
        )}
      </div>
    </aside>
  );
};

