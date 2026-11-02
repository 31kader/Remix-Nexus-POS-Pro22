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


export interface QuickSupplierParams {
  quickSupplierData: {
    name: string;
    contactName?: string;
    phone: string;
    email: string;
    address?: string;
    balance?: string | number;
    deliveryDays?: string[];
    paymentDays?: string[];
    planningNotes?: string;
  };
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
  const trimmedName = (quickSupplierData.name || '').trim();
  if (!trimmedName) {
    toast.error("Le nom du fournisseur est obligatoire.");
    return;
  }

  const duplicate = suppliers.find(s => (s?.name || '').toLowerCase() === trimmedName.toLowerCase());
  if (duplicate) {
    toast.warning(`Un fournisseur nommé "${duplicate.name}" existe déjà.`);
    setSelectedSupplierId(duplicate.id);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierData({ name: '', contactName: '', phone: '', email: '', address: '', balance: 0, deliveryDays: [], paymentDays: [], planningNotes: '' });
    return;
  }

  try {
    const supplierId = generateUniqueId();
    const newSupplier: any = {
      id: supplierId,
      name: trimmedName,
      contactName: (quickSupplierData.contactName || '').trim(),
      phone: (quickSupplierData.phone || '').trim(),
      email: (quickSupplierData.email || '').trim().toLowerCase(),
      address: (quickSupplierData.address || '').trim(),
      balance: parseFloat(String(quickSupplierData.balance || '0')) || 0,
      deliveryDays: Array.isArray(quickSupplierData.deliveryDays) ? quickSupplierData.deliveryDays : [],
      paymentDays: Array.isArray(quickSupplierData.paymentDays) ? quickSupplierData.paymentDays : [],
      planningNotes: (quickSupplierData.planningNotes || '').trim(),
      updatedAt: new Date().toISOString()
    };

    await localDb.insert(`suppliers/${supplierId}`, newSupplier);
    try {
      const { usePeopleStore } = await import('../../../store/usePeopleStore');
      usePeopleStore.setState(state => ({
        suppliers: [newSupplier, ...(state.suppliers || [])]
      }));
    } catch (_) {}

    setSelectedSupplierId(supplierId);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierData({ name: '', contactName: '', phone: '', email: '', address: '', balance: 0, deliveryDays: [], paymentDays: [], planningNotes: '' });
    toast.success(`Fournisseur "${trimmedName}" créé et sélectionné avec succès !`);
  } catch (error: any) {
     console.error("Error creating supplier:", error);
     toast.error("Erreur de création: " + (error?.message || "Erreur inconnue"));
  }
}
