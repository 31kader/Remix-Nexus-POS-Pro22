import { convertKeysToSnake } from '../../lib/db-converters';
import { enqueueStockAdjustment } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { supabase } from '../../supabase';
import { generateUniqueId } from '../../lib/utils';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';
import { toast } from 'sonner';
import { safeOptionalMutation } from '../../lib/supabase/safeOptional';
import { useFinanceStore } from '../../store/useFinanceStore';

export interface SavePurchaseParams {
  cart: PurchaseCartItem[];
  selectedSupplierId: string;
  extractedData: any;
  invoiceNumber: string;
  receptionDate: string;
  globalDiscount: number;
  globalTax: number;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  paidAmount: number;
  editingPurchaseId: string | null;
  autoMargin: boolean;
  suppliers: Supplier[];
  patterns: InvoicePattern[];
  purchases: Purchase[];
  products: Product[];
  setIsProcessing: (v: boolean) => void;
  setLastPurchaseItems: (v: any[]) => void;
  setStep: (v: 'upload' | 'review' | 'confirm' | 'updatePrices') => void;
}

export async function savePurchaseDb({
  cart,
  selectedSupplierId,
  extractedData,
  invoiceNumber,
  receptionDate,
  globalDiscount,
  globalTax,
  purchaseStatus,
  paidAmount,
  editingPurchaseId,
  autoMargin,
  suppliers,
  patterns,
  purchases,
  products,
  setIsProcessing,
  setLastPurchaseItems,
  setStep
}: SavePurchaseParams) {
  setIsProcessing(true);
  try {
    const purchaseItems = cart.map((item: PurchaseCartItem) => ({
      lineId: item.lineId || generateUniqueId(),
      productId: item.productId || '',
      name: item.productName || 'Produit sans nom',
      quantity: item.quantity || 0,
      costPrice: item.costPrice || 0,
      discount: item.discount || 0,
      taxRate: item.taxRate || 0
    }));
    
    const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name || extractedData?.supplierName || 'Inconnu';
    const finalInvoiceNumber = invoiceNumber || extractedData?.invoiceNumber || ''; 
    
    const existingPattern = patterns.find(p => 
      (p.supplierName && p.supplierName.toLowerCase() === supplierName.toLowerCase()) || 
      (selectedSupplierId && p.systemSupplierId === selectedSupplierId)
    );
    
    const newMappings: Record<string, string> = { ...(existingPattern?.itemMappings || {}) };
    cart.forEach(item => {
      if (item.productId && item.productName) {
        newMappings[item.productName] = item.productId;
      }
    });
    
    const patternData = {
      type: 'ocr',
      supplierName,
      systemSupplierId: selectedSupplierId || '',
      itemMappings: newMappings
    };

    const snakePattern = convertKeysToSnake(patternData);

    if (existingPattern) {
      await safeOptionalMutation(
        'invoice_patterns.update',
        () => supabase
          .from('invoice_patterns')
          .update(snakePattern)
          .eq('id', existingPattern.id),
        { module: 'purchaseDbOperations', action: 'updatePattern' }
      );
    } else {
      const newPatternId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
      await safeOptionalMutation(
        'invoice_patterns.insert',
        () => supabase
          .from('invoice_patterns')
          .insert({
            ...snakePattern,
            id: newPatternId
          }),
        { module: 'purchaseDbOperations', action: 'insertPattern' }
      );
    }

    const totalValue = purchaseItems.reduce((sum: number, item: any) => {
      const subtotal = (item.costPrice || 0) * (item.quantity || 0);
      const discounted = subtotal * (1 - (item.discount || 0) /100);
      const totalWithVat = discounted * (1 + (item.taxRate || 0) / 100);
      return sum + totalWithVat;
    }, 0) * (1 - (globalDiscount || 0) / 100) * (1 + (globalTax || 0) / 100);

    const computedPaymentStatus = paidAmount >= totalValue ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const purchaseData: any = {
      supplierId: selectedSupplierId || '',
      supplierName: supplierName || 'Inconnu',
      items: purchaseItems,
      invoiceNumber: finalInvoiceNumber || '',
      total: totalValue,
      date: receptionDate ? new Date(receptionDate).toISOString() : new Date().toISOString(),
      status: purchaseStatus,
      paymentStatus: computedPaymentStatus,
      paidAmount: paidAmount || 0,
      globalDiscount: globalDiscount || 0,
      globalTax: globalTax || 0,
    };

    let purchaseId = editingPurchaseId;
    let oldPurchase: Purchase | undefined;
    
    const snakePurchase: any = convertKeysToSnake(purchaseData);
    snakePurchase.total_amount = snakePurchase.total;
    delete snakePurchase.total;

    if (editingPurchaseId) {
       oldPurchase = purchases.find(p => p.id === editingPurchaseId);
       await localDb.update(`purchases/${editingPurchaseId}`, purchaseData);
    } else {
       purchaseId = Math.random().toString(36).substring(2, 11);
       purchaseData.id = purchaseId;
       await localDb.insert(`purchases/${purchaseId}`, purchaseData);
    }

    // Instantly update Zustand store so the UI is updated immediately
    useFinanceStore.setState(state => {
      const idx = state.purchases.findIndex(p => p.id === purchaseId);
      let updated;
      if (idx > -1) {
        updated = [...state.purchases];
        updated[idx] = { ...updated[idx], ...purchaseData, id: purchaseId };
      } else {
        updated = [{ ...purchaseData, id: purchaseId }, ...state.purchases];
      }
      return { purchases: updated };
    });

    let oldDebt = 0;
    if (oldPurchase && oldPurchase.status === 'completed') {
       oldDebt = oldPurchase.total - (oldPurchase.paidAmount || 0);
       if (oldDebt < 0) oldDebt = 0;
    }
    
    let newDebt = 0;
    if (purchaseStatus === 'completed') {
       newDebt = purchaseData.total - (purchaseData.paidAmount || 0);
       if (newDebt < 0) newDebt = 0;
    }

    const debtDelta = newDebt - oldDebt;
    if (debtDelta !== 0) {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (supplier) {
        await localDb.update(`suppliers/${supplier.id}`, {
          balance: (supplier.balance || 0) + debtDelta
        });
      }
    }

    const stockDeltas: Record<string, number> = {};
    if (oldPurchase && oldPurchase.status === 'completed') {
       oldPurchase.items.forEach(item => {
         if (item.productId) {
           const product = products.find(p => p.id === item.productId);
           if (product?.isBundle && product.bundleItems) {
             product.bundleItems.forEach(bi => {
               stockDeltas[bi.productId] = (stockDeltas[bi.productId] || 0) - (item.quantity * bi.quantity);
             });
           } else {
             stockDeltas[item.productId] = (stockDeltas[item.productId] || 0) - (item.quantity || 0);
           }
         }
       });
    }
    if (purchaseStatus === 'completed') {
       purchaseItems.forEach(item => {
         if (item.productId) {
           const product = products.find(p => p.id === item.productId);
           if (product?.isBundle && product.bundleItems) {
             product.bundleItems.forEach(bi => {
               stockDeltas[bi.productId] = (stockDeltas[bi.productId] || 0) + (item.quantity * bi.quantity);
             });
           } else {
             stockDeltas[item.productId] = (stockDeltas[item.productId] || 0) + (item.quantity || 0);
           }
         }
       });
    }

    for (const productId of Object.keys(stockDeltas)) {
       const delta = stockDeltas[productId];
       const product = products.find(p => p.id === productId);
       if (product) {
          const updates: any = {
             stock: (product.stock || 0) + delta,
             updatedAt: new Date().toISOString()
          };
          
          const newItem = purchaseItems.find(i => i.productId === productId);
          if (purchaseStatus === 'completed' && newItem && newItem.costPrice !== undefined) {
             updates.costPrice = newItem.costPrice;
             if (autoMargin && newItem.costPrice > (product.costPrice || 0)) {
                const oldCost = product.costPrice || 0;
                const oldPrice = product.price || 0;
                if (oldCost > 0) {
                  const marginPercent = (oldPrice - oldCost) / oldCost;
                  updates.price = parseFloat((newItem.costPrice * (1 + marginPercent)).toFixed(2));
                }
             }
          }
          if (productId && productId !== 'undefined') {
            await localDb.update(`products/${productId}`, updates);
          }
       }
    }

    setLastPurchaseItems(purchaseItems);
    setStep('updatePrices');
  } catch (error) {
    console.error("Confirmation error:", error);
  } finally {
    setIsProcessing(false);
  }
}

