import { useState, useMemo } from 'react';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { Product, Category, CompanySettings } from '../../../types';
import { useCoreStore } from '../../../store/useCoreStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { checkIsOwner } from '../../../config/ownerConfig';
import { localDb } from '../../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../../supabase';
import { preparePayload } from '../../../lib/db-converters';
import { 
  PricingScope, 
  WholesaleBase, 
  OnlineBase, 
  RoundingMode, 
  BulkPricingPreviewItem 
} from './bulkPricingTypes';
import { computeNewPrices, PricingRuleConfig } from './bulkPricingRules';

interface UseBulkPricingLogicProps {
  products: Product[];
  filteredProducts: Product[];
  selectedProductIds: string[];
  categories: Category[];
  settings: CompanySettings;
  onClose: () => void;
}

export function useBulkPricingLogic({
  products,
  filteredProducts,
  selectedProductIds,
  categories: _categories,
  settings: _settings,
  onClose
}: UseBulkPricingLogicProps) {
  // Scope: 'all' | 'filtered' | 'selected' | 'category'
  const [scope, setScope] = useState<PricingScope>(
    selectedProductIds.length > 0 ? 'selected' : 'all'
  );
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  // Wholesale Pricing Rules
  const [enableWholesale, setEnableWholesale] = useState<boolean>(true);
  const [wholesaleBase, setWholesaleBase] = useState<WholesaleBase>('retail_discount');
  const [wholesalePercent, setWholesalePercent] = useState<string>('10');

  // Online Pricing Rules
  const [enableOnline, setEnableOnline] = useState<boolean>(true);
  const [onlineBase, setOnlineBase] = useState<OnlineBase>('same_as_retail');
  const [onlinePercent, setOnlinePercent] = useState<string>('-5');

  // Rounding Rule: 'none' | '1' | '5' | '10'
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('none');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const [isZeroConfirmOpen, setIsZeroConfirmOpen] = useState(false);
  const [zeroConfirmInput, setZeroConfirmInput] = useState('');

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

  const pricingConfig: PricingRuleConfig = useMemo(() => ({
    enableWholesale,
    wholesaleBase,
    wholesalePercent,
    enableOnline,
    onlineBase,
    onlinePercent,
    roundingMode
  }), [enableWholesale, wholesaleBase, wholesalePercent, enableOnline, onlineBase, onlinePercent, roundingMode]);

  const previewItems: BulkPricingPreviewItem[] = useMemo(() => {
    return targetProducts.slice(0, 5).map(p => {
      const { nextWholesale, nextOnline } = computeNewPrices(p, pricingConfig);
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
  }, [targetProducts, pricingConfig]);

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
        const { nextWholesale, nextOnline } = computeNewPrices(p, pricingConfig);
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
        // Queue for localDb if offline (2 arguments stricts: path, value)
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

  return {
    scope,
    setScope,
    targetCategoryId,
    setTargetCategoryId,
    enableWholesale,
    setEnableWholesale,
    wholesaleBase,
    setWholesaleBase,
    wholesalePercent,
    setWholesalePercent,
    enableOnline,
    setEnableOnline,
    onlineBase,
    setOnlineBase,
    onlinePercent,
    setOnlinePercent,
    roundingMode,
    setRoundingMode,
    isApplying,
    isZeroConfirmOpen,
    setIsZeroConfirmOpen,
    zeroConfirmInput,
    setZeroConfirmInput,
    targetProducts,
    previewItems,
    handleApplyBulkPricing,
    handleOpenZeroStockConfirm,
    handleConfirmZeroAllStock
  };
}
