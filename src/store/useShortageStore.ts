import { create } from 'zustand';
import { ShortageItem, CustomReplenishmentList, ShortageSummary } from '../types/shortages';
import { Product, Supplier, Purchase } from '../types';
import {
  detectLowStockProducts,
  filterShortageItems,
  computeShortageSummary,
  loadShortagesFromDb,
  persistUpdateShortageItem,
  persistUpdateCustomList,
  executeAddItem,
  executeAddCustomItem,
  executeCreateCustomList,
  executeDeleteCustomList,
  executeUpdateItemQuantity,
  executeUpdateItemCostPrice,
  executeUpdateItemNotes,
  executeToggleItemPriority,
  executeToggleItemCheck,
  executeToggleAllCheck,
  executeRemoveItem,
  executeClearCheckedItems,
  executeClearAllItems
} from './shortages';

interface ShortageState {
  items: ShortageItem[];
  customLists: CustomReplenishmentList[];
  activeListId: string | 'all';
  selectedSupplierFilter: string | 'all';
  searchQuery: string;
  isLoaded: boolean;
  isSuggestionsOpen: boolean;

  // Initialisation & Sync
  loadFromDb: () => Promise<void>;

  // Gestion des Articles du Cahier des Manques
  addItem: (
    product: Partial<Product> & { id: string; name: string },
    options?: {
      quantity?: number;
      listId?: string;
      supplierId?: string;
      supplierName?: string;
      costPrice?: number;
      minStock?: number;
      currentStock?: number;
      notes?: string;
      priority?: 'normal' | 'urgent';
    }
  ) => Promise<ShortageItem>;

  addCustomItem: (data: {
    name: string;
    barcode?: string;
    sku?: string;
    quantityNeeded?: number;
    costPrice?: number;
    supplierId?: string;
    supplierName?: string;
    listIds?: string[];
    notes?: string;
    unit?: string;
    priority?: 'normal' | 'urgent';
  }) => Promise<ShortageItem>;

  updateItemQuantity: (id: string, quantity: number) => Promise<void>;
  updateItemCostPrice: (id: string, costPrice: number) => Promise<void>;
  updateItemNotes: (id: string, notes: string) => Promise<void>;
  toggleItemPriority: (id: string) => Promise<void>;
  toggleItemCheck: (id: string) => Promise<void>;
  toggleAllCheck: (checked?: boolean) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  clearAllItems: () => Promise<void>;

  // Gestion des Listes Personnalisées Libres
  createCustomList: (name: string, description?: string, color?: string) => Promise<CustomReplenishmentList>;
  quickCreateList: (name: string, color?: string) => Promise<CustomReplenishmentList>;
  updateCustomList: (id: string, updates: Partial<CustomReplenishmentList>) => Promise<void>;
  deleteCustomList: (id: string) => Promise<void>;
  assignItemToList: (itemId: string, listId: string) => Promise<void>;

