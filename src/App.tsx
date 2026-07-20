import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useCallback, Suspense, useEffect } from 'react';
import { Toaster, toast } from 'sonner';

// Hooks d'initialisation & authentification
import { useDataFetching } from './hooks/useDataFetching';
import { useAuthUser } from './hooks/useAuthUser';
import { useCategoryBrand } from './hooks/useCategoryBrand';
import { useStaffManagement } from './hooks/useStaffManagement';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useCartSync } from './hooks/useCartSync';
import { useAuthActions } from './hooks/useAuthActions';
import { useTranslation } from './translations';
import { useAppPermissionsAndTheme } from './hooks/useAppPermissionsAndStats';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Nouveaux hooks extraits
import { useModalState } from './hooks/useModalState';
import { useAppHandlers } from './hooks/useAppHandlers';

// Stores
import { useAuthStore } from './store/useAuthStore';
import { useCoreStore } from './store/useCoreStore';
import { useTransactionStore } from './store/useTransactionStore';
import { useCartStore } from './store/useCartStore';
import { useFinanceStore } from './store/useFinanceStore';
import { usePeopleStore } from './store/usePeopleStore';

// Types
import type { Transaction, Customer, Supplier } from './types';

// Utilitaires
import { playNotificationSound } from './services/notificationService';
import { localDb } from './services/LocalDatabase';

import { DEFAULT_PERMISSIONS } from './constants';

// Composants UI principaux
import { SyncIndicator } from './components/SyncIndicator';
import { UnauthorizedView } from './components/UnauthorizedView';
import { LoginView } from './components/LoginView';
import { MainAppContent } from './components/MainAppContent';
import { TabRenderer } from './components/TabRenderer';
import { AppModals } from './components/AppModals';

// Modes alternatifs (lazy-loaded pour réduire la taille du bundle initial)
const SupplierLogin = React.lazy(() => import('./components/SupplierLogin').then(m => ({ default: m.SupplierLogin })));
const CustomerLogin = React.lazy(() => import('./components/CustomerLogin').then(m => ({ default: m.CustomerLogin })));
const CameraLogin = React.lazy(() => import('./components/CameraLogin').then(m => ({ default: m.CameraLogin })));
const SupplierDashboard = React.lazy(() => import('./components/SupplierDashboard').then(m => ({ default: m.SupplierDashboard })));
const CustomerDashboard = React.lazy(() => import('./components/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const DeliveryDashboard = React.lazy(() => import('./components/DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));

