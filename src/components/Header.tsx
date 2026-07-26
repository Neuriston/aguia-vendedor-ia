import React from 'react';
import { Bot, Bell, Search, Sun, Moon, ShieldCheck, Sparkles, SlidersHorizontal } from 'lucide-react';
import { OwnerNotification, SystemSettings } from '../types';

interface HeaderProps {
  settings: SystemSettings;
  notifications: OwnerNotification[];
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  notifications,
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className={`sticky top-0 z-30 h-16 border-b backdrop-blur-md transition-colors ${
      darkMode ? 'bg-[#0F1117]/80 border-[#1F2430] text-gray-100' : 'bg-white/90 border-slate-200 text-slate-800'
    }`}>
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left section: Current page info & Quick search */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold tracking-wider text-emerald-500 uppercase">
                  IA de Vendas 24/7
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ativo no Servidor
                </span>
              </div>
              <h1 className="text-sm font-semibold truncate">
                {settings.companyName}
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center relative w-64 lg:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produtos, clientes, propostas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg text-xs pl-9 pr-3 py-2 border transition-colors outline-none ${
                darkMode
                  ? 'bg-[#181B24] border-[#2A2F3D] text-gray-200 placeholder-slate-500 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Right Section: Quick actions */}
        <div className="flex items-center space-x-3">
          {/* AI Knowledge Pill */}
          <div className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Treinada nos Produtos</span>
          </div>

          {/* Notifications Button */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2 rounded-lg transition-colors border ${
              activeTab === 'notifications'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : darkMode
                ? 'bg-[#181B24] border-[#2A2F3D] text-gray-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Notificações da IA"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors border ${
              darkMode
                ? 'bg-[#181B24] border-[#2A2F3D] text-amber-400 hover:text-amber-300'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={darkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Owner Profile Badge */}
          <div className={`hidden sm:flex items-center space-x-2 pl-2 border-l ${
            darkMode ? 'border-[#2A2F3D]' : 'border-slate-200'
          }`}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {settings.ownerName.charAt(0)}
            </div>
            <div className="text-left leading-tight hidden lg:block">
              <p className="text-xs font-medium">{settings.ownerName}</p>
              <p className="text-[10px] text-slate-400">Proprietário / Gestor</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
