import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { Product, Category, CompanySettings, Employee, Customer, CartItem, Transaction, Promotion, POSSession, CashShift } from '../../types';
import { calculateItemPrice, playScanSound, announcePrice, generateUniqueId } from '../../lib/utils';
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
    products, cart, setCart, user, profile, promotions, customers, settings, 
    activeShift, setActiveShift, transactions, selectedCustomer, setSelectedCustomer,
    posSessions, setPosSessions, activeSessionId, setActiveSessionId,
    setIsProductModalOpen, setEditingProduct, isWholesale, deliveryMethod,
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
  const [showQuickSelect, setShowQuickSelect] = useState(true);
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

  // Reset session-specific local states when switching active session
  useEffect(() => {
    setUseLoyaltyPoints(false);
    setUseBalance(false);
    setIsReturnMode(false);
    setReceivedAmount('');
    setKeepExcessInBalance(false);
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [activeSessionId]);

  // Reset payment calculations when customer changes
  useEffect(() => {
    setReceivedAmount('');
    setKeepExcessInBalance(false);
  }, [selectedCustomer]);

  // Auto-focus search on active shift or mount
  useEffect(() => {
    if (activeShift) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [activeShift]);

  useEffect(() => {
    // 🛡️ SÉCURISÉ : Remplacement de cart.find par un fallback tableau vide
    const safeCart = Array.isArray(cart) ? cart : [];
    if (selectedItemId && !safeCart.find(item => item && item.id === selectedItemId)) {
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

  // 🛡️ MODIFIÉ & SÉCURISÉ : Plus aucun risque de findIndex sur undefined au clic/scan produit
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    if (!product) return;
    if (!settings.allowNegativeStock && (product.stock || 0) <= 0 && quantity > 0) {
      toast.error(`Rupture de stock pour ${product.name}. Stock actuel: ${product.stock}`);
      return;
    }
    const newCartItemId = generateUniqueId();
    setSelectedItemId(product.id);
    
    setCart((prev) => {
      // Barrière absolue : si prev est undefined ou corrompu, on injecte un tableau vide
      const safePrev = Array.isArray(prev) ? prev : [];

      if (quantity === 0) return safePrev;
      const existingIdx = safePrev.findIndex(item => item && item.id === product.id);
      
      if (existingIdx !== -1 && !isReturnMode) {
        const updated = [...safePrev];
        const existing = updated[existingIdx];
        const newQty = (existing?.quantity || 0) + quantity;
        
        if (!settings.allowNegativeStock && newQty > (product.stock || 0) && quantity > 0) {
           toast.error(`Stock insuffisant pour ${product.name}. Stock: ${product.stock}`);
           return safePrev;
        }
        updated.splice(existingIdx, 1);
        toast.success(`${product.name} mis à jour (+${quantity})`);
        return [...updated, { ...existing, quantity: newQty }];
      }
      
      const initQty = settings.allowNegativeStock ? quantity : (quantity > 0 ? Math.min(quantity, Math.max(0, product.stock)) : quantity);
      if (initQty <= 0 && quantity > 0 && !settings.allowNegativeStock) {
        toast.error(`Stock épuisé pour ${product.name}`);
        return safePrev;
      }
      toast.success(`${product.name} ajouté au panier`);
      return [...safePrev, { ...product, quantity: initQty, cartItemId: newCartItemId }];
    });
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [settings.allowNegativeStock, setCart, isReturnMode]);

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

  // Pre-compile search strings for products once to avoid repetitive lowercasing and array joins
  const searchableProducts = useMemo(() => {
    return (products || [])
      .filter(p => p && p.status === 'active')
      .map(p => ({
        product: p,
        searchStr: `${p.name || ''} ${p.sku || ''} ${p.barcode || ''} ${p.description || ''} ${(p.tags || []).join(' ')}`.toLowerCase()
      }));
  }, [products]);

  // Filter products by search key with optimized index lookup and early exit
  const filteredProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    if (!deferredSearch) {
      return safeProducts.filter(p => p && p.status === 'active').slice(0, 100);
    }
    const lower = deferredSearch.toLowerCase();
    const matches: Product[] = [];
    for (let i = 0; i < searchableProducts.length; i++) {
      if (searchableProducts[i].searchStr.includes(lower)) {
        matches.push(searchableProducts[i].product);
        if (matches.length >= 80) break;
      }
    }
    return matches;
  }, [deferredSearch, products, searchableProducts]);

  // 🛡️ SÉCURISÉ : Protection de setQuantity
  const setQuantity = useCallback((cartItemId: string, quantity: number) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => {
        if (item && item.cartItemId === cartItemId) {
          const safeProducts = Array.isArray(products) ? products : [];
          const prod = safeProducts.find(p => p && p.id === item.id);
          const resolved = isNaN(quantity) ? 1 : quantity;
          return { 
            ...item,
            quantity: settings.allowNegativeStock ? resolved : (resolved > 0 ? Math.min(resolved, Math.max(resolved, prod?.stock || 0)) : resolved) 
          };
        }
        return item;
      });
    });
  }, [settings.allowNegativeStock, setCart, products]);

  // 🛡️ SÉCURISÉ : Protection de setPrice
  const setPrice = useCallback((cartItemId: string, price: number) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => {
        if (item && item.cartItemId === cartItemId) return { ...item, overriddenPrice: price };
        return item;
      });
    });
  }, [setCart]);

  // 🛡️ SÉCURISÉ : Protection de removeFromCart
  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.filter(item => item && item.cartItemId !== cartItemId);
    });
    searchRef.current?.focus();
  }, [setCart]);

  const [discountingItemId, setDiscountingItemId] = useState<string | null>(null);
  const [lineDiscountType, setLineDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [lineDiscountValue, setLineDiscountValue] = useState<string>('0');

  useEffect(() => {
    if (discountingItemId) {
      const safeCart = Array.isArray(cart) ? cart : [];
      const item = safeCart.find(i => i && i.cartItemId === discountingItemId);
      if (item?.lineDiscount) {
        setLineDiscountType(item.lineDiscount.type);
        setLineDiscountValue(item.lineDiscount.value.toString());
      } else {
        setLineDiscountType('percentage');
        setLineDiscountValue('0');
      }
    }
  }, [discountingItemId, cart]);

  // 🛡️ SÉCURISÉ : Protection de setLineDiscount
  const setLineDiscount = useCallback((cartItemId: string, discount: { type: 'percentage' | 'fixed', value: number } | null) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => {
        if (item && item.cartItemId === cartItemId) return { ...item, lineDiscount: discount || undefined };
        return item;
      });
    });
  }, [setCart]);

  // Main calculations sub-hook integration
  const {
    subtotal, discountAmount, pointsDiscount, voucherDiscount, total, promotionToApply
  } = useCheckoutCalculations({ 
    isWholesale, cart, promotions, activePromotion, selectedCustomer, useLoyaltyPoints,
    appliedVoucher, settings
  });

  // Main payment processor sub-hook integration
  const { 
    handleCheckout, isProcessing: isCheckoutProcessing 
  } = useCheckoutProcess({ 
    useLoyaltyPoints, appliedVoucher, selectedCustomer, total, discountAmount,
    pointsDiscount, voucherDiscount, isWholesale, cart, setCart, user, profile,
    activeStaffId, employees, settings, deliveryMethod, products,
    receivedAmount, keepExcessInBalance, promotionToApply: promotionToApply || null, activeSessionId,
    setPosSessions, setLastTransaction, setShowSuccess, printReceipt
  });

  const isProcessing = isCheckoutProcessing;

  // Shortcuts keys handler Sub-hook integration
  useCheckoutShortcuts({
    cart, searchRef, setSelectedItemId, quantityInputRefs, handleCheckout, setCart,
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
    filteredProducts, setQuantity, setPrice, setLineDiscount, addCustomerNote,
    applyVoucher: () => applyVoucher(subtotal)
  };
}