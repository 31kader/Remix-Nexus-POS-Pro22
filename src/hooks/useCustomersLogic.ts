import { useState } from 'react';
import { useTranslation } from '../translations';
import {
  CustomersProps,
  useCustomersFilterAndSort,
  useCustomersExcelOperations,
  useCustomersCrudOperations
} from './customers';

export {
  type CustomersProps,
  type CustomerFilterStatus,
  type CustomerSortOption,
  type CustomerFormData
} from './customers';

export function useCustomersLogic(props: CustomersProps) {
  const { 
    customers, 
    transactions, 
    settings
  } = props;

  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'card'>('info');

  // Sous-hook 1 : Filtres, Recherche & Tris
  const {
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    kpiStats,
    filteredCustomers
  } = useCustomersFilterAndSort({ customers });

  // Sous-hook 2 : Opérations d'Import / Export Excel sécurisées
  const {
    exportCustomersToExcel,
    importCustomersFromExcel
  } = useCustomersExcelOperations({ customers, settings });

  // Sous-hook 3 : Opérations CRUD, Règlement / Top-up, Vente & WhatsApp
  const {
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
  } = useCustomersCrudOperations({
    customers,
    transactions,
    settings,
    selectedCustomerId,
    setSelectedCustomerId,
    setIsModalOpen
  });

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
