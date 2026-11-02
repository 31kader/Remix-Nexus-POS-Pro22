import { useState, useMemo, useEffect } from 'react';
import { 
  addDays, 
  startOfDay, 
  startOfMonth, 
  eachDayOfInterval, 
  subDays 
} from 'date-fns';
import { Product, Category } from '../types';
import { 
  parseSafeDate, 
  analyzeExpiryProducts, 
  calculateExpiryStats 
} from './expiry/expiryProductAnalyzer';
import { useExpiryPriceActions } from './expiry/useExpiryPriceActions';
import { exportExpiryCsv } from './expiry/exportExpiryCsv';

export { parseSafeDate };

interface ExpiryManagerProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onAdjustStock: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export function useExpiryManagerLogic(props: ExpiryManagerProps) {
  const { products, onUpdateProduct } = props;
  const [view, setView] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with_date' | 'without_date' | 'expired' | 'critical' | 'warning' | 'safe'>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 📄 Pagination (10 par page par défaut)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 🔍 Image Lightbox Preview
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; sku?: string } | null>(null);

  // 📅 Quick Date Setting Modal
  const [quickDateProduct, setQuickDateProduct] = useState<any | null>(null);

  const now = useMemo(() => startOfDay(new Date()), []);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, filterStatus, pageSize]);

  // Logic for analyzing expiry
  const analyzedProducts = useMemo(() => {
    return analyzeExpiryProducts({
      products,
      search,
      selectedCategory,
      filterStatus,
      now
    });
  }, [products, search, selectedCategory, filterStatus, now]);

  // 📄 Pagination Calculation
  const totalCount = analyzedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return analyzedProducts.slice(startIndex, startIndex + pageSize);
  }, [analyzedProducts, safeCurrentPage, pageSize]);

  const stats = useMemo(() => {
    return calculateExpiryStats(analyzedProducts);
  }, [analyzedProducts]);

  // Calendar Logic (Aligned with Monday-first)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const startDayOfWeek = monthStart.getDay(); // 0 is Sunday, 1 is Monday...
    const padDaysBefore = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const calendarStartDate = subDays(monthStart, padDaysBefore);
    return eachDayOfInterval({ start: calendarStartDate, end: addDays(calendarStartDate, 41) });
  }, [currentMonth]);

  // Sub-hook for price and discount actions
  const {
    handleApplyPromo,
    handleRestorePrice,
    handleSaveQuickDate,
    handleBatchDiscount
  } = useExpiryPriceActions({
    products,
    analyzedProducts,
    onUpdateProduct,
    setQuickDateProduct
  });

  const handleExportCSV = () => {
    exportExpiryCsv(analyzedProducts);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return {
    view,
    setView,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    filterStatus,
    setFilterStatus,
    currentMonth,
    setCurrentMonth,
    calendarDays,
    stats,
    handleExportCSV,
    handlePrintPDF,
    handleBatchDiscount,
    analyzedProducts,
    paginatedProducts,
    currentPage: safeCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalCount,
    handleApplyPromo,
    handleRestorePrice,
    handleSaveQuickDate,
    previewImage,
    setPreviewImage,
    quickDateProduct,
    setQuickDateProduct,
    now
  };
}
