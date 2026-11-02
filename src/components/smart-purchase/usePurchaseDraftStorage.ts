import { useEffect } from 'react';

export function loadPurchaseDraft(): any | null {
  try {
    const saved = localStorage.getItem('nexus_purchase_draft');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // 🛡️ Sécurité : Si le draft est dans une étape de finalisation, le purger pour ne jamais bloquer l'UI
    if (parsed?.step === 'updatePrices' || parsed?.step === 'confirm') {
      localStorage.removeItem('nexus_purchase_draft');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPurchaseDraft(): void {
  try {
    localStorage.removeItem('nexus_purchase_draft');
  } catch (_) {}
}

export interface UsePurchaseDraftAutoSaveProps {
  step: string;
  activeSubTab: string;
  purchaseStatus: string;
  paidAmount: number;
  paymentMethod: string;
  editingPurchaseId: string | null;
  mode: string;
  scanMethod: string;
  cart: any[];
  selectedSupplierId: string;
  invoiceNumber: string;
  receptionDate: string;
  globalDiscount: number;
  globalTax: number;
}

export function usePurchaseDraftAutoSave(data: UsePurchaseDraftAutoSaveProps): void {
  const {
    step, activeSubTab, purchaseStatus, paidAmount, paymentMethod,
    editingPurchaseId, mode, scanMethod, cart, selectedSupplierId, invoiceNumber,
    receptionDate, globalDiscount, globalTax
  } = data;

  useEffect(() => {
    if (step === 'updatePrices' || step === 'confirm') {
      clearPurchaseDraft();
      return;
    }

    const draftData = {
      step: step === 'review' ? 'review' : 'upload',
      activeSubTab,
      purchaseStatus,
      paidAmount,
      paymentMethod,
      editingPurchaseId,
      mode,
      scanMethod,
      cart,
      selectedSupplierId,
      invoiceNumber,
      receptionDate,
      globalDiscount,
      globalTax
    };
    try {
      localStorage.setItem('nexus_purchase_draft', JSON.stringify(draftData));
    } catch (e) {
      console.error("Error saving purchase draft:", e);
    }
  }, [
    step, activeSubTab, purchaseStatus, paidAmount, paymentMethod,
    editingPurchaseId, mode, scanMethod, cart, selectedSupplierId, invoiceNumber,
    receptionDate, globalDiscount, globalTax
  ]);
}
