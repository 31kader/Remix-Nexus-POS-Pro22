import React, { Suspense } from 'react';
import type { Customer, Supplier, Transaction } from '../../types';
import { UnauthorizedView } from '../UnauthorizedView';

const CustomerDisplayWindow = React.lazy(() => import('../CustomerDisplayWindow').then(m => ({ default: m.CustomerDisplayWindow })));
const LoginView = React.lazy(() => import('../LoginView').then(m => ({ default: m.LoginView })));
const SupplierLogin = React.lazy(() => import('../SupplierLogin').then(m => ({ default: m.SupplierLogin })));
const CustomerLogin = React.lazy(() => import('../CustomerLogin').then(m => ({ default: m.CustomerLogin })));
const CameraLogin = React.lazy(() => import('../CameraLogin').then(m => ({ default: m.CameraLogin })));
const SupplierDashboard = React.lazy(() => import('../SupplierDashboard').then(m => ({ default: m.SupplierDashboard })));
const CustomerDashboard = React.lazy(() => import('../CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const DeliveryDashboard = React.lazy(() => import('../DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));
const ClientPriceScanner = React.lazy(() => import('../public-price-checker').then(m => ({ default: m.ClientPriceScanner })));
const KioskPriceTerminal = React.lazy(() => import('../public-price-checker').then(m => ({ default: m.KioskPriceTerminal })));
const MobileCartonReception = React.lazy(() => import('../mobile/MobileCartonReception').then(m => ({ default: m.MobileCartonReception })));

interface AppAlternativeModesProps {
  isCustomerDisplay: boolean;
  appMode: string;
  setAppMode: (mode: any) => void;
  loading: boolean;
  user: any;
  profile: any;
  isOwner: boolean;
  isUnauthorized: boolean;
  handleLogout: (user: any) => void;
  // Login
  loginIdentifier: string;
  setLoginIdentifier: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoggingIn: boolean;
  authError: any;
  setAuthError: (val: any) => void;
  handleIdentifierLogin: any;
  handleLogin: any;
  language: string;
  setLanguage: (lang: string) => void;
  isLangMenuOpen: boolean;
  setIsLangMenuOpen: (val: boolean) => void;
  t: (key: string) => string;
  // Customer & Supplier & Delivery
  currentCustomer: Customer | null;
  setCurrentCustomer: (c: Customer | null) => void;
  currentSupplier: Supplier | null;
  setCurrentSupplier: (s: Supplier | null) => void;
  transactions: Transaction[];
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
  setIsProductModalOpen: (val: boolean) => void;
  setEditingProduct: (p: any) => void;
  editingProduct: any;
  isProductModalOpen: boolean;
  setViewingPurchaseVoucher: (v: any) => void;
  setUser: (u: any) => void;
  setProfile: (p: any) => void;
}

export function AppAlternativeModes({
  isCustomerDisplay,
  appMode,
  setAppMode,
  loading,
  user,
  profile,
  isOwner,
  isUnauthorized,
  handleLogout,
  loginIdentifier,
  setLoginIdentifier,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  isLoggingIn,
  authError,
  setAuthError,
  handleIdentifierLogin,
  handleLogin,
  language,
  setLanguage,
  isLangMenuOpen,
  setIsLangMenuOpen,
  t,
  currentCustomer,
  setCurrentCustomer,
  currentSupplier,
  setCurrentSupplier,
  transactions,
  purchaseOrders,
  onlineOrders,
  purchases,
  supplierPayments,
  products,
  categories,
  brands,
  promotions,
  settings,
  setActiveTab,
  handleCreatePurchaseOrder,
  setIsProductModalOpen,
  setEditingProduct,
  editingProduct,
  isProductModalOpen,
  setViewingPurchaseVoucher,
  setUser,
  setProfile
}: AppAlternativeModesProps): React.ReactElement | null {
  const loadingFallback = (
    <div className="h-screen w-full flex items-center justify-center bg-[#05070a]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
    </div>
  );

  // 1. Double écran client
  if (isCustomerDisplay) {
    return (
      <Suspense fallback={loadingFallback}>
        <CustomerDisplayWindow />
      </Suspense>
    );
  }

  // 2. Scanner Client Smartphone
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
      <Suspense fallback={loadingFallback}>
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

  // 3. Borne Kiosque en rayon
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
      <Suspense fallback={loadingFallback}>
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

  // 4. Initialisation globale
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

  // 5. Non autorisé
  if (isUnauthorized && !isOwner) {
    return <UnauthorizedView user={user} profile={profile} isOwner={isOwner} handleLogout={() => handleLogout(user)} />;
  }

  // 6. Login standard POS
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

  // 7. Espace Client
  if (appMode === 'customer') {
    if (!currentCustomer) {
      return (
        <Suspense fallback={loadingFallback}>
          <CustomerLogin onLogin={setCurrentCustomer} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={loadingFallback}>
        <CustomerDashboard
          customer={currentCustomer}
          transactions={transactions}
          settings={settings}
          onLogout={() => { setCurrentCustomer(null); handleLogout(user); }}
        />
      </Suspense>
    );
  }

  // 8. Espace Fournisseur
  if (appMode === 'supplier') {
    if (!currentSupplier) {
      return (
        <Suspense fallback={loadingFallback}>
          <SupplierLogin onLogin={setCurrentSupplier} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={loadingFallback}>
        <SupplierDashboard
          supplier={currentSupplier}
          onLogout={() => { setCurrentSupplier(null); handleLogout(user); }}
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

  // 9. Login Caméra
  if (!user && appMode === 'camera') {
    return (
      <Suspense fallback={loadingFallback}>
        <CameraLogin onLogin={(empProfile) => {
          setProfile(empProfile);
          setUser({
            uid: empProfile.uid,
            email: empProfile.email,
            displayName: empProfile.displayName,
            role: empProfile.role,
            employeeId: empProfile.employeeId,
            isOffline: true
          } as any);
        }} />
      </Suspense>
    );
  }

  // 10. Dashboard Livreur
  if (user && appMode === 'delivery') {
    return (
      <Suspense fallback={loadingFallback}>
        <DeliveryDashboard user={user} orders={onlineOrders} settings={settings} />
      </Suspense>
    );
  }

  // 11. Réception cartons mobile
  if (appMode === 'carton_reception') {
    return (
      <Suspense fallback={loadingFallback}>
        <MobileCartonReception
          products={products}
          onBackToPos={() => {
            window.location.hash = '';
            setAppMode('pos');
          }}
          currentUserId={user?.uid}
          currentUserName={user?.displayName || profile?.displayName || 'Agent Dépôt'}
          isStandalone={true}
        />
      </Suspense>
    );
  }

  // Aucun mode alternatif actif -> Rendre le POS principal
  return null;
}
