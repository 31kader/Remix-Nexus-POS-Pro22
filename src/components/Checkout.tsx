
import { supabase } from '../supabase';
import { convertKeysToSnake, convertKeysToCamel, enqueueStockAdjustment, localDb } from '../database';
import { toast } from 'sonner';
import { DEFAULT_PERMISSIONS } from '../constants';
import { QuickAddProductModal } from './QuickAddProductModal';
import { DeliveryRequestModal } from './DeliveryRequestModal';
import { CustomerProfile } from './CustomerProfile';
import React, { useState, useMemo, memo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight, LogOut, Bell, TrendingUp, History, EyeOff, LogIn, Store, Gift, Wallet, Edit2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader, SafeImage } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions, Promotion, Voucher, PurchaseOrder, POSSession, CashShift } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked, formatProductStock, calculateItemPrice, playScanSound, announcePrice, sanitizeProductForSupabase, mapDoc } from '../lib/utils';
import { printReceipt, printPurchaseOrder } from '../services/printService';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

import { CartItemRow } from './checkout/CartItemRow';
import { SessionTabs } from './checkout/SessionTabs';
import { CustomerSelection } from './checkout/CustomerSelection';
import { PaymentOrderSummary } from './checkout/PaymentOrderSummary';
import { SearchOverlay } from './checkout/SearchOverlay';
import { SessionInitialCard } from './checkout/SessionInitialCard';
import { PriceCheckerModal } from './checkout/PriceCheckerModal';
import { ItemDiscountModal } from './checkout/ItemDiscountModal';
import { BarcodeScanner } from './BarcodeScanner';
import { Categories } from './Categories';
import { Brands } from './Brands';
import { QuickSelect } from './QuickSelect';
import { CheckoutSuccessModal } from './checkout/CheckoutSuccessModal';
import { useCheckoutProcess } from '../hooks/useCheckoutProcess';
import { useCheckoutCalculations } from '../hooks/useCheckoutCalculations';
import { useCheckoutLogic } from './checkout/useCheckoutLogic';
import { QuickSelectPanel } from './checkout/QuickSelectPanel';
import { CheckoutHeader } from './checkout/CheckoutHeader';
import { CheckoutControlsPanel } from './checkout/CheckoutControlsPanel';
import { CartItemsList } from './checkout/CartItemsList';

import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useCartStore } from '../store/useCartStore';

interface CheckoutProps {
  setActiveTab: (tab: string) => void;
  setIsPOSCustomerModalOpen: (open: boolean) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  setIsProductModalOpen: (open: boolean) => void;
  setEditingProduct: (product: Product | null) => void;
  activeStaffId: string;
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

  const mergedProps = {
    ...props,
    user, profile, products, categories, settings, promotions,
    customers, employees, transactions, activeShift, setActiveShift,
    cart, setCart, posSessions, setPosSessions, activeSessionId, setActiveSessionId,
    isWholesale, setIsWholesale, deliveryMethod, setDeliveryMethod,
    selectedCustomer, setSelectedCustomer
  };

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
    total
  } = logic;

  // Use values from logic
  const displayTotal = total;

  const {
    setActiveTab,
    setIsPOSCustomerModalOpen,
    setIsProductModalOpen, setEditingProduct,
    activeStaffId
  } = props;


  const [mobileTab, setMobileTab] = useState<'cart' | 'catalog'>('cart');
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);

  return (
    <div className="relative h-full flex flex-col w-full bg-[#05070a] overflow-hidden">
      <QuickAddProductModal 
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        barcode={newProductBarcode}
        user={user}
        onSuccess={(product) => addToCart(product, isReturnMode ? -1 : 1)}
      />
      <DeliveryRequestModal 
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        cartTotal={displayTotal}
      />
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
          "flex-1 flex flex-col bg-white/[0.02] border-r border-white/5 relative z-0",
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

        {/* Payment Panel: Sidebar on Desktop, Bottom Sheet on Mobile */}
        {isMobile ? (
          <AnimatePresence>
            {isPaymentSheetOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPaymentSheetOpen(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-[101] bg-[#0a0c10] border-t border-white/10 rounded-t-[3rem] shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
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
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : (
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
          />
        )}
      </div>

      {/* Mobile Navigation Bar */}
      {isMobile && (
        <div className="bg-black/60 backdrop-blur-2xl border-t border-white/5 p-4 flex items-center justify-between gap-4 z-[90]">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setMobileTab('cart')}
              className={cn(
                "p-3 rounded-xl transition-all",
                mobileTab === 'cart' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-slate-500"
              )}
            >
              <ShoppingCart size={20} />
            </button>
            <button
              onClick={() => setMobileTab('catalog')}
              className={cn(
                "p-3 rounded-xl transition-all",
                mobileTab === 'catalog' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-slate-500"
              )}
            >
              <LayoutGrid size={20} />
            </button>
          </div>

          <div className="flex-1">
             <button
               disabled={cart.length === 0}
               onClick={() => setIsPaymentSheetOpen(true)}
               className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-900 disabled:text-slate-700 text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center gap-3 italic"
             >
               {displayTotal.toFixed(2)} {settings.currency} <ArrowRight size={18} />
             </button>
          </div>
        </div>
      )}


      {/* Success Notification */}
      <CheckoutSuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        lastTransaction={lastTransaction}
        settings={settings}
        customers={customers}
        printReceipt={printReceipt}
      />
    </div>
  );
});

