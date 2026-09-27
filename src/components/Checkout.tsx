import React, { useState, memo, useEffect, useMemo, Suspense } from 'react';
import { CreditCard, ShoppingCart, LayoutGrid, ArrowRight, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Product, Customer } from '../types';
import { cn, formatPrice } from '../lib/utils';
import { printReceipt } from '../services/printService';

import { SessionTabs } from './checkout/SessionTabs';
import { SessionInitialCard } from './checkout/SessionInitialCard';
import { BarcodeScanner } from './BarcodeScanner';
import { QuickSelectPanel } from './checkout/QuickSelectPanel';
import { CheckoutHeader } from './checkout/CheckoutHeader';
import { CheckoutControlsPanel } from './checkout/CheckoutControlsPanel';
import { CartItemsList } from './checkout/CartItemsList';
import { useCheckoutLogic } from './checkout/useCheckoutLogic';
import { broadcastCustomerDisplay } from '../services/customerDisplayService';

// 🚀 Modals lourds chargés à la demande (Lazy Loading + Code Splitting)
const QuickAddProductModal = React.lazy(() => import('./QuickAddProductModal').then(m => ({ default: m.QuickAddProductModal })));
const DeliveryRequestModal = React.lazy(() => import('./DeliveryRequestModal').then(m => ({ default: m.DeliveryRequestModal })));
const CheckoutSuccessModal = React.lazy(() => import('./checkout/CheckoutSuccessModal').then(m => ({ default: m.CheckoutSuccessModal })));
const CustomerDisplayModal = React.lazy(() => import('./checkout/CustomerDisplayModal').then(m => ({ default: m.CustomerDisplayModal })));

import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useCartStore } from '../store/useCartStore';

