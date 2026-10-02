import React, { useState, useCallback, Suspense, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
const CustomerDisplayWindow = React.lazy(() => import('./components/CustomerDisplayWindow').then(m => ({ default: m.CustomerDisplayWindow })));

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
import { MainAppContent } from './components/MainAppContent';
import { TabRenderer } from './components/TabRenderer';
import { isTabAllowed } from './lib/permissions';

// Modales et login en lazy-loading (Règle GEMINI.md : bundle optimisé)
const LoginView = React.lazy(() => import('./components/LoginView').then(m => ({ default: m.LoginView })));
const AppModals = React.lazy(() => import('./components/AppModals').then(m => ({ default: m.AppModals })));

// Modes alternatifs (lazy-loaded pour réduire la taille du bundle initial)
const SupplierLogin = React.lazy(() => import('./components/SupplierLogin').then(m => ({ default: m.SupplierLogin })));
const CustomerLogin = React.lazy(() => import('./components/CustomerLogin').then(m => ({ default: m.CustomerLogin })));
const CameraLogin = React.lazy(() => import('./components/CameraLogin').then(m => ({ default: m.CameraLogin })));
const SupplierDashboard = React.lazy(() => import('./components/SupplierDashboard').then(m => ({ default: m.SupplierDashboard })));
const CustomerDashboard = React.lazy(() => import('./components/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const DeliveryDashboard = React.lazy(() => import('./components/DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));
const ClientPriceScanner = React.lazy(() => import('./components/public-price-checker').then(m => ({ default: m.ClientPriceScanner })));
const KioskPriceTerminal = React.lazy(() => import('./components/public-price-checker').then(m => ({ default: m.KioskPriceTerminal })));

export default function App() {
  const [isCustomerDisplay, setIsCustomerDisplay] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash === '#customer-display' || window.location.pathname.startsWith('/customer-display');
  });

  useEffect(() => {
    const checkDisplay = () => {
      const isDisplay = window.location.hash === '#customer-display' || window.location.pathname.startsWith('/customer-display');
      setIsCustomerDisplay(isDisplay);
    };
    window.addEventListener('hashchange', checkDisplay);
    window.addEventListener('popstate', checkDisplay);
    return () => {
      window.removeEventListener('hashchange', checkDisplay);
      window.removeEventListener('popstate', checkDisplay);
    };
  }, []);

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
    let cachedOnline: string | null = null;
    try {
      cachedOnline = sessionStorage.getItem('nexus_active_online_session');
      if (!cachedOnline) {
        cachedOnline = localStorage.getItem('nexus_active_online_session');
        if (cachedOnline) {
          sessionStorage.setItem('nexus_active_online_session', cachedOnline);
          localStorage.removeItem('nexus_active_online_session');
        }
      }
    } catch (_) {
      cachedOnline = localStorage.getItem('nexus_active_online_session');
    }
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

  // 🛡️ NEXUS GUARD : Intercepteur global d'erreurs (Traque le bug ".active")
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message?.includes("reading 'active'")) {
        console.error('🚨 [NEXUS GUARD] CRASH .active INTERCEPTÉ ! 🚨');
        console.error('Ouvre ce lien pour voir le composant coupable 👉', event.error);
      }
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  // 🛡️ NETTOYAGE AUTOMATIQUE DU HASH OAUTH SUPABASE (#access_token=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('error_description'))) {
      // Nettoie l'URL proprement sans recharger la page
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const EMPTY_ARRAY = React.useRef<any[]>([]);

  const transactions = useTransactionStore(s => appMode === 'customer' ? s.transactions : EMPTY_ARRAY.current);
  const purchaseOrders = useTransactionStore(s => appMode === 'supplier' ? s.purchaseOrders : EMPTY_ARRAY.current);
  const onlineOrders = useTransactionStore(s => appMode === 'delivery' ? s.onlineOrders : EMPTY_ARRAY.current);

  const isPublicPriceMode = appMode === 'client_scan' || appMode === 'kiosk';
  const products = useCoreStore(s => (appMode === 'supplier' || isPublicPriceMode) ? s.products : EMPTY_ARRAY.current);
  const categories = useCoreStore(s => (appMode === 'supplier' || isPublicPriceMode) ? s.categories : EMPTY_ARRAY.current);
  const brands = useCoreStore(s => (appMode === 'supplier' || isPublicPriceMode) ? s.brands : EMPTY_ARRAY.current);
  const promotions = useCoreStore(s => isPublicPriceMode ? s.promotions : EMPTY_ARRAY.current);

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
        // Clear any previous interval to prevent duplication on remount
        if ((window as any).__swUpdateIntervalId) {
          clearInterval((window as any).__swUpdateIntervalId);
        }
        const intervalId = setInterval(() => r.update(), 60 * 60 * 1000);
        (window as any).__swUpdateIntervalId = intervalId;
      }
    },
    onRegisterError(error: any) {
      console.warn('SW registration error', error);
    },
  });

  // --- Navigation & Sécurité des Onglets ---
  const isCameraAgent = (profile?.role as string) === 'camera_agent';
  const getInitialTab = useCallback(() => {
    if (isCameraAgent) return 'camera';
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash.includes('=') || hash.includes('&') || hash === 'dashboard' || hash === 'ai_assistant') return 'checkout';
    if (!isTabAllowed(hash, canAccess, { isAdmin: profile?.role === 'admin', isOwner, isManager: profile?.role === 'manager', isCameraAgent })) {
      return 'checkout';
    }
    return hash;
  }, [profile, canAccess, isOwner, isCameraAgent]);

  const [activeTab, setActiveTabState] = useState(getInitialTab());
  const setActiveTab = useCallback((tab: string) => {
    const targetTab = (tab === 'dashboard' || tab === 'ai_assistant') ? 'checkout' : tab;
    // 🛡️ Vérification d'autorisation (Défense en profondeur)
    if (!isTabAllowed(targetTab, canAccess, { isAdmin: profile?.role === 'admin', isOwner, isManager: profile?.role === 'manager', isCameraAgent })) {
      toast.error(t("Accès refusé : vous n'avez pas l'autorisation pour ce module."));
      window.location.hash = 'checkout';
      setActiveTabState('checkout');
      return;
    }
    window.location.hash = targetTab;
    setActiveTabState(targetTab);
  }, [canAccess, profile, isOwner, isCameraAgent, t]);

  // Synchronisation dynamique avec la barre d'adresse pour support multi-fenêtres & multi-onglets
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && !hash.includes('=') && !hash.includes('&')) {
        const target = (hash === 'dashboard' || hash === 'ai_assistant') ? 'checkout' : hash;
        if (!isTabAllowed(target, canAccess, { isAdmin: profile?.role === 'admin', isOwner, isManager: profile?.role === 'manager', isCameraAgent })) {
          setActiveTab('checkout');
        } else {
          setActiveTabState(target);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab, canAccess, profile, isOwner, isCameraAgent]);

  // Si le profil utilisateur change (connexion d'un employé), forcer le retour à un onglet permis
  useEffect(() => {
    if (profile && !isTabAllowed(activeTab, canAccess, { isAdmin: profile.role === 'admin', isOwner, isManager: profile.role === 'manager', isCameraAgent })) {
      setActiveTab('checkout');
    }
  }, [profile, activeTab, canAccess, isOwner, isCameraAgent, setActiveTab]);

  // --- Panier (Sélecteurs d'action ciblés et stables : évite tout re-render de l'App) ---
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
  } = useAppHandlers(
    deferredPrompt,
    setDeferredPrompt,
    setEditingProduct,
    setIsStockAdjustmentModalOpen,
    setIsProductModalOpen,
  );

  // ─── Rendu conditionnel par mode ───────────────────────────────────────────
  if (isCustomerDisplay) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#05070a]"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
        <CustomerDisplayWindow />
      </Suspense>
    );
  }

  // ─── Option 1 : Scanner Client Smartphone via QR Code Magasin ──────────────
  if (appMode === 'client_scan') {
    if (loading) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">Chargement du catalogue...</p>
        </div>
      );
    }
    return (
      <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      }>
        <ClientPriceScanner
          products={products}
          settings={settings}
          categories={categories}
          brands={brands}
          promotions={promotions}
        />
      </Suspense>
    );
  }

  // ─── Option 3 : Borne Tablette Fixe en Rayon / Mode Kiosque 24/7 ────────────
  if (appMode === 'kiosk') {
    if (loading) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#07090e] text-slate-100 gap-4">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-cyan-400 font-semibold tracking-wider uppercase">Initialisation de la borne...</p>
        </div>
      );
    }
    return (
      <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#07090e] text-slate-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
        </div>
      }>
        <KioskPriceTerminal
          products={products}
          settings={settings}
          categories={categories}
          brands={brands}
          promotions={promotions}
          onExit={() => {
            window.location.search = '';
            window.location.hash = 'checkout';
            window.location.reload();
          }}
        />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"   />
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Initializing Systems...</p>
        </div>
      </div>
    );
  }

  if (isUnauthorized && !isOwner) {
    return <UnauthorizedView user={user} profile={profile} isOwner={isOwner} handleLogout={() => handleLogout(user)}   />;
  }

  const loadingFallback = (
    <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"   />
    </div>
  );

  if (!user && appMode === 'pos') {
    return (
      <Suspense fallback={loadingFallback}>
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
      </Suspense>
    );
  }

  if (!user) {
    if (appMode === 'customer') {
      return (
        <Suspense fallback={loadingFallback}>
          <CustomerLogin onLogin={setCurrentCustomer}   />
        </Suspense>
      );
    }
    if (appMode === 'supplier') {
      return (
        <Suspense fallback={loadingFallback}>
          <SupplierLogin onLogin={setCurrentSupplier}   />
        </Suspense>
      );
    }
    if (appMode === 'camera') {
      return (
        <Suspense fallback={loadingFallback}>
          <CameraLogin onLogin={setProfile}   />
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
        <DeliveryDashboard user={user} orders={onlineOrders} settings={settings}   />
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
      <Toaster position="top-right" richColors closeButton theme={theme === 'light' ? 'light' : 'dark'}   />
      <SyncIndicator isOnline={isOnline} syncInfo={syncInfo} bgSyncActive={bgSyncActive} bgPendingChanges={bgPendingChanges}   />

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
        canAccess={canAccess}
        isOwner={isOwner}
        isAdmin={profile?.role === 'admin'}
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
          isAdmin={profile?.role === 'admin'}
          isManager={profile?.role === 'manager'}
          isCameraAgent={profile?.role === 'camera_agent'}
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
        isStorePosterModalOpen={isStorePosterModalOpen} setIsStorePosterModalOpen={setIsStorePosterModalOpen}
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