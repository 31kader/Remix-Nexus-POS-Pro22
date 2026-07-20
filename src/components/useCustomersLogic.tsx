import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Plus, Search, Smartphone, Award, Phone, Mail, MessageSquare, 
  Trash2, Contact, User as UserIcon, Quote, Clock, ShoppingBag, 
  CreditCard as CardIcon, Eye, EyeOff, Printer, Users
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { convertKeysToSnake } from '../lib/db-converters';
import { 
  Customer, Transaction, CompanySettings, Product, Expense, StockAdjustment, Category 
} from '../types';
import { Button, Modal, ConfirmDialog } from './ui';
import { cn, formatSafe } from '../lib/utils';
import { CustomerProfile } from './CustomerProfile';
import { useTranslation } from '../translations';

import { useCustomerData } from '../hooks/useCustomerData';





export interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore: (t: Transaction) => void;
  products?: Product[];
  expenses?: Expense[];
  stockAdjustments?: StockAdjustment[];
  categories?: Category[];
}

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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [financialOpType, setFinancialOpType] = useState<'encaissement' | 'decaissement'>('encaissement');
  const [financialMethod, setFinancialMethod] = useState<'cash' | 'card' | 'bank' | 'other'>('cash');
  const [financialNote, setFinancialNote] = useState('');

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !topUpAmount || isProcessingTopUp) return;
    
    setIsProcessingTopUp(true);
    try {
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Veuillez saisir un montant valide.");
        setIsProcessingTopUp(false);
        return;
      }

      const change = financialOpType === 'encaissement' ? amount : -amount;
      const newBalance = (selectedCustomer.balance || 0) + change;
      
      const labelOp = financialOpType === 'encaissement' ? 'Encaissement/Versement' : 'Décaissement/Sortie';
      const noteRefStr = `[REGLEMENT] ${labelOp} de ${amount.toFixed(2)} ${settings.currency} (${financialMethod.toUpperCase()}) - ${financialNote || 'Ajustement de solde'}`;
      const noteEntry = {
        note: noteRefStr,
        author: 'Direction/Caisse',
        timestamp: new Date().toISOString()
      };
      
      const newNotes = [...(selectedCustomer.cashierNotes || []), noteEntry];

      const snakeData = convertKeysToSnake({
        balance: newBalance,
        cashierNotes: newNotes
      });

      const { error: customerError } = await supabase
        .from('customers')
        .update(snakeData)
        .eq('id', selectedCustomer.id);
      if (customerError) throw customerError;

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          id: Math.random().toString(36).substring(2, 10),
          description: `${financialOpType === 'encaissement' ? 'Encaissement Règlement Client' : 'Décaissement/Retrait Client'} : ${selectedCustomer.name} (${financialNote || 'Sans note'})`,
          amount: -change,
          category: financialOpType === 'encaissement' ? 'Versement Client' : 'Remboursement Client',
          date: new Date().toISOString(),
          userId: 'system',
          paymentMethod: financialMethod
        });
      if (expenseError) throw expenseError;
      
      setIsTopUpModalOpen(false);
      setTopUpAmount('');
      setFinancialNote('');
      setFinancialMethod('cash');
      setFinancialOpType('encaissement');
    } catch (error: any) {
      console.error("Error top-up:", error);
      alert("Erreur lors de l'opération: " + error.message);
    } finally {
      setIsProcessingTopUp(false);
    }
  };

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId) || null, [customers, selectedCustomerId]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    loyaltyCardNumber: '',
    notes: '',
    isAppUser: false,
    password: ''
  });

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        phone: editingCustomer.phone || '',
        email: editingCustomer.email || '',
        loyaltyCardNumber: editingCustomer.loyaltyCardNumber || '',
        notes: editingCustomer.notes || '',
        isAppUser: editingCustomer.isAppUser || false,
        password: ''
      });
    } else {
      setFormData({ name: '', phone: '', email: '', loyaltyCardNumber: '', notes: '', isAppUser: false, password: '' });
    }
  }, [editingCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formData.email ? formData.email.trim().toLowerCase() : '';
    const newPassword = formData.password.trim();
    const existingHash = editingCustomer?.passwordHash || editingCustomer?.password_hash || '';

    if (formData.isAppUser && !cleanEmail) {
      alert("L'email est obligatoire pour un compte client connecté.");
      return;
    }

    if (newPassword && newPassword.length < 4) {
      alert("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    if (formData.isAppUser && !editingCustomer && !newPassword) {
      alert("Le mot de passe est obligatoire pour créer un compte client connecté.");
      return;
    }

    const finalPasswordHash = newPassword
      ? bcrypt.hashSync(newPassword, 10)
      : (formData.isAppUser ? existingHash : '');

    const { password, ...restFormData } = formData;

    const dataToSave = {
      ...restFormData,
      email: cleanEmail,
      loyaltyPoints: editingCustomer?.loyaltyPoints || 0,
      balance: editingCustomer?.balance || 0,
      totalSpent: editingCustomer?.totalSpent || 0,
      updatedAt: new Date().toISOString()
    };

    const snakeData = convertKeysToSnake(dataToSave);
    
    if (finalPasswordHash) {
      snakeData.password_hash = finalPasswordHash;
    } else {
      snakeData.password_hash = null;
    }
    delete snakeData.password;

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(snakeData)
          .eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({ 
            id: Math.random().toString(36).substring(2, 10), 
            ...snakeData, 
            loyalty_points: 0, 
            balance: 0, 
            total_spent: 0 
          });
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      alert("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);
      if (error) throw error;
      
      if (selectedCustomerId === customerToDelete.id) {
        setSelectedCustomerId(null);
      }
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      alert("Erreur lors de la suppression: " + error.message);
    }
  };

  const { sortedCustomers: filteredCustomers, requestSort, sortConfig } = useCustomerData({
    customers,
    searchQuery: search
  });

  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
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
    requestSort,
    sortConfig,
    openWhatsApp
  };
}
