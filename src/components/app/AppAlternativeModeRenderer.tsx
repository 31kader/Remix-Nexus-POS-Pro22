import React from 'react';
import { AppAlternativeModesWrapper } from './AppAlternativeModesWrapper';

interface AppAlternativeModeRendererProps {
  isCustomerDisplay: boolean;
  appMode: any;
  setAppMode: (m: any) => void;
  loading: boolean;
  user: any;
  profile: any;
  isOwner: boolean;
  isUnauthorized: boolean;
  handleLogout: (u?: any) => Promise<void> | void;
  loginState: any;
  authStore: any;
  translation: any;
  storeSelectors: any;
  settings: any;
  setActiveTab: (t: string) => void;
  handleCreatePurchaseOrder: any;
  setIsProductModalOpen: (v: boolean) => void;
  setEditingProduct: (p: any) => void;
  editingProduct: any;
  isProductModalOpen: boolean;
  setViewingPurchaseVoucher: (p: any) => void;
}

export function isAlternativeModeActive({
  isCustomerDisplay,
  appMode,
  loading,
  isUnauthorized,
  isOwner,
  user
}: {
  isCustomerDisplay: boolean;
  appMode: string;
  loading: boolean;
  isUnauthorized: boolean;
  isOwner: boolean;
  user: any;
}): boolean {
  return (
    isCustomerDisplay ||
    appMode === 'client_scan' ||
    appMode === 'kiosk' ||
    loading ||
    (isUnauthorized && !isOwner) ||
    (!user && appMode === 'pos') ||
    appMode === 'customer' ||
    appMode === 'supplier' ||
    (!user && appMode === 'camera') ||
    (Boolean(user) && appMode === 'delivery') ||
    appMode === 'carton_reception'
  );
}

export const AppAlternativeModeRenderer: React.FC<AppAlternativeModeRendererProps> = ({
  isCustomerDisplay,
  appMode,
  setAppMode,
  loading,
  user,
  profile,
  isOwner,
  isUnauthorized,
  handleLogout,
  loginState,
  authStore,
  translation,
  storeSelectors,
  settings,
  setActiveTab,
  handleCreatePurchaseOrder,
  setIsProductModalOpen,
  setEditingProduct,
  editingProduct,
  isProductModalOpen,
  setViewingPurchaseVoucher
}) => {
  return (
    <AppAlternativeModesWrapper
      isCustomerDisplay={isCustomerDisplay}
      appMode={appMode}
      setAppMode={setAppMode}
      loading={loading}
      user={user}
      profile={profile}
      isOwner={isOwner}
      isUnauthorized={isUnauthorized}
      handleLogout={handleLogout}
      loginIdentifier={loginState.loginIdentifier}
      setLoginIdentifier={loginState.setLoginIdentifier}
      loginPassword={loginState.loginPassword}
      setLoginPassword={loginState.setLoginPassword}
      showPassword={loginState.showPassword}
      setShowPassword={loginState.setShowPassword}
      isLoggingIn={authStore.isLoggingIn}
      authError={authStore.authError}
      setAuthError={authStore.setAuthError}
      handleIdentifierLogin={authStore.handleIdentifierLogin}
      handleLogin={authStore.handleLogin}
      language={translation.language}
      setLanguage={translation.setLanguage as any}
      isLangMenuOpen={translation.isLangMenuOpen}
      setIsLangMenuOpen={translation.setIsLangMenuOpen}
      t={translation.t}
      currentCustomer={loginState.currentCustomer}
      setCurrentCustomer={loginState.setCurrentCustomer}
      currentSupplier={loginState.currentSupplier}
      setCurrentSupplier={loginState.setCurrentSupplier}
      transactions={storeSelectors.transactions}
      purchaseOrders={storeSelectors.purchaseOrders}
      onlineOrders={storeSelectors.onlineOrders}
      purchases={storeSelectors.purchases}
      supplierPayments={storeSelectors.supplierPayments}
      products={storeSelectors.products}
      categories={storeSelectors.categories}
      brands={storeSelectors.brands}
      promotions={storeSelectors.promotions}
      settings={settings}
      setActiveTab={setActiveTab}
      handleCreatePurchaseOrder={handleCreatePurchaseOrder}
      setIsProductModalOpen={setIsProductModalOpen}
      setEditingProduct={setEditingProduct}
      editingProduct={editingProduct}
      isProductModalOpen={isProductModalOpen}
      setViewingPurchaseVoucher={setViewingPurchaseVoucher}
      setUser={authStore.setUser}
      setProfile={authStore.setProfile}
    />
  );
};
