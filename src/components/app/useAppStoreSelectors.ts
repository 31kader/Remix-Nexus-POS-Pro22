import { useRef } from 'react';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useCoreStore } from '../../store/useCoreStore';
import { useFinanceStore } from '../../store/useFinanceStore';

export function useAppStoreSelectors(appMode: string) {
  const EMPTY_ARRAY = useRef<any[]>([]);

  const transactions = useTransactionStore(s => appMode === 'customer' ? s.transactions : EMPTY_ARRAY.current);
  const purchaseOrders = useTransactionStore(s => appMode === 'supplier' ? s.purchaseOrders : EMPTY_ARRAY.current);
  const onlineOrders = useTransactionStore(s => appMode === 'delivery' ? s.onlineOrders : EMPTY_ARRAY.current);

  const isPublicPriceMode = appMode === 'client_scan' || appMode === 'kiosk' || appMode === 'carton_reception';
  const products = useCoreStore(s => (appMode === 'supplier' || isPublicPriceMode) ? s.products : EMPTY_ARRAY.current);
  const categories = useCoreStore(s => (appMode === 'supplier' || isPublicPriceMode) ? s.categories : EMPTY_ARRAY.current);
  const brands = useCoreStore(s => (appMode === 'supplier' || isPublicPriceMode) ? s.brands : EMPTY_ARRAY.current);
  const promotions = useCoreStore(s => isPublicPriceMode ? s.promotions : EMPTY_ARRAY.current);

  const purchases = useFinanceStore(s => appMode === 'supplier' ? s.purchases : EMPTY_ARRAY.current);
  const supplierPayments = useFinanceStore(s => appMode === 'supplier' ? s.supplierPayments : EMPTY_ARRAY.current);

  return {
    transactions,
    purchaseOrders,
    onlineOrders,
    products,
    categories,
    brands,
    promotions,
    purchases,
    supplierPayments,
  };
}