export interface SupplierPaymentParams {
  supplierId: string;
  amount: number;
  method: string;
  note: string;
  date: string;
  suppliers: Supplier[];
  setIsProcessing: (v: boolean) => void;
  setIsPaymentModalOpen: (v: boolean) => void;
  setPaymentData: (v: any) => void;
}

export async function handleSupplierPaymentDb({
  supplierId,
  amount,
  method,
  note,
  date,
  suppliers,
  setIsProcessing,
  setIsPaymentModalOpen,
  setPaymentData
}: SupplierPaymentParams) {
  if (!supplierId || amount <= 0) return;
  setIsProcessing(true);
  try {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) throw new Error('Fournisseur introuvable');

    let paymentDate = new Date().toISOString();
    if (date) {
        paymentDate = new Date(date).toISOString();
    }

    const paymentId = Math.random().toString(36).substring(2, 11);
    const payment = {
      id: paymentId,
      supplierId,
      supplierName: supplier.name,
      amount,
      date: paymentDate,
      method,
      note
    };
    
    await localDb.insert(`supplierPayments/${paymentId}`, payment);

    await localDb.update(`suppliers/${supplierId}`, {
      balance: (supplier.balance || 0) - amount
    });

    setIsPaymentModalOpen(false);
    setPaymentData({ supplierId: '', amount: 0, method: 'cash', note: '', date: new Date().toISOString() });
  } catch (error: any) {
     console.error("Error submitting supplier payment:", error);
     alert("Erreur: " + error.message);
  } finally {
    setIsProcessing(false);
  }
}

