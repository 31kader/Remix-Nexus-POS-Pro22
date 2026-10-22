import { create } from 'zustand';
import { ShortageItem, CustomReplenishmentList, ShortageSummary } from '../types/shortages';
import { Product, Supplier, Purchase } from '../types';
import { generateLocalId } from '../lib/db-converters';
import { localDb } from '../services/LocalDatabase';
import { getLocalValue } from '../lib/local-db';
import { get as idbGet } from 'idb-keyval';

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
      // Priorité 1 : Vérification dans le cache mémoire local-db
      let rawItems = getLocalValue('shortage_items');
      let rawLists = getLocalValue('custom_replenishment_lists');

      // Priorité 2 : Si vide en mémoire (démarrage à froid), repli sur IndexedDB
      if (!rawItems || Object.keys(rawItems).length === 0) {
        try {
          const idbItems = (await idbGet<any>('nexus_db_shortage_items')) || (await idbGet<any>('nexus_shortage_items_cache'));
          if (idbItems && typeof idbItems === 'object') {
            rawItems = idbItems;
          }
        } catch (_) {}
      }

      if (!rawLists || Object.keys(rawLists).length === 0) {
        try {
          const idbLists = (await idbGet<any>('nexus_db_custom_replenishment_lists')) || (await idbGet<any>('nexus_custom_replenishment_lists_cache'));
          if (idbLists && typeof idbLists === 'object') {
            rawLists = idbLists;
          }
        } catch (_) {}
      }

      const items: ShortageItem[] = rawItems
        ? (Array.isArray(rawItems) ? rawItems : Object.values(rawItems)).filter(Boolean)
        : [];

      const customLists: CustomReplenishmentList[] = rawLists
        ? (Array.isArray(rawLists) ? rawLists : Object.values(rawLists)).filter(Boolean)
        : [];

      set({
        items,
        customLists,
        isLoaded: true
      });
    } catch (err) {
      console.warn('[useShortageStore] Erreur chargement local:', err);
      set({ isLoaded: true });
    }
  },

  // 2. Ajout d'un article avec déduplication & anti-écrasement arithmétique
  addItem: async (product, options) => {
    const state = get();
    const existingIndex = state.items.findIndex(i => i.productId === product.id);
    const now = new Date().toISOString();
    const effectiveListId = options?.listId || (state.activeListId !== 'all' ? state.activeListId : undefined);

    if (existingIndex >= 0) {
      // Déjà présent : incrémentation de la quantité manquante et fusion des listes
      const existing = state.items[existingIndex];
      const addedQty = Math.max(1, Math.round(options?.quantity ?? 1));
      const nextQty = existing.quantityNeeded + addedQty;
      const existingListIds = Array.isArray(existing.listIds) ? existing.listIds : [];
      const nextListIds = effectiveListId && !existingListIds.includes(effectiveListId)
        ? [...existingListIds, effectiveListId]
        : existingListIds;

      const updatedItem: ShortageItem = {
        ...existing,
        quantityNeeded: nextQty,
        listIds: nextListIds,
        costPrice: options?.costPrice !== undefined ? options.costPrice : existing.costPrice,
        currentStock: options?.currentStock !== undefined ? options.currentStock : (product.stock ?? existing.currentStock),
        minStock: options?.minStock !== undefined ? options.minStock : (product.minStock ?? existing.minStock),
        updatedAt: now
      };

      // Persistance stricte à 2 arguments (path, value)
      await localDb.update(`shortage_items/${updatedItem.id}`, updatedItem);

      set(s => {
        const nextItems = [...s.items];
        nextItems[existingIndex] = updatedItem;
        return { items: nextItems };
      });

      return updatedItem;
    } else {
      // Nouveau produit manquant
      const id = generateLocalId();
      const initialQty = Math.max(
        1,
        Math.round(
          options?.quantity ??
          (product.minStock && product.minStock > (product.stock || 0)
            ? product.minStock - (product.stock || 0)
            : 1)
        )
      );

      const newItem: ShortageItem = {
        id,
        productId: product.id,
        name: product.name,
        barcode: product.barcode || '',
        sku: product.sku || '',
        imageUrl: product.imageUrl || (product as any).image || '',
        costPrice: options?.costPrice ?? (product.costPrice || 0),
        currentStock: options?.currentStock ?? (product.stock || 0),
        minStock: options?.minStock ?? (product.minStock || 0),
        quantityNeeded: initialQty,
        supplierId: options?.supplierId || '',
        supplierName: options?.supplierName || product.supplier || '',
        isChecked: false,
        listIds: effectiveListId ? [effectiveListId] : [],
        unit: (product as any).unit || 'pcs',
        notes: options?.notes || '',
        priority: options?.priority || 'normal',
        createdAt: now,
        updatedAt: now
      };

      // Persistance stricte à 2 arguments (path, value)
      await localDb.insert(`shortage_items/${newItem.id}`, newItem);

      set(s => ({
        items: [newItem, ...s.items]
      }));

      return newItem;
    }
  },

  // 2b. Ajout d'un article hors-catalogue (non répertorié dans les produits)
  addCustomItem: async (data) => {
    const state = get();
    const cleanName = data.name.trim();
    const cleanBarcode = data.barcode?.trim() || '';
    const now = new Date().toISOString();

    // Recherche de doublon par code-barres (si fourni) ou par nom exact
    const existingIndex = state.items.findIndex(i => {
      if (cleanBarcode && i.barcode && i.barcode.toLowerCase() === cleanBarcode.toLowerCase()) {
        return true;
      }
      return i.name.toLowerCase() === cleanName.toLowerCase() && i.isCustomProduct;
    });

    const addedQty = Math.max(1, Math.round(data.quantityNeeded ?? 1));

    if (existingIndex >= 0) {
      const existing = state.items[existingIndex];
      const nextQty = existing.quantityNeeded + addedQty;
      const targetLists = (data.listIds && data.listIds.length > 0)
        ? data.listIds
        : (state.activeListId !== 'all' ? [state.activeListId] : []);
      const combinedLists = Array.from(new Set([...(existing.listIds || []), ...targetLists]));

      const updatedItem: ShortageItem = {
        ...existing,
        quantityNeeded: nextQty,
        listIds: combinedLists,
        costPrice: data.costPrice !== undefined && data.costPrice > 0 ? data.costPrice : existing.costPrice,
        supplierId: data.supplierId || existing.supplierId,
        supplierName: data.supplierName || existing.supplierName,
        barcode: cleanBarcode || existing.barcode,
        notes: data.notes ? (existing.notes ? `${existing.notes} | ${data.notes}` : data.notes) : existing.notes,
        priority: data.priority || existing.priority || 'normal',
        updatedAt: now
      };

      await localDb.update(`shortage_items/${updatedItem.id}`, updatedItem);

      set(s => {
        const nextItems = [...s.items];
        nextItems[existingIndex] = updatedItem;
        return { items: nextItems };
      });

      return updatedItem;
    } else {
      const id = generateLocalId();
      const newItem: ShortageItem = {
        id,
        productId: `custom_${generateLocalId()}`,
        name: cleanName,
        barcode: cleanBarcode,
        sku: data.sku?.trim() || '',
        costPrice: Math.max(0, data.costPrice || 0),
        currentStock: 0,
        minStock: 0,
        quantityNeeded: addedQty,
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || '',
        isChecked: false,
        listIds: (data.listIds && data.listIds.length > 0)
          ? data.listIds
          : (state.activeListId !== 'all' ? [state.activeListId] : []),
        unit: data.unit || 'pcs',
        isCustomProduct: true,
        notes: data.notes?.trim() || '',
        priority: data.priority || 'normal',
        createdAt: now,
        updatedAt: now
      };

      await localDb.insert(`shortage_items/${newItem.id}`, newItem);

      set(s => ({
        items: [newItem, ...s.items]
      }));

      return newItem;
    }
  },

  // 3. Mise à jour de la quantité manquante
  updateItemQuantity: async (id, quantity) => {
    const validQty = Math.max(1, Math.round(quantity));
    const now = new Date().toISOString();

    set(s => ({
      items: s.items.map(item =>
        item.id === id ? { ...item, quantityNeeded: validQty, updatedAt: now } : item
      )
    }));

    await localDb.update(`shortage_items/${id}`, {
      quantityNeeded: validQty,
      updatedAt: now
    });
  },

  // 4. Mise à jour du prix d'achat constaté
  updateItemCostPrice: async (id, costPrice) => {
    const validPrice = Math.max(0, costPrice);
    const now = new Date().toISOString();

    set(s => ({
      items: s.items.map(item =>
        item.id === id ? { ...item, costPrice: validPrice, updatedAt: now } : item
      )
    }));

    await localDb.update(`shortage_items/${id}`, {
      costPrice: validPrice,
      updatedAt: now
    });
  },

  // 4b. Mise à jour des remarques / notes
  updateItemNotes: async (id, notes) => {
    const now = new Date().toISOString();
    set(s => ({
      items: s.items.map(item =>
        item.id === id ? { ...item, notes: notes.trim(), updatedAt: now } : item
      )
    }));

    await localDb.update(`shortage_items/${id}`, {
      notes: notes.trim(),
      updatedAt: now
    });
  },

  // 4c. Bascule de priorité (Normal <-> Urgent)
  toggleItemPriority: async (id) => {
    const state = get();
    const target = state.items.find(i => i.id === id);
    if (!target) return;

    const nextPriority: 'normal' | 'urgent' = target.priority === 'urgent' ? 'normal' : 'urgent';
    const now = new Date().toISOString();

    set(s => ({
      items: s.items.map(item =>
        item.id === id ? { ...item, priority: nextPriority, updatedAt: now } : item
      )
    }));

    await localDb.update(`shortage_items/${id}`, {
      priority: nextPriority,
      updatedAt: now
    });
  },

  // 5. Bascule de sélection (case à cocher)
  toggleItemCheck: async (id) => {
    const state = get();
    const target = state.items.find(i => i.id === id);
    if (!target) return;

    const nextChecked = !target.isChecked;
    const now = new Date().toISOString();

    set(s => ({
      items: s.items.map(item =>
        item.id === id ? { ...item, isChecked: nextChecked, updatedAt: now } : item
      )
    }));

    await localDb.update(`shortage_items/${id}`, {
      isChecked: nextChecked,
      updatedAt: now
    });
  },

  // 6. Sélection / Désélection en masse
  toggleAllCheck: async (checked) => {
    const filtered = get().getFilteredItems();
    if (filtered.length === 0) return;

    const targetVal = checked !== undefined ? checked : !filtered.every(i => i.isChecked);
    const idsToUpdate = new Set(filtered.map(i => i.id));
    const now = new Date().toISOString();

    set(s => ({
      items: s.items.map(item =>
        idsToUpdate.has(item.id) ? { ...item, isChecked: targetVal, updatedAt: now } : item
      )
    }));

    await Promise.all(
      Array.from(idsToUpdate).map(id =>
        localDb.update(`shortage_items/${id}`, {
          isChecked: targetVal,
          updatedAt: now
        })
      )
    );
  },

  // 7. Suppression d'un article
  removeItem: async (id) => {
    set(s => ({
      items: s.items.filter(item => item.id !== id)
    }));

    await localDb.delete(`shortage_items/${id}`);
  },

  // 8. Nettoyage des articles cochés
  clearCheckedItems: async () => {
    const state = get();
    const checked = state.items.filter(i => i.isChecked);
    if (checked.length === 0) return;

    set(s => ({
      items: s.items.filter(item => !item.isChecked)
    }));

    await Promise.all(checked.map(item => localDb.delete(`shortage_items/${item.id}`)));
  },

  // 9. Nettoyage de tous les articles de la vue active
  clearAllItems: async () => {
    const filtered = get().getFilteredItems();
    if (filtered.length === 0) return;

    const idsToDelete = new Set(filtered.map(i => i.id));

    set(s => ({
      items: s.items.filter(item => !idsToDelete.has(item.id))
    }));

    await Promise.all(Array.from(idsToDelete).map(id => localDb.delete(`shortage_items/${id}`)));
  },

  // 10. Création d'une liste personnalisée libre
  createCustomList: async (name, description, color) => {
    const id = `list-${generateLocalId()}`;
    const now = new Date().toISOString();

    const newList: CustomReplenishmentList = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#6366f1',
      createdAt: now,
      updatedAt: now
    };

    await localDb.insert(`custom_replenishment_lists/${newList.id}`, newList);

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

  // 11. Mise à jour d'une liste personnalisée
  updateCustomList: async (id, updates) => {
    const now = new Date().toISOString();
    const payload = { ...updates, updatedAt: now };

    set(s => ({
      customLists: s.customLists.map(l => (l.id === id ? { ...l, ...payload } : l))
    }));

    await localDb.update(`custom_replenishment_lists/${id}`, payload);
  },

  // 12. Suppression d'une liste personnalisée
  deleteCustomList: async (id) => {
    const state = get();
    const now = new Date().toISOString();

    // 1. Retirer la référence de cette liste dans tous les articles
    const updatedItems = state.items.map(item => {
      const safeListIds = Array.isArray(item.listIds) ? item.listIds : [];
      if (safeListIds.includes(id)) {
        const nextListIds = safeListIds.filter(lId => lId !== id);
        localDb.update(`shortage_items/${item.id}`, {
          listIds: nextListIds,
          updatedAt: now
        }).catch(() => {});
        return { ...item, listIds: nextListIds, updatedAt: now };
      }
      return item;
    });

    set(s => ({
      customLists: s.customLists.filter(l => l.id !== id),
      activeListId: s.activeListId === id ? 'all' : s.activeListId,
      items: updatedItems
    }));

    await localDb.delete(`custom_replenishment_lists/${id}`);
  },

  // 13. Affectation / Désaffectation d'un article à une liste
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

    await localDb.update(`shortage_items/${itemId}`, {
      listIds: nextListIds,
      updatedAt: now
    });
  },

  // 14. Contrôles de navigation et filtres
  setActiveListId: (listId) => set({ activeListId: listId }),
  setSelectedSupplierFilter: (supplierId) => set({ selectedSupplierFilter: supplierId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSuggestionsOpen: (open) => set({ isSuggestionsOpen: open }),

  // 15. Algorithme de Détection Intelligente des Articles en Rupture / Seuil Bas
  detectLowStockProducts: (products, purchases = [], suppliers = [], globalAlertThreshold = 5) => {
    const existingProductIds = new Set(get().items.map(i => i.productId));
    const suggestions: ShortageItem[] = [];

    // Trier les achats par date décroissante pour identifier le dernier approvisionnement
    const sortedPurchases = [...purchases].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    for (const product of products) {
      // Ignorer les produits désactivés ou déjà présents dans le cahier des manques
      if (product.status === 'inactive' || product.status === 'discontinued') continue;
      if (existingProductIds.has(product.id)) continue;

      const currentStock = Number(product.stock) || 0;
      const minStock = Number(product.minStock) || globalAlertThreshold;

      // Critère : rupture totale ou passage sous le seuil d'alerte
      if (currentStock <= minStock || currentStock <= 0) {
        // Identification du dernier fournisseur et coût d'achat via l'historique purchases
        let matchedSupplierId = '';
        let matchedSupplierName = '';
        let lastCostPrice = Number(product.costPrice) || 0;

        for (const purchase of sortedPurchases) {
          if (Array.isArray(purchase.items)) {
            const foundItem = purchase.items.find(it => it.productId === product.id);
            if (foundItem) {
              matchedSupplierId = purchase.supplierId || '';
              matchedSupplierName = purchase.supplierName || '';
              if (foundItem.costPrice && foundItem.costPrice > 0) {
                lastCostPrice = Number(foundItem.costPrice);
              }
              break;
            }
          }
        }

        // Repli sur le champ statique de la fiche produit si aucun achat antérieur
        if (!matchedSupplierName && product.supplier) {
          const sup = suppliers.find(
            s => s.id === product.supplier || s.name.toLowerCase() === product.supplier.toLowerCase()
          );
          if (sup) {
            matchedSupplierId = sup.id;
            matchedSupplierName = sup.name;
          } else {
            matchedSupplierName = product.supplier;
          }
        }

        if (!matchedSupplierName) {
          matchedSupplierName = 'Sans fournisseur';
        }

        // Quantité recommandée pour restaurer le stock au-dessus du seuil d'alerte
        const recommendedQty = Math.max(1, Math.round(minStock - Math.max(0, currentStock)));

        suggestions.push({
          id: `sugg-${product.id}`,
          productId: product.id,
          name: product.name,
          barcode: product.barcode || '',
          sku: product.sku || '',
          imageUrl: product.imageUrl || (product as any).image || '',
          costPrice: lastCostPrice,
          currentStock,
          minStock,
          quantityNeeded: recommendedQty,
          supplierId: matchedSupplierId,
          supplierName: matchedSupplierName,
          isChecked: false,
          listIds: [],
          unit: product.unit || 'pcs',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return suggestions;
  },

  // 16. Ajout en masse d'articles suggérés avec consolidation
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

  // 17. Sélecteur : articles filtrés pour l'affichage interactif
  getFilteredItems: () => {
    const { items, activeListId, selectedSupplierFilter, searchQuery } = get();
    const query = searchQuery.trim().toLowerCase();

    return items.filter(item => {
      if (!item) return false;

      // Filtre par liste personnalisée
      if (activeListId !== 'all') {
        const listIds = Array.isArray(item.listIds) ? item.listIds : [];
        if (!listIds.includes(activeListId)) return false;
      }

      // Filtre par fournisseur
      if (selectedSupplierFilter !== 'all') {
        if (
          item.supplierId !== selectedSupplierFilter &&
          item.supplierName !== selectedSupplierFilter
        ) {
          return false;
        }
      }

      // Filtre de recherche textuelle / code-barres
      if (query) {
        const matchesName = (item.name || '').toLowerCase().includes(query);
        const matchesBarcode = (item.barcode || '').toLowerCase().includes(query);
        const matchesSku = (item.sku || '').toLowerCase().includes(query);
        const matchesSupplier = (item.supplierName || '').toLowerCase().includes(query);
        if (!matchesName && !matchesBarcode && !matchesSku && !matchesSupplier) {
          return false;
        }
      }

      return true;
    });
  },

  // 18. Sélecteur : synthèse chiffrée (statistiques & valorisation)
  getSummary: () => {
    const filtered = get().getFilteredItems();

    let totalQuantity = 0;
    let totalEstimatedCost = 0;
    let checkedCount = 0;
    let checkedEstimatedCost = 0;

    for (const item of filtered) {
      const itemCost = item.quantityNeeded * (item.costPrice || 0);
      totalQuantity += item.quantityNeeded;
      totalEstimatedCost += itemCost;

      if (item.isChecked) {
        checkedCount += 1;
        checkedEstimatedCost += itemCost;
      }
    }

    return {
      totalItems: filtered.length,
      totalQuantity,
      totalEstimatedCost,
      checkedCount,
      checkedEstimatedCost
    };
  }
}));

// 🛡️ Auto-hydratation & Écouteur de synchronisation inter-onglets (BroadcastChannel)
if (typeof window !== 'undefined') {
  // 1. Hydratation initiale
  useShortageStore.getState().loadFromDb();

  // 2. Écoute du canal BroadcastChannel pour réagir à toute modification distante
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

  // 3. Écoute des événements locaux
  window.addEventListener('storage', (event) => {
    if (event.key?.includes('shortage') || event.key?.includes('replenishment')) {
      useShortageStore.getState().loadFromDb();
    }
  });
}
