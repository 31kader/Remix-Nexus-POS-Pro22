import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { convertKeysToSnake } from '../../lib/db-converters';
import { Supplier, SupplierPayment } from '../../types';

interface UseSupplierPaymentsParams {
  suppliers: Supplier[];
  viewingDetailsSupplier: Supplier | null;
}

export function useSupplierPayments({ suppliers, viewingDetailsSupplier }: UseSupplierPaymentsParams) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [paymentData, setPaymentData] = useState<{ amount: number, method: 'cash' | 'card' | 'transfer' | 'check', note: string, date: string }>({ 
    amount: 0, 
    method: 'cash', 
    note: '', 
    date: new Date().toISOString() 
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (editingPayment) {
      setPaymentData({
        amount: editingPayment.amount,
        method: editingPayment.method,
        note: editingPayment.note || '',
        date: editingPayment.date
      });
    } else {
      setPaymentData({ amount: 0, method: 'cash', note: '', date: new Date().toISOString() });
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

      const payment: SupplierPayment = {
        id: editingPayment?.id || '',
        supplierId: viewingDetailsSupplier.id,
        supplierName: viewingDetailsSupplier.name,
        amount: paymentData.amount,
        method: paymentData.method,
        note: paymentData.note,
        date: paymentDate
      };

      const currentBalance = viewingDetailsSupplier.balance || 0;
      const snakePayment = convertKeysToSnake(payment);

      if (editingPayment) {
        const { error: payError } = await supabase
          .from('supplier_payments')
          .update(snakePayment)
          .eq('id', editingPayment.id);
        if (payError) throw payError;
        
        const diff = paymentData.amount - editingPayment.amount;
        const { error: supError } = await supabase
          .from('suppliers')
          .update({
            balance: currentBalance - diff
          })
          .eq('id', viewingDetailsSupplier.id);
        if (supError) throw supError;
      } else {
        const newPaymentId = Math.random().toString(36).substring(2, 11);
        payment.id = newPaymentId;
        const snakeNewPayment = convertKeysToSnake(payment);
        const { error: payError } = await supabase
          .from('supplier_payments')
          .insert(snakeNewPayment);
        if (payError) throw payError;

        const { error: supError } = await supabase
          .from('suppliers')
          .update({
            balance: currentBalance - paymentData.amount
          })
          .eq('id', viewingDetailsSupplier.id);
        if (supError) throw supError;
      }

      setIsPaymentModalOpen(false);
      setEditingPayment(null);
      setPaymentData({ amount: 0, method: 'cash', note: '', date: new Date().toISOString() });
    } catch (error: any) {
      console.error("Error submitting supplier payment:", error);
      alert("Erreur de paiement : " + error.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentDelete = async (payment: SupplierPayment) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce versement ? Cela réajustera la dette du fournisseur.')) return;
    try {
      const supplier = suppliers.find(s => s.id === payment.supplierId);
      
      const { error: payError } = await supabase
        .from('supplier_payments')
        .delete()
        .eq('id', payment.id);
      if (payError) throw payError;
      
      if (supplier) {
        const { error: supError } = await supabase
          .from('suppliers')
          .update({
            balance: (supplier.balance || 0) + payment.amount
          })
          .eq('id', payment.supplierId);
        if (supError) throw supError;
      }
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      alert("Erreur : " + error.message);
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
