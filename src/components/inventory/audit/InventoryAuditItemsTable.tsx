import React from 'react';
import { Trash2 } from 'lucide-react';
import { Product } from '../../../types';
import { cn } from '../../../lib/utils';

interface InventoryAuditItemsTableProps {
  visibleAuditItems: any[];
  products: Product[];
  blindCountMode: boolean;
  currency: string;
  updateActualStock: (productId: string, actual: number) => void;
  updateItemNote: (productId: string, notes: string) => void;
  removeItemFromAudit: (productId: string) => void;
}

export const InventoryAuditItemsTable: React.FC<InventoryAuditItemsTableProps> = ({
  visibleAuditItems,
  products,
  blindCountMode,
  currency,
  updateActualStock,
  updateItemNote,
  removeItemFromAudit,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-[52vh] overflow-y-auto">
      {visibleAuditItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs font-bold">
          Aucun article dans cette vue. Recherchez un article ou chargez un rayon ci-dessus.
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400">Article & Réf</th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-center">
                Stock Théorique
              </th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-center">
                Stock Physique Compté
              </th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-center">
                Écart Quantité
              </th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-right">
                Valeur Écart ({currency})
              </th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400">
                Emplacement / Motif
              </th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {visibleAuditItems.map(item => {
              const prod = products.find(p => p.id === item.productId);
              const cost = Number(prod?.costPrice || item.costPrice) || 0;
              const impactVal = (Number(item.discrepancy) || 0) * cost;
              return (
                <tr key={item.productId} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40">
                  <td className="p-3">
                    <p className="text-xs font-black text-slate-900 dark:text-white">{item.productName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {item.sku || prod?.sku || prod?.barcode || 'Sans Réf'}
                    </p>
                  </td>

                  <td className="p-3 text-center font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                    {blindCountMode ? '🔒 Masqué' : item.expectedStock}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateActualStock(item.productId, Math.max(0, Number(item.actualStock) - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-white font-black text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.actualStock}
                        onChange={e => updateActualStock(item.productId, parseInt(e.target.value) || 0)}
                        className="w-20 h-8 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-center font-mono font-black text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateActualStock(item.productId, Number(item.actualStock) + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-white font-black text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-black font-mono inline-block',
                        item.discrepancy === 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : item.discrepancy > 0
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                    </span>
                  </td>

                  <td
                    className={cn(
                      'p-3 text-right font-mono text-xs font-bold',
                      impactVal < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : impactVal > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400'
                    )}
                  >
                    {impactVal >= 0 ? '+' : ''}
                    {impactVal.toFixed(0)} {currency}
                  </td>

                  <td className="p-3">
                    <input
                      type="text"
                      placeholder="Rayon / Observation..."
                      value={item.notes || ''}
                      onChange={e => updateItemNote(item.productId, e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-white outline-none"
                    />
                  </td>

                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeItemFromAudit(item.productId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
