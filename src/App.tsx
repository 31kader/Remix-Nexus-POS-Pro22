import React, { useState, Suspense } from 'react';
import { toast } from 'sonner';

// Hooks d'initialisation & authentification
import { useDataFetching } from './hooks/useDataFetching';
import { useAuthUser } from './hooks/useAuthUser';
import { useCategoryBrand } from './hooks/useCategoryBrand';
import { useStaffManagement } from './hooks/useStaffManagement';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useCartSync } from './hooks/useCartSync';
import { useAuthActions } from './hooks/useAuthActions';
import { useTranslation } from './translations';
import { useAppPermissionsAndTheme, useProductStats } from './hooks/useAppPermissionsAndStats';
import { useAppServiceWorkerAndGuard } from './hooks/useAppServiceWorkerAndGuard';

// Nouveaux hooks & modules extraits
import { useModalState } from './hooks/useModalState';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppTabNavigation } from './components/app/useAppTabNavigation';
import { AppAlternativeModeRenderer } from './components/app/AppAlternativeModeRenderer';
import { useAppCustomerDisplayState } from './components/app/useAppCustomerDisplayState';
import { useAppLoginState } from './components/app/useAppLoginState';
import { useAppStoreSelectors } from './components/app/useAppStoreSelectors';
import { AppModalsHost } from './components/app/AppModalsHost';

// Stores
import { useAuthStore } from './store/useAuthStore';
import { useCoreStore } from './store/useCoreStore';
import { useCartStore } from './store/useCartStore';

// Types
import type { Transaction, Customer } from './types';

// Utilitaires
import { playNotificationSound } from './services/notificationService';

// Composants UI principaux
import { SyncIndicator } from './components/SyncIndicator';
import { MainAppContent } from './components/MainAppContent';
import { TabRenderer } from './components/TabRenderer';

