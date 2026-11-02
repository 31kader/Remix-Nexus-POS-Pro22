import { convertKeysToSnake } from '../../../lib/db-converters';
import { enqueueStockAdjustment } from '../../../services/SyncService';
import { localDb } from '../../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../../supabase';
import { generateUniqueId, safeGetItems } from '../../../lib/utils';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings } from '../../../types';
import { PurchaseCartItem } from '../../../hooks/usePurchaseCart';
import { toast } from 'sonner';
import { safeOptionalMutation } from '../../../lib/supabase/safeOptional';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useCoreStore } from '../../../store/useCoreStore';
import { usePeopleStore } from '../../../store/usePeopleStore';


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
    
    const updatedBalance = (supplier.balance || 0) - amount;
    await localDb.insert(`supplierPayments/${paymentId}`, payment);

    await localDb.update(`suppliers/${supplierId}`, {
      ...supplier,
      balance: updatedBalance
    });

    usePeopleStore.getState().setSuppliers(prev =>
      (prev || []).map(s => s.id === supplierId ? { ...s, balance: updatedBalance } : s)
    );

    useFinanceStore.getState().setSupplierPayments(prev => [payment as any, ...(prev || [])]);

    toast.success("Paiement fournisseur enregistré avec succès !");
    setIsPaymentModalOpen(false);
    setPaymentData({ supplierId: '', amount: 0, method: 'cash', note: '', date: new Date().toISOString() });
  } catch (error: any) {
     console.error("Error submitting supplier payment:", error);
     toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
  } finally {
    setIsProcessing(false);
  }
}
