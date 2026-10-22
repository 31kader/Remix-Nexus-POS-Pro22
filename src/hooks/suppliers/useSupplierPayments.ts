import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { localDb } from '../../services/LocalDatabase';
import { preparePayload } from '../../lib/db-converters';
import { enqueueSyncBatch } from '../../services/SyncService';
import { Supplier, SupplierPayment } from '../../types';

interface UseSupplierPaymentsParams {
  suppliers: Supplier[];
  viewingDetailsSupplier: Supplier | null;
  setViewingDetailsSupplier?: React.Dispatch<React.SetStateAction<Supplier | null>>;
}

export function useSupplierPayments({ suppliers, viewingDetailsSupplier, setViewingDetailsSupplier }: UseSupplierPaymentsParams) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [paymentData, setPaymentData] = useState<{ amount: number, method: 'cash' | 'card' | 'transfer' | 'check', note: string, date: string, opType?: 'decaissement' | 'encaissement' }>({ 
    amount: 0, 
    method: 'cash', 
    note: '', 
    date: new Date().toISOString(),
    opType: 'decaissement'
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (editingPayment) {
      setPaymentData({
        amount: Math.abs(editingPayment.amount),
        method: editingPayment.method,
        note: editingPayment.note || '',
        date: editingPayment.date,
        opType: editingPayment.amount < 0 ? 'encaissement' : 'decaissement'
      });
    } else {
      setPaymentData({ amount: 0, method: 'cash', note: '', date: new Date().toISOString(), opType: 'decaissement' });
    }
  }, [editingPayment]);

  const handlePaymentSubmit = async () => {
    if (!viewingDetailsSupplier || paymentData.amount <= 0) return;
    setIsProcessingPayment(true);
    try {
      let paymentDate = new Date().toISOString();
      try {
        if (paymentData.date) {
            paymentDate = new Date(paymentData.date).toISOString();
        }
      } catch (e) {
        console.error("Invalid payment date", e);
      }

      const opType = paymentData.opType || 'decaissement';
      // Signed amount: positive for payment/décaissement (reduces debt), negative for encaissement/refund (increases balance)
      const signedAmount = opType === 'encaissement' ? -Math.abs(paymentData.amount) : Math.abs(paymentData.amount);

      const payment: SupplierPayment = {
        id: editingPayment?.id || ('pay_' + Date.now() + Math.random().toString(36).substring(2, 6)),
        supplierId: viewingDetailsSupplier.id,
        supplierName: viewingDetailsSupplier.name,
        amount: signedAmount,
        method: paymentData.method,
        note: `${opType === 'encaissement' ? '[ENCAISSEMENT/AVOIR] ' : '[DECAISSEMENT/VERSEMENT] '}${paymentData.note || ''}`.trim(),
        date: paymentDate
      };

      const latestSupplier = (usePeopleStore.getState().suppliers || suppliers).find(s => s.id === viewingDetailsSupplier.id) || viewingDetailsSupplier;
      const currentBalance = Number(latestSupplier.balance) || 0;
      let newBalance = currentBalance;

      if (editingPayment) {
        const oldSigned = editingPayment.amount;
        const diff = signedAmount - oldSigned;
        newBalance = currentBalance - diff;
      } else {
        newBalance = currentBalance - signedAmount;
      }

      // 1. Mettre à jour immédiatement le store local, viewingDetailsSupplier et LocalDatabase (qui enfile dans SyncService)
      const updatedSupplier: Supplier = {
        ...latestSupplier,
        balance: newBalance,
        updatedAt: new Date().toISOString()
      };

      usePeopleStore.getState().setSuppliers(prev =>
        (prev || []).map(s => s.id === viewingDetailsSupplier.id ? updatedSupplier : s)
      );
      setViewingDetailsSupplier?.(updatedSupplier);

      // Mettre à jour immédiatement le store des paiements
      useFinanceStore.getState().setSupplierPayments(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (editingPayment) {
          return list.map(p => p.id === editingPayment.id ? payment : p);
        }
        return [payment, ...list];
      });

      await localDb.update(`suppliers/${viewingDetailsSupplier.id}`, updatedSupplier);
      if (editingPayment) {
        await localDb.update(`supplierPayments/${payment.id}`, payment);
      } else {
        await localDb.insert(`supplierPayments/${payment.id}`, payment);
      }

      toast.success("Paiement fournisseur enregistré avec succès !");
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
      setPaymentData({ amount: 0, method: 'cash', note: '', date: new Date().toISOString(), opType: 'decaissement' });
    } catch (error: any) {
      console.error("Error submitting supplier payment:", error);
      toast.error("Erreur de paiement : " + (error?.message || "Erreur inconnue"));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentDelete = async (payment: SupplierPayment) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce versement ? Cela réajustera la dette du fournisseur.')) return;
    try {
      const supplier = (usePeopleStore.getState().suppliers || suppliers).find(s => s.id === payment.supplierId);
      const currentBalance = Number(supplier?.balance) || 0;
      const newBalance = currentBalance + payment.amount;

      // 1. Local update (localDb.update / localDb.delete enfile automatiquement dans SyncService)
      if (supplier) {
        const updatedSupplier: Supplier = {
          ...supplier,
          balance: newBalance,
          updatedAt: new Date().toISOString()
        };
        usePeopleStore.getState().setSuppliers(prev =>
          (prev || []).map(s => s.id === payment.supplierId ? updatedSupplier : s)
        );
        if (viewingDetailsSupplier?.id === payment.supplierId) {
          setViewingDetailsSupplier?.(updatedSupplier);
        }
        await localDb.update(`suppliers/${payment.supplierId}`, updatedSupplier);
      }
      await localDb.delete(`supplierPayments/${payment.id}`);

      // Update local finance store
      useFinanceStore.getState().setSupplierPayments(prev => 
        (Array.isArray(prev) ? prev : []).filter(p => p.id !== payment.id)
      );

      toast.success("Versement supprimé avec succès.");
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Erreur : " + (error?.message || "Erreur inconnue"));
    }
  };

  return {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    editingPayment,
    setEditingPayment,
    paymentData,
    setPaymentData,
    isProcessingPayment,
    setIsProcessingPayment,
    handlePaymentSubmit,
    handlePaymentDelete
  };
}