interface CheckoutProps {
  setActiveTab: (tab: string) => void;
  setIsPOSCustomerModalOpen: (open: boolean) => void;
  selectedCustomer?: Customer | null;
  setSelectedCustomer?: React.Dispatch<React.SetStateAction<Customer | null>> | ((customer: Customer | null | ((prev: Customer | null) => Customer | null)) => void);
  setIsProductModalOpen: (open: boolean) => void;
  setEditingProduct: (product: Product | null) => void;
  activeStaffId: string;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

export const Checkout = memo(function Checkout(props: CheckoutProps) {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  const settings = useCoreStore(s => s.settings);
  const promotions = useCoreStore(s => s.promotions);
  const customers = usePeopleStore(s => s.customers);
  const employees = usePeopleStore(s => s.employees);
  const transactions = useTransactionStore(s => s.transactions);
  const activeShift = useTransactionStore(s => s.activeShift);
  const setActiveShift = useTransactionStore(s => s.setActiveShift);
  const posSessions = useCartStore(s => s.posSessions);
  const setPosSessions = useCartStore(s => s.setPosSessions);
  const activeSessionId = useCartStore(s => s.activeSessionId);
  const setActiveSessionId = useCartStore(s => s.setActiveSessionId);
  const setCart = useCartStore(s => s.setCart);
  const isWholesale = useCartStore(s => s.isWholesale);
  const setIsWholesale = useCartStore(s => s.setIsWholesale);
  const deliveryMethod = useCartStore(s => s.deliveryMethod);
  const setDeliveryMethod = useCartStore(s => s.setDeliveryMethod);
  const setSelectedCustomer = useCartStore(s => s.setSelectedCustomer);

  const activeSession = posSessions.find(s => s.id === activeSessionId) || posSessions[0];
  const cart = activeSession?.cart || [];
  const selectedCustomer = activeSession?.selectedCustomer || null;

  const mergedProps = useMemo(() => ({
    ...props,
    user, profile, products, categories, settings, promotions,
    customers, employees, transactions, activeShift, setActiveShift,
    cart, setCart, posSessions, setPosSessions, activeSessionId, setActiveSessionId,
    isWholesale, setIsWholesale, deliveryMethod, setDeliveryMethod,
    selectedCustomer, setSelectedCustomer
  }), [
    props,
    user, profile, products, categories, settings, promotions,
    customers, employees, transactions, activeShift, setActiveShift,
    cart, setCart, posSessions, setPosSessions, activeSessionId, setActiveSessionId,
    isWholesale, setIsWholesale, deliveryMethod, setDeliveryMethod,
    selectedCustomer, setSelectedCustomer
  ]);

  const logic = useCheckoutLogic(mergedProps as any);

  const {
    role,
    permissions,
    isMobile,
    search,
    setSearch,
    showQuickSelect,
    setShowQuickSelect,
    searchRef,
    cartEndRef,
    deferredSearch,
    showSuccess,
    setShowSuccess,
    promoCode,
    setPromoCode,
    voucherCode,
    setVoucherCode,
    activePromotion,
    setActivePromotion,
    appliedVoucher,
    setAppliedVoucher,
    customerSearch,
    setCustomerSearch,
    useLoyaltyPoints,
    setUseLoyaltyPoints,
    useBalance,
    setUseBalance,
    lastTransaction,
    setLastTransaction,
    isScannerOpen,
    setIsScannerOpen,
    isReturnMode,
    setIsReturnMode,
    isPriceCheckerOpen,
    setIsPriceCheckerOpen,
    priceCheckResult,
    setPriceCheckResult,
    hasRestored,
    setHasRestored,
    selectedItemId,
    setSelectedItemId,
    isQuickAddModalOpen,
    setIsQuickAddModalOpen,
    isDeliveryModalOpen,
    setIsDeliveryModalOpen,
    newProductBarcode,
    setNewProductBarcode,
    initialCashInput,
    setInitialCashInput,
    isOpeningSession,
    setIsOpeningSession,
    receivedAmount,
    setReceivedAmount,
    keepExcessInBalance,
    setKeepExcessInBalance,
    quantityInputRefs,
    scannerBuffer,
    addNewSession,
    removeSession,
    handleDirectOpenShift,
    addToCart,
    removeFromCart,
    subtotal,
    handleCheckout,
    isProcessing,
    isCheckoutProcessing,
    customerHistory,
    handleBarcodeScan,
    filteredProducts,
    setQuantity,
    setDiscountingItemId,
    setPrice,
    discountingItemId,
    setLineDiscountType,
    lineDiscountType,
    lineDiscountValue,
    setLineDiscountValue,
    setLineDiscount,
    addCustomerNote,
    applyVoucher,
    discountAmount,
    pointsDiscount,
    voucherDiscount,
    total,
    editingTransaction,
    handleCancelEditTransaction
  } = logic;

  // Use values from logic
  const displayTotal = total;

  // F10 est réservé uniquement à la barre de saisie Code-Barres Direct (CheckoutHeader)

  const {
    setActiveTab,
    setIsPOSCustomerModalOpen,
    setIsProductModalOpen, setEditingProduct,
    activeStaffId
  } = props;


  const [mobileTab, setMobileTab] = useState<'cart' | 'catalog'>('cart');
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [isCustomerDisplayModalOpen, setIsCustomerDisplayModalOpen] = useState(false);

  // 🟢 Diffusion en direct vers l'Afficheur Client (Realtime Broadcast + BroadcastChannel)
  useEffect(() => {
    const numReceived = parseFloat(receivedAmount) || 0;
    const changeDue = numReceived > displayTotal ? numReceived - displayTotal : 0;
    broadcastCustomerDisplay({
      items: (cart || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        price: i.overriddenPrice ?? i.price ?? 0,
        quantity: i.quantity || 1,
        barcode: i.barcode || i.sku || ''
      })),
      subtotal: subtotal || 0,
      discountAmount: discountAmount || 0,
      total: displayTotal || 0,
      amountPaid: numReceived,
      changeDue: changeDue,
      customerName: props.selectedCustomer?.name,
      isPaid: showSuccess
    });
  }, [cart, displayTotal, discountAmount, subtotal, receivedAmount, props.selectedCustomer, showSuccess]);

  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_pos_show_controls_panel');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus_pos_show_controls_panel', JSON.stringify(showControlsPanel));
    } catch {}
  }, [showControlsPanel]);

  // When left sidebar opens (isSidebarOpen = true), automatically close right panel to avoid squishing
  useEffect(() => {
    if (props.isSidebarOpen) {
      setShowControlsPanel(false);
    }
  }, [props.isSidebarOpen]);

  return (
    <div className="relative h-full flex flex-col w-full bg-slate-100 dark:bg-[#05070a] overflow-hidden">
      {isCustomerDisplayModalOpen && (
        <Suspense fallback={null}>
          <CustomerDisplayModal 
            isOpen={isCustomerDisplayModalOpen}
            onClose={() => setIsCustomerDisplayModalOpen(false)}
          />
        </Suspense>
      )}
      {isQuickAddModalOpen && (
        <Suspense fallback={null}>
          <QuickAddProductModal 
            isOpen={isQuickAddModalOpen}
            onClose={() => setIsQuickAddModalOpen(false)}
            barcode={newProductBarcode}
            user={user}
            onSuccess={(product) => addToCart(product, isReturnMode ? -1 : 1)}
          />
        </Suspense>
      )}
      {isDeliveryModalOpen && (
        <Suspense fallback={null}>
          <DeliveryRequestModal 
            isOpen={isDeliveryModalOpen}
            onClose={() => setIsDeliveryModalOpen(false)}
            cartTotal={displayTotal}
          />
        </Suspense>
      )}
       {/* Session Tabs - More compact on mobile */}
      {activeShift && (
        <SessionTabs 
          posSessions={posSessions}
          activeSessionId={activeSessionId}
          setActiveSessionId={setActiveSessionId}
          addNewSession={addNewSession}
          removeSession={removeSession}
          isReturnMode={isReturnMode}
          setIsReturnMode={setIsReturnMode}
          showQuickSelect={showQuickSelect}
          setShowQuickSelect={setShowQuickSelect}
          showControlsPanel={showControlsPanel}
          setShowControlsPanel={setShowControlsPanel}
          onOpenCustomerDisplay={() => setIsCustomerDisplayModalOpen(true)}
        />
      )}

      {!activeShift && (
        <SessionInitialCard
          initialCashInput={initialCashInput}
          setInitialCashInput={setInitialCashInput}
          isOpeningSession={isOpeningSession}
          handleDirectOpenShift={handleDirectOpenShift}
          settings={settings}
          role={role}
          setActiveTab={setActiveTab}
        />
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden relative">
        {/* Desktop Sidebar / Mobile Tab: Catalog */}
        <div className={cn(
          "lg:block flex-1 lg:flex-none",
          isMobile && mobileTab !== 'catalog' && "hidden"
        )}>
          <QuickSelectPanel
            isMobile={isMobile}
            activeShift={activeShift}
            showQuickSelect={showQuickSelect}
            setShowQuickSelect={setShowQuickSelect}
            isReturnMode={isReturnMode}
            addToCart={addToCart}
            currency={settings.currency}
          />
        </div>

        {/* Main Cart View */}
        <div className={cn(
          "flex-1 flex flex-col bg-slate-100 dark:bg-[#07090e] border-r border-slate-200 dark:border-white/5 relative z-0",
          isMobile && mobileTab !== 'cart' && "hidden"
        )}>
          <CheckoutHeader
            search={search}
            setSearch={setSearch}
            searchRef={searchRef}
            handleBarcodeScan={handleBarcodeScan}
            setIsScannerOpen={setIsScannerOpen}
            filteredProducts={filteredProducts}
            addToCart={addToCart}
            isReturnMode={isReturnMode}
            settings={settings}
            total={total}
          />

          <AnimatePresence>
            {isScannerOpen && (
              <div className="fixed inset-0 z-[200]">
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onClose={() => setIsScannerOpen(false)}
                />
              </div>
            )}
          </AnimatePresence>

          {editingTransaction && (
            <div className="mx-3 mt-2.5 p-3 bg-amber-500/15 dark:bg-amber-950/40 border-2 border-amber-500/40 dark:border-amber-500/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[11px] uppercase tracking-wider bg-amber-500/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                      Mode Modification Vente
                    </span>
                    <span className="font-mono font-bold text-xs">
                      #{String(editingTransaction.id || '').slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Ticket original du {editingTransaction.timestamp ? new Date(editingTransaction.timestamp).toLocaleString('fr-FR') : ''} • Total initial : <span className="font-bold">{Number(editingTransaction.originalTotal || editingTransaction.total || 0).toFixed(2)} {settings?.currency || 'DA'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEditTransaction}
                className="px-3 py-1.5 text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Annuler l'édition de cette vente et réinitialiser le panier"
              >
                <X size={14} />
                Annuler la modification
              </button>
            </div>
          )}

          <CartItemsList 
            cart={cart}
            cartEndRef={cartEndRef}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
            removeFromCart={removeFromCart}
            setQuantity={setQuantity}
            setEditingProduct={setEditingProduct}
            setIsProductModalOpen={setIsProductModalOpen}
            setDiscountingItemId={setDiscountingItemId}
            setPrice={setPrice}
            isWholesale={isWholesale}
            permissions={permissions}
            settings={settings}
            products={products}
            quantityInputRefs={quantityInputRefs}
          />
        </div>

        {/* Payment Panel: Sidebar on Desktop (collapsible), Bottom Sheet on Mobile */}
        {isMobile ? (
          <AnimatePresence>
            {isPaymentSheetOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPaymentSheetOpen(false)}
                  className="fixed inset-0 bg-black/80 z-[100]"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-[101] bg-zinc-950 border-t border-zinc-800 rounded-t-[3rem] shadow-md max-h-[90vh] overflow-y-auto no-scrollbar"
                >
                  <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4" />
                  <CheckoutControlsPanel
                    selectedCustomer={selectedCustomer}
                    setSelectedCustomer={setSelectedCustomer}
                    customerSearch={customerSearch}
                    setCustomerSearch={setCustomerSearch}
                    customers={customers}
                    isWholesale={isWholesale}
                    setIsWholesale={setIsWholesale}
                    useLoyaltyPoints={useLoyaltyPoints}
                    setUseLoyaltyPoints={setUseLoyaltyPoints}
                    settings={settings}
                    total={total}
                    receivedAmount={receivedAmount}
                    setReceivedAmount={setReceivedAmount}
                    keepExcessInBalance={keepExcessInBalance}
                    setKeepExcessInBalance={setKeepExcessInBalance}
                    handleCheckout={handleCheckout}
                    addCustomerNote={addCustomerNote}
                    setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
                    deliveryMethod={deliveryMethod}
                    setDeliveryMethod={setDeliveryMethod}
                    voucherCode={voucherCode}
                    setVoucherCode={setVoucherCode}
                    appliedVoucher={appliedVoucher}
                    setAppliedVoucher={setAppliedVoucher}
                    applyVoucher={applyVoucher}
                    subtotal={subtotal}
                    discountAmount={discountAmount}
                    pointsDiscount={pointsDiscount}
                    voucherDiscount={voucherDiscount}
                    currency={settings.currency}
                    cart={cart}
                    isProcessing={isProcessing}
                    setIsDeliveryModalOpen={setIsDeliveryModalOpen}
                    globalDiscount={logic.globalDiscount}
                    setGlobalDiscount={logic.setGlobalDiscount}
                    editingTransaction={editingTransaction}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : showControlsPanel ? (
          <CheckoutControlsPanel
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            customers={customers}
            isWholesale={isWholesale}
            setIsWholesale={setIsWholesale}
            useLoyaltyPoints={useLoyaltyPoints}
            setUseLoyaltyPoints={setUseLoyaltyPoints}
            settings={settings}
            total={total}
            receivedAmount={receivedAmount}
            setReceivedAmount={setReceivedAmount}
            keepExcessInBalance={keepExcessInBalance}
            setKeepExcessInBalance={setKeepExcessInBalance}
            handleCheckout={handleCheckout}
            addCustomerNote={addCustomerNote}
            setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
            deliveryMethod={deliveryMethod}
            setDeliveryMethod={setDeliveryMethod}
            voucherCode={voucherCode}
            setVoucherCode={setVoucherCode}
            appliedVoucher={appliedVoucher}
            setAppliedVoucher={setAppliedVoucher}
            applyVoucher={applyVoucher}
            subtotal={subtotal}
            discountAmount={discountAmount}
            pointsDiscount={pointsDiscount}
            voucherDiscount={voucherDiscount}
            currency={settings.currency}
            cart={cart}
            isProcessing={isProcessing}
            setIsDeliveryModalOpen={setIsDeliveryModalOpen}
            globalDiscount={logic.globalDiscount}
            setGlobalDiscount={logic.setGlobalDiscount}
            editingTransaction={editingTransaction}
            onClose={() => setShowControlsPanel(false)}
          />
        ) : (
          <button
            onClick={() => setShowControlsPanel(true)}
            className="hidden lg:flex flex-col items-center justify-between py-6 px-3 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer select-none group w-12 shrink-0 shadow-sm"
            title="Ouvrir le panneau de paiement (Caisse)"
          >
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <CreditCard size={18} />
            </div>
            <span className="[writing-mode:vertical-lr] text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              Caisse • {formatPrice(total, 0)} {settings.currency}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {cart.length} art.
            </span>
          </button>
        )}
      </div>

      {/* Mobile Action Bar (Panier / Catalogue + Encaisser) */}
      {isMobile && (
        <div className="shrink-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 px-2.5 py-2 flex items-center justify-between gap-2.5 z-[50]">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                mobileTab === 'cart' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400"
              )}
            >
              <ShoppingCart size={16} />
              <span>Panier ({cart.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                mobileTab === 'catalog' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400"
              )}
            >
              <LayoutGrid size={16} />
              <span>Grille</span>
            </button>
          </div>

          <div className="flex-1">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsPaymentSheetOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-normal shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Payer {formatPrice(displayTotal, 2)} {settings.currency}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}


      {/* Success Notification */}
      {showSuccess && (
        <Suspense fallback={null}>
          <CheckoutSuccessModal
            isOpen={showSuccess}
            onClose={() => {
              setShowSuccess(false);
            }}
            lastTransaction={lastTransaction}
            settings={settings}
            customers={customers}
            printReceipt={(tx, st) => {
              printReceipt(tx, st);
            }}
          />
        </Suspense>
      )}
    </div>
  );
});

