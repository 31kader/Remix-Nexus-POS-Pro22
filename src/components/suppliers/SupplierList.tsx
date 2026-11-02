import React, { useState, useMemo, useEffect } from 'react';
import { Supplier } from '../../types';
import { SupplierFilterBar, SupplierSortBy, SupplierQuickFilter, SupplierViewMode } from './list/SupplierFilterBar';
import { SupplierTableView } from './list/SupplierTableView';
import { SupplierCardItem } from './list/SupplierCardItem';
import { SupplierPaginationBar } from './list/SupplierPaginationBar';

const SUPPLIERS_PAGE_SIZE = 50;

interface SupplierListProps {
  suppliers: Supplier[];
  isSyncing: string | null;
  handleSync: (supplier: Supplier) => Promise<void> | void;
  setViewingDetailsSupplier: (supplier: Supplier | null) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (val: boolean) => void;
  setSupplierToDelete: (supplier: Supplier | null) => void;
  setIsDeleteConfirmOpen: (val: boolean) => void;
  setEditingSupplier: (supplier: Supplier | null) => void;
  setIsModalOpen: (val: boolean) => void;
  onQuickPaySupplier?: (supplier: Supplier) => void;
  currency?: string;
}

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function SupplierList({
  suppliers,
  isSyncing,
  handleSync,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen,
  setSupplierToDelete,
  setIsDeleteConfirmOpen,
  setEditingSupplier,
  setIsModalOpen,
  onQuickPaySupplier,
  currency = 'DA'
}: SupplierListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<SupplierQuickFilter>('all');
  const [sortBy, setSortBy] = useState<SupplierSortBy>('name');
  const [viewMode, setViewMode] = useState<SupplierViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, quickFilter, sortBy]);

  const todayName = FRENCH_DAYS[new Date().getDay()];

  const getRating = (s: Supplier) => ((s.ratingQuality ?? 5) + (s.ratingDelivery ?? 5) + (s.ratingPrice ?? 5)) / 3;

  const counts = useMemo(() => {
    let debt = 0;
    let settled = 0;
    let today = 0;
    let topRated = 0;
    (suppliers || []).forEach(s => {
      const bal = Number(s?.balance) || 0;
      if (bal > 0) debt++;
      else settled++;
      if (s?.preSaleDays?.includes(todayName) || s?.deliveryDays?.includes(todayName) || s?.paymentDays?.includes(todayName)) {
        today++;
      }
      if (getRating(s) >= 4) topRated++;
    });
    return { all: (suppliers || []).length, debt, settled, today, topRated };
  }, [suppliers, todayName]);

  const filteredSuppliers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = (suppliers || []).filter(s => {
      if (!s) return false;
      const matchesSearch = !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.contactName || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const bal = Number(s.balance) || 0;
      if (quickFilter === 'debt') return bal > 0;
      if (quickFilter === 'settled') return bal <= 0;
      if (quickFilter === 'today') {
        return Boolean(
          s.preSaleDays?.includes(todayName) ||
          s.deliveryDays?.includes(todayName) ||
          s.paymentDays?.includes(todayName)
        );
      }
      if (quickFilter === 'top_rated') return getRating(s) >= 4;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'debt_desc') return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      if (sortBy === 'rating_desc') return getRating(b) - getRating(a);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [suppliers, searchTerm, quickFilter, sortBy, todayName]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / SUPPLIERS_PAGE_SIZE));
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * SUPPLIERS_PAGE_SIZE;
    return filteredSuppliers.slice(start, start + SUPPLIERS_PAGE_SIZE);
  }, [filteredSuppliers, currentPage]);

  const handleViewPurchases = (supplier: Supplier) => {
    setViewingDetailsSupplier(supplier);
    setActiveDetailsTab('purchases');
    setIsDetailsModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-4 text-left">
      {/* Barre de Recherche, Filtres Rapides et Options d'Affichage */}
      <SupplierFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        counts={counts}
        currency={currency}
      />

      {/* VUE TABLEAU COMPACT */}
      {viewMode === 'table' ? (
        <SupplierTableView
          suppliers={paginatedSuppliers}
          currency={currency}
          onQuickPaySupplier={onQuickPaySupplier}
          onViewPurchases={handleViewPurchases}
          onEditSupplier={handleEditSupplier}
        />
      ) : (
        /* VUE GRILLE DE CARTES PRO */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {paginatedSuppliers.map((supplier: Supplier) => (
            <SupplierCardItem
              key={supplier.id}
              supplier={supplier}
              isSyncing={isSyncing === supplier.id}
              currency={currency}
              avgRating={getRating(supplier)}
              handleSync={handleSync}
              onQuickPaySupplier={onQuickPaySupplier}
              onViewPurchases={handleViewPurchases}
              onEditSupplier={handleEditSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <SupplierPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSuppliers.length}
        pageSize={SUPPLIERS_PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
