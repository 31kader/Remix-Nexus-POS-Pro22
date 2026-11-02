import React from 'react';
import { Crown, Users } from 'lucide-react';
import { Card } from '../../ui';
import { cn, formatSafe } from '../../../lib/utils';
import { EnrichedCustomer } from './fidelityTypes';

interface FidelityCustomersTableProps {
  customers: EnrichedCustomer[];
  totalFilteredCount: number;
  currentPage: number;
  itemsPerPage: number;
  currency: string;
}

export const FidelityCustomersTable: React.FC<FidelityCustomersTableProps> = ({
  customers,
  totalFilteredCount,
  currentPage,
  itemsPerPage,
  currency,
}) => {
  return (
    <Card className="overflow-hidden bg-zinc-900/90 border border-zinc-800">
      <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Crown size={18} className="text-amber-400" />
          <h4 className="font-black text-white uppercase tracking-tight text-sm">
            Palmarès Fidélité Clients & Points Cumulés
          </h4>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          {totalFilteredCount} Client(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800">
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Rang & Client</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Téléphone</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-center">Palier Fidélité</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-center">Achats</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Points Fidélité</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Total Dépensé</th>
              <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Solde / Crédit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {customers.map((c, idx) => {
              const rank = (currentPage - 1) * itemsPerPage + idx + 1;
              return (
                <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                          rank === 1
                            ? 'bg-amber-500 text-zinc-950'
                            : rank === 2
                              ? 'bg-slate-300 text-zinc-950'
                              : rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-zinc-800 text-zinc-400'
                        )}
                      >
                        #{rank}
                      </span>
                      <div>
                        <p className="font-bold text-white">{c.name || 'Client Sans Nom'}</p>
                        {c.lastPurchase && (
                          <p className="text-[10px] text-zinc-500">
                            Dernier achat : {formatSafe(c.lastPurchase, 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-zinc-300">{c.phone || '—'}</td>
                  <td className="p-4 text-center">
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase border', c.tier.color)}>
                      {c.tier.label}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-zinc-300">{c.txCount}</td>
                  <td className="p-4 text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-black text-xs border border-amber-500/30">
                      {c.points.toLocaleString()} Pts
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-emerald-400">
                    {c.computedSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                  <td className="p-4 text-right">
                    {(() => {
                      const bal = Number(c.balance || 0);
                      if (bal < 0) {
                        return (
                          <span className="font-bold text-xs text-rose-400">
                            Dette: {Math.abs(bal).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                          </span>
                        );
                      }
                      if (bal > 0) {
                        return (
                          <span className="font-bold text-xs text-emerald-400">
                            Avoir: {bal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                          </span>
                        );
                      }
                      return (
                        <span className="font-bold text-xs text-zinc-400">
                          0.00 {currency}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400">
                  <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="font-semibold">Aucun client trouvé pour cette recherche.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
