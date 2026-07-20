import React, { memo } from 'react';
import { Plus } from 'lucide-react';
import { Supplier, Product, CompanySettings, Category, DamagedRecord } from '../types';
import { Button, ConfirmDialog } from './ui';
import { cn } from '../lib/utils';

// Import newly refactored sub-components
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

export const Suppliers = memo(function Suppliers(props: SuppliersProps) {
  const { 
    suppliers, products, settings, purchases, supplierPayments, 
    setViewingPurchaseVoucher, categories, user, damagedItems 
  } = props;

  const {
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    setEditingSupplier,
    isSyncing,
    setIsSyncing,
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
    setIsProcessingPayment,
    isDamageModalOpen,
    setIsDamageModalOpen,
    selectedProductForDamage,
    setSelectedProductForDamage,
    damageData,
    setDamageData,
    isProcessingDamage,
    setIsProcessingDamage,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    supplierToDelete,
    setSupplierToDelete,
    poDraftItems,
    setPoDraftItems,
    isPODraftOpen,
    setIsPODraftOpen,
    isSavingPurchaseOrder,
    setIsSavingPurchaseOrder,
    newReminderData,
    setNewReminderData,
    formData,
    setFormData,
    t,
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
    togglePoDraftItem,
    selectedSupplierPurchases,
    handleSubmit
  } = useSuppliersLogic(props);
  
  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group mb-8 text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-indigo-500/10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h3 className="text-3xl font-black text-white tracking-widest uppercase italic">Suppliers<span className="text-indigo-500">.hub</span></h3>
            <div className="text-[10px] font-black text-white/40 flex items-center gap-2 uppercase tracking-[0.2em] mt-1 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Réseau de {suppliers.length} partenaires commerciaux
            </div>
          </div>
          <Button 
            onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.25rem] px-8 py-6 font-black uppercase tracking-widest text-[11px] shadow-neon-indigo transition-all hover:scale-105 active:scale-95 flex items-center gap-3 border border-indigo-400/50 cursor-pointer"
          >
            <Plus size={20} strokeWidth={3} /> Nouveau Partenaire
          </Button>
        </div>
        
        <div className="flex gap-4 mt-8 pt-6 border-t border-white/10 relative z-10">
          <button
            onClick={() => setActiveSupplierTab('list')}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 cursor-pointer",
              activeSupplierTab === 'list'
                ? "bg-indigo-600 border-indigo-500 text-white shadow-neon-indigo scale-105"
                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            💼 Liste d'Affaires
          </button>
          <button
            onClick={() => setActiveSupplierTab('planning')}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 cursor-pointer",
              activeSupplierTab === 'planning'
                ? "bg-indigo-600 border-indigo-500 text-white shadow-neon-indigo scale-105"
                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            📆 Planning & Agendas
          </button>
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
        togglePoDraftItem={togglePoDraftItem}
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
