import React, { useState, useMemo, memo } from 'react';
// @ts-ignore
import { createPortal } from 'react-dom';
import { ShoppingBag, ArrowUpDown, ChevronUp, ChevronDown, Package, ShieldCheck, Calculator, Save, X, TrendingUp, Edit2, Receipt } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SafeImage } from '../../ui';
import { Category, Product, Transaction, CompanySettings } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCoreStore } from '../../../store/useCoreStore';
import { useTransactionStore } from '../../../store/useTransactionStore';
import { localDb } from '../../../services/LocalDatabase';
import { toast } from 'sonner';
import { ProductSalesEditModal } from './ProductSalesEditModal';

interface ProfitsReportTableProps {
  productProfitData: any[];
  categories: Category[];
  handleProfitSort: (key: 'revenue' | 'profit' | 'margin' | 'qty') => void;
  profitSortFormat: string;
  onEditProduct?: (product: Product) => void;
  transactions?: Transaction[];
  settings?: CompanySettings;
}

export const ProfitsReportTable = memo(function ProfitsReportTable({
  productProfitData,
  categories,
  handleProfitSort,
  profitSortFormat,
  onEditProduct,
  transactions = [],
  settings
}: ProfitsReportTableProps) {
  const profile = useAuthStore(s => s.profile);
  const userRole = useAuthStore(s => (s as any).role) || profile?.role || 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'owner' || profile?.role === 'admin';
  const currency = useCoreStore(s => s.settings?.currency || settings?.currency || 'DA');

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [salesEditProduct, setSalesEditProduct] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCostPrice, setEditCostPrice] = useState<string>('');
  const [desiredProfit, setDesiredProfit] = useState<string>('');
  const [desiredMargin, setDesiredMargin] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Pagination (Règle GEMINI.md : 50 items/page obligatoire)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil((productProfitData?.length || 0) / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return (productProfitData || []).slice(start, start + ITEMS_PER_PAGE);
  }, [productProfitData, currentPage]);

  // Indexation O(1) des catégories pour éviter .find() dans le tableau
  const categoriesMap = useMemo(() => {
    return new Map((categories || []).map(c => [c.id, c.name]));
  }, [categories]);

  const handleOpenProfitModal = (p: any) => {
    setSelectedProduct(p);
    setEditPrice((p.price ?? 0).toString());
    setEditCostPrice((p.costPrice ?? 0).toString());
    setDesiredProfit('');
    setDesiredMargin('');
  };

  const currentPrice = parseFloat(editPrice || '0');
  const currentCost = parseFloat(editCostPrice || '0');
  const currentProfitVal = currentPrice - currentCost;
  const currentMarginVal = currentCost > 0 ? ((currentProfitVal / currentCost) * 100).toFixed(1) : '0';

  const handleDesiredProfitChange = (valStr: string) => {
    setDesiredProfit(valStr);
    setDesiredMargin('');
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setEditPrice(Math.max(0, currentCost + val).toFixed(2));
    }
  };

  const handleDesiredMarginChange = (valStr: string) => {
    setDesiredMargin(valStr);
    setDesiredProfit('');
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setEditPrice(Math.max(0, currentCost * (1 + val / 100)).toFixed(2));
    }
  };

  const handleApplyPresetMargin = (marginPct: number) => {
    setDesiredMargin(marginPct.toString());
    setDesiredProfit('');
    setEditPrice(Math.max(0, currentCost * (1 + marginPct / 100)).toFixed(2));
  };

  const handleApplyPresetProfit = (profitAmount: number) => {
    setDesiredProfit(profitAmount.toString());
    setDesiredMargin('');
    setEditPrice(Math.max(0, currentCost + profitAmount).toFixed(2));
  };

  const handleSaveProfit = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);

    try {
      const newPrice = parseFloat(editPrice || '0');
      const newCost = parseFloat(editCostPrice || '0');

      const rawProducts = useCoreStore.getState().products;
      const existingProd = rawProducts.find(p => p.id === selectedProduct.id) || selectedProduct;

      // Extract raw product properties without temporary stats/profit/margin from report table
      const { stats, profit, margin, ...cleanProd } = existingProd;

      const updatedProduct: Product = {
        ...cleanProd,
        price: newPrice,
        costPrice: newCost,
        updatedAt: new Date().toISOString()
      };

      // 1. Update local database & trigger Supabase sync
      await localDb.update(`products/${selectedProduct.id}`, updatedProduct);

      // 2. Dispatch cache update event for real-time mobile/desktop sync
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProduct }));

      // 3. Update Zustand global store
      useCoreStore.getState().setProducts(
        rawProducts.map(prod => prod.id === selectedProduct.id ? updatedProduct : prod)
      );

      toast.success(`Bénéfice de "${updatedProduct.name}" mis à jour avec succès ! (${newPrice.toFixed(2)} ${currency})`);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du bénéfice:", error);
      toast.error("Erreur lors de l'enregistrement du bénéfice.");
    } finally {
      setIsSaving(false);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    const isCurrent = profitSortFormat.startsWith(column);
    const isAsc = profitSortFormat.endsWith('asc');
    
    if (!isCurrent) return <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />;
    return isAsc 
      ? <ChevronUp size={12} className="text-indigo-400" /> 
      : <ChevronDown size={12} className="text-indigo-400" />;
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            <th className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest">Produit</th>
            <th className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest">Catégorie</th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('qty')}
            >
              <div className="flex items-center justify-end gap-1">Qté <SortIcon column="qty" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('revenue')}
            >
              <div className="flex items-center justify-end gap-1">Chiffre Aff. <SortIcon column="revenue" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('profit')}
            >
              <div className="flex items-center justify-end gap-1">Bénéfice <SortIcon column="profit" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('margin')}
            >
              <div className="flex items-center justify-end gap-1">Marge % <SortIcon column="margin" /></div>
            </th>
            {isAdmin && (
              <th className="p-4 font-black uppercase text-[10px] text-indigo-400/60 tracking-widest text-right">
                Réglage Profit & Marge
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {paginatedData.map(p => {
            const safePrice = Number(p.price) || 0;
            const safeCost = Number(p.costPrice) || 0;
            const unitMargin = safePrice - safeCost;
            const unitMarginPct = safeCost > 0 ? (unitMargin / safeCost) * 100 : 0;
            return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors group">
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
                        onClick={() => setSalesEditProduct(p)}
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
                    {categoriesMap.get(p.categoryId) || 'N/A'}
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
                      {/* Live Margin Display in front of button */}
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
                        onClick={() => setSalesEditProduct(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
                        title="Inspecter et modifier les ventes de ce produit (Prix, date, suppression)"
                      >
                        <Receipt size={12} className="text-amber-400" />
                        <span>Ventes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenProfitModal(p)}
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
          })}
          {productProfitData.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 7 : 6} className="p-12 text-center text-white/20 border-t border-white/5">
                <ShoppingBag className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">Aucun résultat</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination (50 items/page — Règle GEMINI.md) */}
      {productProfitData && productProfitData.length > ITEMS_PER_PAGE && (
        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/40 font-bold uppercase tracking-wider">
            Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, productProfitData.length)} sur {productProfitData.length} produits
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
            >
              Précédent
            </button>
            <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-black">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal d'ajustement du Bénéfice Admin pour un produit spécifique */}
      {selectedProduct && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80  animate-in fade-in duration-200">
          <div className="bg-[#0f1117] border border-indigo-500/30 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden ring-1 ring-indigo-500/20 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    Ajustement de Bénéfice Admin
                  </h3>
                  <p className="text-xs text-indigo-300 font-bold truncate max-w-[280px]">
                    {selectedProduct.name} <span className="text-[10px] text-slate-500 font-mono">({selectedProduct.sku})</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Profit Banner */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-emerald-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bénéfice Net Estimé / Unité</p>
                  <p className="text-base font-black font-mono text-emerald-400">
                    {currentProfitVal >= 0 ? '+' : ''}{currentProfitVal.toFixed(2)} {currency}
                    <span className="text-xs text-slate-400 font-bold ml-2">({currentMarginVal}%)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Presets rapides */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Raccourcis Marge Rapide :</span>
              <div className="flex flex-wrap gap-2">
                {[10, 15, 20, 25, 30, 40, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyPresetMargin(pct)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 rounded-lg text-xs font-bold font-mono transition-all active:scale-95"
                  >
                    +{pct}%
                  </button>
                ))}
                {[50, 100, 200, 500].map(amt => (
                  <button
                    key={'da-' + amt}
                    type="button"
                    onClick={() => handleApplyPresetProfit(amt)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-indigo-500/20 text-white hover:text-indigo-300 border border-white/10 hover:border-indigo-500/40 rounded-lg text-xs font-bold font-mono transition-all active:scale-95"
                  >
                    +{amt} {currency}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields: Cost Price & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Prix d'Achat ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editCostPrice}
                  onChange={e => setEditCostPrice(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm font-bold outline-none focus:border-amber-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Prix de Vente ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                />
              </div>
            </div>

            {/* Admin Calculators */}
            <div className="p-4 bg-indigo-950/30 rounded-2xl border border-indigo-500/20 space-y-3">
              <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator size={14} /> Calculateur Direct (Mise à jour en temps réel)
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Option A: Bénéfice Fixe (DA)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Saisissez ex: 50"
                    value={desiredProfit}
                    onChange={e => handleDesiredProfitChange(e.target.value)}
                    className="w-full bg-black/60 border border-indigo-500/30 rounded-lg px-2.5 py-2 text-white font-mono text-xs outline-none focus:border-indigo-400 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Option B: Marge Cible (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Saisissez ex: 30"
                    value={desiredMargin}
                    onChange={e => handleDesiredMarginChange(e.target.value)}
                    className="w-full bg-black/60 border border-emerald-500/30 rounded-lg px-2.5 py-2 text-white font-mono text-xs outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveProfit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le Bénéfice'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Sales Inspection and Edit Modal */}
      {salesEditProduct && (
        <ProductSalesEditModal
          isOpen={!!salesEditProduct}
          onClose={() => setSalesEditProduct(null)}
          product={salesEditProduct}
          transactions={(transactions && transactions.length > 0) ? transactions : useTransactionStore.getState().transactions}
          settings={settings || ({} as any)}
        />
      )}
    </div>
  );
});
