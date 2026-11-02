import React from 'react';
import { Tag, Gift } from 'lucide-react';
import { Card } from '../../ui';
import { cn, formatSafe } from '../../../lib/utils';
import { PromoTransaction } from './fidelityTypes';

interface FidelityPromoTransactionsTableProps {
  transactions: PromoTransaction[];
  totalFilteredCount: number;
  currency: string;
}

export const FidelityPromoTransactionsTable: React.FC<FidelityPromoTransactionsTableProps> = ({
  transactions,
  totalFilteredCount,
  currency,
}) => {
  return (
    <Card id="card-fidelity-promo-table" className="overflow-hidden bg-zinc-900/90 border border-zinc-800">
      <div className="bg-zinc-950/60 p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag size={18} className="text-amber-400" />
          <h4 className="font-black text-white uppercase tracking-tight text-sm">
            Historique des Ventes avec Remises, Bons d&apos;Achat & Points
          </h4>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          {totalFilteredCount} Transaction(s)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800">
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Date / Ticket</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Client</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Remise Directe</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Bon d&apos;Achat</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Points Utilisés</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Net Payé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors">
                <td className="p-4">
                  <p className="font-bold text-white">{formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">#{String(t.id || '').slice(-8)}</p>
                </td>
                <td className="p-4">
                  <span className="font-bold text-zinc-200">{t.customerName || 'Client de passage'}</span>
                </td>
                <td className="p-4 text-right">
                  <span
                    className={cn(
                      'font-bold text-sm',
                      t.computedDiscount > 0 ? 'text-rose-400' : 'text-zinc-600'
                    )}
                  >
                    -{t.computedDiscount.toFixed(2)} {currency}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span
                    className={cn(
                      'font-bold text-sm',
                      (t.voucherDiscount || 0) > 0 ? 'text-emerald-400' : 'text-zinc-600'
                    )}
                  >
                    -{(t.voucherDiscount || 0).toFixed(2)} {currency}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span
                    className={cn(
                      'font-bold text-sm',
                      (t.pointsDiscount || 0) > 0 ? 'text-amber-400' : 'text-zinc-600'
                    )}
                  >
                    -{(t.pointsDiscount || 0).toFixed(2)} {currency}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-black text-white text-base">
                    {Number(t.total || 0).toFixed(2)} {currency}
                  </span>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  <Gift className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="font-medium">Aucune vente avec remise ou bon d&apos;achat sur cette période.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
