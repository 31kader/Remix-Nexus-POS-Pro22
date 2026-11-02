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
    <Card className="overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Fournisseur</th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Contact / Tél</th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Jours Planning</th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 text-right">Solde / Dette</th>
              <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {suppliers.map((supplier) => {
              const debt = Number(supplier.balance) || 0;
              return (
                <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase">{supplier.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{supplier.contactName || 'Contact standard'}</p>
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                    {supplier.phone || '—'}
                  </td>
                  <td className="p-3">
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
                  <td className="p-3 text-right font-mono font-black text-xs">
                    <span className={debt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {formatPrice(debt)} {currency}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onQuickPaySupplier && (
                        <button
                          type="button"
                          onClick={() => onQuickPaySupplier(supplier)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                        >
                          💳 Verser
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewPurchases(supplier)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                      >
                        Détails
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSupplier(supplier)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white cursor-pointer"
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
