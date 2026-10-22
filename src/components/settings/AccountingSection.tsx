import React, { useState, useMemo } from 'react';
import { DollarSign, Trash2, Plus, Percent, TrendingUp, Filter, Zap, CheckCircle2, RefreshCw } from 'lucide-react';
import { CompanySettings, Product } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { localDb } from '../../services/LocalDatabase';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function AccountingSection({ formData, setFormData }: SectionProps) {
  const updateField = (key: keyof CompanySettings | string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const products = useCoreStore(s => s.products) || [];
  const setProducts = useCoreStore(s => s.setProducts);
  const categories = useCoreStore(s => s.categories) || [];
  const suppliers = usePeopleStore(s => s.suppliers) || [];
  const brands = useCoreStore(s => s.brands) || [];

  // États des filtres d'exécution des règles de marges
  const [execSearch, setExecSearch] = useState('');
  const [execCategory, setExecCategory] = useState('ALL');
  const [execSupplier, setExecSupplier] = useState('ALL');
  const [execBrand, setExecBrand] = useState('ALL');
  const [execStockFilter, setExecStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [execMinCost, setExecMinCost] = useState<string>('');
  const [execMaxCost, setExecMaxCost] = useState<string>('');
  const [execOnlyMissingPrices, setExecOnlyMissingPrices] = useState<boolean>(false);
  const [execBaseMode, setExecBaseMode] = useState<'from_cost' | 'from_retail'>('from_cost');
  const [execRounding, setExecRounding] = useState<'none' | '1' | '5' | '10'>('5');
  const [applyToRetail, setApplyToRetail] = useState<boolean>(false);
  const [applyToWholesale, setApplyToWholesale] = useState<boolean>(true);
  const [applyToOnline, setApplyToOnline] = useState<boolean>(true);
  const [isExecutingMargins, setIsExecutingMargins] = useState<boolean>(false);

  const retailMargin = Number(formData.defaultRetailMarginPercent ?? 30);
  const wholesaleMargin = Number(formData.defaultWholesaleMarginPercent ?? 15);
  const onlineMargin = Number(formData.defaultOnlineMarginPercent ?? 25);

  const roundPrice = (val: number): number => {
    if (!Number.isFinite(val) || val <= 0) return 0;
    if (execRounding === '1') return Math.round(val);
    if (execRounding === '5') return Math.round(val / 5) * 5;
    if (execRounding === '10') return Math.round(val / 10) * 10;
    return Math.round(val * 100) / 100;
  };

  // Calcul des nouveaux prix d'un produit selon les règles choisies
  const computeNewPrices = (p: any) => {
    const cost = Number(p.costPrice ?? p.cost_price ?? 0);
    const currentRetail = Number(p.price ?? 0);
    const baseRef = execBaseMode === 'from_cost' && cost > 0 ? cost : currentRetail;

    let nextRetail = currentRetail;
    let nextWholesale = Number(p.wholesalePrice ?? p.wholesale_price ?? 0);
    let nextOnline = Number(p.onlinePrice ?? p.online_price ?? 0);

    if (execBaseMode === 'from_cost') {
      if (cost > 0) {
        if (applyToRetail) nextRetail = roundPrice(cost * (1 + retailMargin / 100));
        if (applyToWholesale) nextWholesale = roundPrice(cost * (1 + wholesaleMargin / 100));
        if (applyToOnline) nextOnline = roundPrice(cost * (1 + onlineMargin / 100));
      } else if (currentRetail > 0) {
        // Fallback intelligent si prix d'achat = 0 : déduire depuis le prix détail
        if (applyToWholesale) nextWholesale = roundPrice(currentRetail * (1 - Math.min(50, Math.max(5, 100 - (100 + wholesaleMargin) / (1 + retailMargin / 100))) / 100));
        if (applyToOnline) nextOnline = roundPrice(currentRetail * (1 + (onlineMargin - retailMargin) / 100));
      }
    } else {
      // Depuis le Prix Détail : Gros = Prix Détail - wholesaleMargin%, En ligne = Prix Détail - onlineMargin% (ou +%)
      if (currentRetail > 0) {
        if (applyToRetail) nextRetail = roundPrice(currentRetail * (1 + retailMargin / 100));
        if (applyToWholesale) nextWholesale = roundPrice(currentRetail * (1 - wholesaleMargin / 100));
        if (applyToOnline) nextOnline = roundPrice(currentRetail * (1 - onlineMargin / 100));
      }
    }

    return {
      cost,
      currentRetail,
      nextRetail: Math.max(0, nextRetail),
      nextWholesale: Math.max(0, nextWholesale),
      nextOnline: Math.max(0, nextOnline),
      baseRef
    };
  };

  // Filtrage multi-critères des produits ciblés
  const targetedProducts = useMemo(() => {
    const q = execSearch.trim().toLowerCase();
    const minC = execMinCost !== '' ? parseFloat(execMinCost) : null;
    const maxC = execMaxCost !== '' ? parseFloat(execMaxCost) : null;

    return products.filter(p => {
      if (!p || !p.id) return false;
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode) return false;
      }

      if (execCategory !== 'ALL') {
        const catObj = categories.find(c => c.id === execCategory);
        const pCatId = p.categoryId || p.category_id || '';
        const pCatName = (p.category || '').toLowerCase();
        if (pCatId !== execCategory && (!catObj || pCatName !== (catObj.name || '').toLowerCase())) {
          return false;
        }
      }

      if (execSupplier !== 'ALL') {
        const pSup = (p.supplier || '').trim().toLowerCase();
        if (pSup !== execSupplier.trim().toLowerCase()) return false;
      }

      if (execBrand !== 'ALL') {
        const pBrandId = p.brandId || p.brand_id || '';
        if (pBrandId !== execBrand) return false;
      }

      const stock = Number(p.stock ?? 0);
      const minStock = Number(p.minStock ?? 5);
      if (execStockFilter === 'in_stock' && stock <= 0) return false;
      if (execStockFilter === 'out_of_stock' && stock > 0) return false;
      if (execStockFilter === 'low_stock' && (stock <= 0 || stock > minStock)) return false;

      const cost = Number(p.costPrice ?? p.cost_price ?? 0);
      if (minC !== null && !Number.isNaN(minC) && cost < minC) return false;
      if (maxC !== null && !Number.isNaN(maxC) && cost > maxC) return false;

      if (execOnlyMissingPrices) {
        const w = Number(p.wholesalePrice ?? p.wholesale_price ?? 0);
        const o = Number(p.onlinePrice ?? p.online_price ?? 0);
        if (w > 0 && o > 0) return false;
      }

      // En mode 'from_cost', vérifier qu'on a au moins un prix d'achat ou un prix détail > 0
      const retail = Number(p.price ?? 0);
      if (cost <= 0 && retail <= 0) return false;

      return true;
    });
  }, [
    products, categories, execSearch, execCategory, execSupplier, execBrand,
    execStockFilter, execMinCost, execMaxCost, execOnlyMissingPrices
  ]);

  const handleExecuteMarginsOnFiltered = async () => {
    if (!applyToRetail && !applyToWholesale && !applyToOnline) {
      toast.error('Veuillez cocher au moins un tarif à mettre à jour (Détail, Gros ou En Ligne).');
      return;
    }
    if (targetedProducts.length === 0) {
      toast.error('Aucun article ne correspond aux filtres sélectionnés.');
      return;
    }

    const targetsLabel = [
      applyToRetail ? `Détail (${retailMargin}%)` : null,
      applyToWholesale ? `Gros (${wholesaleMargin}%)` : null,
      applyToOnline ? `En Ligne (${onlineMargin}%)` : null
    ].filter(Boolean).join(', ');

    if (!window.confirm(`Confirmez-vous l'application des règles [${targetsLabel}] sur les ${targetedProducts.length} article(s) filtrés ?`)) {
      return;
    }

    setIsExecutingMargins(true);
    try {
      const updatedIds = new Set(targetedProducts.map(p => p.id));
      const nowIso = new Date().toISOString();
      const batchMap: Record<string, any> = {};

      const newProductsList = products.map(p => {
        if (!updatedIds.has(p.id)) return p;
        const calc = computeNewPrices(p);
        const updatedProd: Product = {
          ...p,
          price: applyToRetail ? calc.nextRetail : p.price,
          wholesalePrice: applyToWholesale ? calc.nextWholesale : p.wholesalePrice,
          wholesale_price: applyToWholesale ? calc.nextWholesale : p.wholesale_price,
          onlinePrice: applyToOnline ? calc.nextOnline : p.onlinePrice,
          online_price: applyToOnline ? calc.nextOnline : p.online_price,
          updatedAt: nowIso
        };
        batchMap[p.id] = updatedProd;
        return updatedProd;
      });

      setProducts(newProductsList);
      await idbSet('nexus_products_cache', newProductsList).catch(() => {});
      await localDb.insertBatch('products', batchMap).catch(() => {});

      toast.success(`✅ Marges appliquées avec succès sur ${targetedProducts.length} article(s) ! Synchronisation Cloud en cours.`);
    } catch (err) {
      console.error('Error executing bulk margins:', err);
      toast.error('Erreur lors de l\'application des marges.');
    } finally {
      setIsExecutingMargins(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloc 1 : Devise, TVA & Export Comptable */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Devise, TVA & Comptabilité</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Paramètres monétaires (Dinar Algérien DA) et fiscalité par défaut</p>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700">
            <span className="text-[10px] font-black text-slate-600 dark:text-zinc-300 uppercase">Afficher Prix HT</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(formData.displayPriceHT)}
                onChange={e => updateField('displayPriceHT', e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Devise du Magasin</label>
            <input
              type="text"
              value={formData.currency || 'DA'}
              onChange={e => updateField('currency', e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Taux TVA par Défaut (%)</label>
            <input
              type="number"
              value={formData.taxRate ?? 19}
              onChange={e => updateField('taxRate', parseFloat(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Format d'Export Comptable</label>
            <select
              value={formData.accountingFormat || 'csv'}
              onChange={e => updateField('accountingFormat', e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="csv">Tableur CSV / Excel</option>
              <option value="pdf">Rapport PDF Imprimable</option>
              <option value="json">Archive JSON Structurée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bloc 2 : Règles de Marges par Défaut + Exécuteur Multi-Filtres */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                Règles de Marges par Défaut (Détail, Gros & En Ligne) + Exécution Filtrée
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Définissez vos pourcentages et exécutez-les sur tout ou partie du catalogue grâce aux 8 filtres de ciblage
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase self-start sm:self-auto">
            {targetedProducts.length} article(s) ciblé(s)
          </span>
        </div>

        {/* Les 3 Pourcentages de Marge */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
                <Percent size={12} /> 1. Marge Détail (%)
              </label>
              <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToRetail}
                  onChange={e => setApplyToRetail(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                Exécuter
              </label>
            </div>
            <input
              type="number"
              value={formData.defaultRetailMarginPercent ?? 30}
              onChange={e => updateField('defaultRetailMarginPercent', parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-emerald-500"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1">
                <Percent size={12} /> 2. Marge Prix de Gros (%)
              </label>
              <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToWholesale}
                  onChange={e => setApplyToWholesale(e.target.checked)}
                  className="rounded accent-amber-600"
                />
                Exécuter
              </label>
            </div>
            <input
              type="number"
              value={formData.defaultWholesaleMarginPercent ?? 15}
              onChange={e => updateField('defaultWholesaleMarginPercent', parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1">
                <Percent size={12} /> 3. Marge Prix En Ligne (%)
              </label>
              <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToOnline}
                  onChange={e => setApplyToOnline(e.target.checked)}
                  className="rounded accent-blue-600"
                />
                Exécuter
              </label>
            </div>
            <input
              type="number"
              value={formData.defaultOnlineMarginPercent ?? 25}
              onChange={e => updateField('defaultOnlineMarginPercent', parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Panneau des 8 Filtres d'Exécution */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-zinc-200 uppercase">
              <Filter size={14} className="text-indigo-500" />
              Filtres de Ciblage pour Exécuter la Règle
            </div>
            <button
              type="button"
              onClick={() => {
                setExecSearch('');
                setExecCategory('ALL');
                setExecSupplier('ALL');
                setExecBrand('ALL');
                setExecStockFilter('all');
                setExecMinCost('');
                setExecMaxCost('');
                setExecOnlyMissingPrices(false);
              }}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} /> Réinitialiser les filtres
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Recherche texte */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">1. Recherche (Nom / SKU)</label>
              <input
                type="text"
                placeholder="Ex: Huile, Boisson, 613..."
                value={execSearch}
                onChange={e => setExecSearch(e.target.value)}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            {/* 2. Catégorie / Rayon */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">2. Catégorie / Rayon</label>
              <select
                value={execCategory}
                onChange={e => setExecCategory(e.target.value)}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">Toutes les catégories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 3. Fournisseur */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">3. Fournisseur</label>
              <select
                value={execSupplier}
                onChange={e => setExecSupplier(e.target.value)}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">Tous les fournisseurs ({suppliers.length})</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 4. Marque */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">4. Marque</label>
              <select
                value={execBrand}
                onChange={e => setExecBrand(e.target.value)}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">Toutes les marques ({brands.length})</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* 5. État du Stock */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">5. État du Stock</label>
              <select
                value={execStockFilter}
                onChange={e => setExecStockFilter(e.target.value as 'all' | 'in_stock' | 'out_of_stock' | 'low_stock')}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="all">Tous les articles (Stock & Rupture)</option>
                <option value="in_stock">En Stock uniquement (&gt; 0)</option>
                <option value="out_of_stock">En Rupture uniquement (0)</option>
                <option value="low_stock">En Alerte Stock Faible</option>
              </select>
            </div>

            {/* 6. Tranche de Prix d'Achat */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">6. Prix d'Achat Min / Max (DA)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min DA"
                  value={execMinCost}
                  onChange={e => setExecMinCost(e.target.value)}
                  className="w-1/2 h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max DA"
                  value={execMaxCost}
                  onChange={e => setExecMaxCost(e.target.value)}
                  className="w-1/2 h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* 7. Base de Calcul */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">7. Base de Calcul</label>
              <select
                value={execBaseMode}
                onChange={e => setExecBaseMode(e.target.value as 'from_cost' | 'from_retail')}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="from_cost">Depuis Prix d'Achat (+% Marge)</option>
                <option value="from_retail">Depuis Prix Détail (-% Remise)</option>
              </select>
            </div>

            {/* 8. Arrondi Commercial */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">8. Arrondi des Prix Calculés</label>
              <select
                value={execRounding}
                onChange={e => setExecRounding(e.target.value as 'none' | '1' | '5' | '10')}
                className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="5">Arrondir à 5 DA (Recommandé)</option>
                <option value="10">Arrondir à 10 DA</option>
                <option value="1">Arrondir à 1 DA</option>
                <option value="none">Aucun arrondi (Exact)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-zinc-700/70">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={execOnlyMissingPrices}
                onChange={e => setExecOnlyMissingPrices(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              Ne modifier que les articles dont le Prix de Gros ou En Ligne est égal à 0 DA
            </label>

            <button
              type="button"
              disabled={isExecutingMargins || targetedProducts.length === 0}
              onClick={handleExecuteMarginsOnFiltered}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Zap size={15} />
              {isExecutingMargins
                ? 'Application en cours...'
                : `Exécuter sur ${targetedProducts.length} article(s) filtré(s)`}
            </button>
          </div>

          {/* Mini-Aperçu des 4 premiers articles touchés */}
          {targetedProducts.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-[10px] font-black uppercase text-slate-500 flex items-center justify-between">
                <span>Aperçu avant exécution (4 premiers articles sur {targetedProducts.length})</span>
                <span className="text-indigo-500">Simulation en direct</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                {targetedProducts.slice(0, 4).map(p => {
                  const sim = computeNewPrices(p);
                  return (
                    <div key={p.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[220px]">
                        {p.name}
                        <span className="ml-2 text-[10px] text-slate-400 font-mono">
                          (Achat: {sim.cost} DA | Actuel: {sim.currentRetail} DA)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        {applyToRetail && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                            Détail: {sim.nextRetail} DA
                          </span>
                        )}
                        {applyToWholesale && (
                          <span className="text-amber-600 dark:text-amber-400 font-black">
                            Gros: {sim.nextWholesale} DA
                          </span>
                        )}
                        {applyToOnline && (
                          <span className="text-blue-600 dark:text-blue-400 font-black">
                            En Ligne: {sim.nextOnline} DA
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bloc 3 : Taux de Taxes Multiples */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign size={17} className="text-emerald-500" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Grille des Taxes Additionnelles (TVA 19%, TVA 9%, Timbre...)</h4>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                availableTaxes: [...(formData.availableTaxes || []), { name: 'TVA 9%', rate: 9 }]
              })
            }
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Ajouter une taxe
          </button>
        </div>

        <div className="space-y-2.5">
          {(formData.availableTaxes || []).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-zinc-500 py-3 text-center">
              Seule la TVA par défaut ({formData.taxRate ?? 19}%) est active.
            </p>
          ) : (
            formData.availableTaxes?.map((tax, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700"
              >
                <input
                  className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none text-xs font-bold"
                  placeholder="Nom de la taxe (ex: TVA Réduite 9%)"
                  value={tax.name}
                  onChange={e => {
                    const newTaxes = [...(formData.availableTaxes || [])];
                    newTaxes[idx].name = e.target.value;
                    setFormData({ ...formData, availableTaxes: newTaxes });
                  }}
                />
                <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-zinc-700">
                  <input
                    type="number"
                    className="w-14 bg-transparent text-center text-emerald-600 dark:text-emerald-400 text-xs font-black outline-none"
                    value={tax.rate}
                    onChange={e => {
                      const newTaxes = [...(formData.availableTaxes || [])];
                      newTaxes[idx].rate = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, availableTaxes: newTaxes });
                    }}
                  />
                  <span className="text-slate-400 font-black text-xs ml-1">%</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      availableTaxes: formData.availableTaxes?.filter((_, i) => i !== idx)
                    })
                  }
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
