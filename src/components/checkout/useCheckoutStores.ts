import { useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useCartStore } from '../../store/useCartStore';

export function useCheckoutStores(props: any) {
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

  return {
    user,
    profile,
    products,
    categories,
    settings,
    promotions,
    customers,
    employees,
    transactions,
    activeShift,
    setActiveShift,
    posSessions,
    setPosSessions,
    activeSessionId,
    setActiveSessionId,
    cart,
    setCart,
    isWholesale,
    setIsWholesale,
    deliveryMethod,
    setDeliveryMethod,
    selectedCustomer,
    setSelectedCustomer,
    mergedProps
  };
}
