import { CartItem, Product, Transaction } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { set as idbSet } from 'idb-keyval';
import { processEditingStock } from './processEditingStock';
import { processNewSaleStock } from './processNewSaleStock';

export interface CheckoutStockProcessorParams {
  isEditing: boolean;
  safeCart: CartItem[];
  editingTransaction?: Transaction | null;
  products: Product[];
}

export async function processCheckoutStock({
  isEditing,
  safeCart,
  editingTransaction,
  products
}: CheckoutStockProcessorParams) {
  // SÉCURITÉ : Protection de la liste locale des produits
  const tempProducts = [...(products || [])];
  const getProductFromTemp = (id: string) => tempProducts.find((p: Product) => p && p.id === id);
  const updateTempProductStock = (id: string, newStock: number, newBatches?: any[]) => {
    const idx = tempProducts.findIndex((p: Product) => p && p.id === id);
    if (idx > -1) {
      tempProducts[idx] = { 
        ...tempProducts[idx], 
        stock: newStock, 
        updatedAt: new Date().toISOString() 
      };
      if (newBatches) {
        tempProducts[idx].batches = newBatches;
      }
    }
  };

  if (isEditing) {
    processEditingStock({
      safeCart,
      editingTransaction,
      getProductFromTemp,
      updateTempProductStock
    });
  } else {
    processNewSaleStock({
      safeCart,
      getProductFromTemp,
      updateTempProductStock
    });
  }

  // Synchronisation immédiate du store Zustand et du cache IDB des produits
  useCoreStore.getState().setProducts(tempProducts);
  if (typeof indexedDB !== 'undefined') {
    idbSet('nexus_products_cache', tempProducts).catch(() => {});
  }
}
