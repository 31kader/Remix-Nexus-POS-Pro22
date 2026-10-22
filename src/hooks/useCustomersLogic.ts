import React, { useState, useEffect, useMemo } from 'react';
import bcrypt from 'bcryptjs';
import { exportToExcelSafely, readExcelObjectsSafely, sanitizeRowObject } from '../lib/excelSecurity';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../supabase';
import { usePeopleStore } from '../store/usePeopleStore';
import { useCartStore } from '../store/useCartStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { localDb } from '../services/LocalDatabase';
import { convertKeysToSnake, generateLocalId, preparePayload } from '../lib/db-converters';
import { 
  Customer, Transaction, CompanySettings, Product, Expense, StockAdjustment, Category 
} from '../types';
import { formatSafe, parseCashierNotes } from '../lib/utils';
import { useTranslation } from '../translations';
import { printCustomerStatement } from '../services/documentPrintService';

export interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  products?: Product[];
  expenses?: Expense[];
  stockAdjustments?: StockAdjustment[];
  categories?: Category[];
}

export type CustomerFilterStatus = 'all' | 'debtors' | 'credits' | 'app_users' | 'vip' | 'inactive';
export type CustomerSortOption = 'name_asc' | 'name_desc' | 'debt_desc' | 'spent_desc' | 'points_desc' | 'recent_visit';

