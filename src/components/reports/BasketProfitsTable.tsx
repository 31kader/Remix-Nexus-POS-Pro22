import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice, formatSafe, cn } from '../../lib/utils';
import { CompanySettings } from '../../types';

export interface BasketProfitsTableProps {
  pagedList: any[];
  expandedBasketId: string | null;
  setExpandedBasketId: (id: string | null) => void;
  resolveCostPerUnit: (item: any) => number;
  settings: CompanySettings;
}

export const BasketProfitsTable: React.FC<BasketProfitsTableProps> = ({
  pagedList,
  expandedBasketId,
  setExpandedBasketId,
  resolveCostPerUnit,
  settings
}) => {
  return (
    <table className="w-full text-left border-collapse min-w-[850px]">
      <thead>
        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <th className="p-4">N° Ticket / Panier</th>
          <th className="p-4">Date & Heure</th>
          <th className="p-4">Client / Caissier</th>
          <th className="p-4 text-center">Nombre Articles</th>
          <th className="p-4 text-right">Total CA Panier</th>
          <th className="p-4 text-right">Coût Marchandises</th>
          <th className="p-4 text-right">Bénéfice Net Panier</th>
          <th className="p-4 text-right">Rentabilité Marge</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/60 text-xs">
        {pagedList.map((basket: any) => {
          const isExpanded = expandedBasketId === basket.id;
          return (
            <React.Fragment key={basket.id}>
              <tr 
                onClick={() => setExpandedBasketId(isExpanded ? null : basket.id)}
                className={cn(
                  "transition-colors cursor-pointer select-none",
                  isExpanded ? "bg-indigo-950/40 hover:bg-indigo-950/50" : "hover:bg-white/5"
                )}
                title="Cliquer pour afficher/masquer le détail des articles de ce panier"
              >
                <td className="p-4 font-mono font-bold text-indigo-400">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp size={14} className="text-indigo-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
                    <span>#{basket.id.slice(-8).toUpperCase()}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-300 font-mono text-xs">
                  {formatSafe(basket.timestamp, 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="p-4">
                  <p className="font-bold text-white text-xs">{basket.customerName}</p>
                  <p className="text-[10px] text-slate-500">Caissier : {basket.employeeName}</p>
                </td>
                <td className="p-4 text-center">
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold">
                    {basket.itemsCount} art.
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-black text-white">
                  {formatPrice(basket.basketTotal)} {settings.currency}
                </td>
                <td className="p-4 text-right font-mono text-slate-400 text-xs">
                  {formatPrice(basket.basketCost)} {settings.currency}
                </td>
                <td className="p-4 text-right font-mono font-black text-emerald-400 text-sm">
                  +{formatPrice(basket.basketProfit)} {settings.currency}
                </td>
                <td className="p-4 text-right">
                  <span className={`px-2.5 py-1 rounded-lg font-black font-mono text-xs border ${
                    basket.marginPercent >= 25 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : basket.marginPercent >= 10 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {basket.marginPercent.toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Ligne accordéon : Détail des articles du panier */}
              {isExpanded && (
                <tr className="bg-slate-950/80 border-b border-indigo-500/20">
                  <td colSpan={8} className="p-3 pl-8">
                    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                          Détail des articles du Ticket #{basket.id.slice(-8).toUpperCase()} ({basket.items?.length || 0} référence(s))
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">
                          Total : {formatPrice(basket.basketTotal)} {settings.currency}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[9px] uppercase font-black text-slate-500 border-b border-slate-800 pb-1">
                              <th className="pb-1.5">Article</th>
                              <th className="pb-1.5 text-center">Quantité</th>
                              <th className="pb-1.5 text-right">Prix Vente</th>
                              <th className="pb-1.5 text-right">Sous-Total</th>
                              <th className="pb-1.5 text-right">Coût Est.</th>
                              <th className="pb-1.5 text-right">Bénéfice</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {(basket.items || []).map((item: any, idx: number) => {
                              const qty = Number(item.quantity) || 1;
                              const price = Number(item.price) || 0;
                              const itemRev = qty * price;
                              const unitCost = resolveCostPerUnit(item);
                              const itemCost = qty * unitCost;
                              const itemProfit = itemRev - itemCost;
                              return (
                                <tr key={idx} className="hover:bg-white/5">
                                  <td className="py-1.5 text-white font-medium">
                                    {item.name || 'Article'}
                                    {item.sku && <span className="text-[9px] text-slate-400 font-mono ml-2">({item.sku})</span>}
                                  </td>
                                  <td className="py-1.5 text-center font-mono font-bold text-slate-300">{qty}</td>
                                  <td className="py-1.5 text-right font-mono text-slate-400">{formatPrice(price)} {settings.currency}</td>
                                  <td className="py-1.5 text-right font-mono font-bold text-white">{formatPrice(itemRev)} {settings.currency}</td>
                                  <td className="py-1.5 text-right font-mono text-slate-400">{formatPrice(itemCost)} {settings.currency}</td>
                                  <td className="py-1.5 text-right font-mono font-bold text-emerald-400">+{formatPrice(itemProfit)} {settings.currency}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
        {pagedList.length === 0 && (
          <tr>
            <td colSpan={8} className="p-6 text-center text-slate-500 font-mono">
              AUCUN PANIER TROUVÉ SUR CETTE PÉRIODE
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
