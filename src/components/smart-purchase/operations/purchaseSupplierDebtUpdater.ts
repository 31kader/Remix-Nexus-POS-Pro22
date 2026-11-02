import { localDb } from '../../../services/LocalDatabase';
import { Supplier, Purchase } from '../../../types';
import { usePeopleStore } from '../../../store/usePeopleStore';

interface UpdateSupplierDebtParams {
  suppliers: Supplier[];
  selectedSupplierId: string;
  oldPurchase: Purchase | undefined;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  totalValue: number;
  paidAmount: number;
}

export async function updateSupplierDebtAfterPurchase({
  suppliers,
  selectedSupplierId,
  oldPurchase,
  purchaseStatus,
  totalValue,
  paidAmount
}: UpdateSupplierDebtParams) {
  let oldDebt = 0;
  if (oldPurchase && oldPurchase.status === 'completed') {
    oldDebt = oldPurchase.total - (oldPurchase.paidAmount || 0);
    if (oldDebt < 0) oldDebt = 0;
  }
  
  let newDebt = 0;
  if (purchaseStatus === 'completed') {
    newDebt = totalValue - (paidAmount || 0);
    if (newDebt < 0) newDebt = 0;
  }

  const oldSupplierId = oldPurchase?.supplierId || (oldPurchase as any)?.supplier_id || '';
  if (oldSupplierId && oldSupplierId !== selectedSupplierId) {
    if (oldDebt > 0) {
      const prevSupplier = suppliers.find(s => s.id === oldSupplierId);
      if (prevSupplier) {
        const updatedPrevSupplier = {
          ...prevSupplier,
          balance: (Number(prevSupplier.balance) || 0) - oldDebt,
          updatedAt: new Date().toISOString()
        };
        await localDb.update(`suppliers/${prevSupplier.id}`, updatedPrevSupplier);
        usePeopleStore.setState(state => ({
          suppliers: (state.suppliers || []).map(s => s.id === prevSupplier.id ? updatedPrevSupplier : s)
        }));
      }
    }
    if (newDebt > 0) {
      const nextSupplier = suppliers.find(s => s.id === selectedSupplierId);
      if (nextSupplier) {
        const updatedNextSupplier = {
          ...nextSupplier,
          balance: (Number(nextSupplier.balance) || 0) + newDebt,
          updatedAt: new Date().toISOString()
        };
        await localDb.update(`suppliers/${nextSupplier.id}`, updatedNextSupplier);
        usePeopleStore.setState(state => ({
          suppliers: (state.suppliers || []).map(s => s.id === nextSupplier.id ? updatedNextSupplier : s)
        }));
      }
    }
  } else {
    const debtDelta = newDebt - oldDebt;
    if (debtDelta !== 0) {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (supplier) {
        const updatedSupplier = {
          ...supplier,
          balance: (Number(supplier.balance) || 0) + debtDelta,
          updatedAt: new Date().toISOString()
        };
        await localDb.update(`suppliers/${supplier.id}`, updatedSupplier);
        usePeopleStore.setState(state => ({
          suppliers: (state.suppliers || []).map(s => s.id === supplier.id ? updatedSupplier : s)
        }));
      }
    }
  }
}
