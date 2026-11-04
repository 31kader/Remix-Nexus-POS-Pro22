import React from 'react';
import { Edit3 } from 'lucide-react';
import { Supplier } from '../../../types';
import { Card } from '../../ui';
import { formatPrice } from '../../../lib/utils';

interface SupplierTableViewProps {
  suppliers: Supplier[];
  currency?: string;
  onQuickPaySupplier?: (supplier: Supplier) => void;
  onViewPurchases: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
}

export const SupplierTableView: React.FC<SupplierTableViewProps> = ({
  suppliers,
  currency = 'DA',
  onQuickPaySupplier,
  onViewPurchases,
  onEditSupplier
}) => {
  return (
    <Card className="overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800">
              <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">Fournisseur</th>
              <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">Contact / Tél</th>
              <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">Jours Planning</th>
              <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">Solde / Dette</th>
              <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
            {suppliers.map((supplier) => {
              const debt = Number(supplier.balance) || 0;
              return (
                <tr key={supplier.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3.5">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight">{supplier.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">{supplier.contactName || 'Contact standard'}</p>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-slate-700 dark:text-zinc-300">
                    {supplier.phone || '—'}
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(supplier.deliveryDays || []).map(d => (
                        <span key={`del-${d}`} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">
                          🚚 {d.slice(0, 3)}
                        </span>
                      ))}
                      {(supplier.paymentDays || []).map(d => (
                        <span key={`pay-${d}`} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase">
                          💳 {d.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-financial font-black text-xs tabular-nums">
                    <span className={debt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {formatPrice(debt)} {currency}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onQuickPaySupplier && (
                        <button
                          type="button"
                          onClick={() => onQuickPaySupplier(supplier)}
                          className="btn-touch-action px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                        >
                          💳 Verser
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewPurchases(supplier)}
                        className="btn-touch-action px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                      >
                        Détails
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSupplier(supplier)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-white cursor-pointer rounded-lg hover:bg-zinc-800"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
