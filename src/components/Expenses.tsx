import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileText, Trash2, TrendingDown, 
  CreditCard, Banknote, RefreshCw, ChevronLeft, ChevronRight,
  RotateCcw, Briefcase, Layers, Calendar
} from 'lucide-react';
import { format, isSameDay, subDays, startOfMonth, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { localDb } from '../services/LocalDatabase';
import { cn, formatSafe, generateUniqueId, formatPrice } from '../lib/utils';
import { Button, Card, Modal, ConfirmDialog, SortableHeader } from './ui';
import { Expense, CompanySettings } from '../types';
import { toast } from 'sonner';
import { useFinanceStore } from '../store/useFinanceStore';

interface ExpensesProps {
  expenses: Expense[];
  user: any;
  settings: CompanySettings;
}

// Détecte si une écriture de dépense correspond à un Retour Client / Remboursement
export function isReturnOrRefundExpense(e: Expense): boolean {
  if (!e) return false;
  const cat = (e.category || '').toLowerCase();
  const desc = (e.description || '').toLowerCase();
  return (
    cat.includes('retour') ||
    cat.includes('remboursement') ||
    cat.includes('avoir') ||
    desc.includes('retour') ||
    desc.includes('remboursement') ||
    desc.includes('avoir client') ||
    desc.includes('annulation ticket')
  );
}

export function Expenses({ expenses, user, settings }: ExpensesProps) {
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

    const expenseData = {
      description: trimmedDescription,
      amount: amountNum,
      category: formData.category,
      date: formData.date,
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

  const handleDelete = async (id: string) => {
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

  const categories = [
    'Fournitures',
    'Transport / Carburant',
    'Repas / Café',
    'Loyer',
    'Électricité',
    'Eau',
    'Salaires',
    'Marketing',
    'Maintenance',
    'Taxes',
    'Retour Client',
    'Autre'
  ];

  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  // Filtrage par date (commun aux KPIs pour comparer sur la même période)
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

  // Calcul des totaux séparés : Dépenses Quotidiennes (Hors Retours) vs Retours Clients
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

  return (
    <div className="space-y-5 text-left">
      {/* En-tête Gestionnaire de Dépenses */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Gestionnaire de Dépenses & Charges
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Isolez vos dépenses opérationnelles quotidiennes des remboursements et retours clients en un clic.
          </p>
        </div>
        <Button onClick={() => { setEditingExpense(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs px-5 py-2.5 rounded-xl">
          <Plus size={18} /> Nouvelle Dépense Quotidienne
        </Button>
      </div>

      {/* 3 Onglets d'Isolation : Dépenses Quotidiennes (Hors Retours) vs Retours Clients vs Tout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Carte 1 : Dépenses Quotidiennes (Hors Retours) */}
        <div
          onClick={() => setIsolationMode('daily')}
          className={cn(
            "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
            isolationMode === 'daily'
              ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30"
              : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
              isolationMode === 'daily' ? "text-white/90" : "text-indigo-600 dark:text-indigo-400"
            )}>
              <Briefcase size={15} /> Dépenses Quotidiennes (Hors Retours)
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
              isolationMode === 'daily' ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            )}>
              {summaryStats.dailyCount} opér.
            </span>
          </div>
          <h4 className={cn(
            "text-2xl font-black mt-2 font-mono tabular-nums",
            isolationMode === 'daily' ? "text-white" : "text-slate-900 dark:text-white"
          )}>
            {formatPrice(summaryStats.dailyTotal)} {settings.currency || 'DA'}
          </h4>
          <p className={cn(
            "text-[10px] font-bold mt-1",
            isolationMode === 'daily' ? "text-white/80" : "text-slate-500 dark:text-slate-400"
          )}>
            ✓ Exclut automatiquement tous les retours clients
          </p>
        </div>

        {/* Carte 2 : Retours & Remboursements Isolés */}
        <div
          onClick={() => setIsolationMode('returns')}
          className={cn(
            "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
            isolationMode === 'returns'
              ? "bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30"
              : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
              isolationMode === 'returns' ? "text-white/90" : "text-amber-600 dark:text-amber-400"
            )}>
              <RotateCcw size={15} /> Retours & Remboursements Isolés
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
              isolationMode === 'returns' ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {summaryStats.returnsCount} retour(s)
            </span>
          </div>
          <h4 className={cn(
            "text-2xl font-black mt-2 font-mono tabular-nums",
            isolationMode === 'returns' ? "text-white" : "text-amber-600 dark:text-amber-400"
          )}>
            {formatPrice(summaryStats.returnsTotal)} {settings.currency || 'DA'}
          </h4>
          <p className={cn(
            "text-[10px] font-bold mt-1",
            isolationMode === 'returns' ? "text-white/80" : "text-slate-500 dark:text-slate-400"
          )}>
            ↩️ Uniquement les sorties liées aux retours marchandises
          </p>
        </div>

        {/* Carte 3 : Toutes les Sorties (Global) */}
        <div
          onClick={() => setIsolationMode('all')}
          className={cn(
            "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
            isolationMode === 'all'
              ? "bg-slate-800 text-white border-slate-700 shadow-md ring-2 ring-slate-500/30"
              : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
              isolationMode === 'all' ? "text-white/90" : "text-slate-600 dark:text-slate-300"
            )}>
              <Layers size={15} /> Total Sorties (Dépenses + Retours)
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
              isolationMode === 'all' ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            )}>
              {summaryStats.combinedCount} total
            </span>
          </div>
          <h4 className={cn(
            "text-2xl font-black mt-2 font-mono tabular-nums",
            isolationMode === 'all' ? "text-white" : "text-slate-900 dark:text-white"
          )}>
            {formatPrice(summaryStats.combinedTotal)} {settings.currency || 'DA'}
          </h4>
          <p className={cn(
            "text-[10px] font-bold mt-1",
            isolationMode === 'all' ? "text-white/80" : "text-slate-500 dark:text-slate-400"
          )}>
            📊 Vue consolidée de toutes les sorties de caisse
          </p>
        </div>
      </div>

      {/* Barre de Filtres Avancés (Période, Recherche, Catégorie, Mode de Paiement) */}
      <Card className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
        {/* Ligne 1 : Filtres de Période Rapides */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar size={13} /> Période :
            </span>
            {[
              { id: 'all', label: 'Toutes les dates' },
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: 'week', label: '7 derniers jours' },
              { id: 'month', label: 'Ce Mois' },
              { id: 'custom', label: 'Dates personnalisées' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDateRangeFilter(p.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer border",
                  dateRangeFilter === p.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Total de la sélection filtrée actuelle */}
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
            Sélection affichée ({filteredExpenses.length}) : -{formatPrice(currentSelectionTotal)} {settings.currency || 'DA'}
          </div>
        </div>

        {dateRangeFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Du :</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Au :</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Ligne 2 : Recherche + Catégorie + Mode de Paiement */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher une dépense par description ou motif..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white text-xs font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-200"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-200"
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
          >
            <option value="all">Tous modes de paiement</option>
            <option value="cash">💵 Espèces (Caisse)</option>
            <option value="card">💳 Carte / TPE</option>
            <option value="transfer">🏦 Virement / Chèque</option>
          </select>
        </div>
      </Card>

      {/* Tableau des Dépenses */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <SortableHeader label="Date" sortKey="date" currentSort={sortConfig} onSort={() => requestSort('date')} />
                <SortableHeader label="Description / Motif" sortKey="description" currentSort={sortConfig} onSort={() => requestSort('description')} />
                <SortableHeader label="Type & Catégorie" sortKey="category" currentSort={sortConfig} onSort={() => requestSort('category')} />
                <SortableHeader label="Mode" sortKey="paymentMethod" currentSort={sortConfig} onSort={() => requestSort('paymentMethod')} />
                <SortableHeader label="Montant" sortKey="amount" currentSort={sortConfig} onSort={() => requestSort('amount')} />
                <th className="p-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {displayedExpenses.map((expense) => {
                const isRet = isReturnOrRefundExpense(expense);
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-300 font-mono font-bold">
                      {formatSafe(expense.date, 'dd/MM/yyyy')}
                    </td>
                    <td className="p-3">
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{expense.description}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isRet ? (
                          <span className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-black uppercase">
                            ↩️ Retour Client
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-black uppercase">
                            💼 {expense.category || 'Charge'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                        {expense.paymentMethod === 'card' ? <CreditCard size={13} /> : 
                         expense.paymentMethod === 'cash' ? <Banknote size={13} /> : <RefreshCw size={13} />}
                        <span>
                          {expense.paymentMethod === 'cash' ? 'Espèces' : expense.paymentMethod === 'card' ? 'Carte' : 'Virement'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        -{formatPrice(expense.amount)} {settings.currency || 'DA'}
                      </p>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 uppercase">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingDown size={36} strokeWidth={1.5} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-black">
                        {isolationMode === 'daily'
                          ? 'Aucune dépense quotidienne trouvée pour ces filtres'
                          : isolationMode === 'returns'
                            ? 'Aucun retour client trouvé pour ces filtres'
                            : 'Aucune écriture trouvée'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Lignes par page :</span>
            {[50, 100, 200].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => { setPageSize(size); setCurrentPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  pageSize === size
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                )}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {filteredExpenses.length > 0
                ? `${(validPage - 1) * pageSize + 1}-${Math.min(validPage * pageSize, filteredExpenses.length)} sur ${filteredExpenses.length}`
                : '0 sur 0'}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Page {validPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal Création / Édition de Dépense */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingExpense(null); }}
        title={editingExpense ? "Modifier la Dépense" : "Nouvelle Dépense Quotidienne"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Description / Motif *</label>
            <input
              type="text"
              required
              placeholder="Ex: Achat sacs emballage, Facture Sonelgaz, Transport..."
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Montant ({settings.currency || 'DA'}) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-base font-black text-rose-600 dark:text-rose-400"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Catégorie *</label>
              <select
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Date *</label>
              <input
                type="date"
                required
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Mode de Paiement *</label>
              <select
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}
              >
                <option value="cash">Espèces (Caisse)</option>
                <option value="card">Carte Bancaire</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {editingExpense ? "Mettre à jour" : "Enregistrer la dépense"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setExpenseToDelete(null); }}
        onConfirm={confirmDelete}
        title="Supprimer la dépense"
        message="Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible."
      />
    </div>
  );
}
