import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  Trash2, 
  Tag, 
  TrendingDown,
  CalendarDays,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Info,
  Percent,
  History,
  FileDown,
  Edit2,
  RefreshCcw,
  Printer
} from 'lucide-react';
import { 
  format, 
  addDays, 
  isBefore, 
  isAfter, 
  startOfDay, 
  endOfDay, 
  parseISO, 
  isSameDay, 
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  subDays
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Product, Category } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { localDb } from '../services/LocalDatabase';

interface ExpiryManagerProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onAdjustStock: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export const parseSafeDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  try {
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : startOfDay(dateStr);
    }
    const cleaned = String(dateStr).trim();
    if (!cleaned) return null;

    // 1. Format ISO standard YYYY-MM-DD or ISO timestamp
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      const parsed = parseISO(cleaned);
      if (!isNaN(parsed.getTime())) return startOfDay(parsed);
    }

    // 2. Format Français DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return startOfDay(d);
    }

    // 3. Format YYYY/MM/DD
    const ymdMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return startOfDay(d);
    }

    // 4. Native Date fallback
    const nativeDate = new Date(cleaned);
    if (!isNaN(nativeDate.getTime())) {
      return startOfDay(nativeDate);
    }
  } catch (e) {
    console.warn("Date parsing failed:", dateStr, e);
  }
  return null;
};

