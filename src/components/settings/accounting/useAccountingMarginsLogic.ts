import { useState, useMemo } from 'react';
import { CompanySettings, Product } from '../../../types';
import { useCoreStore } from '../../../store/useCoreStore';
import { usePeopleStore } from '../../../store/usePeopleStore';
import { localDb } from '../../../services/LocalDatabase';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

export type StockFilterOption = 'all' | 'in_stock' | 'out_of_stock' | 'low_stock';
export type BaseModeOption = 'from_cost' | 'from_retail';
export type RoundingOption = 'none' | '1' | '5' | '10';

export function useAccountingMarginsLogic(
  formData: CompanySettings,
  updateField: (key: keyof CompanySettings | string, value: any) => void
) {
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
  const [execStockFilter, setExecStockFilter] = useState<StockFilterOption>('all');
  const [execMinCost, setExecMinCost] = useState<string>('');
  const [execMaxCost, setExecMaxCost] = useState<string>('');
  const [execOnlyMissingPrices, setExecOnlyMissingPrices] = useState<boolean>(false);
  const [execBaseMode, setExecBaseMode] = useState<BaseModeOption>('from_cost');
  const [execRounding, setExecRounding] = useState<RoundingOption>('5');
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
      // Depuis le Prix Détail : Gros = Prix Détail - wholesaleMargin%, En ligne = Prix Détail - onlineMargin%
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

  const resetFilters = () => {
    setExecSearch('');
    setExecCategory('ALL');
    setExecSupplier('ALL');
    setExecBrand('ALL');
    setExecStockFilter('all');
    setExecMinCost('');
    setExecMaxCost('');
    setExecOnlyMissingPrices(false);
  };

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

  return {
    categories,
    suppliers,
    brands,
    retailMargin,
    wholesaleMargin,
    onlineMargin,
    execSearch,
    setExecSearch,
    execCategory,
    setExecCategory,
    execSupplier,
    setExecSupplier,
    execBrand,
    setExecBrand,
    execStockFilter,
    setExecStockFilter,
    execMinCost,
    setExecMinCost,
    execMaxCost,
    setExecMaxCost,
    execOnlyMissingPrices,
    setExecOnlyMissingPrices,
    execBaseMode,
    setExecBaseMode,
    execRounding,
    setExecRounding,
    applyToRetail,
    setApplyToRetail,
    applyToWholesale,
    setApplyToWholesale,
    applyToOnline,
    setApplyToOnline,
    isExecutingMargins,
    targetedProducts,
    computeNewPrices,
    resetFilters,
    handleExecuteMarginsOnFiltered,
    updateField
  };
}
