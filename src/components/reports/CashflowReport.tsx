import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, DollarSign, Calendar } from 'lucide-react';
import { formatSafe } from '../../lib/utils';
import { Card } from '../ui';
import { Transaction, Expense, SupplierPayment, CompanySettings } from '../../types';

interface CashflowReportProps {
  transactions: Transaction[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  settings: CompanySettings;
}

export const CashflowReport = React.memo(function CashflowReport({
  transactions,
  expenses,
  supplierPayments,
  settings,
}: CashflowReportProps) {
  const flowData = useMemo(() => {
    // Cash In: Transactions (sales)
    const activeTx = transactions.filter(t => t.status !== 'returned');
    const cashInTotal = activeTx.reduce((sum, t) => sum + t.total, 0);

    // Cash In breakdown by method
    const inByMethod: Record<string, number> = {};
    activeTx.forEach(t => {
      const method = t.paymentMethod || 'Autre / Inconnu';
      inByMethod[method] = (inByMethod[method] || 0) + t.total;
    });

    // Cash Out: Expenses
    const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Cash Out: Supplier Payments
    const supplierTotal = supplierPayments.reduce((sum, s) => sum + s.amount, 0);

    const cashOutTotal = expensesTotal + supplierTotal;
    const netCashflow = cashInTotal - cashOutTotal;

    // Timeline of all transactions, expenses, supplier payments combined
    const timeline = [
      ...activeTx.map(t => ({
        type: 'in' as const,
        title: `Vente #${t.id.slice(-8)}`,
        category: t.paymentMethod || 'Vente',
        amount: t.total,
        timestamp: t.timestamp,
        user: t.employeeName || 'Système',
      })),
      ...expenses.map(e => ({
        type: 'out' as const,
        title: `Dépense: ${e.description || e.category}`,
        category: e.category,
        amount: e.amount,
        timestamp: e.date,
        user: 'Administrateur',
      })),
      ...supplierPayments.map(s => ({
        type: 'out' as const,
        title: `Paiement Fournisseur`,
        category: 'Fournisseur',
        amount: s.amount,
        timestamp: s.date,
        user: 'Acheteur',
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      cashInTotal,
      inByMethod,
      expensesTotal,
      supplierTotal,
      cashOutTotal,
      netCashflow,
      timeline: timeline.slice(0, 30), // Top 30 recent ops
    };
  }, [transactions, expenses, supplierPayments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card id="card-cash-in" className="p-6 border-l-4 border-l-emerald-500 bg-white/5 text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Entrées (Ventes)</p>
            <ArrowUpRight className="text-emerald-500" size={18} />
          </div>
          <h4 className="text-3xl font-black text-emerald-400">+{flowData.cashInTotal.toLocaleString()} {settings.currency}</h4>
          <p className="text-xs text-white/40 mt-2">Chiffre d'affaires encaissé</p>
        </Card>

        <Card id="card-cash-out" className="p-6 border-l-4 border-l-rose-500 bg-white/5 text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Sorties (Charges + Fournisseurs)</p>
            <ArrowDownRight className="text-rose-500" size={18} />
          </div>
          <h4 className="text-3xl font-black text-rose-400">-{flowData.cashOutTotal.toLocaleString()} {settings.currency}</h4>
          <p className="text-xs text-white/40 mt-2">Dépenses ({flowData.expensesTotal.toLocaleString()}) & Fournisseurs ({flowData.supplierTotal.toLocaleString()})</p>
        </Card>

        <Card id="card-cash-net" className={`p-6 border-l-4 bg-white/5 text-left ${flowData.netCashflow >= 0 ? "border-l-indigo-500" : "border-l-amber-500"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Trésorerie Nette</p>
            <Wallet className="text-indigo-400" size={18} />
          </div>
          <h4 className={`text-3xl font-black ${flowData.netCashflow >= 0 ? "text-indigo-400" : "text-amber-500"}`}>
            {flowData.netCashflow >= 0 ? '+' : ''}{flowData.netCashflow.toLocaleString()} {settings.currency}
          </h4>
          <p className="text-xs text-white/40 mt-2">Solde de trésorerie disponible</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card id="card-cash-methods" className="p-6 bg-white/5 border-white/10 text-left">
          <h4 className="font-black text-white/60 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
            <DollarSign size={18} className="text-emerald-400" />
            Entrées par Moyen de Paiement
          </h4>
          <div className="space-y-4">
            {Object.entries(flowData.inByMethod).map(([method, amount]) => {
              const percent = flowData.cashInTotal > 0 ? (amount / flowData.cashInTotal) * 100 : 0;
              return (
                <div key={method} className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest mb-1">
                    <span className="text-white/60">{method}</span>
                    <span className="text-white">{amount.toLocaleString()} {settings.currency} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card id="card-cash-timeline" className="p-0 overflow-hidden border-white/10 bg-white/5 lg:col-span-2 text-left">
          <div className="p-4 bg-white/5 border-b border-white/10">
            <h4 className="font-black text-white/60 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Calendar size={18} className="text-indigo-400" />
              Journal des Flux de Trésorerie
            </h4>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Type / Catégorie</th>
                  <th className="p-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {flowData.timeline.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-xs font-medium text-white/50 whitespace-nowrap">
                      {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="p-4">
                      <p className="font-black text-white uppercase text-xs tracking-tight">{item.title}</p>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Par: {item.user}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        item.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-black font-mono text-xs whitespace-nowrap ${
                      item.type === 'in' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {item.type === 'in' ? '+' : '-'}{item.amount.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                ))}
                {flowData.timeline.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-white/20">
                      <Wallet className="w-12 h-12 text-white/5 mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest text-xs">Aucun mouvement récent</p>
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
