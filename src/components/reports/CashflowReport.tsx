import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, DollarSign, Calendar } from 'lucide-react';
import { formatSafe } from '../../lib/utils';
import { Card } from '../ui';
import { Transaction, Expense, SupplierPayment, CompanySettings, ProductReturn } from '../../types';

interface CashflowReportProps {
  transactions: Transaction[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  returns?: ProductReturn[];
  settings: CompanySettings;
}

export const CashflowReport = React.memo(function CashflowReport({
  transactions,
  expenses,
  supplierPayments,
  returns = [],
  settings,
}: CashflowReportProps) {
  const currency = settings.currency || 'DA';

  const flowData = useMemo(() => {
    const activeTx = transactions.filter(t => t.status !== 'returned' && t.status !== 'cancelled');
    const cashInTotal = activeTx.reduce((sum, t) => sum + Number(t.total || 0), 0);

    const inByMethod: Record<string, number> = {};
    activeTx.forEach(t => {
      const method = t.paymentMethod || 'Espèces / Autre';
      inByMethod[method] = (inByMethod[method] || 0) + Number(t.total || 0);
    });

    const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const supplierTotal = supplierPayments.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const returnsTotal = (returns || []).reduce((sum, r) => sum + (Number(r.totalRefund ?? r.refundAmount) || 0), 0);

    const cashOutTotal = expensesTotal + supplierTotal + returnsTotal;
    const netCashflow = cashInTotal - cashOutTotal;

    const timeline = [
      ...activeTx.map(t => ({
        type: 'in' as const,
        title: `Vente #${String(t.id || '').slice(-8)}`,
        category: t.paymentMethod || 'Vente',
        amount: Number(t.total || 0),
        timestamp: t.timestamp || (t as any).date || new Date().toISOString(),
        user: t.employeeName || 'Caisse',
      })),
      ...expenses.map(e => ({
        type: 'out' as const,
        title: `Dépense: ${e.description || e.category}`,
        category: e.category || 'Charge',
        amount: Number(e.amount || 0),
        timestamp: e.date || new Date().toISOString(),
        user: 'Administration',
      })),
      ...supplierPayments.map(s => ({
        type: 'out' as const,
        title: `Règlement Fournisseur`,
        category: 'Fournisseur',
        amount: Number(s.amount || 0),
        timestamp: s.date || new Date().toISOString(),
        user: 'Achats',
      })),
      ...(returns || []).map(r => ({
        type: 'out' as const,
        title: `Remboursement Client (Retour #${String(r.id || '').slice(-8)})`,
        category: 'Retour',
        amount: Number(r.totalRefund ?? r.refundAmount) || 0,
        timestamp: r.timestamp || r.date || new Date().toISOString(),
        user: 'Caisse',
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      cashInTotal,
      inByMethod,
      expensesTotal,
      supplierTotal,
      returnsTotal,
      cashOutTotal,
      netCashflow,
      timeline: timeline.slice(0, 50),
    };
  }, [transactions, expenses, supplierPayments, returns]);

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card id="card-cash-in" className="p-6 border-l-4 border-l-emerald-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Entrées (Ventes)</p>
            <ArrowUpRight className="text-emerald-500" size={18} />
          </div>
          <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            +{flowData.cashInTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Chiffre d'affaires encaissé</p>
        </Card>

        <Card id="card-cash-out" className="p-6 border-l-4 border-l-rose-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Sorties (Charges + Fourn.)</p>
            <ArrowDownRight className="text-rose-500" size={18} />
          </div>
          <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400">
            -{flowData.cashOutTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Dépenses ({flowData.expensesTotal.toLocaleString('fr-DZ')}), Fournisseurs ({flowData.supplierTotal.toLocaleString('fr-DZ')})
          </p>
        </Card>

        <Card id="card-cash-net" className={`p-6 border-l-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl ${flowData.netCashflow >= 0 ? 'border-l-indigo-500' : 'border-l-amber-500'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Trésorerie Nette</p>
            <Wallet className="text-indigo-500" size={18} />
          </div>
          <h4 className={`text-2xl font-black ${flowData.netCashflow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {flowData.netCashflow >= 0 ? '+' : ''}{flowData.netCashflow.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Solde net disponible</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card id="card-cash-methods" className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <h4 className="font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2 text-sm uppercase">
            <DollarSign size={18} className="text-emerald-500" />
            Entrées par Moyen de Paiement
          </h4>
          <div className="space-y-3">
            {Object.entries(flowData.inByMethod).map(([method, amount]) => {
              const percent = flowData.cashInTotal > 0 ? (amount / flowData.cashInTotal) * 100 : 0;
              return (
                <div key={method} className="bg-slate-50 dark:bg-zinc-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600 dark:text-zinc-300 uppercase">{method}</span>
                    <span className="text-slate-900 dark:text-white font-black">
                      {amount.toLocaleString('fr-DZ')} {currency} ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card id="card-cash-timeline" className="p-0 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl lg:col-span-2">
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800">
            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase">
              <Calendar size={18} className="text-indigo-500" />
              Journal des Flux de Trésorerie (50 derniers mouvements)
            </h4>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/80 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Opération</th>
                  <th className="p-3.5">Catégorie</th>
                  <th className="p-3.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {flowData.timeline.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3.5 text-xs font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{item.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">Par: {item.user}</p>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.type === 'in'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className={`p-3.5 text-right font-black font-mono text-xs whitespace-nowrap ${
                      item.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.type === 'in' ? '+' : '-'}{item.amount.toLocaleString('fr-DZ')} {currency}
                    </td>
                  </tr>
                ))}
                {flowData.timeline.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                      Aucun mouvement enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
});
