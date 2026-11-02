import React, { useState, useEffect, useMemo } from 'react';
import { format, isSameDay, subDays, startOfMonth, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { localDb } from '../../services/LocalDatabase';
import { formatSafe, generateUniqueId } from '../../lib/utils';
import { Expense } from '../../types';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store/useFinanceStore';
import { isReturnOrRefundExpense } from './expensesTypes';

export interface UseExpensesLogicProps {
  expenses: Expense[];
  user: any;
}

export function useExpensesLogic({ expenses, user }: UseExpensesLogicProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Filtres principaux : par défaut "daily" (Dépenses Quotidiennes HORS Retours !)
  const [isolationMode, setIsolationMode] = useState<'daily' | 'returns' | 'all'>('daily');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'card' | 'transfer'>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Fournitures',
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer'
  });

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description || '',
        amount: (editingExpense.amount ?? '').toString(),
        category: editingExpense.category || 'Fournitures',
        date: editingExpense.date ? formatSafe(editingExpense.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: editingExpense.paymentMethod || 'cash'
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        category: 'Fournitures',
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'cash'
      });
    }
  }, [editingExpense, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedDescription = formData.description.trim();
    const amountNum = parseFloat(formData.amount);

    if (!trimmedDescription) {
      toast.error("La description est obligatoire.");
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Veuillez saisir un montant valide supérieur à 0.");
      return;
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const resolvedDate = formData.date
      ? (formData.date === todayStr ? nowIso : (formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`))
      : nowIso;

    const expenseData = {
      description: trimmedDescription,
      amount: amountNum,
      category: formData.category,
      date: resolvedDate,
      createdAt: nowIso,
      userId: user.uid || user.id,
      paymentMethod: formData.paymentMethod
    };

    try {
      if (editingExpense) {
        await localDb.update(`expenses/${editingExpense.id}`, expenseData);
        useFinanceStore.setState(state => ({
          expenses: (state.expenses || []).map(ex => ex.id === editingExpense.id ? { ...ex, ...expenseData } : ex)
        }));
        toast.success("Dépense mise à jour avec succès !");
      } else {
        const newId = generateUniqueId();
        const newRecord = { id: newId, ...expenseData };
        await localDb.insert(`expenses/${newId}`, newRecord);
        useFinanceStore.setState(state => ({
          expenses: [newRecord as Expense, ...(state.expenses || [])]
        }));
        toast.success("Dépense enregistrée avec succès !");
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error: any) {
      toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const handleDelete = (id: string) => {
    setExpenseToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await localDb.delete(`expenses/${expenseToDelete}`);
      useFinanceStore.setState(state => ({
        expenses: (state.expenses || []).filter(ex => ex.id !== expenseToDelete)
      }));
      setExpenseToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast.success("Dépense supprimée avec succès !");
    } catch (error: any) {
      toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  // Filtrage par date
  const dateFilteredExpenses = useMemo(() => {
    const now = new Date();
    const yesterday = subDays(now, 1);
    const weekAgo = subDays(now, 7);
    const monthStart = startOfMonth(now);

    return (expenses || []).filter(e => {
      if (!e) return false;
      if (dateRangeFilter === 'all') return true;
      const d = e.date ? new Date(e.date) : null;
      if (!d || isNaN(d.getTime())) return false;

      if (dateRangeFilter === 'today') return isSameDay(d, now);
      if (dateRangeFilter === 'yesterday') return isSameDay(d, yesterday);
      if (dateRangeFilter === 'week') return isAfter(d, startOfDay(weekAgo));
      if (dateRangeFilter === 'month') return isAfter(d, monthStart) || isSameDay(d, monthStart);
      if (dateRangeFilter === 'custom') {
        if (customStartDate && isBefore(d, startOfDay(parseISO(customStartDate)))) return false;
        if (customEndDate && isAfter(d, endOfDay(parseISO(customEndDate)))) return false;
        return true;
      }
      return true;
    });
  }, [expenses, dateRangeFilter, customStartDate, customEndDate]);

  // Calcul des totaux séparés
  const summaryStats = useMemo(() => {
    let dailyTotal = 0;
    let dailyCount = 0;
    let returnsTotal = 0;
    let returnsCount = 0;

    dateFilteredExpenses.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (isReturnOrRefundExpense(e)) {
        returnsTotal += amt;
        returnsCount++;
      } else {
        dailyTotal += amt;
        dailyCount++;
      }
    });

    return {
      dailyTotal,
      dailyCount,
      returnsTotal,
      returnsCount,
      combinedTotal: dailyTotal + returnsTotal,
      combinedCount: dailyCount + returnsCount
    };
  }, [dateFilteredExpenses]);

  const filteredExpenses = useMemo(() => {
    const raw = dateFilteredExpenses.filter(e => {
      const isReturn = isReturnOrRefundExpense(e);
      if (isolationMode === 'daily' && isReturn) return false;
      if (isolationMode === 'returns' && !isReturn) return false;

      const matchesSearch = !search ||
        (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesMethod = paymentMethodFilter === 'all' || e.paymentMethod === paymentMethodFilter;

      return matchesSearch && matchesCategory && matchesMethod;
    });

    if (sortConfig !== null) {
      raw.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return raw;
  }, [dateFilteredExpenses, isolationMode, search, categoryFilter, paymentMethodFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, isolationMode, dateRangeFilter, paymentMethodFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const displayedExpenses = useMemo(() => {
    const from = (validPage - 1) * pageSize;
    return filteredExpenses.slice(from, from + pageSize);
  }, [filteredExpenses, validPage, pageSize]);

  const requestSort = (key: keyof Expense) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const currentSelectionTotal = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return {
    isModalOpen,
    setIsModalOpen,
    editingExpense,
    setEditingExpense,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    expenseToDelete,
    setExpenseToDelete,
    isolationMode,
    setIsolationMode,
    dateRangeFilter,
    setDateRangeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    paymentMethodFilter,
    setPaymentMethodFilter,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    formData,
    setFormData,
    sortConfig,
    requestSort,
    summaryStats,
    filteredExpenses,
    displayedExpenses,
    totalPages,
    validPage,
    currentSelectionTotal,
    handleSubmit,
    handleDelete,
    confirmDelete
  };
}
