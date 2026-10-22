import React from 'react';
import { CloudUpload } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { Product } from '../types';
import { useGRNLogic } from '../hooks/useGRNLogic';
import { GRNHistoryTable } from './GRNHistoryTable';
import { GRNCreateForm } from './grn-manager/GRNCreateForm';

import { CompanySettings } from '../types';

export interface GRNManagerProps {
  products: Product[];
  suppliers: any[];
  setIsProductModalOpen: (isOpen: boolean) => void;
  setEditingProduct: (product: Product | null) => void;
  settings: CompanySettings;
}

export function GRNManager(props: GRNManagerProps) {
  const { products, suppliers, setIsProductModalOpen, setEditingProduct, settings } = props;

  const {
    grns,
    newSupplierName,
    setNewSupplierName,
    isAddingSupplier,
    setIsAddingSupplier,
    search,
    setSearch,
    grnSearch,
    setGrnSearch,
    isScannerOpen,
    setIsScannerOpen,
    supplierId,
    setSupplierId,
    items,
    setItems,
    globalDiscount,
    setGlobalDiscount,
    globalVat,
    setGlobalVat,
    validateImmediately,
    setValidateImmediately,
    isProcessing,
    searchRef,
    quantityInputRefs,
    filteredProducts,
    filteredGRNs,
    handleBarcodeScan,
    handleKeyDown,
    handleAddSupplier,
    addItem,
    updateItem,
    handleCreate,
    handleValidate,
    handleSyncAllToSupabase,
    isSyncingGrns
  } = useGRNLogic({
    products,
    suppliers,
    setIsProductModalOpen,
    setEditingProduct,
    settings
  });

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestion des Réceptions</h3>
          <p className="text-sm text-slate-500">Créez vos bons de réception manuellement</p>
        </div>
        <button
          onClick={handleSyncAllToSupabase}
          disabled={isSyncingGrns || isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm w-fit"
          title="Synchroniser tous les bons de réception locaux vers Supabase Cloud"
        >
          <CloudUpload size={16} className={isSyncingGrns ? "animate-bounce" : ""} />
          <span>{isSyncingGrns ? "Synchronisation en cours..." : "Synchroniser vers Supabase"}</span>
        </button>
      </div>
      
      {/* Formulaire de création */}
      <GRNCreateForm 
        suppliers={suppliers}
        products={products}
        supplierId={supplierId}
        setSupplierId={setSupplierId}
        isAddingSupplier={isAddingSupplier}
        setIsAddingSupplier={setIsAddingSupplier}
        newSupplierName={newSupplierName}
        setNewSupplierName={setNewSupplierName}
        handleAddSupplier={handleAddSupplier}
        search={search}
        setSearch={setSearch}
        searchRef={searchRef}
        handleKeyDown={handleKeyDown}
        setIsScannerOpen={setIsScannerOpen}
        filteredProducts={filteredProducts}
        addItem={addItem}
        items={items}
        setItems={setItems}
        updateItem={updateItem}
        quantityInputRefs={quantityInputRefs}
        setEditingProduct={setEditingProduct}
        setIsProductModalOpen={setIsProductModalOpen}
        globalDiscount={globalDiscount}
        setGlobalDiscount={setGlobalDiscount}
        globalVat={globalVat}
        setGlobalVat={setGlobalVat}
        validateImmediately={validateImmediately}
        setValidateImmediately={setValidateImmediately}
        isProcessing={isProcessing}
        handleCreate={handleCreate}
      />

      {/* Liste des réceptions */}
      <GRNHistoryTable
        filteredGRNs={filteredGRNs}
        suppliers={suppliers}
        handleValidate={handleValidate}
        isProcessing={isProcessing}
        grnSearch={grnSearch}
        setGrnSearch={setGrnSearch}
        settings={settings}
        products={products}
      />

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
