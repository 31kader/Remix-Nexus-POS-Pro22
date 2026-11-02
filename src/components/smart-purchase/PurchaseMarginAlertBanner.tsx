import React from 'react';
import { AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { Product } from '../../types';
import { computeMarginStats, suggestSellingPrice } from './operations/marginAlertDetector';

interface PurchaseMarginAlertBannerProps {
  items: PurchaseCartItem[];
  products: Product[];
  onApplySuggestedPrices: (updates: { productId: string; newPrice: number; name: string }[]) => void;
}

export const PurchaseMarginAlertBanner: React.FC<PurchaseMarginAlertBannerProps> = ({
  items,
  products,
  onApplySuggestedPrices
}) => {
  const productMap = new Map<string, Product>();
  products.forEach(p => { if (p.id) productMap.set(p.id, p); });

  let negativeCount = 0;
  let lowMarginCount = 0;
  const updates: { productId: string; newPrice: number; name: string }[] = [];

  for (const item of items) {
    if (!item.productId) continue;
    const prod = productMap.get(item.productId);
    if (!prod) continue;

    const stats = computeMarginStats(item.costPrice, prod.price);
    if (stats.level === 'CRITICAL_NEGATIVE') {
      negativeCount++;
      const suggested = suggestSellingPrice(item.costPrice, 25);
      updates.push({ productId: prod.id, newPrice: suggested, name: prod.name });
    } else if (stats.level === 'WARNING_LOW') {
      lowMarginCount++;
      const suggested = suggestSellingPrice(item.costPrice, 25);
      updates.push({ productId: prod.id, newPrice: suggested, name: prod.name });
    }
  }

  const totalIssues = negativeCount + lowMarginCount;
  if (totalIssues === 0) return null;

  const isSevere = negativeCount > 0;

  return (
    <div className={`p-3.5 mb-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all animate-in fade-in ${
      isSevere 
        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isSevere ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
          <AlertTriangle size={20} className={isSevere ? 'animate-bounce' : ''} />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <span>Alerte Rentabilité Achats</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isSevere ? 'bg-rose-500 text-white' : 'bg-amber-500 text-industrial-950'
            }`}>
              {totalIssues} {totalIssues > 1 ? 'articles impactés' : 'article impacté'}
            </span>
          </h4>
          <p className="text-xs mt-0.5 opacity-90">
            {negativeCount > 0 && (
              <span className="font-bold text-rose-400 mr-2">
                ⚠️ {negativeCount} en vente à perte (Prix Achat &gt; Prix Vente)
              </span>
            )}
            {lowMarginCount > 0 && (
              <span className="font-medium text-amber-300">
                ⚠️ {lowMarginCount} avec marge critique (&lt; 8%)
              </span>
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApplySuggestedPrices(updates)}
        className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
        title="Applique un prix de vente garantissant 25% de marge sur les articles à risque"
      >
        <Sparkles size={13} className="text-amber-300" />
        <span className="whitespace-nowrap">Réajuster à 25% de marge</span>
      </button>
    </div>
  );
};
