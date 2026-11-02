import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { toast } from 'sonner';
import { Customer, Transaction, CompanySettings } from '../../types';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useCartStore } from '../../store/useCartStore';
import { localDb } from '../../services/LocalDatabase';
import { generateLocalId } from '../../lib/db-converters';
import { CustomerFormData } from './customersTypes';
import { executeCustomerTopUp } from './customerSettlementOperations';
import { executePrintCustomerStatement, executeOpenCustomerWhatsApp } from './customerCommunicationUtils';

export interface UseCustomersCrudOperationsProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  setIsModalOpen: (open: boolean) => void;
}

export function useCustomersCrudOperations({
  customers,
  transactions,
  settings,
  selectedCustomerId,
  setSelectedCustomerId,
  setIsModalOpen
}: UseCustomersCrudOperationsProps) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Top-Up / Settlement states
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [financialOpType, setFinancialOpType] = useState<'encaissement' | 'decaissement'>('encaissement');
  const [financialMethod, setFinancialMethod] = useState<'cash' | 'card' | 'bank' | 'other'>('cash');
  const [financialNote, setFinancialNote] = useState('');

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    loyaltyCardNumber: '',
    notes: '',
    isAppUser: false,
    password: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    mapsUrl: '',
    creditLimit: 0,
    isWholesale: false
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        phone: editingCustomer.phone || '',
        email: editingCustomer.email || '',
        loyaltyCardNumber: editingCustomer.loyaltyCardNumber || '',
        notes: editingCustomer.notes || '',
        isAppUser: editingCustomer.isAppUser || false,
        password: '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        latitude: editingCustomer.latitude ?? '',
        longitude: editingCustomer.longitude ?? '',
        mapsUrl: editingCustomer.mapsUrl || (editingCustomer as any).maps_url || '',
        creditLimit: editingCustomer.creditLimit || 0,
        isWholesale: editingCustomer.isWholesale || false
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        loyaltyCardNumber: '',
        notes: '',
        isAppUser: false,
        password: '',
        address: '',
        city: '',
        latitude: '',
        longitude: '',
        mapsUrl: '',
        creditLimit: 0,
        isWholesale: false
      });
    }
  }, [editingCustomer]);

  // Top-Up / Settlement logic
  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !topUpAmount || isProcessingTopUp) return;
    
    setIsProcessingTopUp(true);
    try {
      const success = await executeCustomerTopUp({
        selectedCustomer,
        topUpAmount,
        financialOpType,
        financialMethod,
        financialNote,
        settings
      });

      if (success) {
        setIsTopUpModalOpen(false);
        setTopUpAmount('');
        setFinancialNote('');
        setFinancialMethod('cash');
        setFinancialOpType('encaissement');
      }
    } catch (error: any) {
      console.error("Error top-up:", error);
      toast.error("Erreur lors de l'opération: " + error.message);
    } finally {
      setIsProcessingTopUp(false);
    }
  };

  // Submit create or edit customer (Offline-First compliant)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    if (!cleanName) {
      toast.error("Le nom du client est obligatoire.");
      return;
    }

    const cleanEmail = formData.email ? formData.email.trim().toLowerCase() : '';
    const newPassword = formData.password.trim();
    const existingHash = editingCustomer?.passwordHash || (editingCustomer as any)?.password_hash || '';

    if (formData.isAppUser && !cleanEmail) {
      toast.error("L'email est obligatoire pour un compte client connecté.");
      return;
    }

    if (newPassword && newPassword.length < 4) {
      toast.error("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    if (formData.isAppUser && !editingCustomer && !newPassword) {
      toast.error("Le mot de passe est obligatoire pour créer un compte client connecté.");
      return;
    }

    const finalPasswordHash = newPassword
      ? bcrypt.hashSync(newPassword, 10)
      : (formData.isAppUser ? existingHash : '');

    const { password: _unusedPassword, ...restFormData } = formData;
    const nowIso = new Date().toISOString();
    const custId = editingCustomer?.id || generateLocalId();

    const numLat = formData.latitude !== '' && !isNaN(Number(formData.latitude)) ? Number(formData.latitude) : undefined;
    const numLng = formData.longitude !== '' && !isNaN(Number(formData.longitude)) ? Number(formData.longitude) : undefined;

    const customerObj: Customer = {
      ...(editingCustomer || {}),
      ...restFormData,
      latitude: numLat,
      longitude: numLng,
      mapsUrl: formData.mapsUrl || (numLat && numLng ? `https://maps.google.com/?q=${numLat},${numLng}` : undefined),
      id: custId,
      name: cleanName,
      email: cleanEmail,
      loyaltyPoints: editingCustomer?.loyaltyPoints || 0,
      balance: editingCustomer?.balance || 0,
      totalSpent: editingCustomer?.totalSpent || 0,
      updatedAt: nowIso,
      joinDate: editingCustomer?.joinDate || nowIso.split('T')[0]
    };

    if (finalPasswordHash) {
      customerObj.passwordHash = finalPasswordHash;
    }

    if (editingCustomer) {
      usePeopleStore.getState().setCustomers(prev =>
        prev.map(c => c.id === custId ? customerObj : c)
      );
      try {
        await localDb.update(`customers/${custId}`, customerObj);
      } catch (localErr) {
        console.warn("Erreur mise à jour IndexedDB:", localErr);
      }
    } else {
      usePeopleStore.getState().setCustomers(prev => [customerObj, ...prev]);
      try {
        await localDb.insert(`customers/${custId}`, customerObj);
      } catch (localErr) {
        console.warn("Erreur insertion IndexedDB:", localErr);
      }
    }

    toast.success(editingCustomer ? "Client mis à jour avec succès" : "Client créé avec succès");
    setIsModalOpen(false);
    setEditingCustomer(null);
    setSelectedCustomerId(custId);
  };

  // Delete customer (Offline-First compliant)
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const targetId = customerToDelete.id;

    usePeopleStore.getState().setCustomers(prev => prev.filter(c => c.id !== targetId));
    try {
      await localDb.delete(`customers/${targetId}`);
    } catch (localErr) {
      console.warn("Erreur suppression locale:", localErr);
    }

    if (selectedCustomerId === targetId) {
      setSelectedCustomerId(null);
    }
    toast.success(`Client ${customerToDelete.name} supprimé`);
    setIsDeleteConfirmOpen(false);
    setCustomerToDelete(null);
  };

  // Launch Sale: Loads customer directly into cart and switches to Caisse
  const handleLaunchSale = (customer: Customer) => {
    if (!customer) return;
    useCartStore.getState().setSelectedCustomer(customer);
    if (customer.isWholesale) {
      useCartStore.getState().setIsWholesale(true);
    }
    window.location.hash = 'checkout';
    window.dispatchEvent(new CustomEvent('change-tab', { detail: 'checkout' }));
    toast.success(`Client ${customer.name} chargé en caisse !`);
  };

  // Print customer account statement
  const handlePrintStatement = (customer: Customer) => {
    executePrintCustomerStatement(customer, transactions, settings);
  };

  // WhatsApp with templates or custom text
  const openWhatsApp = (phone: string, templateOrText?: string, customer?: Customer) => {
    executeOpenCustomerWhatsApp(phone, templateOrText, customer, settings);
  };

  return {
    editingCustomer,
    setEditingCustomer,
    showPassword,
    setShowPassword,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    customerToDelete,
    setCustomerToDelete,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    topUpAmount,
    setTopUpAmount,
    isProcessingTopUp,
    setIsProcessingTopUp,
    financialOpType,
    setFinancialOpType,
    financialMethod,
    setFinancialMethod,
    financialNote,
    setFinancialNote,
    formData,
    setFormData,
    selectedCustomer,
    handleTopUp,
    handleSubmit,
    handleDeleteCustomer,
    handleLaunchSale,
    handlePrintStatement,
    openWhatsApp
  };
}
