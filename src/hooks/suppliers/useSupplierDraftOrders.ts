import { useState } from 'react';
import { Supplier } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { useTransactionStore } from '../../store/useTransactionStore';
import { toast } from 'sonner';

export function useSupplierDraftOrders(viewingDetailsSupplier: Supplier | null) {
  const [poDraftItems, setPoDraftItems] = useState<{ productId: string; productName: string; quantity: number; price: number }[]>([]);
  const [isPODraftOpen, setIsPODraftOpen] = useState(false);
  const [isSavingPurchaseOrder, setIsSavingPurchaseOrder] = useState(false);

  const handleSavePurchaseOrderDraft = async () => {
    if (!viewingDetailsSupplier || poDraftItems.length === 0) return;
    setIsSavingPurchaseOrder(true);
    try {
      const orderNumber = `BC-${Date.now().toString().slice(-6)}`;
      const total = poDraftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      const newOrderId = Math.random().toString(36).substring(2, 11);
      const orderData = {
        id: newOrderId,
        supplierId: viewingDetailsSupplier.id,
        supplierName: viewingDetailsSupplier.name,
        orderNumber: orderNumber,
        items: poDraftItems.map(it => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          price: it.price
        })),
        total,
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      await localDb.insert(`purchaseOrders/${newOrderId}`, orderData);
      useTransactionStore.getState().setPurchaseOrders(prev => [orderData as any, ...(prev || [])]);
      toast.success(`Bon de Commande ${orderNumber} enregistré avec succès !`);
      setIsPODraftOpen(false);
      setPoDraftItems([]);
    } catch (error: any) {
      console.error("Error saving purchase order draft:", error);
      toast.error("Erreur: " + error.message);
    } finally {
      setIsSavingPurchaseOrder(false);
    }
  };

  return {
    poDraftItems,
    setPoDraftItems,
    isPODraftOpen,
    setIsPODraftOpen,
    isSavingPurchaseOrder,
    setIsSavingPurchaseOrder,
    handleSavePurchaseOrderDraft
  };
}
