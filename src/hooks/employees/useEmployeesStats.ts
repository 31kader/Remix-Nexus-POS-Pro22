import { useState, useMemo } from 'react';
import { Employee, Transaction } from '../../types';

interface UseEmployeesStatsParams {
  employees: Employee[];
  transactions: Transaction[];
}

export function useEmployeesStats({ employees, transactions }: UseEmployeesStatsParams) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const employeePerformance = useMemo(() => {
    const perfMap: Record<string, { totalSales: number, transactionCount: number }> = {};
    
    employees.forEach(emp => {
      perfMap[emp.id] = { totalSales: 0, transactionCount: 0 };
    });

    transactions.forEach(t => {
      if (t.employeeId && perfMap[t.employeeId]) {
        perfMap[t.employeeId].totalSales += t.total;
        perfMap[t.employeeId].transactionCount += 1;
      }
    });

    return perfMap;
  }, [employees, transactions]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedEmployeesPerformance = useMemo(() => {
    const raw = [...employees];
    if (sortConfig !== null) {
      raw.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        const perfA = employeePerformance[a.id] || { totalSales: 0, transactionCount: 0 };
        const perfB = employeePerformance[b.id] || { totalSales: 0, transactionCount: 0 };

        if (sortConfig.key === 'name') {
           aValue = a.name;
           bValue = b.name;
        } else if (sortConfig.key === 'transactions') {
           aValue = perfA.transactionCount;
           bValue = perfB.transactionCount;
        } else if (sortConfig.key === 'revenue') {
           aValue = perfA.totalSales;
           bValue = perfB.totalSales;
        } else if (sortConfig.key === 'average') {
           aValue = perfA.transactionCount > 0 ? perfA.totalSales / perfA.transactionCount : 0;
           bValue = perfB.transactionCount > 0 ? perfB.totalSales / perfB.transactionCount : 0;
        } else {
           aValue = a.name;
           bValue = b.name;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return raw;
  }, [employees, employeePerformance, sortConfig]);

  return {
    sortConfig,
    setSortConfig,
    requestSort,
    employeePerformance,
    sortedEmployeesPerformance
  };
}
