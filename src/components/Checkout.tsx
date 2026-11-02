import React, { useState, memo, useMemo } from 'react';
import { Product, Customer } from '../types';
import { cn } from '../lib/utils';
import { QuickSelectPanel } from './checkout/QuickSelectPanel';
import { useCheckoutLogic } from './checkout/useCheckoutLogic';
import { CheckoutPaymentWrapper } from './checkout/CheckoutPaymentWrapper';
import { CheckoutMobileActionBar } from './checkout/CheckoutMobileActionBar';
import { CheckoutSecondaryModals } from './checkout/CheckoutSecondaryModals';
import { CheckoutTerminalModals } from './checkout/CheckoutTerminalModals';
import { useCheckoutCustomerDisplay } from './checkout/useCheckoutCustomerDisplay';
import { useCheckoutStores } from './checkout/useCheckoutStores';
import { useCheckoutControlsDisplay } from './checkout/useCheckoutControlsDisplay';
import { useCheckoutControlsProps } from './checkout/useCheckoutControlsProps';
import { CheckoutCartColumn } from './checkout/CheckoutCartColumn';
import { CheckoutSessionBanner } from './checkout/CheckoutSessionBanner';

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
  const {
    user,
    products,
    settings,
    customers,
    activeShift,
    posSessions,
    activeSessionId,
    setActiveSessionId,
    cart,
    isWholesale,
    setIsWholesale,
    deliveryMethod,
    setDeliveryMethod,
    selectedCustomer,
    setSelectedCustomer,
    mergedProps
  } = useCheckoutStores(props);

  const logic = useCheckoutLogic(mergedProps as any);
  const discountingItem = useMemo(() => {
    if (!logic.discountingItemId) return null;
    return (cart || []).find((i) => i && (i.cartItemId === logic.discountingItemId || i.id === logic.discountingItemId)) || null;
  }, [logic.discountingItemId, cart]);

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
    showSuccess,
    setShowSuccess,
    voucherCode,
    setVoucherCode,
    appliedVoucher,
    setAppliedVoucher,
    customerSearch,
    setCustomerSearch,
    useLoyaltyPoints,
    setUseLoyaltyPoints,
    lastTransaction,
    isScannerOpen,
    setIsScannerOpen,
    isReturnMode,
    setIsReturnMode,
    selectedItemId,
    setSelectedItemId,
    isQuickAddModalOpen,
    setIsQuickAddModalOpen,
    isDeliveryModalOpen,
    setIsDeliveryModalOpen,
    newProductBarcode,
    initialCashInput,
    setInitialCashInput,
    isOpeningSession,
    receivedAmount,
    setReceivedAmount,
    keepExcessInBalance,
    setKeepExcessInBalance,
    quantityInputRefs,
    addNewSession,
    removeSession,
    handleDirectOpenShift,
    addToCart,
    removeFromCart,
    subtotal,
    handleCheckout,
    isProcessing,
    handleBarcodeScan,
    filteredProducts,
    setQuantity,
    setDiscountingItemId,
    setPrice,
    addCustomerNote,
    applyVoucher,
    discountAmount,
    pointsDiscount,
    voucherDiscount,
    total,
    editingTransaction,
    handleCancelEditTransaction
  } = logic;

  const displayTotal = total;
  const currency = settings?.currency || 'DA';

  const {
    setActiveTab,
    setIsPOSCustomerModalOpen,
    setIsProductModalOpen,
    setEditingProduct
  } = props;

  const [mobileTab, setMobileTab] = useState<'cart' | 'catalog'>('cart');
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [isCustomerDisplayModalOpen, setIsCustomerDisplayModalOpen] = useState(false);

  // 🟢 Diffusion en direct vers l'Afficheur Client (Realtime Broadcast + BroadcastChannel)
  useCheckoutCustomerDisplay({
    cart,
    displayTotal,
    discountAmount,
    subtotal,
    receivedAmount,
    selectedCustomer: props.selectedCustomer,
    showSuccess
  });

  const { showControlsPanel, setShowControlsPanel } = useCheckoutControlsDisplay();

  const controlsProps = useCheckoutControlsProps({
    selectedCustomer,
    setSelectedCustomer,
    customerSearch,
    setCustomerSearch,
    customers,
    isWholesale,
    setIsWholesale,
    useLoyaltyPoints,
    setUseLoyaltyPoints,
    settings,
    total,
    receivedAmount,
    setReceivedAmount,
    keepExcessInBalance,
    setKeepExcessInBalance,
    handleCheckout,
    addCustomerNote,
    setIsPOSCustomerModalOpen,
    deliveryMethod,
    setDeliveryMethod,
    voucherCode,
    setVoucherCode,
    appliedVoucher,
    setAppliedVoucher,
    applyVoucher,
    subtotal,
    discountAmount,
    pointsDiscount,
    voucherDiscount,
    currency: settings.currency,
    cart,
    isProcessing,
    setIsDeliveryModalOpen,
    globalDiscount: logic.globalDiscount,
    setGlobalDiscount: logic.setGlobalDiscount,
    editingTransaction
  });

  return (
    <div className="relative h-full flex flex-col w-full bg-slate-100 dark:bg-[#05070a] overflow-hidden pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <CheckoutSecondaryModals
        isCustomerDisplayModalOpen={isCustomerDisplayModalOpen}
        setIsCustomerDisplayModalOpen={setIsCustomerDisplayModalOpen}
        isQuickAddModalOpen={isQuickAddModalOpen}
        setIsQuickAddModalOpen={setIsQuickAddModalOpen}
        isDeliveryModalOpen={isDeliveryModalOpen}
        setIsDeliveryModalOpen={setIsDeliveryModalOpen}
        newProductBarcode={newProductBarcode}
        user={user}
        displayTotal={displayTotal}
        onQuickAddSuccess={(product) => addToCart(product, isReturnMode ? -1 : 1)}
      />

      <CheckoutSessionBanner
        activeShift={activeShift}
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
        total={total}
        currency={currency}
        cart={cart}
        displayTotal={displayTotal}
        discountAmount={discountAmount}
        initialCashInput={initialCashInput}
        setInitialCashInput={setInitialCashInput}
        isOpeningSession={isOpeningSession}
        handleDirectOpenShift={handleDirectOpenShift}
        settings={settings}
        role={role}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden relative">
        {/* Grille / Sélection rapide (Desktop Sidebar ou Mobile Tab) */}
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

        {/* Vue principale du panier */}
        <CheckoutCartColumn
          isMobile={isMobile}
          mobileTab={mobileTab}
          search={search}
          setSearch={setSearch}
          searchRef={searchRef as any}
          handleBarcodeScan={handleBarcodeScan}
          isScannerOpen={isScannerOpen}
          setIsScannerOpen={setIsScannerOpen}
          filteredProducts={filteredProducts}
          addToCart={addToCart}
          isReturnMode={isReturnMode}
          settings={settings}
          total={total}
          editingTransaction={editingTransaction}
          handleCancelEditTransaction={handleCancelEditTransaction}
          currency={currency}
          cart={cart}
          cartEndRef={cartEndRef as any}
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
          products={products}
          quantityInputRefs={quantityInputRefs}
        />

        {/* Panneau de paiement (volet tactile de paiement : pb-[max(env(safe-area-inset-bottom,0px),16px)]) */}
        <CheckoutPaymentWrapper
          isMobile={isMobile}
          isPaymentSheetOpen={isPaymentSheetOpen}
          setIsPaymentSheetOpen={setIsPaymentSheetOpen}
          showControlsPanel={showControlsPanel}
          setShowControlsPanel={setShowControlsPanel}
          controlsProps={controlsProps}
          total={total}
          currency={currency}
          cartLength={cart.length}
        />
      </div>

      {/* Barre d'action mobile : px-2.5 py-2 pb-[max(env(safe-area-inset-bottom,0px),10px)] flex items-center justify-between gap-2.5 */}
      <CheckoutMobileActionBar
        isMobile={isMobile}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        cartLength={cart.length}
        displayTotal={displayTotal}
        currency={currency}
        onOpenPaymentSheet={() => setIsPaymentSheetOpen(true)}
      />

      <CheckoutTerminalModals
        discountingItemId={logic.discountingItemId}
        setDiscountingItemId={logic.setDiscountingItemId}
        discountingItem={discountingItem}
        currency={currency}
        isWholesale={isWholesale}
        onApplyLineDiscount={logic.setLineDiscount}
        showSuccess={showSuccess}
        setShowSuccess={setShowSuccess}
        lastTransaction={lastTransaction}
        settings={settings}
        customers={customers}
      />
    </div>
  );
});