export interface ReceiveOrderParams {
  order: PurchaseOrder;
  suppliers: Supplier[];
  products: Product[];
  setIsProcessing: (v: boolean) => void;
  setActiveSubTab: (v: any) => void;
}

export async function handleReceiveOrderDb({
  order,
  suppliers,
  products,
  setIsProcessing,
  setActiveSubTab
}: ReceiveOrderParams) {
  setIsProcessing(true);
  try {
    const newPurchaseId = 'pur_' + Math.random().toString(36).substring(2, 11);
    const purchaseData: any = {
      supplierId: order.supplierId || '',
      supplierName: suppliers.find(s => s.id === order.supplierId)?.name || 'Unknown',
      items: order.items.map(item => ({
        productId: item.productId || '',
        name: item.productName || 'Unknown Product',
        quantity: item.quantity || 0,
        costPrice: item.price || 0
      })),
      total: order.total || 0,
      invoiceNumber: order.orderNumber || '',
      date: new Date().toISOString(),
      status: 'completed',
      paymentStatus: 'unpaid',
      paidAmount: 0
    };

    await localDb.insert(`purchases/${newPurchaseId}`, { ...purchaseData, id: newPurchaseId });

    // Instantly update Zustand store so the UI is updated immediately
    useFinanceStore.setState(state => {
      const purchaseItem = { ...purchaseData, id: newPurchaseId };
      const idx = state.purchases.findIndex(p => p.id === newPurchaseId);
      let updated;
      if (idx > -1) {
        updated = [...state.purchases];
        updated[idx] = { ...updated[idx], ...purchaseItem };
      } else {
        updated = [purchaseItem, ...state.purchases];
      }
      return { purchases: updated };
    });

    for (const item of order.items) {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          if (product.isBundle && product.bundleItems) {
            for (const bi of product.bundleItems) {
              if (bi.productId && bi.productId !== 'undefined') {
                const targetProd = products.find(p => p.id === bi.productId);
                if (targetProd) {
                  enqueueStockAdjustment(bi.productId, (item.quantity || 0) * bi.quantity);
                  localDb.update(`products/${bi.productId}`, { updatedAt: new Date().toISOString() });
                }
              }
            }
            localDb.update(`products/${item.productId}`, {
              costPrice: item.price || 0,
              updatedAt: new Date().toISOString()
            });
          } else {
            enqueueStockAdjustment(item.productId, item.quantity || 0);
            localDb.update(`products/${item.productId}`, {
              costPrice: item.price || 0,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    await localDb.update(`purchaseOrders/${order.id}`, {
      status: 'received'
    });

    setActiveSubTab('purchases');
    toast.success('Commande reçue avec succès.');
  } catch (error) {
    console.error("Error receiving order:", error);
    toast.error("Erreur lors de la réception de la commande.");
  } finally {
    setIsProcessing(false);
  }
}

export interface DeletePurchaseParams {
  purchaseId: string;
  setIsProcessing: (v: boolean) => void;
  setPurchaseToDelete: (v: string | null) => void;
}

export async function handleDeletePurchaseDb({
  purchaseId,
  setIsProcessing,
  setPurchaseToDelete
}: DeletePurchaseParams) {
  setIsProcessing(true);
  try {
    // Delete from local DB and trigger sync/delete in background
    await localDb.delete(`purchases/${purchaseId}`);
    
    // Instantly update Zustand store so it disappears from the UI immediately
    useFinanceStore.setState(state => ({
      purchases: state.purchases.filter(p => p.id !== purchaseId)
    }));
    
    setPurchaseToDelete(null);
    toast.success("Achat supprimé avec succès.");
  } catch (error: any) {
    console.error("Error deleting purchase:", error);
    toast.error("Erreur de suppression : " + error.message);
  } finally {
    setIsProcessing(false);
  }
}

export interface QuickSupplierParams {
  quickSupplierData: { name: string; phone: string; email: string };
  suppliers: Supplier[];
  setSelectedSupplierId: (v: string) => void;
  setIsQuickSupplierModalOpen: (v: boolean) => void;
  setQuickSupplierData: (v: any) => void;
}

export async function handleQuickSupplierSubmitDb({
  quickSupplierData,
  suppliers,
  setSelectedSupplierId,
  setIsQuickSupplierModalOpen,
  setQuickSupplierData
}: QuickSupplierParams) {
  const trimmedName = quickSupplierData.name.trim();
  if (!trimmedName) {
    alert("Le nom du fournisseur est obligatoire.");
    return;
  }

  const duplicate = suppliers.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
  if (duplicate) {
    alert(`Un fournisseur nommé "${duplicate.name}" existe déjà.`);
    setSelectedSupplierId(duplicate.id);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierData({ name: '', phone: '', email: '' });
    return;
  }

  try {
    const supplierId = Math.random().toString(36).substring(2, 11);
    const newSupplier = {
      ...quickSupplierData,
      id: supplierId,
      name: trimmedName,
      phone: (quickSupplierData.phone || '').trim(),
      email: (quickSupplierData.email || '').trim().toLowerCase(),
      balance: 0
    };

    await localDb.insert(`suppliers/${supplierId}`, newSupplier);
    setSelectedSupplierId(supplierId);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierData({ name: '', phone: '', email: '' });
    toast.success("Fournisseur créé avec succès.");
  } catch (error: any) {
     console.error("Error creating supplier:", error);
     alert("Erreur de création: " + error.message);
  }
}
