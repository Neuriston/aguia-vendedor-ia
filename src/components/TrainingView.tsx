import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  DollarSign,
  Truck,
  Percent,
  Bot,
  Zap,
  Lightbulb,
  ShieldCheck,
  Brain,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { learningService } from '../services/LearningService';
import { FirestoreSalesLearning } from '../services/FirestoreService';

interface TrainingRule {
  id: string;
  category: 'resposta' | 'negociacao' | 'frete' | 'desconto' | 'vendas';
  title: string;
  instruction: string;
  active: boolean;
}

interface TrainingViewProps {
  darkMode: boolean;
}

export const TrainingView: React.FC<TrainingViewProps> = ({ darkMode }) => {
  const [mainTab, setMainTab] = useState<'rules' | 'learnings' | 'suggestions'>('learnings');

  // Rules state
  const [rules, setRules] = useState<TrainingRule[]>([
    {
      id: 'rule-1',
      category: 'resposta',
      title: 'Tom Comercial e Identidade Humana',
      instruction:
        'Sempre responda como o consultor comercial da empresa. Nunca mencione que é uma IA, assistente virtual ou ChatGPT. Cumprimente com o nome do cliente e pergunte sobre a propriedade ou demanda atual.',
      active: true,
    },
    {
      id: 'rule-2',
      category: 'negociacao',
      title: 'Defesa de Valor & Objeção de Preço',
      instruction:
        'Quando o cliente disser que está caro, destaque a garantia do produto, laudo técnico oficial, pureza e pronta entrega antes de dar qualquer desconto. Mostre o risco de comprar insumos sem laudo.',
      active: true,
    },
    {
      id: 'rule-3',
      category: 'frete',
      title: 'Cálculo e Condições de Frete',
      instruction:
        'Para compras acima do volume mínimo da região, ofereça Frete CIF (entregue na fazenda) grátis ou negociado. Para cargas menores, informe que o frete FOB é calculado com transportadora parceira.',
      active: true,
    },
    {
      id: 'rule-4',
      category: 'desconto',
      title: 'Descontos no Pagamento à Vista / PIX',
      instruction:
        'Conceda até 3% de desconto extra para pagamentos via PIX à vista ou antecipado, desde que o valor final fique acima do Preço Mínimo do produto.',
      active: true,
    },
    {
      id: 'rule-5',
      category: 'vendas',
      title: 'Ofertamento Complementar (Cross-Selling)',
      instruction:
        'Ao fechar venda de sementes, ofereça o Fertilizante NPK para o plantio. Ao negociar tratores, sugira os implementos da categoria com desconto no pacote.',
      active: true,
    },
  ]);

  const [activeCategory, setActiveCategory] = useState<'todos' | 'resposta' | 'negociacao' | 'frete' | 'desconto' | 'vendas'>('todos');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'resposta' | 'negociacao' | 'frete' | 'desconto' | 'vendas'>('resposta');
  const [newInstruction, setNewInstruction] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Sales Learnings State
  const [learnings, setLearnings] = useState<FirestoreSalesLearning[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [learningFilter, setLearningFilter] = useState<string>('todos');
  const [searchLearning, setSearchLearning] = useState<string>('');
  const [loadingLearnings, setLoadingLearnings] = useState<boolean>(true);

  const loadLearningsData = async () => {
    setLoadingLearnings(true);
    try {
      const fetchedLearnings = await learningService.getSalesLearnings();
      const fetchedSuggestions = await learningService.generateOwnerSuggestions();
      setLearnings(fetchedLearnings);
      setSuggestions(fetchedSuggestions);
    } catch (e) {
      console.error('Erro ao carregar aprendizados do ÁGUIA:', e);
    } finally {
      setLoadingLearnings(false);
    }
  };

  useEffect(() => {
    loadLearningsData();
  }, []);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstruction.trim()) return;

    const newRule: TrainingRule = {
      id: `rule-${Date.now()}`,
      category: newCategory,
      title: newTitle.trim(),
      instruction: newInstruction.trim(),
      active: true,
    };

    setRules([newRule, ...rules]);
    setNewTitle('');
    setNewInstruction('');
    triggerSaved();
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
    triggerSaved();
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    triggerSaved();
  };

  const triggerSaved = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const filteredRules =
    activeCategory === 'todos' ? rules : rules.filter((r) => r.category === activeCategory);

  const filteredLearnings = learnings.filter((item) => {
    const matchesFilter =
      learningFilter === 'todos' ||
      (learningFilter === 'vendas' && item.type === 'venda_sucesso') ||
      (learningFilter === 'perdas' && item.type === 'perda_atendimento') ||
      (learningFilter === 'objecoes' && item.type === 'objecao_frequente');

    const matchesSearch =
      (item.productName || '').toLowerCase().includes(searchLearning.toLowerCase()) ||
      item.context.toLowerCase().includes(searchLearning.toLowerCase()) ||
      item.outcome.toLowerCase().includes(searchLearning.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
              <Brain className="h-3.5 w-3.5 animate-pulse" />
              Módulo de Aprendizado do ÁGUIA VENDEDOR IA
            </span>
            {isSaved && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Instruções Salvas!
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Treinamento & Base de Aprendizado Contínuo
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Acompanhe a evolução do ÁGUIA com base no histórico real das conversas e vendas concluídas.
          </p>
        </div>

        <button
          onClick={loadLearningsData}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Dados
        </button>
      </div>

      {/* Main Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#202533] space-x-4">
        <button
          onClick={() => setMainTab('learnings')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            mainTab === 'learnings'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Base de Aprendizado (`sales_learnings`) [{learnings.length}]
        </button>

        <button
          onClick={() => setMainTab('suggestions')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            mainTab === 'suggestions'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          Sugestões ao Proprietário [{suggestions.length}]
        </button>

        <button
          onClick={() => setMainTab('rules')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            mainTab === 'rules'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Regras e Instruções do Vendedor [{rules.length}]
        </button>
      </div>

      {/* SECURITY & GUARDRAILS BANNER (ALWAYS VISIBLE FOR COMPLIANCE) */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold">
          <ShieldCheck className="h-4 w-4" />
          <span>SEGURANÇA DO APRENDIZADO & TRAVAS COMERCIAIS</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          O ÁGUIA evolui a forma de conversar, mas <strong className="text-white">NÃO altera sozinho</strong> preços de tabela, preço mínimo, desconto máximo, estoque, frete, formas de pagamento ou regras de aprovação. Todas as diretrizes comerciais permanecem sob controle exclusivo do proprietário.
        </p>
      </div>

      {/* TAB 1: BASE DE APRENDIZADO (sales_learnings) */}
      {mainTab === 'learnings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por produto, contexto ou resultado..."
                value={searchLearning}
                onChange={(e) => setSearchLearning(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                  darkMode
                    ? 'bg-[#181B24] border-[#2A2F3D] text-gray-200 focus:border-emerald-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center space-x-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'vendas', label: 'Vendas de Sucesso' },
                { id: 'perdas', label: 'Atendimentos sem Venda' },
                { id: 'objecoes', label: 'Objeções Recorrentes' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLearningFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    learningFilter === f.id
                      ? 'bg-emerald-500 text-white font-bold'
                      : darkMode
                      ? 'bg-[#181B24] text-slate-400 border border-[#2A2F3D]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredLearnings.length === 0 ? (
            <div
              className={`p-10 text-center rounded-2xl border ${
                darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200'
              }`}
            >
              <Brain className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">Nenhum aprendizado registrado ainda</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Conforme o ÁGUIA interagir com os clientes e fechar vendas no WhatsApp, a base de conhecimento `sales_learnings` será preenchida automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLearnings.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border space-y-3 transition-all ${
                    darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#202533] pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] text-slate-500 font-bold">{item.id}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'venda_sucesso'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.type === 'perda_atendimento'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.type === 'venda_sucesso'
                        ? 'Venda Fechada'
                        : item.type === 'perda_atendimento'
                        ? 'Sem Venda'
                        : 'Objeção Frequente'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.productName || 'Produto Geral'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.context}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181B24] border border-slate-200 dark:border-[#2A2F3D] text-xs space-y-1">
                    <div className="font-semibold text-emerald-400">{item.outcome}</div>
                    {item.contributingFactors && item.contributingFactors.length > 0 && (
                      <div className="text-[11px] text-slate-400 pt-1">
                        <strong>Fatores Relevantes:</strong> {item.contributingFactors.join(' | ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>
                      Confiança: <strong className="text-slate-200">{item.confidence}</strong>
                    </span>
                    <span>
                      Origem da Informação:{' '}
                      <strong className="text-cyan-400 uppercase">{item.source}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUGESTÕES PARA O PROPRIETÁRIO */}
      {mainTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-400">
                Oportunidades de Melhoria Comercial Identificadas
              </h4>
              <p className="text-amber-200/80 mt-0.5">
                A IA analisa padrões nas negociações e apresenta sugestões. Lembre-se: Nenhuma regra comercial é alterada sem sua confirmação.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-xs">
                    #{idx + 1}
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">{sug}</p>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold">
                  Sugestão Apenas
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REGRAS E INSTRUÇÕES MANUAIS */}
      {mainTab === 'rules' && (
        <div className="space-y-6">
          {/* Category Filter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: 'todos', label: 'Todas as Regras', icon: BookOpen },
              { id: 'resposta', label: 'Como Responder', icon: MessageSquare },
              { id: 'negociacao', label: 'Como Negociar', icon: DollarSign },
              { id: 'frete', label: 'Como Calcular Frete', icon: Truck },
              { id: 'desconto', label: 'Dar Descontos', icon: Percent },
              { id: 'vendas', label: 'Como Vender Mais', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : darkMode
                      ? 'bg-[#12151E] border-[#202533] text-slate-300 hover:border-emerald-500/40'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500/40 shadow-sm'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                  <span className="text-xs font-bold mt-2 truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Add New Rule Form */}
          <form
            onSubmit={handleAddRule}
            className={`p-5 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#12151E] border-[#202533]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-[#202533]">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold">Adicionar Nova Instrução de Treinamento</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Título da Regra
                </label>
                <input
                  type="text"
                  placeholder="Ex: Como lidar com prazo no Boleto Safra"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${
                    darkMode
                      ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Categoria do Treinamento
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${
                    darkMode
                      ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-500'
                  }`}
                >
                  <option value="resposta">💬 Como Responder</option>
                  <option value="negociacao">🤝 Como Negociar</option>
                  <option value="frete">🚚 Como Calcular Frete</option>
                  <option value="desconto">🏷️ Como Conceder Descontos</option>
                  <option value="vendas">⚡ Táticas de Vendas / Cross-Selling</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Gravar Instrução no ÁGUIA</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Instrução Detalhada para a IA
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Se o cliente pedir parcelamento no boleto, aceite em até 3x (30/60/90) apenas se o valor total for superior a R$ 20.000,00."
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${
                  darkMode
                    ? 'bg-[#181B24] border-[#2A2F3D] text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 focus:border-emerald-500'
                }`}
              />
            </div>
          </form>

          {/* Rules List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider text-[11px]">
              Regras de Atendimento do Vendedor Virtual
            </h3>

            {filteredRules.map((rule) => {
              const categoryLabels = {
                resposta: { label: 'Como Responder', bg: 'bg-blue-500/10 text-blue-400' },
                negociacao: { label: 'Como Negociar', bg: 'bg-emerald-500/10 text-emerald-400' },
                frete: { label: 'Como Calcular Frete', bg: 'bg-amber-500/10 text-amber-400' },
                desconto: { label: 'Como Conceder Desconto', bg: 'bg-rose-500/10 text-rose-400' },
                vendas: { label: 'Como Vender Mais', bg: 'bg-cyan-500/10 text-cyan-400' },
              };

              const catMeta = categoryLabels[rule.category];

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rule.active
                      ? darkMode
                        ? 'bg-[#12151E] border-[#202533]'
                        : 'bg-white border-slate-200 shadow-sm'
                      : 'opacity-50 bg-slate-900/10 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${catMeta.bg}`}>
                          {catMeta.label}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {rule.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        "{rule.instruction}"
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          rule.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700/20 text-slate-400 border border-slate-700/40'
                        }`}
                      >
                        {rule.active ? 'Ativo na IA' : 'Pausado'}
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
