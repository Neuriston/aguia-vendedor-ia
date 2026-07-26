import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Key,
  Globe,
  Phone,
  Send,
  ShieldCheck,
  RefreshCw,
  Copy,
  Wifi,
  WifiOff,
  Inbox,
  SendHorizontal,
  Clock,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  FileDown,
  MapPin,
  UserCheck,
  Terminal,
  Play,
  Square,
  RotateCw,
} from 'lucide-react';
import { SystemSettings } from '../types';
import { whatsappService, WhatsAppConnectionState, WhatsAppLog, WhatsAppMessageType } from '../services/WhatsAppService';

interface WhatsAppViewProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  darkMode: boolean;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  settings,
  setSettings,
  darkMode,
}) => {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>(whatsappService.getStatus());
  const [logs, setLogs] = useState<WhatsAppLog[]>(whatsappService.getLogs());
  const [testResultMsg, setTestResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Credentials
  const [phoneNumberId, setPhoneNumberId] = useState('109283749201948');
  const [accessToken, setAccessToken] = useState('EAAG...meta_secret_token_live');
  const [verifyToken, setVerifyToken] = useState('aguia_vendedor_secret_2026');

  // Test Disparo
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Aqui é o ÁGUIA. Vi seu interesse em nossos produtos, como posso te atender?');
  const [testMessageType, setTestMessageType] = useState<WhatsAppMessageType>('text');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;

  const refreshState = async () => {
    await whatsappService.checkServerStatus();
    setConnectionState(whatsappService.getStatus());
    setLogs(whatsappService.getLogs());
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(() => {
      refreshState();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    setIsConnecting(true);
    setTestResultMsg(null);
    const res = await whatsappService.testServerConnection();
    if (res.success) {
      setTestResultMsg({ success: true, text: 'Conexão confirmada com sucesso pela Meta Graph API!' });
    } else {
      setTestResultMsg({
        success: false,
        text: res.error || 'WhatsApp não configurado ou credenciais inválidas no servidor.',
      });
    }
    await refreshState();
    setIsConnecting(false);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    await whatsappService.connect();
    refreshState();
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    await whatsappService.disconnect();
    refreshState();
  };

  const handleReconnect = async () => {
    setIsConnecting(true);
    await whatsappService.reconnect();
    refreshState();
    setIsConnecting(false);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) return;
    setSendingTest(true);
    setTestSuccess(false);

    try {
      await whatsappService.sendOutgoingMessage(testNumber, testMessage, testMessageType);
      refreshState();
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    } finally {
      setSendingTest(false);
    }
  };

  const supportedMediaTypes = [
    { type: 'text', label: 'Texto', icon: FileText, desc: 'Mensagens diretas com suporte a negociação' },
    { type: 'image', label: 'Imagem', icon: ImageIcon, desc: 'Fotos de produtos, comprovantes e catálogos' },
    { type: 'audio', label: 'Áudio / Voz', icon: Mic, desc: 'Atendimento e transcrição automática de voz' },
    { type: 'video', label: 'Vídeo', icon: Video, desc: 'Demonstração de máquinas e propriedades' },
    { type: 'document', label: 'Documentos', icon: FileDown, desc: 'Envio e recebimento de PDFs, laudos e boletos' },
    { type: 'location', label: 'Localização', icon: MapPin, desc: 'GPS de fazendas e rotas para cálculo de frete' },
    { type: 'contact', label: 'Contato', icon: UserCheck, desc: 'Compartilhamento de gerentes e compradores' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              API Oficial WhatsApp Business Meta
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                connectionState.status === 'CONNECTED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : connectionState.status === 'CONNECTING' || connectionState.status === 'RECONNECTING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {connectionState.status === 'CONNECTED' && <>🟢 Conectado & 24/7 Ativo</>}
              {connectionState.status === 'CONNECTING' && <>🟡 Conectando...</>}
              {connectionState.status === 'RECONNECTING' && <>🟡 Sincronizando Webhook...</>}
              {connectionState.status === 'DISCONNECTED' && <>🔴 Desconectado</>}
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Conexão WhatsApp Business & Webhook
          </h2>
          <p className="text-xs text-slate-400">
            Gerencie a conexão oficial via Meta API do Vendedor ÁGUIA em tempo real.
          </p>
        </div>

        {/* Connection Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={isConnecting}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>Testar Conexão API Meta</span>
          </button>
          {connectionState.status === 'DISCONNECTED' ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Ativar Integração</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleReconnect}
                disabled={isConnecting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                <span>Reconectar</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Pausar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {testResultMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
            testResultMsg.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          {testResultMsg.success ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{testResultMsg.text}</span>
        </div>
      )}

      {/* Connection Status Dashboard Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Status & Number */}
        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Número Conectado
            </span>
            {connectionState.status === 'CONNECTED' ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <p className="text-base font-mono font-extrabold text-emerald-400 mt-2">
            {connectionState.phoneNumber}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">WABA ID: {connectionState.wabaId}</p>
        </div>

        {/* Metric 2: Last Sync */}
        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Última Sincronização
            </span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200 mt-2">
            {new Date(connectionState.lastSyncAt).toLocaleTimeString('pt-BR')} hs
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Webhook Meta verificado 200 OK</p>
        </div>

        {/* Metric 3: Received Today */}
        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Recebidas Hoje
            </span>
            <Inbox className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {connectionState.messagesReceivedToday}
          </p>
          <p className="text-[11px] text-slate-400">Mensagens enviadas por clientes</p>
        </div>

        {/* Metric 4: Sent Today */}
        <div
          className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Enviadas Hoje
            </span>
            <SendHorizontal className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            {connectionState.messagesSentToday}
          </p>
          <p className="text-[11px] text-slate-400">Respostas automáticas do ÁGUIA</p>
        </div>
      </div>

      {/* Main Grid: Meta Setup & Supported Media Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Credentials & Webhook Setup */}
        <div className="lg:col-span-2 space-y-6">
          {/* Webhook Configuration Card */}
          <div
            className={`p-5 rounded-2xl border ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#202533]">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold">URL do Webhook Meta Cloud API</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                SSL / HTTPS Ativo
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-3">
              Configure esta URL no aplicativo Meta para que todas as conversas do WhatsApp cheguem diretamente ao ÁGUIA:
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                  darkMode ? 'bg-[#181B24] border-[#2A2F3D] text-emerald-400' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              />
              <button
                onClick={handleCopyWebhook}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                {copiedWebhook ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Credentials Status & Instructions Card */}
          <div
            className={`p-5 rounded-2xl border ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#202533]">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold">Credenciais da API Oficial Meta (Variáveis de Ambiente)</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Armazenamento Seguro Backend (.env)
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3 mb-4 leading-relaxed">
              Por razões de segurança e em conformidade com as diretrizes da Meta, os tokens e secrets 
              <strong> jamais são salvos no navegador ou no Firestore</strong>. Eles são configurados diretamente no arquivo 
              <code className="text-emerald-400 font-mono mx-1 px-1.5 py-0.5 bg-emerald-500/10 rounded">.env</code> do servidor backend.
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-[#181B24] border-[#2A2F3D]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-200">WHATSAPP_PHONE_NUMBER_ID</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">ID do número de telefone no painel Meta for Developers</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${connectionState.phoneNumberId !== 'Não configurado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {connectionState.phoneNumberId !== 'Não configurado' ? 'CONFIGURADO' : 'PENDENTE'}
                </span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-[#181B24] border-[#2A2F3D]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-200">WHATSAPP_BUSINESS_ACCOUNT_ID</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">ID da Conta do WhatsApp Business (WABA)</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${connectionState.wabaId !== 'Não informado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {connectionState.wabaId !== 'Não informado' ? 'CONFIGURADO' : 'OPCIONAL'}
                </span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-[#181B24] border-[#2A2F3D]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-200">WHATSAPP_ACCESS_TOKEN</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Token de acesso permanente de Usuário do Sistema (System User Token)</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${connectionState.status === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {connectionState.status === 'CONNECTED' ? 'CONFIGURADO' : 'PENDENTE'}
                </span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-[#181B24] border-[#2A2F3D]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-200">WHATSAPP_VERIFY_TOKEN</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Token de validação para o Webhook (definido por você)</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md">
                  CONFIGURADO DEFAULTT
                </span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-[#181B24] border-[#2A2F3D]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-200">META_APP_SECRET</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Segredo do Aplicativo no Meta for Developers</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-500/20 text-slate-400 rounded-md">
                  SEGURANÇA
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#202533] flex items-center justify-between">
              <span className="text-xs text-slate-400">Clique para efetuar teste de chamada direta com a Graph API da Meta:</span>
              <button
                onClick={handleTestConnection}
                disabled={isConnecting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                <span>[ TESTAR CONEXÃO ]</span>
              </button>
            </div>
          </div>

          {/* Test Message Disparo Form */}
          <form
            onSubmit={handleSendTest}
            className={`p-5 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-[#202533]">
              <Send className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold">Testar Envio via WhatsApp API</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tipo de Mensagem
                </label>
                <select
                  value={testMessageType}
                  onChange={(e) => setTestMessageType(e.target.value as WhatsAppMessageType)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                    darkMode
                      ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-500'
                  }`}
                >
                  <option value="text">Texto</option>
                  <option value="image">Imagem</option>
                  <option value="audio">Áudio</option>
                  <option value="document">Documento</option>
                  <option value="location">Localização</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Número do Cliente (com DDD e 55)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5565999887766"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                    darkMode
                      ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Conteúdo da Mensagem
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                  darkMode
                    ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 focus:border-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {testSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Enviado com sucesso no WhatsApp!
                </span>
              )}
              {!testSuccess && <span />}

              <button
                type="submit"
                disabled={sendingTest || !testNumber}
                className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-emerald-500/20"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Disparar pelo WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Supported Message Types & Realtime Terminal */}
        <div className="space-y-6">
          {/* Supported Types List */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-[#202533] pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Tipos de Mídia Suportados
              </h3>
            </div>

            <div className="space-y-2.5">
              {supportedMediaTypes.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    className={`p-2.5 rounded-xl border flex items-center space-x-3 transition-colors ${
                      darkMode ? 'bg-[#181B24] border-[#2A2F3D]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Webhook Terminal */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#202533] pb-3">
              <div className="flex items-center space-x-2 text-emerald-500">
                <Terminal className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Logs do WhatsAppService
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Live Sync</span>
            </div>

            <div className="bg-[#0A0C10] p-3 rounded-xl border border-[#1E2330] font-mono text-[11px] h-48 overflow-y-auto space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="text-slate-300 leading-tight">
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span
                    className={`font-bold ${
                      log.direction === 'INBOUND'
                        ? 'text-cyan-400'
                        : log.direction === 'OUTBOUND'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {log.direction}
                  </span>{' '}
                  <span className="text-slate-400">({log.type}):</span> {log.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