export function useCustomersLogic(props: CustomersProps) {
  const { 
    customers, 
    transactions, 
    settings, 
    onRestore,
    products,
    expenses,
    stockAdjustments,
    categories
  } = props;



  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'card'>('info');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CustomerFilterStatus>('all');
  const [sortBy, setSortBy] = useState<CustomerSortOption>('name_asc');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [financialOpType, setFinancialOpType] = useState<'encaissement' | 'decaissement'>('encaissement');
  const [financialMethod, setFinancialMethod] = useState<'cash' | 'card' | 'bank' | 'other'>('cash');
  const [financialNote, setFinancialNote] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    loyaltyCardNumber: '',
    notes: '',
    isAppUser: false,
    password: '',
    address: '',
    city: '',
    latitude: '' as string | number,
    longitude: '' as string | number,
    mapsUrl: '',
    creditLimit: 0,
    isWholesale: false
  });

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

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

  // Global KPIs summary
  const kpiStats = useMemo(() => {
    let totalDebt = 0;
    let totalCredits = 0;
    let totalSpentAll = 0;
    let totalPoints = 0;
    let debtorCount = 0;
    let creditCount = 0;
    let appUserCount = 0;

    (customers || []).forEach(c => {
      const bal = Number(c.balance) || 0;
      if (bal < 0) {
        totalDebt += Math.abs(bal);
        debtorCount++;
      } else if (bal > 0) {
        totalCredits += bal;
        creditCount++;
      }
      totalSpentAll += Number(c.totalSpent) || 0;
      totalPoints += c.loyaltyPoints || 0;
      if (c.isAppUser) appUserCount++;
    });

    return {
      totalCustomers: (customers || []).length,
      totalDebt,
      totalCredits,
      creditCount,
      totalSpentAll,
      totalPoints,
      debtorCount,
      appUserCount
    };
  }, [customers]);

  // Memoized Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    const searchLower = (search || '').toLowerCase().trim();

    let result = (customers || []).filter(c => {
      if (!c) return false;

      // Text search matching
      if (searchLower) {
        const matchName = (c.name || '').toLowerCase().includes(searchLower);
        const matchPhone = (c.phone || '').toLowerCase().includes(searchLower);
        const matchEmail = (c.email || '').toLowerCase().includes(searchLower);
        const matchCard = (c.loyaltyCardNumber || '').toLowerCase().includes(searchLower);
        const matchNotes = (c.notes || '').toLowerCase().includes(searchLower);
        const matchCity = (c.city || '').toLowerCase().includes(searchLower);
        if (!matchName && !matchPhone && !matchEmail && !matchCard && !matchNotes && !matchCity) {
          return false;
        }
      }

      // Quick filter badges
      const bal = Number(c.balance) || 0;
      if (filterStatus === 'debtors') return bal < 0;
      if (filterStatus === 'credits') return bal > 0;
      if (filterStatus === 'app_users') return !!c.isAppUser;
      if (filterStatus === 'vip') return (c.loyaltyPoints || 0) >= 100 || (Number(c.totalSpent) || 0) >= 20000;
      if (filterStatus === 'inactive') {
        if (!c.lastVisit) return true;
        const diffDays = (Date.now() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 60;
      }

      return true;
    });

    // Sorting
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'debt_desc':
          return (Number(a.balance) || 0) - (Number(b.balance) || 0);
        case 'spent_desc':
          return (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0);
        case 'points_desc':
          return (Number(b.loyaltyPoints) || 0) - (Number(a.loyaltyPoints) || 0);
        case 'recent_visit': {
          const tA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const tB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          return tB - tA;
        }
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });
  }, [customers, search, filterStatus, sortBy]);

  // Top-Up / Settlement logic
  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !topUpAmount || isProcessingTopUp) return;
    
    setIsProcessingTopUp(true);
    try {
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Veuillez saisir un montant valide.");
        setIsProcessingTopUp(false);
        return;
      }

      const change = financialOpType === 'encaissement' ? amount : -amount;
      const newBalance = (selectedCustomer.balance || 0) + change;
      
      const labelOp = financialOpType === 'encaissement' ? 'Encaissement/Versement' : 'Décaissement/Sortie';
      const noteRefStr = `[REGLEMENT] ${labelOp} de ${amount.toFixed(2)} ${settings.currency || 'DA'} (${financialMethod.toUpperCase()}) - ${financialNote || 'Ajustement de solde'}`;
      const noteEntry = {
        note: noteRefStr,
        author: 'Direction/Caisse',
        timestamp: new Date().toISOString()
      };
      
      const currentNotes = parseCashierNotes(selectedCustomer.cashierNotes || (selectedCustomer as any).cashier_notes);
      const newNotes = [...currentNotes, noteEntry];

      const updatedCustomer: Customer = {
        ...selectedCustomer,
        balance: newBalance,
        cashierNotes: newNotes,
        updatedAt: new Date().toISOString()
      };

      let expenseData: Expense | null = null;
      let topUpTx: Transaction | null = null;
      if (financialOpType === 'decaissement') {
        const expenseId = generateLocalId();
        const nowIso = new Date().toISOString();
        expenseData = {
          id: expenseId,
          description: `Décaissement/Retrait Client : ${selectedCustomer.name} (${financialNote || 'Sans note'})`,
          amount: amount,
          category: 'Remboursement Client',
          date: nowIso,
          createdAt: nowIso,
          userId: 'system',
          paymentMethod: financialMethod === 'bank' ? 'transfer' : (financialMethod === 'card' ? 'card' : 'cash')
        };
      } else if (financialOpType === 'encaissement') {
        // 🛡️ P0-BIZ-5 : Enregistrer une transaction d'encaissement (topup) pour alimenter le tiroir-caisse (Z) et la trésorerie
        const txId = generateLocalId();
        const nowIso = new Date().toISOString();
        topUpTx = {
          id: txId,
          items: [],
          total: amount,
          paymentMethod: (financialMethod === 'bank' ? 'transfer' : (financialMethod === 'card' ? 'card' : 'cash')) as any,
          timestamp: nowIso,
          created_at: nowIso,
          userId: 'system',
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          status: 'completed',
          employeeName: 'Direction/Caisse',
          amountReceived: amount,
          amountReturned: 0,
          notes: noteRefStr,
          source: 'topup',
          taxAmount: 0,
          subtotal: amount
        };
      }

      // 1. Mise à jour immédiate locale et IndexedDB + SyncService (Offline-First atomique via adjust_customer_balance)
      usePeopleStore.getState().setCustomers(prev => 
        prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c)
      );
      try {
        await localDb.update(`customers/${selectedCustomer.id}`, {
          ...updatedCustomer,
          deltaBalance: change
        });
        if (expenseData) {
          await localDb.insert(`expenses/${expenseData.id}`, expenseData);
          useFinanceStore.getState().setExpenses(prev => [expenseData!, ...(prev || [])]);
        }
        if (topUpTx) {
          await localDb.insert(`transactions/${topUpTx.id}`, topUpTx);
          useTransactionStore.getState().setTransactions(prev => [topUpTx!, ...(prev || [])]);
        }
      } catch (localErr) {
        console.warn("Mise à jour locale:", localErr);
      }
      
      toast.success(`Opération enregistrée : ${amount.toFixed(2)} ${settings.currency || 'DA'}`);
      setIsTopUpModalOpen(false);
      setTopUpAmount('');
      setFinancialNote('');
      setFinancialMethod('cash');
      setFinancialOpType('encaissement');
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

    const { password, ...restFormData } = formData;
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

    // 1. Mise à jour immédiate locale (store Zustand + IndexedDB offline-first)
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

    // 1. Suppression locale immédiate (store + IndexedDB + file SyncService)
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
    if (!customer) return;
    printCustomerStatement(customer, transactions, settings);
    toast.success(`Génération du relevé de compte pour ${customer.name}`);
  };

  // WhatsApp with templates (Debt reminder & Loyalty points) or custom text
  const openWhatsApp = (phone: string, templateOrText?: string, customer?: Customer) => {
    if (!phone) {
      toast.error("Numéro de téléphone non renseigné.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    let text = '';
    const storeName = settings.name || 'Nexus POS Pro';
    const curr = settings.currency || 'DA';

    if (templateOrText === 'debt' && customer) {
      const debtAmount = Math.abs(Number(customer.balance) || 0).toFixed(2);
      text = `Bonjour ${customer.name || ''},\n\nNous vous informons que votre solde débiteur auprès de *${storeName}* est actuellement de *${debtAmount} ${curr}*.\n\nMerci de bien vouloir passer au magasin pour régulariser votre compte.\nCordialement,\n${storeName}`;
    } else if (templateOrText === 'points' && customer) {
      text = `Bonjour ${customer.name || ''},\n\nVous disposez actuellement de *${customer.loyaltyPoints || 0} points fidélité* chez *${storeName}* ! 🎉\nMerci pour votre fidélité et à bientôt dans notre magasin !`;
    } else if (templateOrText && templateOrText !== 'custom') {
      text = templateOrText;
    }

    const url = text 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank');
  };

  // Excel Export
  const exportCustomersToExcel = async () => {
    if (!customers || customers.length === 0) {
      toast.error("Aucun client à exporter.");
      return;
    }

    const exportRows = customers.map(c => ({
      "Identifiant": c.id,
      "Nom Complet": c.name || '',
      "Téléphone": c.phone || '',
      "Email": c.email || '',
      "N° Carte Fidélité": c.loyaltyCardNumber || '',
      "Solde (DA)": Number(c.balance || 0),
      "Dette (DA)": Number(c.balance || 0) < 0 ? Math.abs(Number(c.balance || 0)) : 0,
      "Points Fidélité": c.loyaltyPoints || 0,
      "Total Dépensé (DA)": Number(c.totalSpent || 0),
      "Nombre d'Achats": c.purchaseCount || 0,
      "Dernière Visite": c.lastVisit || '',
      "Date d'Adhésion": c.joinDate || '',
      "Client App": c.isAppUser ? "OUI" : "NON",
      "Client Grossiste": c.isWholesale ? "OUI" : "NON",
      "Adresse": c.address || '',
      "Ville": c.city || '',
      "Notes": c.notes || ''
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Clients_${settings.name ? settings.name.replace(/\s+/g, '_') : 'NexusPOS'}_${dateStr}`;
    try {
      await exportToExcelSafely(exportRows, fileName, "Clients");
      toast.success(`${customers.length} clients exportés avec succès !`);
    } catch (err: any) {
      console.error("Erreur lors de l'export des clients :", err);
      toast.error("Échec de l'exportation Excel : " + (err.message || "Erreur"));
    }
  };

  // Excel / CSV Import sécurisé
  const importCustomersFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readExcelObjectsSafely<Record<string, any>>(file);

      if (!rawRows || rawRows.length === 0) {
        toast.error("Le fichier Excel est vide.");
        return;
      }

      let count = 0;
      const nowIso = new Date().toISOString();

      const newCustomers: Customer[] = rawRows.map(rawRow => {
        const row = sanitizeRowObject(rawRow);
        const name = row["Nom Complet"] || row["Nom"] || row["name"] || row["Client"] || '';
        const phone = String(row["Téléphone"] || row["Tel"] || row["phone"] || '');
        const email = String(row["Email"] || row["email"] || '').toLowerCase().trim();
        const loyaltyCardNumber = String(row["N° Carte Fidélité"] || row["Carte"] || row["loyaltyCardNumber"] || '');
        const balance = Number(row["Solde (DA)"] || row["Solde"] || row["balance"] || 0);
        const loyaltyPoints = parseInt(row["Points Fidélité"] || row["Points"] || row["loyaltyPoints"] || 0, 10) || 0;
        const totalSpent = Number(row["Total Dépensé (DA)"] || row["totalSpent"] || 0);
        const notes = String(row["Notes"] || row["notes"] || '');
        const address = String(row["Adresse"] || row["address"] || '');
        const city = String(row["Ville"] || row["city"] || '');

        count++;
        const custId = generateLocalId();

        return {
          id: custId,
          name: name || `Client Importé #${count}`,
          phone,
          email,
          loyaltyCardNumber,
          balance,
          loyaltyPoints,
          totalSpent,
          notes,
          address,
          city,
          updatedAt: nowIso,
          joinDate: nowIso.split('T')[0]
        };
      });

      // Update Zustand and localDb
      usePeopleStore.getState().setCustomers(prev => [...newCustomers, ...prev]);
      for (const c of newCustomers) {
        await localDb.insert(`customers/${c.id}`, c);
      }

      toast.success(`${newCustomers.length} clients importés avec succès !`);
      e.target.value = '';
    } catch (err: any) {
      console.error("Erreur lors de l'importation Excel:", err);
      toast.error("Échec de l'importation: " + err.message);
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
    selectedCustomerId,
    setSelectedCustomerId,
    activeTab,
    setActiveTab,
    editingCustomer,
    setEditingCustomer,
    showPassword,
    setShowPassword,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
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
    t,
    handleTopUp,
    selectedCustomer,
    handleSubmit,
    handleDeleteCustomer,
    filteredCustomers,
    openWhatsApp,
    kpiStats,
    handleLaunchSale,
    handlePrintStatement,
    exportCustomersToExcel,
    importCustomersFromExcel
  };
}
