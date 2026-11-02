import React, { memo } from 'react';
import { FileText, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { PurchasesSummary } from '../purchaseHelpers';

interface PurchasesHistoryKpisProps {
  summary: PurchasesSummary;
}

export const PurchasesHistoryKpis = memo(function PurchasesHistoryKpis({
  summary,
}: PurchasesHistoryKpisProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="industrial-card p-4 flex flex-col justify-between border-l-4 border-indigo-500">
        <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
          <span>Bons d'Achat</span>
          <FileText size={16} className="text-indigo-400" />
        </div>
        <div className="mt-2 text-2xl font-black text-white font-mono">
          {summary.count}
        </div>
        <div className="text-[10px] text-industrial-500 font-bold uppercase tracking-widest mt-1">
          Résultats filtrés
        </div>
      </div>

      <div className="industrial-card p-4 flex flex-col justify-between border-l-4 border-blue-500">
        <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
          <span>Total TTC</span>
          <DollarSign size={16} className="text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-black text-blue-300 font-mono">
          {summary.totalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-industrial-400">DA</span>
        </div>
        <div className="text-[10px] text-industrial-500 font-bold uppercase tracking-widest mt-1">
          Montant global facturé
        </div>
      </div>

      <div className="industrial-card p-4 flex flex-col justify-between border-l-4 border-emerald-500">
        <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
          <span>Total Réglé</span>
          <CheckCircle2 size={16} className="text-emerald-400" />
        </div>
        <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
          {summary.totalPaid.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-industrial-400">DA</span>
        </div>
        <div className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest mt-1">
          Versements effectués
        </div>
      </div>

      <div className={`industrial-card p-4 flex flex-col justify-between border-l-4 ${summary.totalDebt > 0 ? 'border-rose-500 bg-rose-950/10' : 'border-industrial-700'}`}>
        <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
          <span>Reste à Payer (Dette)</span>
          <AlertCircle size={16} className={summary.totalDebt > 0 ? 'text-rose-400' : 'text-industrial-500'} />
        </div>
        <div className={`mt-2 text-2xl font-black font-mono ${summary.totalDebt > 0 ? 'text-rose-400' : 'text-industrial-400'}`}>
          {summary.totalDebt.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-industrial-400">DA</span>
        </div>
        <div className="text-[10px] text-industrial-500 font-bold uppercase tracking-widest mt-1">
          {summary.totalDebt > 0 ? 'Dettes fournisseurs restantes' : 'Tous les comptes sont à jour'}
        </div>
      </div>
    </div>
  );
});
