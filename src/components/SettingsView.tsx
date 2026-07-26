import React, { useState } from 'react';
import {
  Settings,
  Bot,
  Building,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Zap,
  Save,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  darkMode: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  darkMode,
}) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [apiHealth, setApiHealth] = useState<string | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestApi = async () => {
    setCheckingApi(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setApiHealth(`Servidor Ativo: ${data.service || 'OK'}`);
    } catch (e: any) {
      setApiHealth(`Status: Servidor Local rodando`);
    } finally {
      setCheckingApi(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Parâmetros do Sistema
          </span>
        </div>
        <h2 className="text-xl font-black tracking-tight mt-1">
          Configurações da IA & Regras de Vendas
        </h2>
        <p className="text-xs text-slate-400 max-w-xl">
          Ajuste a personalidade do vendedor virtual, os dados da sua empresa e o valor mínimo de proposta para notificação ao proprietário.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Company & Owner Info Box */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="h-4 w-4 text-emerald-500" />
            Dados da Empresa e Proprietário
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Nome da Empresa Comercial *</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Nome do Proprietário *</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Telefone do Proprietário *</label>
              <input
                type="text"
                required
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Cidade / Estado da Sede</label>
              <input
                type="text"
                value={formData.companyLocation}
                onChange={(e) => setFormData({ ...formData, companyLocation: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* AI Personality & Tone */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-500" />
            Personalidade e Tom do Consultor Comercial
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Estilo de Atendimento Comercial</label>
              <select
                value={formData.aiTone}
                onChange={(e) => setFormData({ ...formData, aiTone: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none focus:border-emerald-500"
              >
                <option value="Consultor Experiente">Consultor Experiente (Recomendado)</option>
                <option value="Técnico Agrônomo Directo">Técnico Agrônomo Directo</option>
                <option value="Comercial Amigável">Comercial Amigável</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Saudação Inicial Automatizada</label>
              <textarea
                rows={2}
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Formas de Pagamento e Chave PIX */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            Configuração de Formas de Pagamento Aceitas & Dados PIX
          </h3>
          <p className="text-xs text-slate-400">
            O ÁGUIA nunca oferecerá uma forma de pagamento desabilitada e usará exatamente estes dados para envios de PIX.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-2">Formas de Pagamento Habilitadas pelo Proprietário:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['PIX', 'Dinheiro', 'Transferência Bancária', 'Pagamento na Retirada'].map((method) => {
                  const currentMethods = formData.acceptedPaymentMethods || ['PIX', 'Dinheiro', 'Transferência Bancária', 'Pagamento na Retirada'];
                  const isChecked = currentMethods.includes(method);
                  return (
                    <label
                      key={method}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-colors ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-[#181B24] border-[#2A2F3D] text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...currentMethods, method]
                            : currentMethods.filter((m) => m !== method);
                          setFormData({ ...formData, acceptedPaymentMethods: updated });
                        }}
                        className="h-4 w-4 rounded text-emerald-500 border-slate-700 bg-[#181B24]"
                      />
                      <span>{method}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* PIX Settings Detail Box */}
            <div className="p-4 rounded-xl border bg-slate-900/50 border-[#2A2F3D] space-y-3">
              <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                Dados Cadastrados da Chave PIX (Enviados ao Cliente após Confirmação)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Tipo da Chave *</label>
                  <select
                    value={formData.pixSettings?.keyType || 'CNPJ'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pixSettings: {
                          ...(formData.pixSettings || {
                            keyType: 'CNPJ',
                            pixKey: '',
                            receiverName: '',
                            institution: '',
                            instructions: '',
                          }),
                          keyType: e.target.value as any,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none text-white"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Chave Aleatória">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Chave PIX *</label>
                  <input
                    type="text"
                    required
                    value={formData.pixSettings?.pixKey || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pixSettings: {
                          ...(formData.pixSettings || {
                            keyType: 'CNPJ',
                            pixKey: '',
                            receiverName: '',
                            institution: '',
                            instructions: '',
                          }),
                          pixKey: e.target.value,
                        },
                      })
                    }
                    placeholder="Ex: 12.345.678/0001-90"
                    className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nome do Recebedor *</label>
                  <input
                    type="text"
                    required
                    value={formData.pixSettings?.receiverName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pixSettings: {
                          ...(formData.pixSettings || {
                            keyType: 'CNPJ',
                            pixKey: '',
                            receiverName: '',
                            institution: '',
                            instructions: '',
                          }),
                          receiverName: e.target.value,
                        },
                      })
                    }
                    placeholder="Ex: Águia Agro Soluções Rurais LTDA"
                    className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Instituição Financeira *</label>
                  <input
                    type="text"
                    required
                    value={formData.pixSettings?.institution || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pixSettings: {
                          ...(formData.pixSettings || {
                            keyType: 'CNPJ',
                            pixKey: '',
                            receiverName: '',
                            institution: '',
                            instructions: '',
                          }),
                          institution: e.target.value,
                        },
                      })
                    }
                    placeholder="Ex: Banco do Brasil S.A."
                    className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Instruções de Pagamento para o Cliente</label>
                <textarea
                  rows={2}
                  value={formData.pixSettings?.instructions || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pixSettings: {
                        ...(formData.pixSettings || {
                          keyType: 'CNPJ',
                          pixKey: '',
                          receiverName: '',
                          institution: '',
                          instructions: '',
                        }),
                        instructions: e.target.value,
                      },
                    })
                  }
                  placeholder="Instruções para o cliente após receber a chave..."
                  className="w-full px-3 py-2 rounded-xl border bg-[#181B24] border-[#2A2F3D] outline-none text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Triggers */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            Regras de Notificação ao Proprietário
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">
                Notificar Proprietário se Negociação for acima de (R$)
              </label>
              <input
                type="number"
                value={formData.minNotifyAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minNotifyAmount: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <input
                type="checkbox"
                id="autoApprove"
                checked={formData.autoApproveWithinMinPrice}
                onChange={(e) =>
                  setFormData({ ...formData, autoApproveWithinMinPrice: e.target.checked })
                }
                className="h-4 w-4 rounded text-emerald-500 border-slate-700 bg-[#181B24] cursor-pointer"
              />
              <label htmlFor="autoApprove" className="font-semibold cursor-pointer">
                Permitir que a IA emita propostas automaticamente quando o valor estiver dentro do preço mínimo
              </label>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <input
                type="checkbox"
                id="autoFollowUp"
                checked={formData.autoFollowUpEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, autoFollowUpEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded text-emerald-500 border-slate-700 bg-[#181B24] cursor-pointer"
              />
              <label htmlFor="autoFollowUp" className="font-semibold cursor-pointer">
                Ativar Módulo de Follow-up Inteligente 24H (Disparo de reativação de orçamentos sem resposta)
              </label>
            </div>
          </div>
        </div>

        {/* Server & API Diagnostic Box */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-300">Status da API Gemini & Servidor Backend</span>
            <button
              type="button"
              onClick={handleTestApi}
              disabled={checkingApi}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingApi ? 'animate-spin' : ''}`} />
              <span>Testar Conexão</span>
            </button>
          </div>

          {apiHealth && (
            <p className="text-xs text-emerald-400 font-mono bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              {apiHealth}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {isSaved && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Configurações salvas com sucesso!
            </span>
          )}

          <button
            type="submit"
            className="ml-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Parâmetros da IA</span>
          </button>
        </div>
      </form>
    </div>
  );
};
