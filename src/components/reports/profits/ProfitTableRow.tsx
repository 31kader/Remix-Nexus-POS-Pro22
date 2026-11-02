import React, { memo } from 'react';
import { ShoppingBag, Package, ShieldCheck, Calculator, Edit2, Receipt } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SafeImage } from '../../ui';
import { Product } from '../../../types';

interface ProfitTableRowProps {
  product: any;
  categoryName: string;
  isAdmin: boolean;
  currency: string;
  onEditProduct?: (product: Product) => void;
  onOpenSalesEdit: (product: any) => void;
  onOpenProfitModal: (product: any) => void;
}

export const ProfitTableRow = memo(function ProfitTableRow({
  product: p,
  categoryName,
  isAdmin,
  currency,
  onEditProduct,
  onOpenSalesEdit,
  onOpenProfitModal
}: ProfitTableRowProps) {
  const safePrice = Number(p.price) || 0;
  const safeCost = Number(p.costPrice) || 0;
  const unitMargin = safePrice - safeCost;
  const unitMarginPct = safeCost > 0 ? (unitMargin / safeCost) * 100 : 0;

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            {onEditProduct && (
              <button
                type="button"
                onClick={() => onEditProduct(p)}
                className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-400 border border-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                title="Modifier la fiche produit"
              >
                <Edit2 size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenSalesEdit(p)}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-400 border border-amber-500/20 transition-all active:scale-95 cursor-pointer"
              title="Inspecter et corriger les ventes de ce produit (Prix achat, prix vente, date, suppression)"
            >
              <Receipt size={13} />
            </button>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {p.imageUrl ? (
              <SafeImage 
                src={p.imageUrl} 
                alt={p.name} 
                className="w-full h-full object-cover" 
                fallback={<Package size={18} className="text-slate-500/20" />}
              />
            ) : (
              <ShoppingBag className="w-4 h-4 text-white/20" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-white text-sm max-w-[180px] truncate uppercase tracking-tight">{p.name}</span>
            <span className="text-[10px] text-white/40 font-black font-mono tracking-widest">#{p.sku || String(p.id || "").slice(0,6)}</span>
          </div>
        </div>
      </td>
      <td className="p-4">
        <span className="px-2 py-1 bg-white/5 text-white/60 rounded-md text-[10px] font-black uppercase tracking-widest border border-white/5">
          {categoryName}
        </span>
      </td>
      <td className="p-4 text-right font-black text-white/80 bg-white/5 text-xs font-mono">
        {p.stats?.qty ?? 0}
      </td>
      <td className="p-4 text-right font-black text-white text-xs font-mono">
        {Number(p.stats?.revenue || 0).toFixed(2)}
      </td>
      <td className="p-4 text-right">
        <div className="flex flex-col items-end">
          <span className={cn("font-black text-xs font-mono", (Number(p.profit) || 0) > 0 ? "text-emerald-400" : (Number(p.profit) || 0) < 0 ? "text-rose-400" : "text-white/40")}>
            {(Number(p.profit) || 0) > 0 ? '+' : ''}{Number(p.profit || 0).toFixed(2)}
          </span>
          <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter mt-0.5">
            (Achat: {Number(p.costPrice || 0).toFixed(2)})
          </span>
        </div>
      </td>
      <td className="p-4 text-right">
        <span className={cn("inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black w-14 font-mono", 
          (Number(p.margin) || 0) > 30 ? "text-emerald-400 bg-emerald-400/10" : (Number(p.margin) || 0) > 15 ? "text-amber-400 bg-amber-400/10" : (Number(p.margin) || 0) > 0 ? "text-rose-400 bg-rose-400/10" : "text-white/20 bg-white/5")}>
          {Number(p.margin || 0).toFixed(0)}%
        </span>
      </td>
      {isAdmin && (
        <td className="p-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="flex flex-col items-end text-right">
              <span className={cn("text-[11px] font-black font-mono", (Number(unitMargin) || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {(Number(unitMargin) || 0) >= 0 ? '+' : ''}{Number(unitMargin || 0).toFixed(2)} {currency}
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                ({Number(unitMarginPct || 0).toFixed(0)}%)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenSalesEdit(p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Inspecter et modifier les ventes de ce produit (Prix, date, suppression)"
            >
              <Receipt size={12} className="text-amber-400" />
              <span>Ventes</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenProfitModal(p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Ajuster le bénéfice de ce produit"
            >
              <ShieldCheck size={13} className="text-indigo-400" />
              <Calculator size={12} />
              <span>Régler</span>
            </button>
          </div>
        </td>
      )}
    </tr>
  );
});
