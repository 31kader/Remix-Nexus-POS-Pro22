import React, { useState, useMemo } from 'react';
import { Calculator, Percent, Globe, Boxes, CheckCircle2, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { Modal } from '../ui';
import { cn } from '../../lib/utils';
import { Product, Category, CompanySettings } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { useAuthStore } from '../../store/useAuthStore';
import { checkIsOwner } from '../../config/ownerConfig';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { preparePayload } from '../../lib/db-converters';

interface BulkPricingStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  filteredProducts: Product[];
  selectedProductIds: string[];
  categories: Category[];
  settings: CompanySettings;
}

export const BulkPricingStudioModal: React.FC<BulkPricingStudioModalProps> = ({
  isOpen,
  onClose,
  products = [],
  filteredProducts = [],
  selectedProductIds = [],
  categories = [],
  settings
}) => {
  const currency = settings?.currency || 'DA';

  // Scope: 'all' | 'filtered' | 'selected' | 'category'
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected' | 'category'>(
    selectedProductIds.length > 0 ? 'selected' : 'all'
  );
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  // Wholesale Pricing Rules
  const [enableWholesale, setEnableWholesale] = useState<boolean>(true);
  const [wholesaleBase, setWholesaleBase] = useState<'retail_discount' | 'cost_margin'>('retail_discount');
  const [wholesalePercent, setWholesalePercent] = useState<string>('10');

  // Online Pricing Rules
  const [enableOnline, setEnableOnline] = useState<boolean>(true);
  const [onlineBase, setOnlineBase] = useState<'same_as_retail' | 'retail_adjust' | 'cost_margin'>('same_as_retail');
  const [onlinePercent, setOnlinePercent] = useState<string>('-5');

  // Rounding Rule: 'none' | '1' | '5' | '10'
  const [roundingMode, setRoundingMode] = useState<'none' | '1' | '5' | '10'>('none');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const applyRounding = (val: number): number => {
    if (!isFinite(val) || val < 0) return 0;
    if (roundingMode === '1') return Math.round(val);
    if (roundingMode === '5') return Math.round(val / 5) * 5;
    if (roundingMode === '10') return Math.round(val / 10) * 10;
    return Math.round(val * 100) / 100;
  };

  const targetProducts = useMemo(() => {
    if (scope === 'selected' && selectedProductIds.length > 0) {
      const idSet = new Set(selectedProductIds);
      return products.filter(p => idSet.has(p.id));
    }
    if (scope === 'filtered') {
      return filteredProducts;
    }
    if (scope === 'category' && targetCategoryId) {
      return products.filter(p => p.categoryId === targetCategoryId);
    }
    return products;
  }, [scope, selectedProductIds, products, filteredProducts, targetCategoryId]);

  const computeNewPrices = (p: Product) => {
    const retail = Number(p.price) || 0;
    const cost = Number(p.costPrice) || 0;
    let nextWholesale = Number(p.wholesalePrice) || 0;
    let nextOnline = Number(p.onlinePrice) || 0;

    if (enableWholesale) {
      const pct = parseFloat(wholesalePercent) || 0;
      if (wholesaleBase === 'retail_discount') {
        nextWholesale = applyRounding(Math.max(0, retail * (1 - pct / 100)));
      } else {
        const base = cost > 0 ? cost : retail * 0.8;
        nextWholesale = applyRounding(Math.max(0, base * (1 + pct / 100)));
      }
    }

    if (enableOnline) {
      const pct = parseFloat(onlinePercent) || 0;
      if (onlineBase === 'same_as_retail') {
        nextOnline = applyRounding(retail);
      } else if (onlineBase === 'retail_adjust') {
        nextOnline = applyRounding(Math.max(0, retail * (1 + pct / 100)));
      } else {
        const base = cost > 0 ? cost : retail;
        nextOnline = applyRounding(Math.max(0, base * (1 + pct / 100)));
      }
    }

    return { nextWholesale, nextOnline };
  };

  const previewItems = useMemo(() => {
    return targetProducts.slice(0, 5).map(p => {
      const { nextWholesale, nextOnline } = computeNewPrices(p);
      return {
        id: p.id,
        name: p.name,
        cost: Number(p.costPrice) || 0,
        retail: Number(p.price) || 0,
        oldWholesale: Number(p.wholesalePrice) || 0,
        newWholesale: nextWholesale,
        oldOnline: Number(p.onlinePrice) || 0,
        newOnline: nextOnline
      };
    });
  }, [targetProducts, enableWholesale, wholesaleBase, wholesalePercent, enableOnline, onlineBase, onlinePercent, roundingMode]);

  const handleApplyBulkPricing = async () => {
    if (!enableWholesale && !enableOnline) {
      toast.error("Veuillez activer au moins le réglage Prix de Gros ou Prix En Ligne.");
      return;
    }
    if (targetProducts.length === 0) {
      toast.error("Aucun article dans la sélection cible.");
      return;
    }

    if (!window.confirm(`Confirmer la mise à jour automatique des tarifs (${enableWholesale ? 'Prix de Gros' : ''}${enableWholesale && enableOnline ? ' + ' : ''}${enableOnline ? 'Tarif En Ligne' : ''}) sur ${targetProducts.length} articles ?`)) {
      return;
    }

    setIsApplying(true);
    try {
      const nowIso = new Date().toISOString();
      const targetIds = new Set(targetProducts.map(p => p.id));

      const updatedAllProducts = products.map(p => {
        if (!targetIds.has(p.id)) return p;
        const { nextWholesale, nextOnline } = computeNewPrices(p);
        return {
          ...p,
          ...(enableWholesale ? { wholesalePrice: nextWholesale } : {}),
          ...(enableOnline ? { onlinePrice: nextOnline } : {}),
          updatedAt: nowIso
        };
      });

      // 1. Update Zustand store & IndexedDB cache immediately
      useCoreStore.getState().setProducts(updatedAllProducts);
      await idbSet('nexus_products_cache', updatedAllProducts).catch(() => {});

      // 2. Sync with Supabase in batches of 200 if online
      const changedProducts = updatedAllProducts.filter(p => targetIds.has(p.id));
      if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
        const batchSize = 200;
        for (let i = 0; i < changedProducts.length; i += batchSize) {
          const chunk = changedProducts.slice(i, i + batchSize).map(item =>
            preparePayload('products', item.id, {
              id: item.id,
              name: item.name,
              price: item.price,
              costPrice: item.costPrice || 0,
              wholesalePrice: item.wholesalePrice || 0,
              onlinePrice: item.onlinePrice || 0,
              stock: item.stock || 0,
              updatedAt: nowIso
            })
          );
          await supabase.from('products').upsert(chunk, { onConflict: 'id' });
        }
      } else {
        // Queue for localDb if offline
        for (const item of changedProducts.slice(0, 500)) {
          localDb.update(`products/${item.id}`, {
            wholesalePrice: item.wholesalePrice,
            onlinePrice: item.onlinePrice,
            updatedAt: nowIso
          }).catch(() => {});
        }
      }

      toast.success(`Tarifs mis à jour avec succès sur ${changedProducts.length} articles !`);
      onClose();
    } catch (err: any) {
      console.error('[BulkPricingStudio] Error:', err);
      toast.error("Erreur lors de la mise à jour des prix : " + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsApplying(false);
    }
  };

  const [isZeroConfirmOpen, setIsZeroConfirmOpen] = useState(false);
  const [zeroConfirmInput, setZeroConfirmInput] = useState('');

  const handleOpenZeroStockConfirm = () => {
    const authUser = useAuthStore.getState().user;
    const authProfile = useAuthStore.getState().profile;
    const isAdmin = checkIsOwner(authUser?.email, authUser?.uid) || authProfile?.role === 'admin';
    if (!isAdmin) {
      toast.error("Action de remise à zéro de masse réservée exclusivement à l'administrateur.");
      return;
    }
    setZeroConfirmInput('');
    setIsZeroConfirmOpen(true);
  };

  const handleConfirmZeroAllStock = async () => {
    if (zeroConfirmInput.trim().toUpperCase() !== 'ZERO') {
      toast.error("Veuillez taper exactement 'ZERO' pour confirmer.");
      return;
    }
    setIsApplying(true);
    try {
      const nowIso = new Date().toISOString();
      const targetIds = new Set(targetProducts.map(p => p.id));
      const updatedAllProducts = products.map(p =>
        targetIds.has(p.id) ? { ...p, stock: 0, updatedAt: nowIso } : p
      );

      useCoreStore.getState().setProducts(updatedAllProducts);
      await idbSet('nexus_products_cache', updatedAllProducts).catch(() => {});

      if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
        if (scope === 'all') {
          await supabase.from('products').update({ stock: 0, updated_at: nowIso }).neq('stock', 0);
        } else {
          const ids = Array.from(targetIds);
          for (let i = 0; i < ids.length; i += 200) {
            await supabase.from('products').update({ stock: 0, updated_at: nowIso }).in('id', ids.slice(i, i + 200));
          }
        }
      }

      toast.success(`Quantité mise à 0 sur ${targetProducts.length} articles (Local & Supabase) !`);
      setIsZeroConfirmOpen(false);
      onClose();
    } catch (err: any) {
      toast.error("Erreur lors de la remise à zéro du stock : " + (err.message || err));
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio de Réglage des Prix de Gros & En Ligne (%)"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-left">
        {/* 1. Sélection de la cible */}
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              1. Articles à mettre à jour ({targetProducts.length} articles ciblés)
            </span>
            <button
              type="button"
              onClick={handleOpenZeroStockConfirm}
              disabled={isApplying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <AlertTriangle size={13} />
              <span>Mettre Stock à 0 ({targetProducts.length})</span>
            </button>
          </div>

          {isZeroConfirmOpen && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <AlertTriangle size={15} />
                <span>Confirmer la remise à 0 de {targetProducts.length} article(s)</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Cette action est irréversible (Local & Supabase). Pour valider, tapez <strong>ZERO</strong> :
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={zeroConfirmInput}
                  onChange={(e) => setZeroConfirmInput(e.target.value)}
                  placeholder="Tapez ZERO"
                  autoFocus
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-rose-500 text-center flex-1 min-w-[120px] max-w-[160px]"
                />
                <button
                  type="button"
                  onClick={handleConfirmZeroAllStock}
                  disabled={zeroConfirmInput.trim().toUpperCase() !== 'ZERO' || isApplying}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isApplying ? "Application..." : "Confirmer"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsZeroConfirmOpen(false)}
                  disabled={isApplying}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'all', label: `Tous (${products.length})` },
              { id: 'filtered', label: `Liste filtrée (${filteredProducts.length})` },
              { id: 'selected', label: `Cochés (${selectedProductIds.length})`, disabled: selectedProductIds.length === 0 },
              { id: 'category', label: 'Par Catégorie' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.disabled}
                onClick={() => setScope(opt.id as any)}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  scope === opt.id
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {scope === 'category' && (
            <select
              value={targetCategoryId}
              onChange={e => setTargetCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="">-- Choisir une catégorie --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Cartes de règles : Prix de Gros & Tarif En Ligne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Colonne Prix de Gros */}
          <div className={cn(
            "p-4 rounded-xl border transition-all space-y-4",
            enableWholesale
              ? "bg-sky-500/5 border-sky-500/30"
              : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableWholesale}
                  onChange={e => setEnableWholesale(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Boxes size={15} /> Prix de Gros (Wholesale)
                </span>
              </label>
            </div>

            {enableWholesale && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setWholesaleBase('retail_discount'); setWholesalePercent('10'); }}
                    className={cn(
                      "p-2.5 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                      wholesaleBase === 'retail_discount'
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    Prix Détail - X % (Remise)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWholesaleBase('cost_margin'); setWholesalePercent('10'); }}
                    className={cn(
                      "p-2.5 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                      wholesaleBase === 'cost_margin'
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    Prix d'Achat + X % (Marge)
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                    {wholesaleBase === 'retail_discount' ? 'Pourcentage de remise sur le Prix Détail (-%)' : "Pourcentage de marge sur le Prix d'Achat (+%)"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={wholesalePercent}
                      onChange={e => setWholesalePercent(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-sky-500/40 rounded-xl py-2.5 px-3.5 text-sm font-black font-mono text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-sky-500">%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[5, 8, 10, 12, 15, 20, 25].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setWholesalePercent(String(pct))}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border transition-all cursor-pointer",
                        wholesalePercent === String(pct)
                          ? "bg-sky-600 text-white border-sky-500"
                          : "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/10"
                      )}
                    >
                      {wholesaleBase === 'retail_discount' ? `-${pct}%` : `+${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne Tarif En Ligne */}
          <div className={cn(
            "p-4 rounded-xl border transition-all space-y-4",
            enableOnline
              ? "bg-violet-500/5 border-violet-500/30"
              : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableOnline}
                  onChange={e => setEnableOnline(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                  <Globe size={15} /> Prix En Ligne (E-Commerce)
                </span>
              </label>
            </div>

            {enableOnline && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setOnlineBase('same_as_retail'); setOnlinePercent('0'); }}
                    className={cn(
                      "p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                      onlineBase === 'same_as_retail'
                        ? "bg-violet-600 text-white border-violet-500"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    = Prix Détail
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOnlineBase('retail_adjust'); setOnlinePercent('-5'); }}
                    className={cn(
                      "p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                      onlineBase === 'retail_adjust'
                        ? "bg-violet-600 text-white border-violet-500"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    Détail ± %
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOnlineBase('cost_margin'); setOnlinePercent('15'); }}
                    className={cn(
                      "p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                      onlineBase === 'cost_margin'
                        ? "bg-violet-600 text-white border-violet-500"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    Achat + %
                  </button>
                </div>

                {onlineBase !== 'same_as_retail' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                        {onlineBase === 'retail_adjust' ? 'Ajustement % sur le Prix Détail (ex: -5 ou +5)' : "Marge % sur le Prix d'Achat (ex: +15)"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          value={onlinePercent}
                          onChange={e => setOnlinePercent(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-violet-500/40 rounded-xl py-2.5 px-3.5 text-sm font-black font-mono text-slate-900 dark:text-white"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-violet-500">%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(onlineBase === 'retail_adjust' ? [-15, -10, -5, 5, 10] : [10, 15, 20, 25, 30]).map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setOnlinePercent(String(pct))}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border transition-all cursor-pointer",
                            onlinePercent === String(pct)
                              ? "bg-violet-600 text-white border-violet-500"
                              : "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10"
                          )}
                        >
                          {pct > 0 ? `+${pct}%` : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Règle d'arrondi */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Arrondi Commercial ({currency}) :
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'none', label: 'Exact (0.01)' },
              { id: '1', label: 'Arrondi 1 DA' },
              { id: '5', label: 'Arrondi 5 DA' },
              { id: '10', label: 'Arrondi 10 DA' }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoundingMode(r.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all cursor-pointer",
                  roundingMode === r.id
                    ? "bg-emerald-600 text-white border-emerald-500"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Aperçu en direct */}
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
                    <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{item.name}</td>
                    <td className="p-2.5 text-right text-slate-500">{item.cost.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.retail.toFixed(2)}</td>
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

        {/* 5. Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleApplyBulkPricing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isApplying ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            <span>Appliquer sur {targetProducts.length} articles</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
