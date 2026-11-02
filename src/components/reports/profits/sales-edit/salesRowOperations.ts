import { Product, Transaction } from '../../../../types';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useCoreStore } from '../../../../store/useCoreStore';
import { localDb } from '../../../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../../../supabase';
import { calculateItemPrice, safeGetItems } from '../../../../lib/utils';
import { toast } from 'sonner';
import { EditableSaleRow } from './salesEditTypes';

export async function executeSaveTransactionRow(
  row: EditableSaleRow,
  product: Product,
  onRowUpdated: (patch: Partial<EditableSaleRow>) => void
) {
  const origTx = row.transaction;
  const updatedItems = [...origTx.items];

  const targetItem = updatedItems[row.itemIndex];
  if (!targetItem) {
    throw new Error("L'article n'a pas été trouvé dans ce ticket.");
  }

  const prevQty = targetItem.quantity;
  const newQty = row.quantity;
  const qtyDiff = newQty - prevQty;

  updatedItems[row.itemIndex] = {
    ...targetItem,
    price: row.price,
    costPrice: row.costPrice,
    quantity: row.quantity
  };

  const grossItemsTotal = updatedItems.reduce((sum, it) => sum + (calculateItemPrice(it, origTx.isWholesale) * it.quantity), 0);
  const newDiscountAmount = Math.max(0, Number(row.discountAmount || 0));
  const pointsAndVoucher = Number(origTx.pointsDiscount || 0) + Number(origTx.voucherDiscount || 0);
  const newTotal = Math.max(0, grossItemsTotal - newDiscountAmount - pointsAndVoucher);
  const newTimestamp = row.currentDate ? new Date(row.currentDate).toISOString() : origTx.timestamp;

  const updatedTx: Transaction = {
    ...origTx,
    items: updatedItems,
    discountAmount: newDiscountAmount,
    total: newTotal,
    timestamp: newTimestamp,
    updatedAt: new Date().toISOString()
  };

  await localDb.update(`transactions/${updatedTx.id}`, updatedTx);
  useTransactionStore.getState().setTransactions(prev =>
    prev.map(t => t.id === updatedTx.id ? updatedTx : t)
  );

  if (qtyDiff !== 0 && product.id) {
    const rawProds = useCoreStore.getState().products;
    const prodInStore = rawProds.find(p => p.id === product.id);
    if (prodInStore) {
      const newStock = Math.max(0, (prodInStore.stock || 0) - qtyDiff);
      const updatedProd = { ...prodInStore, stock: newStock, updatedAt: new Date().toISOString() };
      await localDb.update(`products/${product.id}`, updatedProd);
      useCoreStore.getState().setProducts(rawProds.map(p => p.id === product.id ? updatedProd : p));
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
    }
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('transactions')
        .update({
          items: updatedItems,
          discount_amount: newDiscountAmount,
          total: newTotal,
          timestamp: newTimestamp,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTx.id);
    } catch (cloudErr) {
      console.warn("Sync Supabase error:", cloudErr);
    }
  }

  onRowUpdated({ isEditing: false });
  toast.success(`Vente #${row.transactionId.slice(-6).toUpperCase()} mise à jour avec succès !`);
}

export async function executeRemoveProductFromTransaction(
  row: EditableSaleRow,
  product: Product,
  onRemoved: () => void
) {
  if (!window.confirm(`Voulez-vous vraiment RETIRER "${product.name}" de la vente #${row.transactionId.slice(-6).toUpperCase()} ? Le total du ticket sera recalculé.`)) {
    return;
  }

  const origTx = row.transaction;
  const updatedItems = safeGetItems(origTx).filter((_, idx) => idx !== row.itemIndex);

  if (updatedItems.length === 0) {
    await localDb.delete(`transactions/${origTx.id}`);
    useTransactionStore.getState().setTransactions(prev => prev.filter(t => t.id !== origTx.id));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('transactions').delete().eq('id', origTx.id);
      } catch (_) {}
    }
    toast.success(`Le ticket #${origTx.id.slice(-6).toUpperCase()} était vide et a été supprimé.`);
  } else {
    const newTotal = updatedItems.reduce((sum, it) => sum + (calculateItemPrice(it, origTx.isWholesale) * it.quantity), 0);

    const updatedTx: Transaction = {
      ...origTx,
      items: updatedItems,
      total: newTotal,
      updatedAt: new Date().toISOString()
    };

    await localDb.update(`transactions/${updatedTx.id}`, updatedTx);
    useTransactionStore.getState().setTransactions(prev =>
      prev.map(t => t.id === updatedTx.id ? updatedTx : t)
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('transactions')
          .update({
            items: updatedItems,
            total: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', updatedTx.id);
      } catch (_) {}
    }
    toast.success(`Article retiré de la vente #${origTx.id.slice(-6).toUpperCase()}.`);
  }

  if (product.id) {
    const rawProds = useCoreStore.getState().products;
    const prodInStore = rawProds.find(p => p.id === product.id);
    if (prodInStore) {
      const newStock = (prodInStore.stock || 0) + row.quantity;
      const updatedProd = { ...prodInStore, stock: newStock, updatedAt: new Date().toISOString() };
      await localDb.update(`products/${product.id}`, updatedProd);
      useCoreStore.getState().setProducts(rawProds.map(p => p.id === product.id ? updatedProd : p));
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
    }
  }

  onRemoved();
}
