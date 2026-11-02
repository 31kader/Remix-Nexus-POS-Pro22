import { useState, useMemo } from 'react';
import { Customer } from '../../types';
import { CustomerFilterStatus, CustomerSortOption } from './customersTypes';

export interface UseCustomersFilterAndSortProps {
  customers: Customer[];
}

export function useCustomersFilterAndSort({ customers }: UseCustomersFilterAndSortProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CustomerFilterStatus>('all');
  const [sortBy, setSortBy] = useState<CustomerSortOption>('name_asc');

  // Global KPIs summary
  const kpiStats = useMemo(() => {
    let totalDebt = 0;
    let totalCredits = 0;
    let totalSpentAll = 0;
    let totalPoints = 0;
    let debtorCount = 0;
    let creditCount = 0;
    let appUserCount = 0;

    (customers || []).forEach(c => {
      const bal = Number(c.balance) || 0;
      if (bal < 0) {
        totalDebt += Math.abs(bal);
        debtorCount++;
      } else if (bal > 0) {
        totalCredits += bal;
        creditCount++;
      }
      totalSpentAll += Number(c.totalSpent) || 0;
      totalPoints += c.loyaltyPoints || 0;
      if (c.isAppUser) appUserCount++;
    });

    return {
      totalCustomers: (customers || []).length,
      totalDebt,
      totalCredits,
      creditCount,
      totalSpentAll,
      totalPoints,
      debtorCount,
      appUserCount
    };
  }, [customers]);

  // Memoized Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    const searchLower = (search || '').toLowerCase().trim();

    let result = (customers || []).filter(c => {
      if (!c) return false;

      // Text search matching
      if (searchLower) {
        const matchName = (c.name || '').toLowerCase().includes(searchLower);
        const matchPhone = (c.phone || '').toLowerCase().includes(searchLower);
        const matchEmail = (c.email || '').toLowerCase().includes(searchLower);
        const matchCard = (c.loyaltyCardNumber || '').toLowerCase().includes(searchLower);
        const matchNotes = (c.notes || '').toLowerCase().includes(searchLower);
        const matchCity = (c.city || '').toLowerCase().includes(searchLower);
        if (!matchName && !matchPhone && !matchEmail && !matchCard && !matchNotes && !matchCity) {
          return false;
        }
      }

      // Quick filter badges
      const bal = Number(c.balance) || 0;
      if (filterStatus === 'debtors') return bal < 0;
      if (filterStatus === 'credits') return bal > 0;
      if (filterStatus === 'app_users') return !!c.isAppUser;
      if (filterStatus === 'vip') return (c.loyaltyPoints || 0) >= 100 || (Number(c.totalSpent) || 0) >= 20000;
      if (filterStatus === 'inactive') {
        if (!c.lastVisit) return true;
        const diffDays = (Date.now() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 60;
      }

      return true;
    });

    // Sorting
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'debt_desc':
          return (Number(a.balance) || 0) - (Number(b.balance) || 0);
        case 'spent_desc':
          return (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0);
        case 'points_desc':
          return (Number(b.loyaltyPoints) || 0) - (Number(a.loyaltyPoints) || 0);
        case 'recent_visit': {
          const tA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const tB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          return tB - tA;
        }
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });
  }, [customers, search, filterStatus, sortBy]);

  return {
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    kpiStats,
    filteredCustomers
  };
}
