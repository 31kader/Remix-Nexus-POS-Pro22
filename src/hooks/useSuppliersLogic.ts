import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { set as idbSet } from 'idb-keyval';
import { localDb } from '../services/LocalDatabase';
import { usePeopleStore } from '../store/usePeopleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { 
  Supplier, Product, CompanySettings, Category, DamagedRecord 
} from '../types';
import { toast } from 'sonner';

// New sub-hooks
import { useSupplierSync } from './suppliers/useSupplierSync';
import { useSupplierPayments } from './suppliers/useSupplierPayments';
import { useSupplierDamaged } from './suppliers/useSupplierDamaged';
import { useSupplierReminders } from './suppliers/useSupplierReminders';

export interface SuppliersProps {
  suppliers: Supplier[];
  products: Product[];
  settings: CompanySettings;
  purchases: any[];
  supplierPayments: any[];
  setViewingPurchaseVoucher: (p: any) => void;
  categories: Category[];
  user: any;
  damagedItems: DamagedRecord[];
}

export function useSuppliersLogic(props: SuppliersProps) {
  const { 
    suppliers, products, purchases, categories, user 
  } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingDetailsSupplier, setViewingDetailsSupplier] = useState<Supplier | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'products' | 'purchases' | 'payments' | 'damaged'>('products');
  const [activeSupplierTab, setActiveSupplierTab] = useState<'list' | 'planning'>('list');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Purchase Order Auto-Draft State
  const [poDraftItems, setPoDraftItems] = useState<{ productId: string; productName: string; quantity: number; price: number }[]>([]);
  const [isPODraftOpen, setIsPODraftOpen] = useState(false);
  const [isSavingPurchaseOrder, setIsSavingPurchaseOrder] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    categories: [] as string[],
    feedUrl: '',
    feedFormat: 'json' as 'json' | 'csv',
    syncEnabled: false,
    isAppUser: false,
    hasFullInventoryAccess: false,
    password: '',
    preSaleDays: [] as string[],
    deliveryDays: [] as string[],
    paymentDays: [] as string[],
    planningNotes: '',
    ratingQuality: 5,
    ratingDelivery: 5,
    ratingPrice: 5
  });

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name || '',
        contactName: editingSupplier.contactName || '',
        phone: editingSupplier.phone || '',
        email: editingSupplier.email || '',
        address: editingSupplier.address || '',
        categories: editingSupplier.categories || [],
        feedUrl: editingSupplier.feedUrl || '',
        feedFormat: editingSupplier.feedFormat || 'json',
        syncEnabled: editingSupplier.syncEnabled || false,
        isAppUser: editingSupplier.isAppUser || false,
        hasFullInventoryAccess: editingSupplier.hasFullInventoryAccess || false,
        password: '',
        preSaleDays: editingSupplier.preSaleDays || [],
        deliveryDays: editingSupplier.deliveryDays || [],
        paymentDays: editingSupplier.paymentDays || [],
        planningNotes: editingSupplier.planningNotes || '',
        ratingQuality: editingSupplier.ratingQuality ?? 5,
        ratingDelivery: editingSupplier.ratingDelivery ?? 5,
        ratingPrice: editingSupplier.ratingPrice ?? 5
      });
    } else {
      setFormData({ 
        name: '', contactName: '', phone: '', email: '', address: '', categories: [],
        feedUrl: '', feedFormat: 'json', syncEnabled: false, isAppUser: false, hasFullInventoryAccess: false, password: '',
        preSaleDays: [], deliveryDays: [], paymentDays: [], planningNotes: '',
        ratingQuality: 5, ratingDelivery: 5, ratingPrice: 5
      });
    }
  }, [editingSupplier]);

  // Hook 1: Sync helper for supplier catalogs
  const { isSyncing, setIsSyncing, handleSync } = useSupplierSync({ products });

  // Hook 2: Supplier payment transactions
  const {
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
  } = useSupplierPayments({ suppliers, viewingDetailsSupplier, setViewingDetailsSupplier });

  // Hook 3: Damaged goods reporting and return status claim workflows
  const {
    isDamageModalOpen,
    setIsDamageModalOpen,
    selectedProductForDamage,
    setSelectedProductForDamage,
    damageData,
    setDamageData,
    isProcessingDamage,
    setIsProcessingDamage,
    handleDamageSubmit,
    handleUpdateClaimStatus
  } = useSupplierDamaged({ user, viewingDetailsSupplier });

  // Hook 4: Supplier planning, schedulers and reminders
  const {
    newReminderData,
    setNewReminderData,
    handleAddReminder,
    handleToggleReminderComplete,
    handleDeleteReminder
  } = useSupplierReminders({ suppliers });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanEmail = formData.email ? formData.email.trim().toLowerCase() : '';
      const newPassword = formData.password.trim();
      const existingHash = (editingSupplier as any)?.passwordHash || (editingSupplier as any)?.password_hash || '';

      if (formData.isAppUser && !cleanEmail) {
        toast.error("L'email est obligatoire pour un compte fournisseur connecté.");
        return;
      }

      if (newPassword && newPassword.length < 4) {
        toast.error("Le mot de passe doit contenir au moins 4 caractères.");
        return;
      }

      if (formData.isAppUser && !editingSupplier && !newPassword) {
        toast.error("Le mot de passe est obligatoire pour créer un compte fournisseur connecté.");
        return;
      }

      const finalPasswordHash = newPassword
        ? bcrypt.hashSync(newPassword, 10)
        : (formData.isAppUser ? existingHash : '');

      const { password, ...restFormData } = formData;
      const finalData = { ...restFormData, email: cleanEmail };

      const dataToSave: any = { 
        ...finalData
      };

      dataToSave.passwordHash = finalPasswordHash || null;
      delete dataToSave.password;

      if (editingSupplier) {
        const updatedSupp: Supplier = { ...editingSupplier, ...dataToSave, updatedAt: new Date().toISOString() };
        await localDb.update(`suppliers/${editingSupplier.id}`, updatedSupp);
        usePeopleStore.getState().setSuppliers(prev => {
          const next = (prev || []).map(s => s.id === editingSupplier.id ? updatedSupp : s);
          idbSet('nexus_suppliers_cache', next).catch(() => {});
          return next;
        });
        if (viewingDetailsSupplier?.id === editingSupplier.id) {
          setViewingDetailsSupplier(updatedSupp);
        }
      } else {
        const newId = Math.random().toString(36).substring(2, 11);
        const newSupp: Supplier = {
          id: newId,
          ...dataToSave,
          balance: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDb.insert(`suppliers/${newId}`, newSupp);
        usePeopleStore.getState().setSuppliers(prev => {
          const next = [newSupp, ...(prev || [])];
          idbSet('nexus_suppliers_cache', next).catch(() => {});
          return next;
        });
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      toast.success(editingSupplier ? "Fournisseur mis à jour." : "Fournisseur créé avec succès.");
    } catch (error: any) {
      console.error("Error creating/editing supplier:", error);
      toast.error("Erreur d'enregistrement: " + error.message);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    // Check if supplier is linked to products or purchases
    const hasProducts = products.some((p: Product) => p.supplier === supplierToDelete.name);
    if (hasProducts) {
      toast.error(`Impossible de supprimer "${supplierToDelete.name}" car des produits lui sont associés.`);
      return;
    }

    const hasPurchases = purchases.some((p: any) => p.supplierId === supplierToDelete.id || p.supplierName === supplierToDelete.name);
    if (hasPurchases) {
      toast.error(`Impossible de supprimer "${supplierToDelete.name}" car il possède un historique d'achats.`);
      return;
    }

    try {
      const deletedId = supplierToDelete.id;
      await localDb.delete(`suppliers/${deletedId}`);
      usePeopleStore.getState().setSuppliers(prev => {
        const next = (prev || []).filter(s => s.id !== deletedId);
        idbSet('nexus_suppliers_cache', next).catch(() => {});
        return next;
      });
      if (viewingDetailsSupplier?.id === deletedId) {
        setViewingDetailsSupplier(null);
        setIsDetailsModalOpen(false);
      }
      setIsDeleteConfirmOpen(false);
      setSupplierToDelete(null);
      toast.success("Fournisseur supprimé avec succès.");
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      toast.error("Erreur de suppression: " + error.message);
    }
  };

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

  const t = (k: string) => k;
  const selectedSupplierPurchases = purchases.filter(p => p.supplierId === viewingDetailsSupplier?.id);

  return {   
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    setEditingSupplier,
    isSyncing,
    setIsSyncing,
    viewingDetailsSupplier,
    setViewingDetailsSupplier,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    activeDetailsTab,
    setActiveDetailsTab,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    activeSupplierTab,
    setActiveSupplierTab,
    editingPayment,
    setEditingPayment,
    paymentData,
    setPaymentData,
    isProcessingPayment,
    setIsProcessingPayment,
    isDamageModalOpen,
    setIsDamageModalOpen,
    selectedProductForDamage,
    setSelectedProductForDamage,
    damageData,
    setDamageData,
    isProcessingDamage,
    setIsProcessingDamage,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    supplierToDelete,
    setSupplierToDelete,
    poDraftItems,
    setPoDraftItems,
    isPODraftOpen,
    setIsPODraftOpen,
    isSavingPurchaseOrder,
    setIsSavingPurchaseOrder,
    newReminderData,
    setNewReminderData,
    formData,
    setFormData,
    t,
    handleDeleteSupplier,
    handlePaymentSubmit,
    handlePaymentDelete,
    handleDamageSubmit,
    handleUpdateClaimStatus,
    handleAddReminder,
    handleToggleReminderComplete,
    handleDeleteReminder,
    handleSavePurchaseOrderDraft,
    handleSync,
    selectedSupplierPurchases,
    handleSubmit
  };
}