export default function App() {
  const { language, setLanguage, t } = useTranslation();

  const {
    isMobile, isOnline, isStandalone, deferredPrompt,
    setDeferredPrompt, appMode, setAppMode,
    syncInfo, bgSyncActive, bgPendingChanges,
  } = useAppInitialization();

  // --- Authentification ---
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(() => {
    const cachedOffline = localStorage.getItem('nexus_active_offline_session');
    const cachedOnline = localStorage.getItem('nexus_active_online_session');
    return !(cachedOffline || cachedOnline);
  });

  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const isLoggingIn = useAuthStore(s => s.isLoggingIn);
  const isUnauthorized = useAuthStore(s => s.isUnauthorized);
  const authError = useAuthStore(s => s.authError);
  const setAuthError = useAuthStore(s => s.setAuthError);
  const setProfile = useAuthStore(s => s.setProfile);

  const settings = useCoreStore(s => s.settings);
  const isDataLoading = useCoreStore(s => s.isDataLoading);

  const EMPTY_ARRAY = React.useRef<any[]>([]);

  const transactions = useTransactionStore(s => appMode === 'customer' ? s.transactions : EMPTY_ARRAY.current);
  const purchaseOrders = useTransactionStore(s => appMode === 'supplier' ? s.purchaseOrders : EMPTY_ARRAY.current);
  const onlineOrders = useTransactionStore(s => appMode === 'delivery' ? s.onlineOrders : EMPTY_ARRAY.current);

  const products = useCoreStore(s => appMode === 'supplier' ? s.products : EMPTY_ARRAY.current);
  const categories = useCoreStore(s => appMode === 'supplier' ? s.categories : EMPTY_ARRAY.current);
  const brands = useCoreStore(s => appMode === 'supplier' ? s.brands : EMPTY_ARRAY.current);

  const purchases = useFinanceStore(s => appMode === 'supplier' ? s.purchases : EMPTY_ARRAY.current);
  const supplierPayments = useFinanceStore(s => appMode === 'supplier' ? s.supplierPayments : EMPTY_ARRAY.current);

  const { handleLogin } = useAuthUser(appMode, setLoading);
  const { handleIdentifierLogin, handleLogout } = useAuthActions(t);

  useDataFetching(user, profile, appMode, currentSupplier, currentCustomer, loading, playNotificationSound);

  // --- Catégories & Marques ---
  const {
    isCategoryModalOpen, setIsCategoryModalOpen,
    isBrandModalOpen, setIsBrandModalOpen,
    editingCategory, setEditingCategory,
    editingBrand, setEditingBrand,
    newCategoryName, setNewCategoryName,
    parentCategoryId, setParentCategoryId,
    categoryImageUrl, setCategoryImageUrl,
    newBrandName, setNewBrandName,
    newBrandLogo, setNewBrandLogo,
    newBrandDesc, setNewBrandDesc,
    openCategoryModal, openBrandModal,
    handleSaveCategory, handleDeleteCategory,
    handleSaveBrand, handleDeleteBrand,
  } = useCategoryBrand();

  // --- Staff ---
  const {
    isAddUserModalOpen, setIsAddUserModalOpen,
    activeStaffId, setActiveStaffId,
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

  const { syncOrder } = useCartSync(autoSyncOrders);

  // --- PWA Service Worker ---
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        const intervalId = setInterval(() => r.update(), 60 * 60 * 1000);
        (window as any).__swUpdateIntervalId = intervalId;
      }
    },
    onRegisterError(error: any) {
      console.warn('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log("[PWA] Update detected, skipping auto-reload for stability");
      // setNeedRefresh(false); // Optionally clear it
    }
  }, [needRefresh]);

  // --- Navigation ---
  const getInitialTab = useCallback(() => {
    if (profile?.role === 'camera_agent') return 'camera';
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash.includes('=') || hash.includes('&')) return 'checkout';
    return hash;
  }, [profile]);

  const [activeTab, setActiveTabState] = useState(getInitialTab());
  const setActiveTab = useCallback((tab: string) => {
    window.location.hash = tab;
    setActiveTabState(tab);
  }, []);

  // --- Panier ---
  const {
    posSessions, setPosSessions,
    activeSessionId, setActiveSessionId,
    getCart, setCart,
    getSelectedCustomer, setSelectedCustomer,
    loadTransactionToCart,
    isWholesale, setIsWholesale,
    deliveryMethod, setDeliveryMethod,
  } = useCartStore();

  const cart = getCart();
  const selectedCustomer = getSelectedCustomer();

  // --- États des modales (IMPORTANT: DOIT ÊTRE DÉFINI AVANT LES HANDLERS) ---
  const {
    isReturnModalOpen, setIsReturnModalOpen,
    isEditTransactionModalOpen, setIsEditTransactionModalOpen,
    isLowStockModalOpen, setIsLowStockModalOpen,
    isExpirationModalOpen, setIsExpirationModalOpen,
    isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen,
    isPriceCheckerModalOpen, setIsPriceCheckerModalOpen,
    isPOSCustomerModalOpen, setIsPOSCustomerModalOpen,
    isProductModalOpen, setIsProductModalOpen,
    editingProduct, setEditingProduct,
    viewingPurchaseVoucher, setViewingPurchaseVoucher,
  } = useModalState();

  const [selectedTransactionForReturn, setSelectedTransactionForReturn] = useState<Transaction | null>(null);
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<Transaction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);

  // --- Handlers (centralisés via useAppHandlers) ---
  const {
    handleInstallApp,
    handleCreatePurchaseOrder,
    handleUpdateProduct,
    handleAdjustStock,
    handleEditProduct,
  } = useAppHandlers(
    deferredPrompt,
    setDeferredPrompt,
    setEditingProduct,
    setIsStockAdjustmentModalOpen,
    setIsProductModalOpen,
  );

  // ─── Rendu conditionnel par mode ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Initializing Systems...</p>
        </div>
      </div>
    );
  }

  if (isUnauthorized && !isOwner) {
    return <UnauthorizedView user={user} profile={profile} isOwner={isOwner} handleLogout={() => handleLogout(user)} />;
  }

  if (!user && appMode === 'pos') {
    return (
      <LoginView
        loginIdentifier={loginIdentifier} setLoginIdentifier={setLoginIdentifier}
        loginPassword={loginPassword} setLoginPassword={setLoginPassword}
        showPassword={showPassword} setShowPassword={setShowPassword}
        isLoggingIn={isLoggingIn} authError={authError} setAuthError={setAuthError}
        handleIdentifierLogin={handleIdentifierLogin}
        handleLogin={handleLogin}
        language={language} setLanguage={setLanguage as any}
        isLangMenuOpen={isLangMenuOpen} setIsLangMenuOpen={setIsLangMenuOpen}
        t={t}
      />
    );
  }

  const loadingFallback = (
    <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
    </div>
  );

  if (!user) {
    if (appMode === 'customer') {
      return (
        <Suspense fallback={loadingFallback}>
          <CustomerLogin onLogin={setCurrentCustomer} />
        </Suspense>
      );
    }
    if (appMode === 'supplier') {
      return (
        <Suspense fallback={loadingFallback}>
          <SupplierLogin onLogin={setCurrentSupplier} />
        </Suspense>
      );
    }
    if (appMode === 'camera') {
      return (
        <Suspense fallback={loadingFallback}>
          <CameraLogin onLogin={setProfile} />
        </Suspense>
      );
    }
  }

  if (user && appMode === 'customer') {
    return (
      <Suspense fallback={loadingFallback}>
        <CustomerDashboard
          customer={currentCustomer!}
          transactions={transactions}
          settings={settings}
          onLogout={() => handleLogout(user)}
        />
      </Suspense>
    );
  }

  if (user && appMode === 'supplier') {
    return (
      <Suspense fallback={loadingFallback}>
        <SupplierDashboard
          supplier={currentSupplier!}
          onLogout={() => handleLogout(user)}
          products={products}
          categories={categories}
          brands={brands}
          settings={settings}
          setActiveTab={setActiveTab}
          handleCreatePurchaseOrder={handleCreatePurchaseOrder}
          purchaseOrders={purchaseOrders}
          user={user}
          setIsProductModalOpen={setIsProductModalOpen}
          setEditingProduct={setEditingProduct}
          editingProduct={editingProduct}
          isProductModalOpen={isProductModalOpen}
          purchases={purchases}
          supplierPayments={supplierPayments}
          setViewingPurchaseVoucher={setViewingPurchaseVoucher}
        />
      </Suspense>
    );
  }

  if (user && appMode === 'delivery') {
    return (
      <Suspense fallback={loadingFallback}>
        <DeliveryDashboard user={user} orders={onlineOrders} settings={settings} />
      </Suspense>
    );
  }

  // ─── Mode POS Principal ────────────────────────────────────────────────────
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    }>
      <Toaster position="top-right" richColors closeButton theme={theme === 'light' ? 'light' : 'dark'} />
      <SyncIndicator isOnline={isOnline} syncInfo={syncInfo} bgSyncActive={bgSyncActive} bgPendingChanges={bgPendingChanges} />

      <MainAppContent
        activeTab={activeTab} setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile} isMobileOverlayOpen={isMobileOverlayOpen} setIsMobileOverlayOpen={setIsMobileOverlayOpen}
        isDataLoading={isDataLoading}
        setIsLowStockModalOpen={setIsLowStockModalOpen}
        setIsExpirationModalOpen={setIsExpirationModalOpen}
        handleClockInOut={handleClockInOut}
        language={language} setLanguage={setLanguage as any}
        isLangMenuOpen={isLangMenuOpen} setIsLangMenuOpen={setIsLangMenuOpen}
        theme={theme} setTheme={setTheme}
        isThemeMenuOpen={isThemeMenuOpen} setIsThemeMenuOpen={setIsThemeMenuOpen}
        activeStaffId={activeStaffId} t={t} toast={toast}
        permissions={permissions}
        handleLogout={handleLogout}
        handleInstallApp={handleInstallApp}
        deferredPrompt={deferredPrompt}
        setIsPriceCheckerModalOpen={setIsPriceCheckerModalOpen}
      >
        <TabRenderer
          activeTab={activeTab}
          cart={cart} setCart={setCart}
          setActiveTab={setActiveTab}
          setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
          selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
          posSessions={posSessions} setPosSessions={setPosSessions}
          activeSessionId={activeSessionId} setActiveSessionId={setActiveSessionId}
          setIsProductModalOpen={setIsProductModalOpen}
          setEditingProduct={setEditingProduct}
          isWholesale={isWholesale} setIsWholesale={setIsWholesale}
          deliveryMethod={deliveryMethod} setDeliveryMethod={setDeliveryMethod}
          activeStaffId={activeStaffId}
          canAccess={canAccess}
          onUpdateProduct={handleUpdateProduct}
          onAdjustStock={handleAdjustStock}
          onEditProduct={handleEditProduct}
          onAddCategory={openCategoryModal} onEditCategory={openCategoryModal}
          onDeleteCategory={(cat: any) => handleDeleteCategory(cat)}
          onAddBrand={openBrandModal} onEditBrand={openBrandModal}
          onDeleteBrand={(brand: any) => handleDeleteBrand(brand)}
          setIsAddUserModalOpen={setIsAddUserModalOpen}
          onReturn={(t: Transaction) => { setSelectedTransactionForReturn(t); setIsReturnModalOpen(true); }}
          onMarkAsDelivered={async (t: Transaction) => {
            await localDb.insert(`transactions/${t.id}`, { ...t, status: 'delivered' });
          }}
          onEdit={(t: Transaction) => { setSelectedTransactionForEdit(t); setIsEditTransactionModalOpen(true); }}
          onRestore={(t: Transaction) => loadTransactionToCart(t, setActiveTab)}
          syncOrder={syncOrder} autoSyncOrders={autoSyncOrders} setAutoSyncOrders={setAutoSyncOrders}
          isStandalone={isStandalone} deferredPrompt={deferredPrompt} handleInstallApp={handleInstallApp}
          setViewingPurchaseVoucher={setViewingPurchaseVoucher}
          editingProduct={editingProduct}
          isProductModalOpen={isProductModalOpen}
        />
      </MainAppContent>

      <AppModals
        isReturnModalOpen={isReturnModalOpen} setIsReturnModalOpen={setIsReturnModalOpen}
        selectedTransactionForReturn={selectedTransactionForReturn} setSelectedTransactionForReturn={setSelectedTransactionForReturn}
        isEditTransactionModalOpen={isEditTransactionModalOpen} setIsEditTransactionModalOpen={setIsEditTransactionModalOpen}
        selectedTransactionForEdit={selectedTransactionForEdit} setSelectedTransactionForEdit={setSelectedTransactionForEdit}
        isCategoryModalOpen={isCategoryModalOpen} setIsCategoryModalOpen={setIsCategoryModalOpen}
        editingCategory={editingCategory} setEditingCategory={setEditingCategory}
        newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName}
        parentCategoryId={parentCategoryId} setParentCategoryId={setParentCategoryId}
        categoryImageUrl={categoryImageUrl} setCategoryImageUrl={setCategoryImageUrl}
        handleSaveCategory={handleSaveCategory} handleDeleteCategory={handleDeleteCategory}
        isBrandModalOpen={isBrandModalOpen} setIsBrandModalOpen={setIsBrandModalOpen}
        editingBrand={editingBrand} setEditingBrand={setEditingBrand}
        newBrandName={newBrandName} setNewBrandName={setNewBrandName}
        newBrandLogo={newBrandLogo} setNewBrandLogo={setNewBrandLogo}
        newBrandDesc={newBrandDesc} setNewBrandDesc={setNewBrandDesc}
        handleSaveBrand={handleSaveBrand}
        isPriceCheckerModalOpen={isPriceCheckerModalOpen} setIsPriceCheckerModalOpen={setIsPriceCheckerModalOpen}
        isPOSCustomerModalOpen={isPOSCustomerModalOpen} setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
        handlePOSCustomerCreated={(c: Customer) => { setSelectedCustomer(c); setIsPOSCustomerModalOpen(false); }}
        isProductModalOpen={isProductModalOpen} setIsProductModalOpen={setIsProductModalOpen}
        editingProduct={editingProduct} setEditingProduct={setEditingProduct} setActiveTab={setActiveTab}
        isAddUserModalOpen={isAddUserModalOpen} setIsAddUserModalOpen={setIsAddUserModalOpen}
        handleAddStaffManual={(name: string, email: string, role: string, phone?: string, password?: string) =>
          handleAddStaffManual(name, email, role, phone, password)
        }
        viewingPurchaseVoucher={viewingPurchaseVoucher} setViewingPurchaseVoucher={setViewingPurchaseVoucher}
        isLowStockModalOpen={isLowStockModalOpen} setIsLowStockModalOpen={setIsLowStockModalOpen}
        isExpirationModalOpen={isExpirationModalOpen} setIsExpirationModalOpen={setIsExpirationModalOpen}
        isStockAdjustmentModalOpen={isStockAdjustmentModalOpen} setIsStockAdjustmentModalOpen={setIsStockAdjustmentModalOpen}
      />
    </Suspense>
  );
}
