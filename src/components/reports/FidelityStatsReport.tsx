import React, { useMemo } from 'react';
import { Gift, Tag } from 'lucide-react';
import { formatSafe, cn } from '../../lib/utils';
import { Card } from '../ui';
import { Transaction, CompanySettings } from '../../types';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';

interface FidelityStatsReportProps {
  transactions: Transaction[];
  settings: CompanySettings;
  marketingFilterDate: 'today' | 'week' | 'month' | 'year' | 'all';
  setMarketingFilterDate: (date: 'today' | 'week' | 'month' | 'year' | 'all') => void;
}

export const FidelityStatsReport = React.memo(function FidelityStatsReport({
  transactions,
  settings,
  marketingFilterDate,
  setMarketingFilterDate,
}: FidelityStatsReportProps) {
  const marketingData = useMemo(() => {
    let filtered = transactions.filter(t => t.status !== 'returned');
    
    filtered = filtered.filter(t => {
      const tDate = new Date(t.timestamp);
      if (isNaN(tDate.getTime())) return false;
      if (marketingFilterDate === 'today' && !isToday(tDate)) return false;
      if (marketingFilterDate === 'week' && !isThisWeek(tDate, { weekStartsOn: 1 })) return false;
      if (marketingFilterDate === 'month' && !isThisMonth(tDate)) return false;
      if (marketingFilterDate === 'year' && !isThisYear(tDate)) return false;
      return true;
    });

    let totalDiscounts = 0;
    let totalVouchers = 0;
    let totalPointsDiscount = 0;
    let transactionsWithPromos: Transaction[] = [];

    filtered.forEach(t => {
      const d = t.discountAmount || 0;
      const v = t.voucherDiscount || 0;
      const p = t.pointsDiscount || 0;

      if (d > 0 || v > 0 || p > 0) {
        totalDiscounts += d;
        totalVouchers += v;
        totalPointsDiscount += p;
        transactionsWithPromos.push(t);
      }
    });

    transactionsWithPromos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      totalDiscounts,
      totalVouchers,
      totalPointsDiscount,
      totalSavings: totalDiscounts + totalVouchers + totalPointsDiscount,
      transactions: transactionsWithPromos
    };
  }, [transactions, marketingFilterDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
         <div className="bg-workspace px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
           <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Période:</label>
           <select 
             value={marketingFilterDate} 
             onChange={e => setMarketingFilterDate(e.target.value as any)}
             className="text-sm font-bold border-none bg-transparent outline-none cursor-pointer"
           >
             <option value="all">Toutes périodes</option>
             <option value="today">Aujourd'hui</option>
             <option value="week">Cette semaine</option>
             <option value="month">Ce mois-ci</option>
             <option value="year">Cette année</option>
           </select>
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card id="card-fidelity-saved" className="p-6 border-l-4 border-l-amber-500 bg-amber-50/30">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Gift size={14} /> Total Économisé
          </p>
          <h4 className="text-2xl font-black text-slate-800">{marketingData.totalSavings.toFixed(2)} {settings.currency}</h4>
        </Card>
        <Card id="card-fidelity-discounts" className="p-6 border-l-4 border-l-rose-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remises Directes</p>
          <h4 className="text-xl font-bold text-slate-800">{marketingData.totalDiscounts.toFixed(2)} {settings.currency}</h4>
        </Card>
        <Card id="card-fidelity-vouchers" className="p-6 border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bons d'Achat Utilisés</p>
          <h4 className="text-xl font-bold text-slate-800">{marketingData.totalVouchers.toFixed(2)} {settings.currency}</h4>
        </Card>
        <Card id="card-fidelity-points" className="p-6 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Points Fidélité Dépensés</p>
          <h4 className="text-xl font-bold text-slate-800">{marketingData.totalPointsDiscount.toFixed(2)} {settings.currency}</h4>
        </Card>
      </div>
      
      <Card id="card-fidelity-promo-table" className="overflow-hidden border-slate-200">
         <div className="bg-workspace p-4 border-b border-slate-200 flex items-center gap-3">
            <Tag size={18} className="text-indigo-500" />
            <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm">
              Historique des Ventes avec avantages
            </h4>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm border-collapse">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-100">
                 <th className="p-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Date / ID</th>
                 <th className="p-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Client</th>
                 <th className="p-4 font-black uppercase text-[10px] text-slate-400 tracking-widest text-right">Remise</th>
                 <th className="p-4 font-black uppercase text-[10px] text-slate-400 tracking-widest text-right">Bon d'Achat</th>
                 <th className="p-4 font-black uppercase text-[10px] text-slate-400 tracking-widest text-right">Fidélité</th>
                 <th className="p-4 font-black uppercase text-[10px] text-slate-400 tracking-widest text-right">Montant Final Payé</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {marketingData.transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</p>
                      <p className="text-[10px] text-slate-400 font-mono">#{t.id.slice(-8)}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700">{t.customerName || 'Client de passage'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("font-bold text-sm", (t.discountAmount || 0) > 0 ? "text-rose-600" : "text-slate-300")}>
                        -{(t.discountAmount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("font-bold text-sm", (t.voucherDiscount || 0) > 0 ? "text-emerald-600" : "text-slate-300")}>
                        -{(t.voucherDiscount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("font-bold text-sm", (t.pointsDiscount || 0) > 0 ? "text-blue-600" : "text-slate-300")}>
                        -{(t.pointsDiscount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-slate-800 text-lg">
                        {t.total.toFixed(2)} {settings.currency}
                      </span>
                    </td>
                  </tr>
                ))}
                {marketingData.transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      <Gift className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="font-medium">Aucun avantage client utilisé sur cette période.</p>
                    </td>
                  </tr>
                )}
             </tbody>
           </table>
         </div>
      </Card>
    </div>
  );
});
