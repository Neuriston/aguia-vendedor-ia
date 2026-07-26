import React from 'react';
import {
  FileCheck2,
  Printer,
  Download,
  X,
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Proposal, SystemSettings } from '../types';

interface ProposalModalProps {
  proposal: Proposal;
  settings: SystemSettings;
  onClose: () => void;
  onApproveProposal?: (id: string) => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  proposal,
  settings,
  onClose,
  onApproveProposal,
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Top Action Bar (Non-printable) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            <span className="font-extrabold text-sm tracking-wide">
              PROPOSTA COMERCIAL GERADA PELA IA - ÁGUIA VENDEDOR
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Formal Printable Document Content */}
        <div className="p-8 space-y-6 bg-white" id="printable-proposal">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  {settings.companyName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {settings.companyLocation} • Consultoria Comercial Agrícola
              </p>
              <p className="text-xs text-slate-500">
                Contato Responsável: {settings.ownerName} - {settings.ownerPhone}
              </p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Nº {proposal.proposalNumber}
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Emissão: {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-slate-500">
                Válido até: {new Date(proposal.validUntil).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                PRODUTOR / CLIENTE
              </span>
              <p className="font-bold text-sm text-slate-900">{proposal.customerName}</p>
              <p className="text-slate-600">{proposal.customerLocation}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                TELEFONE / CONTATO
              </span>
              <p className="font-bold text-slate-800">{proposal.customerPhone}</p>
              <p className="text-slate-600">Status: {proposal.status}</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-2">
              ITENS DA PROPOSTA
            </h4>
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Descrição do Produto Agro</th>
                  <th className="p-3">Qtd / Unidade</th>
                  <th className="p-3">Preço Tabela</th>
                  <th className="p-3">Preço Combinado</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposal.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-semibold text-slate-900">
                      {item.productName}
                    </td>
                    <td className="p-3">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-3 text-slate-500 line-through">
                      {formatCurrency(item.unitListPrice)}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {formatCurrency(item.unitAgreedPrice)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Conditions & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                CONDIÇÕES DE PAGAMENTO E LOGÍSTICA
              </h5>
              <p><strong>Forma de Pagamento:</strong> {proposal.paymentMethod}</p>
              <p><strong>Condição de Frete:</strong> {proposal.freightMethod}</p>
              <p><strong>Prazo Estimado de Entrega:</strong> {proposal.deliveryEstimateDays} dias úteis</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Tabela:</span>
                <span>{formatCurrency(proposal.subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Desconto Concedido pela IA:</span>
                <span>- {formatCurrency(proposal.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-900 pt-2 border-t border-emerald-300">
                <span>TOTAL DA PROPOSTA:</span>
                <span>{formatCurrency(proposal.finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* AI Notes */}
          {proposal.aiNotes && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <strong>Observação da IA Vendedora:</strong> {proposal.aiNotes}
            </div>
          )}

          {/* Signature / Validation Line */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
            <div className="flex items-center space-x-1.5 text-emerald-600 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Validado dentro da margem estipulada pelo proprietário</span>
            </div>
            <div>
              Águia Vendedor IA • {settings.companyName}
            </div>
          </div>
        </div>

        {/* Footer Actions (Non-printable) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end space-x-3 print:hidden">
          {proposal.status !== 'Fechada/Aprovada' && onApproveProposal && (
            <button
              onClick={() => {
                onApproveProposal(proposal.id);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
            >
              Aprovar e Confirmar Venda
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