  // Filtres & Recherche UI
  setActiveListId: (listId: string | 'all') => void;
  setSelectedSupplierFilter: (supplierId: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  setIsSuggestionsOpen: (open: boolean) => void;

  // Détection Intelligente & Réassort
  detectLowStockProducts: (
    products: Product[],
    purchases?: Purchase[],
    suppliers?: Supplier[],
    globalAlertThreshold?: number
  ) => ShortageItem[];

  addAllSuggested: (suggestedItems: ShortageItem[]) => Promise<void>;

  // Sélecteurs & Calculs
  getFilteredItems: () => ShortageItem[];
  getSummary: () => ShortageSummary;
}

export const useShortageStore = create<ShortageState>((set, get) => ({
  items: [],
  customLists: [],
  activeListId: 'all',
  selectedSupplierFilter: 'all',
  searchQuery: '',
  isLoaded: false,
  isSuggestionsOpen: false,

  // 1. Chargement & Réhydratation Locale (Offline-First)
  loadFromDb: async () => {
    try {
      const { items, customLists } = await loadShortagesFromDb();
      set({ items, customLists, isLoaded: true });
    } catch (err) {
      console.warn('[useShortageStore] Erreur chargement local:', err);
      set({ isLoaded: true });
    }
  },

  // 2. Ajout d'un article avec déduplication & anti-écrasement arithmétique
  addItem: async (product, options) => {
    const state = get();
    const { nextItems, item } = await executeAddItem(state.items, state.activeListId, product, options);
    set({ items: nextItems });
    return item;
  },

  // 2b. Ajout d'un article hors-catalogue
  addCustomItem: async (data) => {
    const state = get();
    const { nextItems, item } = await executeAddCustomItem(state.items, state.activeListId, data);
    set({ items: nextItems });
    return item;
  },

  // 3. Mise à jour de la quantité manquante
  updateItemQuantity: async (id, quantity) => {
    set(s => ({ items: executeUpdateItemQuantity(s.items, id, quantity) }));
  },

  // 4. Mise à jour du prix d'achat
  updateItemCostPrice: async (id, costPrice) => {
    set(s => ({ items: executeUpdateItemCostPrice(s.items, id, costPrice) }));
  },

  // 4b. Mise à jour des remarques
  updateItemNotes: async (id, notes) => {
    set(s => ({ items: executeUpdateItemNotes(s.items, id, notes) }));
  },

  // 4c. Bascule de priorité
  toggleItemPriority: async (id) => {
    set(s => ({ items: executeToggleItemPriority(s.items, id) }));
  },

  // 5. Bascule de case à cocher
  toggleItemCheck: async (id) => {
    set(s => ({ items: executeToggleItemCheck(s.items, id) }));
  },

  // 6. Sélection / Désélection en masse
  toggleAllCheck: async (checked) => {
    set(s => ({ items: executeToggleAllCheck(s.items, get().getFilteredItems(), checked) }));
  },

  // 7. Suppression d'un article
  removeItem: async (id) => {
    set(s => ({ items: executeRemoveItem(s.items, id) }));
  },

  // 8. Nettoyage des articles cochés
  clearCheckedItems: async () => {
    set(s => ({ items: executeClearCheckedItems(s.items) }));
  },

  // 9. Nettoyage de tous les articles de la vue active
  clearAllItems: async () => {
    set(s => ({ items: executeClearAllItems(s.items, get().getFilteredItems()) }));
  },

  // 10. Création d'une liste personnalisée
  createCustomList: async (name, description, color) => {
    const newList = await executeCreateCustomList(name, description, color);
    set(s => ({
      customLists: [...s.customLists, newList],
      activeListId: newList.id
    }));
    return newList;
  },

  // 10b. Création rapide d'une liste en 1 clic
  quickCreateList: async (name, color) => {
    return get().createCustomList(name, '', color);
  },

  // 11. Mise à jour d'une liste
  updateCustomList: async (id, updates) => {
    const now = new Date().toISOString();
    const payload = { ...updates, updatedAt: now };

    set(s => ({
      customLists: s.customLists.map(l => (l.id === id ? { ...l, ...payload } : l))
    }));

    await persistUpdateCustomList(id, payload);
  },

  // 12. Suppression d'une liste
  deleteCustomList: async (id) => {
    const state = get();
    const updatedItems = await executeDeleteCustomList(state.items, id);

    set(s => ({
      customLists: s.customLists.filter(l => l.id !== id),
      activeListId: s.activeListId === id ? 'all' : s.activeListId,
      items: updatedItems
    }));
  },

  // 13. Affectation d'un article à une liste
  assignItemToList: async (itemId, listId) => {
    const state = get();
    const target = state.items.find(i => i.id === itemId);
    if (!target) return;

    const safeListIds = Array.isArray(target.listIds) ? target.listIds : [];
    const exists = safeListIds.includes(listId);
    const nextListIds = exists
      ? safeListIds.filter(id => id !== listId)
      : [...safeListIds, listId];

    const now = new Date().toISOString();

    set(s => ({
      items: s.items.map(item =>
        item.id === itemId ? { ...item, listIds: nextListIds, updatedAt: now } : item
      )
    }));

    await persistUpdateShortageItem(itemId, { listIds: nextListIds, updatedAt: now });
  },

  // 14. Contrôles de navigation et filtres
  setActiveListId: (listId) => set({ activeListId: listId }),
  setSelectedSupplierFilter: (supplierId) => set({ selectedSupplierFilter: supplierId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSuggestionsOpen: (open) => set({ isSuggestionsOpen: open }),

  // 15. Algorithme de Détection Intelligente
  detectLowStockProducts: (products, purchases = [], suppliers = [], globalAlertThreshold = 5) => {
    const existingProductIds = new Set(get().items.map(i => i.productId));
    return detectLowStockProducts(products, purchases, suppliers, globalAlertThreshold, existingProductIds);
  },

  // 16. Ajout en masse d'articles suggérés
  addAllSuggested: async (suggestedItems) => {
    for (const item of suggestedItems) {
      await get().addItem(
        {
          id: item.productId,
          name: item.name,
          barcode: item.barcode,
          sku: item.sku,
          stock: item.currentStock,
          minStock: item.minStock,
          costPrice: item.costPrice,
          supplier: item.supplierName,
          unit: item.unit,
          imageUrl: item.imageUrl
        },
        {
          quantity: item.quantityNeeded,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          costPrice: item.costPrice,
          currentStock: item.currentStock,
          minStock: item.minStock
        }
      );
    }
  },

  // 17. Sélecteur : articles filtrés
  getFilteredItems: () => {
    const { items, activeListId, selectedSupplierFilter, searchQuery } = get();
    return filterShortageItems(items, activeListId, selectedSupplierFilter, searchQuery);
  },

  // 18. Sélecteur : synthèse chiffrée
  getSummary: () => {
    const filtered = get().getFilteredItems();
    return computeShortageSummary(filtered);
  }
}));

// 🛡️ Auto-hydratation & Écouteur de synchronisation inter-onglets (BroadcastChannel)
if (typeof window !== 'undefined') {
  useShortageStore.getState().loadFromDb();

  try {
    const crossTabBc = new BroadcastChannel('nexus_crosstab_sync');
    crossTabBc.onmessage = (event) => {
      const data = event.data;
      if (
        data?.type === 'table-updated' &&
        (data.detail?.table === 'shortage_items' ||
         data.detail?.table === 'custom_replenishment_lists')
      ) {
        useShortageStore.getState().loadFromDb();
      }
    };
  } catch (_) {}

  window.addEventListener('storage', (event) => {
    if (event.key?.includes('shortage') || event.key?.includes('replenishment')) {
      useShortageStore.getState().loadFromDb();
    }
  });
}
