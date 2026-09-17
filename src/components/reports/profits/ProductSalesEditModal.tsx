import React, { useState, useMemo } from 'react';
import { 
  Receipt, Calendar, Trash2, Edit3, Save, X, AlertTriangle, 
  CheckCircle2, DollarSign, Clock, RefreshCw, ShoppingCart, User, Zap
} from 'lucide-react';
import { Modal, Button } from '../../ui';
import { Transaction, Product, CompanySettings } from '../../../types';
import { useTransactionStore } from '../../../store/useTransactionStore';
import { useCoreStore } from '../../../store/useCoreStore';
import { localDb } from '../../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../../supabase';
import { calculateItemPrice, formatSafe } from '../../../lib/utils';
import { toast } from 'sonner';

interface ProductSalesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  transactions: Transaction[];
  settings: CompanySettings;
}

interface EditableSaleRow {
  transactionId: string;
  transaction: Transaction;
  itemIndex: number;
  item: any;
  currentDate: string;
  quantity: number;
  price: number;
  costPrice: number;
  isEditing: boolean;
}

export function ProductSalesEditModal({
  isOpen,
  onClose,
  product,
  transactions,
  settings
}: ProductSalesEditModalProps) {
  const currency = settings?.currency || 'DA';

  // Combiner les transactions des props et du store Zustand
  const storeTransactions = useTransactionStore(s => s.transactions);
  const effectiveTransactions = useMemo(() => {
    const combined = [...(transactions || []), ...(storeTransactions || [])];
    const map = new Map<string, Transaction>();
    combined.forEach(t => {
      if (t && t.id) map.set(t.id, t);
    });
    return Array.from(map.values());
  }, [transactions, storeTransactions]);

  // Find all transactions containing this product
  const matchingSales = useMemo(() => {
    if (!product) return [];

    const targetId = String(product.id || '');
    const targetSku = String(product.sku || '').toLowerCase().trim();
    const targetBarcode = String(product.barcode || '').toLowerCase().trim();
    const targetName = String(product.name || '').toLowerCase().trim();

    const sales: EditableSaleRow[] = [];

    effectiveTransactions.forEach(t => {
      if (!t || t.status === 'returned') return;

      let items = t.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (_) {
          items = [];
        }
      }
      if (!Array.isArray(items)) return;

      items.forEach((item, idx) => {
        if (!item) return;
        const itemProdId = String((item as any).productId || item.id || '');
        const itemSku = String((item as any).sku || '').toLowerCase().trim();
        const itemBarcode = String((item as any).barcode || '').toLowerCase().trim();
        const itemName = String((item as any).name || '').toLowerCase().trim();

        const isMatch = (targetId && itemProdId === targetId) ||
                        (targetSku && itemSku && itemSku === targetSku) ||
                        (targetBarcode && itemBarcode && itemBarcode === targetBarcode) ||
                        (targetName && itemName && itemName === targetName);

        if (isMatch) {
          const rawCost = (item as any).costPrice ?? (item as any).cost_price;
          const itemCost = rawCost !== undefined && Number(rawCost) >= 0 
            ? Number(rawCost) 
            : Number(product.costPrice || (product as any).cost_price || 0);

          const itemPrice = Number(calculateItemPrice(item, t.isWholesale) ?? item.price ?? 0);
          const itemQty = Number(item.quantity) || 1;

          sales.push({
            transactionId: t.id,
            transaction: t,
            itemIndex: idx,
            item: { ...item },
            currentDate: t.timestamp ? new Date(t.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            quantity: itemQty,
            price: itemPrice,
            costPrice: itemCost,
            isEditing: false
          });
        }
      });
    });

    return sales.sort((a, b) => new Date(b.transaction.timestamp).getTime() - new Date(a.transaction.timestamp).getTime());
  }, [product, effectiveTransactions]);

  // Local state for rows being edited
  const [salesRows, setSalesRows] = useState<EditableSaleRow[]>([]);
  const [bulkCost, setBulkCost] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  // Sync rows on modal open
  React.useEffect(() => {
    setSalesRows(matchingSales);
    if (product) {
      setBulkCost((product.costPrice || 0).toString());
    }
  }, [matchingSales, product]);

  if (!product) return null;

  // Update row values in local state
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

  // Save single transaction changes (Price, CostPrice, Quantity, Date)
  const handleSaveTransactionRow = async (row: EditableSaleRow) => {
    setProcessingTxId(row.transactionId);
    try {
      const origTx = row.transaction;
      const updatedItems = [...origTx.items];

      // Update the specific item in the transaction
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

      // Recalculate transaction total
      const newTotal = updatedItems.reduce((sum, it) => sum + (calculateItemPrice(it, origTx.isWholesale) * it.quantity), 0);
      const newTimestamp = row.currentDate ? new Date(row.currentDate).toISOString() : origTx.timestamp;

      const updatedTx: Transaction = {
        ...origTx,
        items: updatedItems,
        total: newTotal,
        timestamp: newTimestamp,
        updatedAt: new Date().toISOString()
      };

      // 1. Update local database & store
      await localDb.update(`transactions/${updatedTx.id}`, updatedTx);
      useTransactionStore.getState().setTransactions(prev =>
        prev.map(t => t.id === updatedTx.id ? updatedTx : t)
      );

      // 2. Adjust stock if quantity changed
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

      // 3. Sync to Supabase
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('transactions')
            .update({
              items: updatedItems,
              total: newTotal,
              timestamp: newTimestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', updatedTx.id);
        } catch (cloudErr) {
          console.warn("Sync Supabase error:", cloudErr);
        }
      }

      // Close editing mode for this row
      handleUpdateRowState(row.transactionId, row.itemIndex, { isEditing: false });
      toast.success(`Vente #${row.transactionId.slice(-6).toUpperCase()} mise à jour avec succès !`);
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour de la vente:", err);
      toast.error("Erreur: " + err.message);
    } finally {
      setProcessingTxId(null);
    }
  };

  // Remove this product from the transaction
  const handleRemoveProductFromTransaction = async (row: EditableSaleRow) => {
    if (!window.confirm(`Voulez-vous vraiment RETIRER "${product.name}" de la vente #${row.transactionId.slice(-6).toUpperCase()} ? Le total du ticket sera recalculé.`)) {
      return;
    }

    setProcessingTxId(row.transactionId);
    try {
      const origTx = row.transaction;
      const updatedItems = origTx.items.filter((_, idx) => idx !== row.itemIndex);

      if (updatedItems.length === 0) {
        // If ticket becomes completely empty, delete transaction
        await localDb.delete(`transactions/${origTx.id}`);
        useTransactionStore.getState().setTransactions(prev => prev.filter(t => t.id !== origTx.id));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('transactions').delete().eq('id', origTx.id);
          } catch (_) {}
        }
        toast.success(`Le ticket #${origTx.id.slice(-6).toUpperCase()} était vide et a été supprimé.`);
      } else {
        // Recalculate transaction total
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

      // Restock the returned item
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

      setSalesRows(prev => prev.filter(r => !(r.transactionId === row.transactionId && r.itemIndex === row.itemIndex)));
    } catch (err: any) {
      toast.error("Erreur lors de la suppression de l'article: " + err.message);
    } finally {
      setProcessingTxId(null);
    }
  };

  // Apply bulk cost price to all transactions containing this product
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

      // Save each updated transaction locally and enqueue sync
      for (const tx of updatedTxs) {
        await localDb.update(`transactions/${tx.id}`, tx);
      }

      useTransactionStore.getState().setTransactions(
        currentTxStore.map(t => allTxMap.get(t.id) || t)
      );

      // Also update product catalog cost price
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

      // Update local modal state rows
      setSalesRows(prev => prev.map(r => ({ ...r, costPrice: costNum })));
      toast.success(`Coût d'achat régularisé sur ${updatedTxs.length} ticket(s) avec succès !`);
    } catch (err: any) {
      console.error("Erreur bulk cost:", err);
      toast.error("Erreur: " + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const totalQtySold = salesRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalRevenue = salesRows.reduce((sum, r) => sum + ((Number(r.price) || 0) * (Number(r.quantity) || 0)), 0);
  const totalCost = salesRows.reduce((sum, r) => sum + ((Number(r.costPrice) || 0) * (Number(r.quantity) || 0)), 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DÉTAIL & CORRECTION DES VENTES PAR PRODUIT"
      maxWidth="max-w-5xl"
      className="bg-[#0b0d14] border border-white/10"
    >
      <div className="space-y-6 text-left py-2">
        {/* Product Overview Header */}
        <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h4 className="text-base font-black text-white uppercase tracking-tight">{product.name}</h4>
              <p className="text-xs text-slate-400 font-mono">
                SKU: <span className="text-white font-bold">{product.sku || product.id}</span> • Prix actuel fiche: <span className="text-emerald-400 font-bold font-mono">{Number(product.price || 0).toFixed(2)} {currency}</span> • Achat fiche: <span className="text-amber-400 font-bold font-mono">{Number(product.costPrice || 0).toFixed(2)} {currency}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-xl border border-white/5 font-mono text-xs">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-sans block">Qté Vendue</span>
              <span className="text-sm font-black text-white">{totalQtySold}</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-sans block">CA Total</span>
              <span className="text-sm font-black text-white">{Number(totalRevenue || 0).toFixed(2)}</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-sans block">Bénéfice</span>
              <span className={`text-sm font-black ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{Number(totalProfit || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Cost Regularization Banner */}
        <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Zap className="text-indigo-400 shrink-0" size={20} />
            <div>
              <p className="text-xs font-black text-indigo-200 uppercase tracking-wider">Régulariser le Prix d'Achat en Lot</p>
              <p className="text-[10px] text-slate-300">Si l'article avait un coût d'achat erroné (ex: 0 DA), appliquez le coût correct sur toutes ses ventes passées en 1 clic.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              step="0.01"
              placeholder="Coût d'achat"
              value={bulkCost}
              onChange={e => setBulkCost(e.target.value)}
              className="w-28 bg-black/60 border border-indigo-500/40 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold outline-none focus:border-indigo-400"
            />
            <Button
              onClick={handleApplyBulkCost}
              disabled={isProcessingBulk || !bulkCost}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider py-2 px-4 rounded-xl cursor-pointer shadow-neon-indigo/30"
            >
              {isProcessingBulk ? "Application..." : "Appliquer à tout"}
            </Button>
          </div>
        </div>

        {/* Sales List Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Receipt size={15} className="text-indigo-400" />
              Historique des Ventes de ce Produit ({salesRows.length} tickets)
            </h5>
            <span className="text-[10px] text-slate-400 italic">Modifiez le prix, le coût, la date ou supprimez une ligne erronée</span>
          </div>

          {salesRows.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 text-slate-400 text-sm">
              Aucune vente trouvée pour ce produit sur la période sélectionnée.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40 custom-scrollbar max-h-[50vh]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-900 z-10">
                    <th className="p-3">Ticket & Date</th>
                    <th className="p-3">Client / Caisse</th>
                    <th className="p-3 text-center">Qté</th>
                    <th className="p-3 text-right">Prix Vente ({currency})</th>
                    <th className="p-3 text-right">Prix Achat ({currency})</th>
                    <th className="p-3 text-right">Total Ligne</th>
                    <th className="p-3 text-right">Marge</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {salesRows.map((row, idx) => {
                    const isRowProcessing = processingTxId === row.transactionId;
                    const safePrice = Number(row.price) || 0;
                    const safeCost = Number(row.costPrice) || 0;
                    const safeQty = Number(row.quantity) || 0;
                    const lineTotal = safePrice * safeQty;
                    const lineCost = safeCost * safeQty;
                    const lineProfit = lineTotal - lineCost;
                    const lineMarginPct = lineCost > 0 ? ((lineProfit / lineCost) * 100).toFixed(0) : '0';

                    return (
                      <tr key={`sale-${row.transactionId}-${row.itemIndex}-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                        {/* Ticket ID and Date */}
                        <td className="p-3 font-sans">
                          <span className="font-bold text-white block">#{row.transactionId.slice(-6).toUpperCase()}</span>
                          {row.isEditing ? (
                            <input
                              type="datetime-local"
                              value={row.currentDate}
                              onChange={e => handleUpdateRowState(row.transactionId, row.itemIndex, { currentDate: e.target.value })}
                              className="mt-1 bg-black/60 border border-indigo-500/40 rounded-lg px-2 py-1 text-[10px] text-white font-mono outline-none"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              {formatSafe(row.transaction.timestamp, 'dd/MM/yyyy HH:mm')}
                            </span>
                          )}
                        </td>

                        {/* Customer & Cashier */}
                        <td className="p-3 font-sans">
                          <span className="text-white font-bold block truncate max-w-[120px]">
                            {row.transaction.customerName || 'Client Comptoir'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {row.transaction.employeeName || 'Caisse'}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="p-3 text-center">
                          {row.isEditing ? (
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={row.quantity}
                              onChange={e => handleUpdateRowState(row.transactionId, row.itemIndex, { quantity: parseFloat(e.target.value) || 1 })}
                              className="w-14 text-center bg-black/60 border border-indigo-500/40 rounded-lg py-1 text-xs font-black text-white outline-none"
                            />
                          ) : (
                            <span className="font-black text-white text-xs">{safeQty}</span>
                          )}
                        </td>

                        {/* Selling Price */}
                        <td className="p-3 text-right">
                          {row.isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={row.price}
                              onChange={e => handleUpdateRowState(row.transactionId, row.itemIndex, { price: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right bg-black/60 border border-indigo-500/40 rounded-lg py-1 px-2 text-xs font-black text-white outline-none"
                            />
                          ) : (
                            <span className="font-bold text-white text-xs">{safePrice.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Cost Price */}
                        <td className="p-3 text-right">
                          {row.isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={row.costPrice}
                              onChange={e => handleUpdateRowState(row.transactionId, row.itemIndex, { costPrice: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right bg-black/60 border border-amber-500/40 rounded-lg py-1 px-2 text-xs font-black text-amber-300 outline-none"
                            />
                          ) : (
                            <span className="font-bold text-amber-400 text-xs">{safeCost.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Line Total */}
                        <td className="p-3 text-right font-black text-white text-xs">
                          {lineTotal.toFixed(2)}
                        </td>

                        {/* Margin */}
                        <td className="p-3 text-right font-sans">
                          <span className={`text-[11px] font-black block font-mono ${lineProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {lineProfit >= 0 ? '+' : ''}{lineProfit.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            ({lineMarginPct}%)
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isRowProcessing}
                                  onClick={() => handleSaveTransactionRow(row)}
                                  className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all active:scale-95 cursor-pointer"
                                  title="Enregistrer les modifications"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRowState(row.transactionId, row.itemIndex, { isEditing: false })}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                                  title="Annuler"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRowState(row.transactionId, row.itemIndex, { isEditing: true })}
                                  className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                                  title="Modifier cette vente (Prix d'achat, de vente, qté, date)"
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  type="button"
                                  disabled={isRowProcessing}
                                  onClick={() => handleRemoveProductFromTransaction(row)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                                  title="Supprimer cet article de cette vente"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="px-6 py-2.5 text-xs font-bold uppercase cursor-pointer">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
