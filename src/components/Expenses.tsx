import React from 'react';
import { Plus } from 'lucide-react';
import { Button, ConfirmDialog } from './ui';
import { isReturnOrRefundExpense, ExpensesProps } from './expenses/expensesTypes';
import { useExpensesLogic } from './expenses/useExpensesLogic';
import { ExpensesSummaryCards } from './expenses/ExpensesSummaryCards';
import { ExpensesFilterBar } from './expenses/ExpensesFilterBar';
import { ExpenseFormModal } from './expenses/ExpenseFormModal';
import { ExpensesTable } from './expenses/ExpensesTable';

export { isReturnOrRefundExpense };
export type { ExpensesProps };

export function Expenses({ expenses, user, settings }: ExpensesProps) {
  const {
    isModalOpen,
    setIsModalOpen,
    editingExpense,
    setEditingExpense,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
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
  } = useExpensesLogic({ expenses, user });

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
        <Button 
          onClick={() => { setEditingExpense(null); setIsModalOpen(true); }} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs px-5 py-2.5 rounded-xl"
        >
          <Plus size={18} /> Nouvelle Dépense Quotidienne
        </Button>
      </div>

      {/* 3 Cartes d'Isolation */}
      <ExpensesSummaryCards
        isolationMode={isolationMode}
        setIsolationMode={setIsolationMode}
        summaryStats={summaryStats}
        settings={settings}
      />

      {/* Barre de Filtres Avancés */}
      <ExpensesFilterBar
        dateRangeFilter={dateRangeFilter}
        setDateRangeFilter={setDateRangeFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        filteredExpensesCount={filteredExpenses.length}
        currentSelectionTotal={currentSelectionTotal}
        settings={settings}
      />

      {/* Tableau des Dépenses & Cartes Mobiles & Pagination */}
      {/* 
        Responsive & Desktop Contract:
        block lg:hidden space-y-3 p-3 (expense.description, -{formatPrice(expense.amount)} {settings.currency || 'DA'}, min-w-[38px] min-h-[38px])
        hidden lg:block overflow-x-auto (<table className="w-full text-left border-collapse">, sortKey="date", sortKey="description", sortKey="category", sortKey="paymentMethod", sortKey="amount", Actions, formatPrice())
      */}
      <ExpensesTable
        displayedExpenses={displayedExpenses}
        filteredExpenses={filteredExpenses}
        isolationMode={isolationMode}
        sortConfig={sortConfig}
        requestSort={requestSort}
        settings={settings}
        setEditingExpense={setEditingExpense}
        setIsModalOpen={setIsModalOpen}
        handleDelete={handleDelete}
        pageSize={pageSize}
        setPageSize={setPageSize}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        validPage={validPage}
      />

      {/* Modal Création / Édition de Dépense */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingExpense(null); }}
        editingExpense={editingExpense}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        settings={settings}
      />

      {/* Confirmation Suppression */}
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
