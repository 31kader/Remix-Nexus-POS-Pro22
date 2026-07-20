import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { convertKeysToSnake } from '../lib/db-converters';
import { localDb } from '../services/LocalDatabase';
import { 
  Supplier, Product, CompanySettings, Category, DamagedRecord 
} from '../types';
import { toast } from 'sonner';

// New sub-hooks
import { useSupplierSync } from '../hooks/suppliers/useSupplierSync';
import { useSupplierPayments } from '../hooks/suppliers/useSupplierPayments';
import { useSupplierDamaged } from '../hooks/suppliers/useSupplierDamaged';
import { useSupplierReminders } from '../hooks/suppliers/useSupplierReminders';

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
  } = useSupplierPayments({ suppliers, viewingDetailsSupplier });

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
  } = useSupplierDamaged({ user });

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
        alert("L'email est obligatoire pour un compte fournisseur connecté.");
        return;
      }

      if (newPassword && newPassword.length < 4) {
        alert("Le mot de passe doit contenir au moins 4 caractères.");
        return;
      }

      if (formData.isAppUser && !editingSupplier && !newPassword) {
        alert("Le mot de passe est obligatoire pour créer un compte fournisseur connecté.");
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
        await localDb.update(`suppliers/${editingSupplier.id}`, dataToSave);
      } else {
        const newId = Math.random().toString(36).substring(2, 11);
        await localDb.insert(`suppliers/${newId}`, {
          id: newId,
          ...dataToSave,
          balance: 0
        });
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (error: any) {
      console.error("Error creating/editing supplier:", error);
      alert("Erreur d'enregistrement: " + error.message);
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
      await localDb.delete(`suppliers/${supplierToDelete.id}`);
      setIsDeleteConfirmOpen(false);
      setSupplierToDelete(null);
      toast.success("Fournisseur supprimé avec succès.");
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      alert("Erreur de suppression: " + error.message);
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
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await localDb.insert(`purchaseOrders/${newOrderId}`, orderData);
      alert(`Bon de Commande ${orderNumber} enregistré avec succès !`);
      setIsPODraftOpen(false);
      setPoDraftItems([]);
    } catch (error: any) {
      console.error("Error saving purchase order draft:", error);
      alert("Erreur: " + error.message);
    } finally {
      setIsSavingPurchaseOrder(false);
    }
  };

  const t = (k: string) => k;
  const togglePoDraftItem = () => {};
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
    togglePoDraftItem,
    selectedSupplierPurchases,
    handleSubmit
  };
}
