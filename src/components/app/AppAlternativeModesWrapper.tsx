import React from 'react';
import { AppAlternativeModes } from './AppAlternativeModes';

interface AppAlternativeModesWrapperProps {
  isCustomerDisplay: boolean;
  appMode: any;
  setAppMode: (mode: any) => void;
  loading: boolean;
  user: any;
  profile: any;
  isOwner: boolean;
  isUnauthorized: boolean;
  handleLogout: (user?: any) => Promise<void> | void;
  loginIdentifier: string;
  setLoginIdentifier: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isLoggingIn: boolean;
  authError: any;
  setAuthError: (v: any) => void;
  handleIdentifierLogin: any;
  handleLogin: any;
  language: any;
  setLanguage: any;
  isLangMenuOpen: boolean;
  setIsLangMenuOpen: (v: boolean) => void;
  t: any;
  currentCustomer: any;
  setCurrentCustomer: (c: any) => void;
  currentSupplier: any;
  setCurrentSupplier: (s: any) => void;
  transactions: any[];
  purchaseOrders: any[];
  onlineOrders: any[];
  purchases: any[];
  supplierPayments: any[];
  products: any[];
  categories: any[];
  brands: any[];
  promotions: any[];
  settings: any;
  setActiveTab: (tab: string) => void;
  handleCreatePurchaseOrder: any;
  setIsProductModalOpen: (v: boolean) => void;
  setEditingProduct: (p: any) => void;
  editingProduct: any;
  isProductModalOpen: boolean;
  setViewingPurchaseVoucher: (p: any) => void;
  setUser: any;
  setProfile: any;
}

export const AppAlternativeModesWrapper: React.FC<AppAlternativeModesWrapperProps> = (props) => {
  return <AppAlternativeModes {...props} />;
};
