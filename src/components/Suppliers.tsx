import React, { memo, useMemo } from 'react';
import { Plus, Truck, Wallet, AlertCircle, CalendarCheck } from 'lucide-react';
import { Supplier, Product, CompanySettings, Category, DamagedRecord } from '../types';
import { Button, ConfirmDialog } from './ui';
import { cn, formatPrice } from '../lib/utils';

import { SupplierPlanningTab } from './suppliers/SupplierPlanningTab';
import { SupplierDetailsModal } from './suppliers/SupplierDetailsModal';
import { SupplierFormModal } from './suppliers/SupplierFormModal';
import { SupplierPaymentModal } from './suppliers/SupplierPaymentModal';
import { SupplierDamageModal } from './suppliers/SupplierDamageModal';
import { SupplierList } from './suppliers/SupplierList';
import { useSuppliersLogic } from './useSuppliersLogic';

export interface SuppliersProps {
  suppliers: Supplier[];
  products: Product[];
  settings: CompanySettings;
  purchases: any[];
  supplierPayments: any[];
  setViewingPurchaseVoucher: (p: any) => void;
  categories: Category[];
  user: any;
  damagedItems: DamagedRecord[];
}

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const Suppliers = memo(function Suppliers(props: SuppliersProps) {
  const { 
    suppliers, products, settings, purchases, supplierPayments, 
    setViewingPurchaseVoucher, categories, damagedItems 
  } = props;

  const {
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    setEditingSupplier,
    isSyncing,
    viewingDetailsSupplier,
    setViewingDetailsSupplier,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    activeDetailsTab,
    setActiveDetailsTab,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    activeSupplierTab,
    setActiveSupplierTab,
    editingPayment,
    setEditingPayment,
    paymentData,
    setPaymentData,
    isProcessingPayment,
    isDamageModalOpen,
    setIsDamageModalOpen,
    selectedProductForDamage,
    setSelectedProductForDamage,
    damageData,
    setDamageData,
    isProcessingDamage,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    supplierToDelete,
    setSupplierToDelete,
    poDraftItems,
    setPoDraftItems,
    isPODraftOpen,
    setIsPODraftOpen,
    isSavingPurchaseOrder,
    newReminderData,
    setNewReminderData,
    formData,
    setFormData,
    handleDeleteSupplier,
    handlePaymentSubmit,
    handlePaymentDelete,
    handleDamageSubmit,
    handleUpdateClaimStatus,
    handleAddReminder,
    handleToggleReminderComplete,
    handleDeleteReminder,
    handleSavePurchaseOrderDraft,
    handleSync,
    selectedSupplierPurchases,
    handleSubmit
  } = useSuppliersLogic(props);

  const todayName = FRENCH_DAYS[new Date().getDay()];

  const metrics = useMemo(() => {
    const totalDebt = (suppliers || []).reduce((acc, s) => acc + Math.max(0, Number(s?.balance) || 0), 0);
    const withDebtCount = (suppliers || []).filter(s => (Number(s?.balance) || 0) > 0).length;
    const todayEventsCount = (suppliers || []).filter(
      s => s?.preSaleDays?.includes(todayName) || s?.deliveryDays?.includes(todayName) || s?.paymentDays?.includes(todayName)
    ).length;
    return { totalDebt, withDebtCount, todayEventsCount };
  }, [suppliers, todayName]);

  const handleOpenQuickPayment = (supplier: Supplier) => {
    setViewingDetailsSupplier(supplier);
    setPaymentData({
      amount: Math.max(0, Number(supplier.balance) || 0),
      method: 'cash',
      note: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Principal Suppliers.hub */}
      <div className="bg-white dark:bg-slate-900/90 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-600/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  Suppliers<span className="text-indigo-600 dark:text-indigo-400">.hub</span> & Partenaires
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gestion des fournisseurs, soldes, dettes et tableau de bord des activités hebdomadaires ({todayName})
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveSupplierTab('list')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  activeSupplierTab === 'list'
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                💼 Annuaire & Soldes ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSupplierTab('planning')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  activeSupplierTab === 'planning'
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                📆 Tableau de Bord des Activités ({metrics.todayEventsCount} auj.)
              </button>
            </div>

            <Button 
              onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 font-black uppercase tracking-wider text-xs flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={18} /> Nouveau Fournisseur
            </Button>
          </div>
        </div>

        {/* Cartes KPIs Fournisseurs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Total Partenaires</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">{suppliers.length}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Truck size={18} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Total Dettes Fournisseurs</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums font-mono">
                {formatPrice(metrics.totalDebt)} {settings.currency || 'DA'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">Fournisseurs à Régler</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                {metrics.withDebtCount} <span className="text-xs font-bold">sur {suppliers.length}</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>

          <div
            onClick={() => setActiveSupplierTab('planning')}
            className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-all"
          >
            <div>
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Activités ({todayName})</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                {metrics.todayEventsCount} <span className="text-xs font-bold">prévue(s)</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck size={18} />
            </div>
          </div>
        </div>
      </div>

      {activeSupplierTab === 'planning' ? (
        <SupplierPlanningTab
          suppliers={suppliers}
          setViewingDetailsSupplier={setViewingDetailsSupplier}
          setActiveDetailsTab={setActiveDetailsTab}
          setIsDetailsModalOpen={setIsDetailsModalOpen}
          newReminderData={newReminderData}
          setNewReminderData={setNewReminderData}
          handleAddReminder={handleAddReminder}
          handleDeleteReminder={handleDeleteReminder}
          handleToggleReminderComplete={handleToggleReminderComplete}
          onQuickPaySupplier={handleOpenQuickPayment}
          currency={settings.currency || 'DA'}
        />
      ) : (
        <SupplierList
          suppliers={suppliers}
          isSyncing={isSyncing}
          handleSync={handleSync}
          setViewingDetailsSupplier={setViewingDetailsSupplier}
          setActiveDetailsTab={setActiveDetailsTab}
          setIsDetailsModalOpen={setIsDetailsModalOpen}
          setSupplierToDelete={setSupplierToDelete}
          setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
          setEditingSupplier={setEditingSupplier}
          setIsModalOpen={setIsModalOpen}
          onQuickPaySupplier={handleOpenQuickPayment}
          currency={settings.currency || 'DA'}
        />
      )}

      {/* Supplier Hub Modals */}
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }}
        editingSupplier={editingSupplier}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
      />

      <SupplierDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setViewingDetailsSupplier(null); }}
        viewingDetailsSupplier={viewingDetailsSupplier}
        settings={settings}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        setPoDraftItems={setPoDraftItems}
        products={products}
        categories={categories}
        activeDetailsTab={activeDetailsTab}
        setActiveDetailsTab={setActiveDetailsTab}
        purchases={selectedSupplierPurchases}
        setViewingPurchaseVoucher={setViewingPurchaseVoucher}
        supplierPayments={supplierPayments}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        setEditingPayment={setEditingPayment}
        handlePaymentDelete={handlePaymentDelete}
        damagedItems={damagedItems}
        setIsDamageModalOpen={setIsDamageModalOpen}
        handleUpdateClaimStatus={handleUpdateClaimStatus}
        poDraftItems={poDraftItems}
        isPODraftOpen={isPODraftOpen}
        setIsPODraftOpen={setIsPODraftOpen}
        handleSavePurchaseOrderDraft={handleSavePurchaseOrderDraft}
        isSavingPurchaseOrder={isSavingPurchaseOrder}
        selectedProductForDamage={selectedProductForDamage}
        setSelectedProductForDamage={setSelectedProductForDamage}
        damageData={damageData}
        setDamageData={setDamageData}
      />

      <SupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setEditingPayment(null); }}
        editingPayment={editingPayment}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        handlePaymentSubmit={handlePaymentSubmit}
        isProcessingPayment={isProcessingPayment}
        viewingDetailsSupplier={viewingDetailsSupplier}
        settings={settings}
        setEditingPayment={setEditingPayment}
      />

      <SupplierDamageModal
        isOpen={isDamageModalOpen}
        onClose={() => { setIsDamageModalOpen(false); setSelectedProductForDamage(null); }}
        selectedProductForDamage={selectedProductForDamage}
        damageData={damageData}
        setDamageData={setDamageData}
        handleDamageSubmit={handleDamageSubmit}
        isProcessingDamage={isProcessingDamage}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setSupplierToDelete(null); }}
        onConfirm={handleDeleteSupplier}
        title="Supprimer le fournisseur"
        message={`Êtes-vous sûr de vouloir supprimer ${supplierToDelete?.name} ? Cette action est irréversible.`}
      />
    </div>
  );
});
