import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../../../../types';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useCoreStore } from '../../../../store/useCoreStore';
import { localDb } from '../../../../services/LocalDatabase';
import { toast } from 'sonner';
import { EditableSaleRow, ProductSalesSummary, ProductSalesEditModalProps } from './salesEditTypes';
import { extractMatchingSalesForProduct } from './matchingSalesExtractor';
import { executeSaveTransactionRow, executeRemoveProductFromTransaction } from './salesRowOperations';

const ITEMS_PER_PAGE = 50;

export function useProductSalesEditLogic({
  product,
  transactions,
  settings,
}: Pick<ProductSalesEditModalProps, 'product' | 'transactions' | 'settings'>) {
  const currency = settings?.currency || 'DA';

  const storeTransactions = useTransactionStore(s => s.transactions);
  const effectiveTransactions = useMemo(() => {
    const combined = [...(transactions || []), ...(storeTransactions || [])];
    const map = new Map<string, Transaction>();
    combined.forEach(t => {
      if (t && t.id) map.set(t.id, t);
    });
    return Array.from(map.values());
  }, [transactions, storeTransactions]);

  const matchingSales = useMemo(() => {
    return extractMatchingSalesForProduct(product, effectiveTransactions);
  }, [product, effectiveTransactions]);

  const [salesRows, setSalesRows] = useState<EditableSaleRow[]>([]);
  const [bulkCost, setBulkCost] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setSalesRows(matchingSales);
    if (product) {
      setBulkCost((product.costPrice || 0).toString());
    }
  }, [matchingSales, product]);

  const handleUpdateRowState = (txId: string, itemIdx: number, patch: Partial<EditableSaleRow>) => {
    setSalesRows(prev =>
      prev.map(row => {
        if (row.transactionId === txId && row.itemIndex === itemIdx) {
          return { ...row, ...patch };
        }
        return row;
      })
    );
  };

  const handleSaveTransactionRow = async (row: EditableSaleRow) => {
    setProcessingTxId(row.transactionId);
    try {
      await executeSaveTransactionRow(row, product, (patch) => {
        handleUpdateRowState(row.transactionId, row.itemIndex, patch);
      });
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour de la vente:", err);
      toast.error("Erreur: " + err.message);
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleRemoveProductFromTransaction = async (row: EditableSaleRow) => {
    setProcessingTxId(row.transactionId);
    try {
      await executeRemoveProductFromTransaction(row, product, () => {
        setSalesRows(prev => prev.filter(r => !(r.transactionId === row.transactionId && r.itemIndex === row.itemIndex)));
      });
    } catch (err: any) {
      toast.error("Erreur lors de la suppression de l'article: " + err.message);
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleApplyBulkCost = async () => {
    const costNum = parseFloat(bulkCost);
    if (isNaN(costNum) || costNum < 0) {
      toast.error("Veuillez saisir un coût d'achat valide.");
      return;
    }

    if (!window.confirm(`Appliquer le coût d'achat de ${costNum.toFixed(2)} ${currency} à TOUTES les ${salesRows.length} ventes passées de "${product.name}" ?`)) {
      return;
    }

    setIsProcessingBulk(true);
    try {
      const allTxMap = new Map<string, Transaction>();
      const currentTxStore = useTransactionStore.getState().transactions;
      currentTxStore.forEach(t => allTxMap.set(t.id, { ...t }));

      const updatedTxs: Transaction[] = [];

      salesRows.forEach(row => {
        const tx = allTxMap.get(row.transactionId);
        if (!tx) return;

        const updatedItems = [...tx.items];
        if (updatedItems[row.itemIndex]) {
          updatedItems[row.itemIndex] = {
            ...updatedItems[row.itemIndex],
            costPrice: costNum
          };
          tx.items = updatedItems;
          tx.updatedAt = new Date().toISOString();
          allTxMap.set(tx.id, tx);
          if (!updatedTxs.some(t => t.id === tx.id)) {
            updatedTxs.push(tx);
          }
        }
      });

      for (const tx of updatedTxs) {
        await localDb.update(`transactions/${tx.id}`, tx);
      }

      useTransactionStore.getState().setTransactions(
        currentTxStore.map(t => allTxMap.get(t.id) || t)
      );

      if (product.id) {
        const rawProds = useCoreStore.getState().products;
        const prodInStore = rawProds.find(p => p.id === product.id);
        if (prodInStore) {
          const updatedProd = { ...prodInStore, costPrice: costNum, updatedAt: new Date().toISOString() };
          await localDb.update(`products/${product.id}`, updatedProd);
          useCoreStore.getState().setProducts(rawProds.map(p => p.id === product.id ? updatedProd : p));
          window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
        }
      }

      setSalesRows(prev => prev.map(r => ({ ...r, costPrice: costNum })));
      toast.success(`Coût d'achat régularisé sur ${updatedTxs.length} ticket(s) avec succès !`);
    } catch (err: any) {
      console.error("Erreur bulk cost:", err);
      toast.error("Erreur: " + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const summary: ProductSalesSummary = useMemo(() => {
    const qty = salesRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const grossRev = salesRows.reduce((sum, r) => sum + ((Number(r.price) || 0) * (Number(r.quantity) || 0)), 0);
    const disc = salesRows.reduce((sum, r) => sum + (Number(r.discountAmount) || 0), 0);
    const netRev = Math.max(0, grossRev - disc);
    const cost = salesRows.reduce((sum, r) => sum + ((Number(r.costPrice) || 0) * (Number(r.quantity) || 0)), 0);
    return {
      totalQtySold: qty,
      totalRevenue: netRev,
      totalDiscount: disc,
      totalCost: cost,
      totalProfit: netRev - cost,
    };
  }, [salesRows]);

  const totalPages = Math.max(1, Math.ceil(salesRows.length / ITEMS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return salesRows.slice(start, start + ITEMS_PER_PAGE);
  }, [salesRows, currentPage]);

  return {
    currency,
    salesRows,
    paginatedRows,
    bulkCost,
    setBulkCost,
    isProcessingBulk,
    processingTxId,
    currentPage,
    setCurrentPage,
    totalPages,
    summary,
    handleUpdateRowState,
    handleSaveTransactionRow,
    handleRemoveProductFromTransaction,
    handleApplyBulkCost,
    ITEMS_PER_PAGE
  };
}
