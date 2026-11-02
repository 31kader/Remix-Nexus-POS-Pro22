import React from 'react';
import type { Customer, Transaction, Product } from '../../types';

const AppModals = React.lazy(() => import('../AppModals').then(m => ({ default: m.AppModals })));

interface AppModalsHostProps {
  isReturnModalOpen: boolean;
  setIsReturnModalOpen: (v: boolean) => void;
  selectedTransactionForReturn: Transaction | null;
  setSelectedTransactionForReturn: (t: Transaction | null) => void;
  isEditTransactionModalOpen: boolean;
  setIsEditTransactionModalOpen: (v: boolean) => void;
  selectedTransactionForEdit: Transaction | null;
  setSelectedTransactionForEdit: (t: Transaction | null) => void;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (v: boolean) => void;
  editingCategory: any;
  setEditingCategory: (c: any) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  parentCategoryId: string;
  setParentCategoryId: (v: string) => void;
  categoryImageUrl: string;
  setCategoryImageUrl: (v: string) => void;
  handleSaveCategory: () => Promise<void>;
  handleDeleteCategory: (cat: any) => Promise<void>;
  isBrandModalOpen: boolean;
  setIsBrandModalOpen: (v: boolean) => void;
  editingBrand: any;
  setEditingBrand: (b: any) => void;
  newBrandName: string;
  setNewBrandName: (v: string) => void;
  newBrandLogo: string;
  setNewBrandLogo: (v: string) => void;
  newBrandDesc: string;
  setNewBrandDesc: (v: string) => void;
  handleSaveBrand: (e: React.FormEvent) => Promise<void>;
  isPriceCheckerModalOpen: boolean;
  setIsPriceCheckerModalOpen: (v: boolean) => void;
  isStorePosterModalOpen: boolean;
  setIsStorePosterModalOpen: (v: boolean) => void;
  isPOSCustomerModalOpen: boolean;
  setIsPOSCustomerModalOpen: (v: boolean) => void;
  handlePOSCustomerCreated: (c: Customer) => void;
  isProductModalOpen: boolean;
  setIsProductModalOpen: (v: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: (p: Product | null) => void;
  setActiveTab: (t: string) => void;
  isAddUserModalOpen: boolean;
  setIsAddUserModalOpen: (v: boolean) => void;
  handleAddStaffManual: (name: string, email: string, role: string, phone?: string, password?: string) => Promise<void>;
  viewingPurchaseVoucher: any;
  setViewingPurchaseVoucher: (p: any) => void;
  isLowStockModalOpen: boolean;
  setIsLowStockModalOpen: (v: boolean) => void;
  lowStockProducts: any[];
  isExpirationModalOpen: boolean;
  setIsExpirationModalOpen: (v: boolean) => void;
  expiringProducts: any[];
  isStockAdjustmentModalOpen: boolean;
  setIsStockAdjustmentModalOpen: (v: boolean) => void;
}

export const AppModalsHost: React.FC<AppModalsHostProps> = (props) => {
  return <AppModals {...props} />;
};
