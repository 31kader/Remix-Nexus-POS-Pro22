import { Product } from '../../../types';
import { useTransactionStore } from '../../../store/useTransactionStore';
import { set as setIDB } from 'idb-keyval';
import { enqueueSyncBatch } from '../../../services/SyncService';
import { preparePayload } from '../../../lib/db-converters';
import { toast } from 'sonner';

export async function executeRecalculateProfits(products: Product[]): Promise<boolean> {
  if (!confirm("Voulez-vous resynchroniser et recalculer le prix d'achat et le bénéfice de toutes les ventes à partir des prix du catalogue actuel ?")) {
    return false;
  }

  try {
    const productsById = new Map<string, Product>();
    products.forEach(p => productsById.set(p.id, p));

    let updatedCount = 0;
    const currentTransactions = useTransactionStore.getState().transactions || [];

    const updatedTransactions = currentTransactions.map(t => {
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) return t;

      let txModified = false;
      const updatedItems = items.map(item => {
        const itemSku = String((item as any).sku || '').toLowerCase().trim();
        const itemBarcode = String((item as any).barcode || '').toLowerCase().trim();
        const itemName = String(item.name || '').toLowerCase().trim();
        const itemKey = (item as any).productId || item.id;
        const matchingProduct = productsById.get(itemKey) || 
                                (itemSku ? products.find(p => p.sku && p.sku.toLowerCase().trim() === itemSku) : null) ||
                                (itemBarcode ? products.find(p => p.barcode && p.barcode.toLowerCase().trim() === itemBarcode) : null) ||
                                (itemName ? products.find(p => p.name && p.name.toLowerCase().trim() === itemName) : null);

        if (matchingProduct && matchingProduct.costPrice !== undefined && Number(matchingProduct.costPrice) > 0) {
          if ((item as any).costPrice !== matchingProduct.costPrice) {
            txModified = true;
            return {
              ...item,
              costPrice: matchingProduct.costPrice
            };
          }
        }
        return item;
      });

      if (txModified) {
        updatedCount++;
        return {
          ...t,
          items: updatedItems
        };
      }
      return t;
    });

    if (updatedCount > 0) {
      useTransactionStore.setState({ transactions: updatedTransactions });
      await setIDB('nexus_transactions_cache', updatedTransactions).catch(() => {});

      const modifiedTxs = updatedTransactions.filter(t => currentTransactions.some(orig => orig.id === t.id && orig !== t));
      if (modifiedTxs.length > 0) {
        enqueueSyncBatch(modifiedTxs.map(t => ({
          table: 'transactions',
          action: 'UPSERT',
          recordId: t.id,
          payload: preparePayload('transactions', t.id, t)
        })));
      }

      toast.success(`Bénéfices recalculés avec succès ! ${updatedCount} transaction(s) mise(s) à jour.`);
    } else {
      toast.info("Toutes les ventes sont déjà basées sur les prix d'achat actuels du catalogue.");
    }
    return true;
  } catch (err: any) {
    toast.error(`Erreur lors du recalcul : ${err.message || 'Erreur inconnue'}`);
    return false;
  }
}
