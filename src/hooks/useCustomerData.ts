import { useMemo, useState } from 'react';
import { Customer } from '../types';

interface UseCustomerDataProps {
  customers: Customer[];
  searchQuery: string;
}

export function useCustomerData({ customers, searchQuery }: UseCustomerDataProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer; direction: 'asc' | 'desc' } | null>({
    key: 'name',
    direction: 'asc'
  });

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(c => {
      if (!c) return false;
      const searchLower = (searchQuery || '').toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(searchLower) ||
        (c.phone || '').toLowerCase().includes(searchLower) ||
        (c.email || '').toLowerCase().includes(searchLower) ||
        (c.loyaltyCardNumber || '').toLowerCase().includes(searchLower)
      );
    });
  }, [customers, searchQuery]);

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...filteredCustomers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || bValue === undefined) return 0;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCustomers, sortConfig]);

  const requestSort = (key: keyof Customer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    sortedCustomers,
    requestSort,
    sortConfig
  };
}