export function useExpiryManagerLogic(props: ExpiryManagerProps) {
  const { products, categories, onUpdateProduct, onAdjustStock, onEditProduct } = props;
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

  const now = startOfDay(new Date());

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, filterStatus, pageSize]);

  // Logic for analyzing expiry
  const analyzedProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const flatList: any[] = [];

    safeProducts.forEach(p => {
      if (!p) return;
      if (p.useMultiExpiry && p.batches && p.batches.length > 0) {
        p.batches.forEach(batch => {
          flatList.push({
            ...p,
            id: `${p.id}-batch-${batch.id || Math.random()}`,
            originalId: p.id,
            isBatch: true,
            batchNumber: batch.batchNumber,
            expirationDate: batch.expirationDate || p.expirationDate,
            stock: batch.stock
          });
        });
      } else {
        flatList.push({
          ...p,
          originalId: p.id,
          isBatch: false,
          expirationDate: p.expirationDate || null
        });
      }
    });

    return flatList
      .map(p => {
        const parsed = parseSafeDate(p.expirationDate);
        if (!parsed) {
          return {
            ...p,
            hasExpiryDate: false,
            daysLeft: 99999,
            expiryStatus: 'no_date' as const,
            expiryDate: null
          };
        }
        const daysLeft = differenceInDays(parsed, now);
        
        let expiryStatus: 'expired' | 'critical' | 'warning' | 'safe' = 'safe';
        if (daysLeft < 0) expiryStatus = 'expired';
        else if (daysLeft <= 7) expiryStatus = 'critical';
        else if (daysLeft <= 30) expiryStatus = 'warning';

        return { ...p, hasExpiryDate: true, daysLeft, expiryStatus, expiryDate: parsed };
      })
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                             (p.sku && String(p.sku).toLowerCase().includes(search.toLowerCase())) ||
                             (p.barcode && String(p.barcode).toLowerCase().includes(search.toLowerCase())) ||
                             (p.batchNumber || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
        
        let matchesStatus = true;
        if (filterStatus === 'expired') matchesStatus = p.expiryStatus === 'expired';
        else if (filterStatus === 'critical') matchesStatus = p.expiryStatus === 'critical';
        else if (filterStatus === 'warning') matchesStatus = p.expiryStatus === 'warning';
        else if (filterStatus === 'safe') matchesStatus = p.expiryStatus === 'safe';
        else if (filterStatus === 'with_date') matchesStatus = p.hasExpiryDate;
        else if (filterStatus === 'without_date') matchesStatus = !p.hasExpiryDate;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        // Expired and critical first, then products with dates, then products without date
        if (a.hasExpiryDate && !b.hasExpiryDate) return -1;
        if (!a.hasExpiryDate && b.hasExpiryDate) return 1;
        return a.daysLeft - b.daysLeft;
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
    const expiredCount = analyzedProducts.filter(p => p.expiryStatus === 'expired').length;
    const criticalCount = analyzedProducts.filter(p => p.expiryStatus === 'critical').length;
    const withoutDateCount = analyzedProducts.filter(p => !p.hasExpiryDate).length;
    const valueAtRisk = analyzedProducts
      .filter(p => p.expiryStatus === 'expired' || p.expiryStatus === 'critical' || p.expiryStatus === 'warning')
      .reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.stock || 0)), 0);
    
    const costAtRisk = analyzedProducts
      .filter(p => p.expiryStatus === 'expired' || p.expiryStatus === 'critical' || p.expiryStatus === 'warning')
      .reduce((sum, p) => sum + (Number(p.costPrice || 0) * Number(p.stock || 0)), 0);
    
    return { expiredCount, criticalCount, withoutDateCount, valueAtRisk, costAtRisk };
  }, [analyzedProducts]);

  // Calendar Logic (Aligned with Monday-first)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const startDayOfWeek = monthStart.getDay(); // 0 is Sunday, 1 is Monday...
    const padDaysBefore = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const calendarStartDate = subDays(monthStart, padDaysBefore);
    return eachDayOfInterval({ start: calendarStartDate, end: addDays(calendarStartDate, 41) });
  }, [currentMonth]);

  const handleApplyPromo = async (product: any, percent: number) => {
    const oldPrice = product.price;
    const targetId = product.originalId || product.id;
    try {
      const discount = percent / 100;
      const newPrice = Math.round(Number(product.price) * (1 - discount));
      
      const updates: any = { price: newPrice };
      if (!product.originalPrice) {
        updates.originalPrice = oldPrice;
      }
      
      await onUpdateProduct(targetId, updates);
      localDb.update(`products/${targetId}`, updates);
      toast.success(`Promo -${percent}% appliquée sur ${product.name}`, {
        action: {
          label: "Annuler",
          onClick: () => {
            onUpdateProduct(targetId, { price: oldPrice, originalPrice: undefined });
            localDb.update(`products/${targetId}`, { price: oldPrice, originalPrice: null });
          }
        }
      });
    } catch (err) {
      toast.error("Erreur lors de l'application de la promo");
    }
  };

  const handleRestorePrice = async (product: any) => {
    const targetId = product.originalId || product.id;
    try {
      if (product.originalPrice) {
        await onUpdateProduct(targetId, { price: product.originalPrice, originalPrice: undefined });
        localDb.update(`products/${targetId}`, { price: product.originalPrice, originalPrice: null });
        toast.success(`Prix normal restauré pour ${product.name}`);
      } else {
        const restoredPrice = Math.round(product.price / 0.8);
        await onUpdateProduct(targetId, { price: restoredPrice });
        localDb.update(`products/${targetId}`, { price: restoredPrice });
        toast.success(`Prix restauré pour ${product.name}`);
      }
    } catch (err) {
      toast.error("Erreur lors de la restauration du prix");
    }
  };

  const handleSaveQuickDate = async (product: any, newDate: string, batchNumber?: string) => {
    const targetId = product.originalId || product.id;
    try {
      const updates: any = { expirationDate: newDate };
      if (batchNumber) updates.batchNumber = batchNumber;
      await onUpdateProduct(targetId, updates);
      localDb.update(`products/${targetId}`, updates);
      toast.success(`Date de péremption mise à jour pour ${product.name}`);
      setQuickDateProduct(null);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour de la date");
    }
  };

  const handleBatchDiscount = async (status: 'expired' | 'critical') => {
    const targets = analyzedProducts.filter(p => p.expiryStatus === status);
    if (targets.length === 0) {
      toast.info("Aucun produit trouvé pour cette catégorie.");
      return;
    }

    const confirmMsg = `Voulez-vous appliquer une réduction de 20% sur les ${targets.length} produits ${status === 'expired' ? 'expirés' : 'critiques'} ?`;
    if (!window.confirm(confirmMsg)) return;

    let successCount = 0;
    for (const p of targets) {
      try {
        const targetId = p.originalId || p.id;
        const newPrice = Math.round(Number(p.price) * 0.8);
        await onUpdateProduct(targetId, { price: newPrice, originalPrice: p.originalPrice || p.price });
        localDb.update(`products/${targetId}`, { price: newPrice, originalPrice: p.originalPrice || p.price });
        successCount++;
      } catch (_) {}
    }

    toast.success(`Réduction appliquée sur ${successCount} produits !`);
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU/Code-barre',
      'Produit',
      'Date de peremption',
      'No de Lot / Batch',
      'Jours restants',
      'Statut',
      'Stock',
      'Unite',
      'Prix de Vente (DA)',
      'Prix d Purchase (DA)',
      'Valeur de Vente a risque (DA)',
      'Cout d Purchase a risque (DA)'
    ];

    const rows = analyzedProducts.map(p => [
      p.sku || '',
      p.name,
      p.expirationDate && p.expiryDate ? format(p.expiryDate, 'yyyy-MM-dd') : 'Non définie',
      p.batchNumber || '',
      p.hasExpiryDate ? p.daysLeft : 'N/A',
      p.expiryStatus === 'expired' ? 'Expire' : p.expiryStatus === 'critical' ? 'Critique' : p.expiryStatus === 'warning' ? 'A surveiller' : p.hasExpiryDate ? 'Normal' : 'Sans Date',
      p.stock,
      p.unit || '',
      p.price,
      p.costPrice || 0,
      p.stock * p.price,
      p.stock * (p.costPrice || 0)
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Peremptions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Rapport CSV exporté avec succès !");
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