export default function App() {
  const { isCustomerDisplay } = useAppCustomerDisplayState();
  const { language, setLanguage, t } = useTranslation();

  const {
    isMobile, isOnline, isStandalone, deferredPrompt,
    setDeferredPrompt, appMode, setAppMode,
    syncInfo, bgSyncActive, bgPendingChanges,
  } = useAppInitialization();

  // --- Authentification & Sessions ---
  const loginState = useAppLoginState();
  const { loading, setLoading, currentCustomer, currentSupplier } = loginState;

  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const isLoggingIn = useAuthStore(s => s.isLoggingIn);
  const isUnauthorized = useAuthStore(s => s.isUnauthorized);
  const authError = useAuthStore(s => s.authError);
  const setAuthError = useAuthStore(s => s.setAuthError);
  const setUser = useAuthStore(s => s.setUser);
  const setProfile = useAuthStore(s => s.setProfile);

  const settings = useCoreStore(s => s.settings);
  const isDataLoading = useCoreStore(s => s.isDataLoading);

  // 🛡️ NEXUS GUARD & Service Worker
  useAppServiceWorkerAndGuard();

  const storeSelectors = useAppStoreSelectors(appMode);

  const { handleLogin } = useAuthUser(appMode, setLoading);
  const { handleIdentifierLogin, handleLogout } = useAuthActions(t);

  useDataFetching(user, profile, appMode, currentSupplier, currentCustomer, loading, playNotificationSound);

  // --- Catégories & Marques ---
  const cb = useCategoryBrand();

  // --- Staff ---
  const {
    isAddUserModalOpen, setIsAddUserModalOpen,
    activeStaffId,
    handleAddStaffManual,
  } = useStaffManagement();

  // --- Thème, langue, permissions ---
  const {
    autoSyncOrders, setAutoSyncOrders,
    theme, setTheme,
    isThemeMenuOpen, setIsThemeMenuOpen,
    isLangMenuOpen, setIsLangMenuOpen,
    permissions, isOwner, canAccess,
    currentEmployee, isClockedIn, handleClockInOut,
  } = useAppPermissionsAndTheme();
  const { expiringProducts, lowStockProducts } = useProductStats();

  const { syncOrder } = useCartSync(autoSyncOrders);

  // --- Navigation & Sécurité des Onglets ---
  const {
    activeTab,
    setActiveTab,
    isCameraAgent,
    isVerifiedAdmin
  } = useAppTabNavigation({
    profile,
    canAccess,
    isOwner,
    t
  });

  // --- Panier ---
  const loadTransactionToCart = useCartStore(s => s.loadTransactionToCart);
  const setSelectedCustomer = useCartStore(s => s.setSelectedCustomer);

  // --- États des modales ---
  const {
    isReturnModalOpen, setIsReturnModalOpen,
    isEditTransactionModalOpen, setIsEditTransactionModalOpen,
    isLowStockModalOpen, setIsLowStockModalOpen,
    isExpirationModalOpen, setIsExpirationModalOpen,
    isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen,
    isPriceCheckerModalOpen, setIsPriceCheckerModalOpen,
    isStorePosterModalOpen, setIsStorePosterModalOpen,
    isPOSCustomerModalOpen, setIsPOSCustomerModalOpen,
    isProductModalOpen, setIsProductModalOpen,
    editingProduct, setEditingProduct,
    viewingPurchaseVoucher, setViewingPurchaseVoucher,
  } = useModalState();

  const [selectedTransactionForReturn, setSelectedTransactionForReturn] = useState<Transaction | null>(null);
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<Transaction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);

  // --- Handlers ---
  const {
    handleInstallApp,
    handleCreatePurchaseOrder,
    handleUpdateProduct,
    handleAdjustStock,
    handleEditProduct,
    handleMarkAsDelivered,
  } = useAppHandlers(
    deferredPrompt,
    setDeferredPrompt,
    setEditingProduct,
    setIsStockAdjustmentModalOpen,
    setIsProductModalOpen,
  );

  // ─── Rendu conditionnel par mode (Alternatifs) ─────────────────────────────
  const alternativeView = (
    <AppAlternativeModeRenderer
      isCustomerDisplay={isCustomerDisplay}
      appMode={appMode}
      setAppMode={setAppMode}
      loading={loading}
      user={user}
      profile={profile}
      isOwner={isOwner}
      isUnauthorized={isUnauthorized}
      handleLogout={handleLogout}
      loginState={loginState}
      authStore={{ isLoggingIn, authError, setAuthError, handleIdentifierLogin, handleLogin, setUser, setProfile }}
      translation={{ language, setLanguage, isLangMenuOpen, setIsLangMenuOpen, t }}
      storeSelectors={storeSelectors}
      settings={settings}
      setActiveTab={setActiveTab}
      handleCreatePurchaseOrder={handleCreatePurchaseOrder}
      setIsProductModalOpen={setIsProductModalOpen}
      setEditingProduct={setEditingProduct}
      editingProduct={editingProduct}
      isProductModalOpen={isProductModalOpen}
      setViewingPurchaseVoucher={setViewingPurchaseVoucher}
    />
  );

  if (alternativeView) {
    return alternativeView;
  }

  // ─── Mode POS Principal ────────────────────────────────────────────────────
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    }>
      <SyncIndicator 
        isOnline={isOnline} 
        syncInfo={syncInfo} 
        bgSyncActive={bgSyncActive} 
        bgPendingChanges={bgPendingChanges} 
        onOpenSyncStudio={() => setActiveTab('sync_studio')} 
      />

      <MainAppContent
        activeTab={activeTab} setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile} isMobileOverlayOpen={isMobileOverlayOpen} setIsMobileOverlayOpen={setIsMobileOverlayOpen}
        isDataLoading={isDataLoading}
        setIsLowStockModalOpen={setIsLowStockModalOpen}
        setIsExpirationModalOpen={setIsExpirationModalOpen}
        lowStockProducts={lowStockProducts}
        expiringProducts={expiringProducts}
        currentEmployee={currentEmployee}
        isClockedIn={isClockedIn}
        handleClockInOut={handleClockInOut}
        language={language} setLanguage={setLanguage as any}
        isLangMenuOpen={isLangMenuOpen} setIsLangMenuOpen={setIsLangMenuOpen}
        theme={theme} setTheme={setTheme}
        isThemeMenuOpen={isThemeMenuOpen} setIsThemeMenuOpen={setIsThemeMenuOpen}
        activeStaffId={activeStaffId} t={t} toast={toast}
        permissions={permissions}
        canAccess={canAccess}
        isOwner={isOwner}
        isAdmin={isVerifiedAdmin}
        isManager={profile?.role === 'manager'}
        handleLogout={handleLogout}
        handleInstallApp={handleInstallApp}
        deferredPrompt={deferredPrompt}
        setIsPriceCheckerModalOpen={setIsPriceCheckerModalOpen}
        setIsStorePosterModalOpen={setIsStorePosterModalOpen}
      >
        <TabRenderer
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
          setIsProductModalOpen={setIsProductModalOpen}
          setEditingProduct={setEditingProduct}
          activeStaffId={activeStaffId}
          canAccess={canAccess}
          isOwner={isOwner}
          isAdmin={isVerifiedAdmin}
          isManager={profile?.role === 'manager'}
          isCameraAgent={isCameraAgent}
          onUpdateProduct={handleUpdateProduct}
          onAdjustStock={handleAdjustStock}
          onEditProduct={handleEditProduct}
          onAddCategory={cb.openCategoryModal} onEditCategory={cb.openCategoryModal}
          onDeleteCategory={cb.handleDeleteCategory}
          onAddBrand={cb.openBrandModal} onEditBrand={cb.openBrandModal}
          onDeleteBrand={cb.handleDeleteBrand}
          setIsAddUserModalOpen={setIsAddUserModalOpen}
          onReturn={(tr: Transaction) => { setSelectedTransactionForReturn(tr); setIsReturnModalOpen(true); }}
          onMarkAsDelivered={handleMarkAsDelivered}
          onEdit={(tr: Transaction) => { setSelectedTransactionForEdit(tr); setIsEditTransactionModalOpen(true); }}
          onRestore={(tr: Transaction) => loadTransactionToCart(tr, setActiveTab)}
          syncOrder={syncOrder} autoSyncOrders={autoSyncOrders} setAutoSyncOrders={setAutoSyncOrders}
          isStandalone={isStandalone} deferredPrompt={deferredPrompt} handleInstallApp={handleInstallApp}
          setViewingPurchaseVoucher={setViewingPurchaseVoucher}
          editingProduct={editingProduct}
          isProductModalOpen={isProductModalOpen}
        />
      </MainAppContent>

      <AppModalsHost
        isReturnModalOpen={isReturnModalOpen} setIsReturnModalOpen={setIsReturnModalOpen}
        selectedTransactionForReturn={selectedTransactionForReturn} setSelectedTransactionForReturn={setSelectedTransactionForReturn}
        isEditTransactionModalOpen={isEditTransactionModalOpen} setIsEditTransactionModalOpen={setIsEditTransactionModalOpen}
        selectedTransactionForEdit={selectedTransactionForEdit} setSelectedTransactionForEdit={setSelectedTransactionForEdit}
        isCategoryModalOpen={cb.isCategoryModalOpen} setIsCategoryModalOpen={cb.setIsCategoryModalOpen}
        editingCategory={cb.editingCategory} setEditingCategory={cb.setEditingCategory}
        newCategoryName={cb.newCategoryName} setNewCategoryName={cb.setNewCategoryName}
        parentCategoryId={cb.parentCategoryId} setParentCategoryId={cb.setParentCategoryId}
        categoryImageUrl={cb.categoryImageUrl} setCategoryImageUrl={cb.setCategoryImageUrl}
        handleSaveCategory={cb.handleSaveCategory} handleDeleteCategory={cb.handleDeleteCategory}
        isBrandModalOpen={cb.isBrandModalOpen} setIsBrandModalOpen={cb.setIsBrandModalOpen}
        editingBrand={cb.editingBrand} setEditingBrand={cb.setEditingBrand}
        newBrandName={cb.newBrandName} setNewBrandName={cb.setNewBrandName}
        newBrandLogo={cb.newBrandLogo} setNewBrandLogo={cb.setNewBrandLogo}
        newBrandDesc={cb.newBrandDesc} setNewBrandDesc={cb.setNewBrandDesc}
        handleSaveBrand={cb.handleSaveBrand}
        isPriceCheckerModalOpen={isPriceCheckerModalOpen} setIsPriceCheckerModalOpen={setIsPriceCheckerModalOpen}
        isStorePosterModalOpen={isStorePosterModalOpen} setIsStorePosterModalOpen={setIsStorePosterModalOpen}
        isPOSCustomerModalOpen={isPOSCustomerModalOpen} setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
        handlePOSCustomerCreated={(c: Customer) => { setSelectedCustomer(c); setIsPOSCustomerModalOpen(false); }}
        isProductModalOpen={isProductModalOpen} setIsProductModalOpen={setIsProductModalOpen}
        editingProduct={editingProduct} setEditingProduct={setEditingProduct} setActiveTab={setActiveTab}
        isAddUserModalOpen={isAddUserModalOpen} setIsAddUserModalOpen={setIsAddUserModalOpen}
        handleAddStaffManual={handleAddStaffManual}
        viewingPurchaseVoucher={viewingPurchaseVoucher} setViewingPurchaseVoucher={setViewingPurchaseVoucher}
        isLowStockModalOpen={isLowStockModalOpen} setIsLowStockModalOpen={setIsLowStockModalOpen}
        lowStockProducts={lowStockProducts}
        isExpirationModalOpen={isExpirationModalOpen} setIsExpirationModalOpen={setIsExpirationModalOpen}
        expiringProducts={expiringProducts}
        isStockAdjustmentModalOpen={isStockAdjustmentModalOpen} setIsStockAdjustmentModalOpen={setIsStockAdjustmentModalOpen}
      />
    </Suspense>
  );
}
