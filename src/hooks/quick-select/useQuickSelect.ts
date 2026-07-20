import { useState, useMemo } from 'react';
import { useCoreStore } from '../../store/useCoreStore';
import { localDb } from '../../services/LocalDatabase';
import { Product } from '../../types';
import { toast } from 'sonner';
import { set as idbSet } from 'idb-keyval';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { getLocalValue, setLocalState, saveStateToStorage } from '../../lib/local-db';

export const useQuickSelect = () => {
  const products = useCoreStore(state => state.products);
  const settings = useCoreStore(state => state.settings);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [direction, setDirection] = useState(0);

  // Filter favorited products in memory (offline-first)
  const favoriteProducts = useMemo(() => {
    return products.filter(p => p.isQuickSelect);
  }, [products]);

  // Determine favorite categories: custom virtual category groups defined by the user in settings
  const favoriteCategories = useMemo(() => {
    return settings.quickSelectGroups || [];
  }, [settings.quickSelectGroups]);

  // Filter products for display in the grid
  const filteredProducts = useMemo(() => {
    return favoriteProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (selectedCategoryId === 'all') {
        return matchesSearch;
      }
      
      const currentGroup = favoriteCategories.find(g => g.id === selectedCategoryId);
      const matchesCategory = currentGroup ? currentGroup.productIds.includes(p.id) : false;
      return matchesSearch && matchesCategory;
    });
  }, [favoriteProducts, searchQuery, selectedCategoryId, favoriteCategories]);

  const toggleFavorite = async (product: any) => {
    try {
      const storeProduct = products.find(p => p.id === product.id);
      const isAlreadyFav = storeProduct ? storeProduct.isQuickSelect : false;
      
      // If we are on a specific custom category/group tab
      if (selectedCategoryId !== 'all') {
        const groups = settings.quickSelectGroups || [];
        const updatedGroups = groups.map(g => {
          if (g.id === selectedCategoryId) {
            const alreadyInGroup = g.productIds.includes(product.id);
            return {
              ...g,
              productIds: alreadyInGroup 
                ? g.productIds.filter(id => id !== product.id)
                : [...g.productIds, product.id]
            };
          }
          return g;
        });

        // Determine if it belongs to any custom group now
        const isInAnyGroup = updatedGroups.some(g => g.productIds.includes(product.id));
        
        // Update settings in localDb (syncs in background)
        await localDb.update('settings/company', { quickSelectGroups: updatedGroups });
        
        // Update product's isQuickSelect flag if it was newly added or completely removed from all groups
        if (isInAnyGroup !== isAlreadyFav) {
          await localDb.update(`products/${product.id}`, { isQuickSelect: isInAnyGroup });
          window.dispatchEvent(new CustomEvent('product-cache-update', { 
            detail: { ...product, isQuickSelect: isInAnyGroup, updatedAt: new Date().toISOString() } 
          }));
        }
        
        toast.success(isInAnyGroup ? 'Produit ajouté à la catégorie favorite' : 'Produit retiré de la catégorie favorite');
      } else {
        // Toggle in 'all' tab
        const newVal = !isAlreadyFav;
        await localDb.update(`products/${product.id}`, { isQuickSelect: newVal });
        window.dispatchEvent(new CustomEvent('product-cache-update', { 
          detail: { ...product, isQuickSelect: newVal, updatedAt: new Date().toISOString() } 
        }));
        
        // If removing from favorites, remove it from all custom groups
        const groups = settings.quickSelectGroups || [];
        if (!newVal) {
          const updatedGroups = groups.map(g => ({
            ...g,
            productIds: g.productIds.filter(id => id !== product.id)
          }));
          await localDb.update('settings/company', { quickSelectGroups: updatedGroups });
        } else {
          // If adding to favorites and groups exist, add it to the first custom group by default
          if (groups.length > 0) {
            const updatedGroups = groups.map((g, idx) => {
              if (idx === 0 && !g.productIds.includes(product.id)) {
                return { ...g, productIds: [...g.productIds, product.id] };
              }
              return g;
            });
            await localDb.update('settings/company', { quickSelectGroups: updatedGroups });
          }
        }
        
        toast.success(newVal ? 'Ajouté aux favoris' : 'Retiré des favoris');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const clearAllFavorites = async () => {
    try {
      setLoading(true);
      
      // Update in-memory Zustand store and local cache first (instant UI update)
      const updatedProducts = products.map(p => {
        if (p.isQuickSelect) {
          return {
            ...p,
            isQuickSelect: false,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      
      // Update store
      useCoreStore.getState().setProducts(updatedProducts);
      
      // Update IndexedDB cache
      await idbSet('nexus_products_cache', updatedProducts);
      
      // Clear productIds in all custom groups
      const groups = settings.quickSelectGroups || [];
      const updatedGroups = groups.map(g => ({ ...g, productIds: [] }));
      await localDb.update('settings/company', { quickSelectGroups: updatedGroups });
      
      // Synchronize changes to backend
      if (isSupabaseConfigured) {
        // Bulk update Supabase directly
        const { error } = await supabase
          .from('products')
          .update({ is_quick_select: false })
          .is('is_quick_select', true);
        if (error) throw error;
      } else {
        // Update local emulated DB state for offline use
        const localProds = getLocalValue('products') || {};
        Object.keys(localProds).forEach(id => {
          if (localProds[id]) {
            localProds[id].is_quick_select = false;
            localProds[id].isQuickSelect = false;
          }
        });
        setLocalState('products', localProds);
        saveStateToStorage();
      }
      
      toast.success('Liste des favoris vidée');
    } catch (err) {
      console.error('Error clearing favorites:', err);
      toast.error('Erreur lors du nettoyage');
    } finally {
      setLoading(false);
    }
  };

  return {
    products: favoriteProducts,
    categories: favoriteCategories,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    direction,
    setDirection,
    favoriteCategories,
    filteredProducts,
    toggleFavorite,
    clearAllFavorites
  };
};
