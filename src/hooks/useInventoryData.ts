import { useMemo, useState, useCallback } from 'react';
import { Product, Category, Brand } from '../types';
import { safeDate } from '../lib/utils';

interface UseInventoryDataProps {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  selectedCategories: string[];
  stockLevelFilter: 'all' | 'low' | 'out' | 'in';
  brandFilter: string;
  dateRange: { start: string; end: string };
  statusFilter: 'all' | 'active' | 'inactive' | 'discontinued';
  selectedSupplier: string;
}

export function useInventoryData({
  products,
  categories,
  searchQuery,
  selectedCategories,
  stockLevelFilter,
  brandFilter,
  dateRange,
  statusFilter,
  selectedSupplier
}: UseInventoryDataProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'margin'; direction: 'asc' | 'desc' } | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
      const matchesSearch = searchTerms.every(term => 
        (p.name || '').toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term) ||
        p.supplier?.toLowerCase().includes(term)
      );

      let matchesCategory = true;
      if (selectedCategories.length > 0) {
        matchesCategory = selectedCategories.includes(p.categoryId || 'uncategorized');
      }
      
      const matchesBrand = brandFilter === 'all' || p.brandId === brandFilter;
      const matchesSupplier = selectedSupplier === 'all' || (p.supplier || 'Sans fournisseur') === selectedSupplier;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      const currentStock = Number(p.stock) || 0;
      const matchesStock = stockLevelFilter === 'all' 
        ? true 
        : stockLevelFilter === 'in'
          ? currentStock > 0
          : stockLevelFilter === 'out'
            ? currentStock <= 0
            : stockLevelFilter === 'low' 
              ? currentStock <= (p.minStock || 5) && currentStock > 0
              : currentStock > 0;

      const matchesDate = (!dateRange.start || safeDate(p.createdAt || p.updatedAt) >= safeDate(dateRange.start)) &&
                         (!dateRange.end || safeDate(p.createdAt || p.updatedAt) <= safeDate(dateRange.end));

      return matchesSearch && matchesCategory && matchesStock && matchesBrand && matchesDate && matchesStatus && matchesSupplier;
    });
  }, [products, searchQuery, selectedCategories, stockLevelFilter, brandFilter, dateRange, statusFilter, selectedSupplier]);

  const sortedProducts = useMemo(() => {
    let sortableItems = [...filteredProducts];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'margin') {
          aValue = a.price - (a.costPrice || 0);
          bValue = b.price - (b.costPrice || 0);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProducts, sortConfig]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedProducts.length / pageSize);

  const requestSort = useCallback((key: keyof Product | 'margin') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  return {
    sortedProducts,
    paginatedProducts,
    totalPages,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    requestSort,
    sortConfig,
    totalResults: filteredProducts.length
  };
}
