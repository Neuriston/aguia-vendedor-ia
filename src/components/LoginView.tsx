import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Key, Zap, CheckCircle2, AlertTriangle, Eye, EyeOff, Bot } from 'lucide-react';
import { authService } from '../services/AuthService';

interface LoginViewProps {
  onLoginSuccess: () => void;
  darkMode: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, darkMode }) => {
  const [email, setEmail] = useState('proprietario@aguiaagro.com.br');
  const [password, setPassword] = useState('aguia2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await authService.login(email, password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'Falha na autenticação. Verifique e-mail e senha.');
      }
    } catch (err) {
      setErrorMessage('Erro de conexão ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
      darkMode ? 'bg-[#090A0F] text-gray-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-xl shadow-emerald-500/20">
            <Zap className="h-8 w-8 fill-current" />
          </div>
          <div>
            <div className="flex items-center justify-center space-x-1.5">
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                ÁGUIA
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                IA VENDEDOR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Acesso Exclusivo do Proprietário ao Painel de Controle Administrativo
            </p>
          </div>
        </div>

        {/* Security Alert Badge */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <span>Sessão Protegida • Criptografia de Ponta a Ponta • Proteção Anti-Injection</span>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className={`p-6 sm:p-8 rounded-3xl border space-y-5 shadow-2xl transition-all ${
            darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="border-b border-slate-200 dark:border-[#202533] pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-500" />
              Autenticação Obrigatória
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Águia Auth
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">
              E-mail do Proprietário
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="proprietario@empresa.com.br"
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                  darkMode
                    ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">
              Senha de Acesso Comercial
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                  darkMode
                    ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Demo Login Credentials Note */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Credenciais Padrão do Proprietário:</div>
            <div>E-mail: <code className="text-emerald-400 font-mono">proprietario@aguiaagro.com.br</code></div>
            <div>Senha: <code className="text-emerald-400 font-mono">aguia2026</code></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {loading ? (
              <span>Autenticando e validando token...</span>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Entrar no Painel com Segurança</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badges */}
        <div className="text-center text-[10px] text-slate-500 space-y-1">
          <p>ÁGUIA VENDEDOR IA • Proteção do Catálogo, Preços Mínimos e Webhook</p>
          <p>Acesso restrito apenas ao gestor do WhatsApp Comercial</p>
        </div>
      </div>
    </div>
  );
};
