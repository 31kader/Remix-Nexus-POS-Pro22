import { useCallback } from 'react';
import { toast } from 'sonner';
import { localDb } from '../services/LocalDatabase';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import type { PurchaseOrder, Product, Transaction } from '../types';

/**
 * Centralise les handlers d'actions de l'application principale.
 * Extrait de App.tsx pour alléger le composant racine.
 */
export function useAppHandlers(
  deferredPrompt: any,
  setDeferredPrompt: (prompt: any) => void,
  setEditingProduct: (product: Product | null) => void,
  setIsStockAdjustmentModalOpen: (open: boolean) => void,
  setIsProductModalOpen: (open: boolean) => void,
) {
  /**
   * Déclenche le prompt d'installation PWA
   */
  const handleInstallApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }, [deferredPrompt, setDeferredPrompt]);

  /**
   * Crée une commande fournisseur dans la base locale
   */
  const handleCreatePurchaseOrder = useCallback(async (
    order: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await localDb.push('purchaseOrders', {
        ...order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Commande créée avec succès');
    } catch (err) {
      handleDatabaseError(err, OperationType.WRITE, 'purchaseOrders');
      throw err;
    }
  }, []);

  /**
   * Met à jour un produit dans la base locale
   */
  const handleUpdateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const prod = useCoreStore.getState().products.find(p => p.id === id);
      if (prod) {
        await localDb.insert(`products/${id}`, {
          ...prod,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await localDb.update(`products/${id}`, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleDatabaseError(err, OperationType.WRITE, 'products');
    }
  }, []);

  /**
   * Ouvre la modale d'ajustement de stock pour un produit donné
   */
  const handleAdjustStock = useCallback((product: Product, options?: any) => {
    setEditingProduct(options ? ({ ...product, _adjustmentOptions: options } as any) : product);
    setIsStockAdjustmentModalOpen(true);
  }, [setEditingProduct, setIsStockAdjustmentModalOpen]);

  /**
   * Ouvre la modale d'édition pour un produit donné
   */
  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  }, [setEditingProduct, setIsProductModalOpen]);

  /**
   * Marque une commande comme livrée dans la base locale et le store
   */
  const handleMarkAsDelivered = useCallback(async (tr: Transaction) => {
    const updated = { ...tr, status: 'delivered' as const, updatedAt: new Date().toISOString() };
    await localDb.update(`transactions/${tr.id}`, updated);
    useTransactionStore.getState().setTransactions(prev =>
      (prev || []).map(tx => tx.id === tr.id ? updated : tx)
    );
  }, []);

  return {
    handleInstallApp,
    handleCreatePurchaseOrder,
    handleUpdateProduct,
    handleAdjustStock,
    handleEditProduct,
    handleMarkAsDelivered,
  };
}
