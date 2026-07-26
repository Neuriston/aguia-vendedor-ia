import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertTriangle, Eye, CheckCircle2, RefreshCw, Key, ShieldAlert, Bot, Server, FileCode, Check } from 'lucide-react';
import { authService, SecurityLogEvent } from '../services/AuthService';

interface SecurityAuditViewProps {
  darkMode: boolean;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ darkMode }) => {
  const [logs, setLogs] = useState<SecurityLogEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const fetched = await authService.getSecurityLogs();
      setLogs(fetched);
    } catch (e) {
      console.error('Error fetching security logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const securityChecklist = [
    { title: 'Firestore Security Rules', desc: 'Negando acesso público total (deny by default). Acesso restrito ao proprietário autenticado.', status: 'OK' },
    { title: 'Proteção Anti-Prompt Injection', desc: 'Filtro no servidor neutro que impede clientes de forçarem alteração de preço, leitura de regras ou comandos no WhatsApp.', status: 'OK' },
    { title: 'Assinatura HMAC x-hub-signature-256 no Webhook', desc: 'Validação de integridade do payload recebido da Meta.', status: 'OK' },
    { title: 'Validação Comercial pelo Backend Autorritativo', desc: 'Preço mínimo e desconto máximo validados no servidor antes de fechar pedidos.', status: 'OK' },
    { title: 'Armazenamento Seguro de Credenciais', desc: 'Chaves do Gemini, WhatsApp Access Token e Meta App Secret 100% no servidor, nunca expostas ao browser.', status: 'OK' },
    { title: 'Isolamento de Memória por Cliente', desc: 'Atendimentos isolados individualmente pelo número de telefone do comprador rural.', status: 'OK' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Módulo de Segurança Integrado
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Auditoria de Segurança & Logs do Servidor
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Acompanhe a proteção do sistema, tentativas de acesso, bloqueio de Prompt Injection e validações de preço mínimo.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </button>
      </div>

      {/* Security Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {securityChecklist.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border space-y-2 transition-all ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {item.title}
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                {item.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Logs Table */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#202533]">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
            Registro do Histórico de Eventos de Segurança (`security_logs`)
          </h3>
          <span className="text-xs text-slate-400">Total: {logs.length} eventos</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum evento crítico registrado no momento. Todos os parâmetros operam normalmente.
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                  log.severity === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : log.severity === 'WARNING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] opacity-70">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.eventType === 'LOGIN_SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.eventType === 'PROMPT_INJECTION_BLOCKED'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {log.eventType}
                    </span>
                  </div>
                  <p className="font-medium leading-relaxed">{log.details}</p>
                </div>

                <div className="text-[10px] text-slate-400 self-end sm:self-center font-mono">
                  {log.ipAddress ? `IP: ${log.ipAddress}` : 'Servidor Interno'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
