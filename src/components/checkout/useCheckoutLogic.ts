import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { Product, Category, CompanySettings, Employee, Customer, CartItem, Transaction, Promotion, POSSession, CashShift } from '../../types';
import { calculateItemPrice, announcePrice } from '../../lib/utils';
import { printReceipt } from '../../services/printService';
import { DEFAULT_PERMISSIONS } from '../../constants';
import { useCheckoutProcess } from '../../hooks/useCheckoutProcess';
import { useCheckoutCalculations } from '../../hooks/useCheckoutCalculations';
import { toast } from 'sonner';

// Imported custom sub-hooks to delegate logic
import { useCheckoutDrafts } from './useCheckoutDrafts';
import { useCheckoutBarcode } from './useCheckoutBarcode';
import { useCheckoutShortcuts } from './useCheckoutShortcuts';
import { useCheckoutSessionAndPromo } from './useCheckoutSessionAndPromo';
import { useCheckoutDiscounts } from './useCheckoutDiscounts';
import { useCheckoutProductsSearch } from './useCheckoutProductsSearch';
import { useCheckoutCartOperations } from './useCheckoutCartOperations';

interface CheckoutProps {
  products: Product[];
  categories?: Category[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  user: any;
  profile: any;
  promotions: Promotion[];
  customers: Customer[];
  settings: CompanySettings;
  activeShift: CashShift | null;
  setActiveShift: React.Dispatch<React.SetStateAction<CashShift | null>>;
  setActiveTab: (tab: string) => void;
  transactions: Transaction[];
  setIsPOSCustomerModalOpen: (open: boolean) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  posSessions: POSSession[];
  setPosSessions: React.Dispatch<React.SetStateAction<POSSession[]>>;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  setIsProductModalOpen: (open: boolean) => void;
  setEditingProduct: (product: Product | null) => void;
  isWholesale: boolean;
  setIsWholesale: React.Dispatch<React.SetStateAction<boolean>>;
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  setDeliveryMethod: React.Dispatch<React.SetStateAction<'in_store' | 'delivery' | 'pickup'>>;
  activeStaffId: string;
  employees: Employee[];
}

export function useCheckoutLogic(props: CheckoutProps) {
  const {
    products, cart, setCart, user, profile, promotions, settings, 
    setActiveShift, transactions, selectedCustomer, setSelectedCustomer,
    posSessions, setPosSessions, activeSessionId, setActiveSessionId,
    isWholesale, deliveryMethod,
    activeStaffId, employees
  } = props;

  const role = profile?.role || 'cashier';
  const roleKey = role as keyof typeof DEFAULT_PERMISSIONS;
  const permissions = settings.rolePermissions?.[roleKey] || DEFAULT_PERMISSIONS[roleKey];
  
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [search, setSearch] = useState('');

  // 💾 Persistance de l'état d'affichage des favoris dans le localStorage
  const [showQuickSelect, setShowQuickSelect] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_pos_show_quick_select');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus_pos_show_quick_select', JSON.stringify(showQuickSelect));
      if (showQuickSelect) {
        window.dispatchEvent(new CustomEvent('nexus-collapse-sidebar'));
      }
    } catch (e) {
      console.error('[Checkout] Erreur d\'écriture localStorage pour showQuickSelect:', e);
    }
  }, [showQuickSelect]);

  const searchRef = useRef<HTMLInputElement>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cartEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cart]);

  const deferredSearch = useDeferredValue(search);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [useBalance, setUseBalance] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [keepExcessInBalance, setKeepExcessInBalance] = useState<boolean>(false);

  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sub-hook for Sessions, Shift and Promo management
  const {
    promoCode, setPromoCode, voucherCode, setVoucherCode,
    activePromotion, setActivePromotion, appliedVoucher, setAppliedVoucher,
    initialCashInput, setInitialCashInput, isOpeningSession, setIsOpeningSession,
    addNewSession, removeSession, handleDirectOpenShift, applyVoucher, applyPromoCode,
    addCustomerNote,
  } = useCheckoutSessionAndPromo({
    posSessions, setPosSessions, activeSessionId, setActiveSessionId, profile, user,
    setActiveShift, promotions, selectedCustomer, setSelectedCustomer, settings,
  });

  // Détection du mode modification de vente sur la session active
  const activeSession = (posSessions || []).find(s => s && s.id === activeSessionId) || posSessions?.[0];
  const editingTransaction = activeSession?.editingTransaction || null;

  // Sub-hook for line & global discounts management
  const {
    globalDiscount, setGlobalDiscount,
    discountingItemId, setDiscountingItemId,
    lineDiscountType, setLineDiscountType,
    lineDiscountValue, setLineDiscountValue,
    setLineDiscount,
  } = useCheckoutDiscounts({
    cart, setCart, editingTransaction, activeSessionId, showSuccess
  });

  // Reset session-specific local states when switching active session
  useEffect(() => {
    setUseLoyaltyPoints(false);
    setUseBalance(false);
    setIsReturnMode(false);
    setReceivedAmount('');
    setKeepExcessInBalance(false);
  }, [activeSessionId]);

  // Reset payment calculations when customer changes
  useEffect(() => {
    setReceivedAmount('');
    setKeepExcessInBalance(false);
  }, [selectedCustomer]);

  useEffect(() => {
    const safeCart = Array.isArray(cart) ? cart : [];
    if (selectedItemId && !safeCart.find(item => item && (item.id === selectedItemId || item.cartItemId === selectedItemId))) {
      setSelectedItemId(null);
    }
  }, [cart, selectedItemId]);

  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return (transactions || [])
      .filter((t: Transaction) => t && t.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
  }, [selectedCustomer, transactions]);

  // Operations de panier (ajout, modification, suppression, annulation modif)
  const {
    addToCart,
    setQuantity,
    setPrice,
    removeFromCart,
    handleCancelEditTransaction
  } = useCheckoutCartOperations({
    products,
    setCart,
    settings,
    setSelectedItemId,
    isReturnMode,
    activeSessionId,
    setPosSessions
  });

  // Sub-hook for auto-saving and restoring draft carts
  const { hasRestored, setHasRestored } = useCheckoutDrafts({
    user, posSessions, setPosSessions, activeSessionId, setActiveSessionId, setCart, cart,
  });

  // Sub-hook for scanner bar code detection
  const {
    isScannerOpen, setIsScannerOpen, isPriceCheckerOpen, setIsPriceCheckerOpen,
    priceCheckResult, setPriceCheckResult, handleBarcodeScan, scannerBuffer
  } = useCheckoutBarcode({
    products, addToCart, isReturnMode,
  });

  // Voice guidance
  useEffect(() => {
    const safeCart = Array.isArray(cart) ? cart : [];
    if (safeCart.length > 0 && settings.enableVoiceGuidance) {
      const lastItem = safeCart[safeCart.length - 1];
      if (lastItem) {
        announcePrice(lastItem.name, calculateItemPrice(lastItem, isWholesale), settings.currency);
      }
    }
  }, [cart, isWholesale, settings.enableVoiceGuidance, settings.currency]);

  // ⚡ Sub-hook Worker de recherche hors thread principal : 0 saccade sur 11 700 articles
  const { filteredProducts } = useCheckoutProductsSearch({ products, deferredSearch });

  // Main calculations sub-hook integration
  const {
    subtotal, discountAmount, pointsDiscount, voucherDiscount, total, promotionToApply
  } = useCheckoutCalculations({ 
    isWholesale, cart, promotions, activePromotion, selectedCustomer, useLoyaltyPoints,
    appliedVoucher, settings, globalDiscount
  });

  // Main payment processor sub-hook integration
  const { 
    handleCheckout, isProcessing: isCheckoutProcessing 
  } = useCheckoutProcess({ 
    useLoyaltyPoints, appliedVoucher, selectedCustomer, total, discountAmount,
    pointsDiscount, voucherDiscount, isWholesale, cart, setCart, user, profile,
    activeStaffId, employees, settings, deliveryMethod, products,
    receivedAmount, keepExcessInBalance, promotionToApply: promotionToApply || null, activeSessionId,
    setPosSessions, setLastTransaction, setShowSuccess, printReceipt,
    editingTransaction
  });

  const isProcessing = isCheckoutProcessing;

  // Shortcuts keys handler Sub-hook integration
  useCheckoutShortcuts({
    cart, 
    selectedItemId,
    searchRef, 
    setSelectedItemId, 
    quantityInputRefs, 
    handleCheckout, 
    setCart, 
    addNewSession,
    onReprintLastTicket: () => {
      const txToPrint = lastTransaction || (transactions && transactions.length > 0 ? transactions[0] : null);
      if (txToPrint) {
        toast.info(`Réimpression du ticket #${txToPrint.id?.slice(0, 8) || ''}...`);
        printReceipt(txToPrint, settings);
      } else {
        toast.error("Aucune transaction récente à réimprimer.");
      }
    }
  });

  return {
    setShowSuccess, activePromotion, appliedVoucher, useLoyaltyPoints, setLastTransaction,
    isReturnMode, isPriceCheckerOpen, receivedAmount, keepExcessInBalance, total,
    discountAmount, pointsDiscount, voucherDiscount, isMobile, setIsMobile, search, setSearch,
    showQuickSelect, setShowQuickSelect, showSuccess, promoCode, setPromoCode, voucherCode, setVoucherCode,
    setActivePromotion, setAppliedVoucher, customerSearch, setCustomerSearch, setUseLoyaltyPoints,
    useBalance, setUseBalance, lastTransaction, isScannerOpen, setIsScannerOpen, setIsReturnMode,
    setIsPriceCheckerOpen, priceCheckResult, setPriceCheckResult, hasRestored, setHasRestored,
    selectedItemId, setSelectedItemId, isQuickAddModalOpen, setIsQuickAddModalOpen, isDeliveryModalOpen,
    setIsDeliveryModalOpen, newProductBarcode, setNewProductBarcode, initialCashInput, setInitialCashInput,
    isOpeningSession, setIsOpeningSession, setReceivedAmount, setKeepExcessInBalance, discountingItemId,
    setDiscountingItemId, lineDiscountType, setLineDiscountType, lineDiscountValue, setLineDiscountValue,
    searchRef, cartEndRef, quantityInputRefs, scannerBuffer, role, permissions, deferredSearch,
    customerHistory, subtotal, isProcessing, addNewSession, removeSession, handleDirectOpenShift,
    addToCart, removeFromCart, handleCheckout, isCheckoutProcessing, handleBarcodeScan,
    filteredProducts, setQuantity, setPrice, setLineDiscount, addCustomerNote, globalDiscount, setGlobalDiscount,
    editingTransaction, handleCancelEditTransaction,
    applyVoucher: () => applyVoucher(subtotal)
  };
}
