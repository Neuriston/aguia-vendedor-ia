import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SimulatorView } from './components/SimulatorView';
import { ProductsView } from './components/ProductsView';
import { ProposalsView } from './components/ProposalsView';
import { TrainingView } from './components/TrainingView';
import { WhatsAppView } from './components/WhatsAppView';
import { NotificationsView } from './components/NotificationsView';
import { ProposalModal } from './components/ProposalModal';
import { LoginView } from './components/LoginView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { authService } from './services/AuthService';

import {
  getStoredProducts,
  saveProducts,
  getStoredCustomers,
  saveCustomers,
  getStoredProposals,
  saveProposals,
  getStoredNotifications,
  saveNotifications,
  getStoredSettings,
  saveSettings,
} from './lib/storage';

import { Product, Customer, Proposal, OwnerNotification, SystemSettings } from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!authService.getToken();
  });

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
  };

  // Domain States
  const [products, setProducts] = useState<Product[]>(getStoredProducts);
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers);
  const [proposals, setProposals] = useState<Proposal[]>(getStoredProposals);
  const [notifications, setNotifications] = useState<OwnerNotification[]>(getStoredNotifications);
  const [settings, setSettings] = useState<SystemSettings>(getStoredSettings);

  // Selected proposal for document view
  const [modalProposal, setModalProposal] = useState<Proposal | null>(null);

  // Verify session on mount
  useEffect(() => {
    authService.verifySession().then((valid) => {
      setIsAuthenticated(valid);
    });
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveProposals(proposals);
  }, [proposals]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Apply dark mode class to html document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // If not authenticated, force redirect to Login View
  if (!isAuthenticated) {
    return <LoginView darkMode={darkMode} onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      darkMode ? 'bg-[#090A0F] text-gray-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          products={products}
          darkMode={darkMode}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Sticky Header */}
          <Header
            settings={settings}
            notifications={notifications}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          {/* Body Views */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                products={products}
                setProducts={setProducts}
                customers={customers}
                setCustomers={setCustomers}
                proposals={proposals}
                setProposals={setProposals}
                settings={settings}
                setSettings={setSettings}
                setActiveTab={setActiveTab}
                darkMode={darkMode}
              />
            )}

            {(activeTab === 'conversations' || activeTab === 'simulator' || activeTab === 'customers') && (
              <SimulatorView
                products={products}
                customers={customers}
                setCustomers={setCustomers}
                proposals={proposals}
                setProposals={setProposals}
                notifications={notifications}
                setNotifications={setNotifications}
                settings={settings}
                darkMode={darkMode}
                onOpenProposalModal={(prop) => setModalProposal(prop)}
              />
            )}

            {activeTab === 'products' && (
              <ProductsView
                products={products}
                setProducts={setProducts}
                darkMode={darkMode}
              />
            )}

            {(activeTab === 'orders' || activeTab === 'proposals') && (
              <ProposalsView
                proposals={proposals}
                setProposals={setProposals}
                settings={settings}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'training' && (
              <TrainingView darkMode={darkMode} />
            )}

            {activeTab === 'security' && (
              <SecurityAuditView darkMode={darkMode} />
            )}

            {(activeTab === 'whatsapp' || activeTab === 'settings') && (
              <WhatsAppView
                settings={settings}
                setSettings={setSettings}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                setNotifications={setNotifications}
                setActiveTab={setActiveTab}
                darkMode={darkMode}
              />
            )}
          </main>
        </div>
      </div>

      {/* Global Document Proposal Modal */}
      {modalProposal && (
        <ProposalModal
          proposal={modalProposal}
          settings={settings}
          onClose={() => setModalProposal(null)}
          onApproveProposal={(id) => {
            setProposals((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, status: 'Fechada/Aprovada', closedAt: new Date().toISOString() } : p
              )
            );
          }}
        />
      )}
    </div>
  );
}

