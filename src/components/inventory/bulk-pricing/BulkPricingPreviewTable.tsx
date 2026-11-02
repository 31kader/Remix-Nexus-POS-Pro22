import React, { memo } from 'react';
import { BulkPricingPreviewItem } from './bulkPricingTypes';

interface BulkPricingPreviewTableProps {
  previewItems: BulkPricingPreviewItem[];
  currency: string;
}

export const BulkPricingPreviewTable = memo(function BulkPricingPreviewTable({
  previewItems,
  currency,
}: BulkPricingPreviewTableProps) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
        Aperçu en direct (5 premiers articles) :
      </span>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="p-2.5">Article</th>
              <th className="p-2.5 text-right">Prix Achat</th>
              <th className="p-2.5 text-right">Prix Détail</th>
              <th className="p-2.5 text-right text-sky-500">Nouveau Gros</th>
              <th className="p-2.5 text-right text-violet-500">Nouveau En Ligne</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950 font-mono">
            {previewItems.map(item => (
              <tr key={item.id}>
                <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                  {item.name}
                </td>
                <td className="p-2.5 text-right text-slate-500">
                  {item.cost.toFixed(2)}
                </td>
                <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {item.retail.toFixed(2)}
                </td>
                <td className="p-2.5 text-right font-black text-sky-600 dark:text-sky-400">
                  {item.newWholesale.toFixed(2)} {currency}
                </td>
                <td className="p-2.5 text-right font-black text-violet-600 dark:text-violet-400">
                  {item.newOnline.toFixed(2)} {currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
