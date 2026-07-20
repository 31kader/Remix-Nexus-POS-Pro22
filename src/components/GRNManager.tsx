import React from 'react';
import { BarcodeScanner } from './BarcodeScanner';
import { Product } from '../types';
import { useGRNLogic } from './useGRNLogic';
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
    handleValidate
  } = useGRNLogic({
    products,
    suppliers,
    setIsProductModalOpen,
    setEditingProduct,
    settings
  });

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestion des Réceptions</h3>
          <p className="text-sm text-slate-500">Créez vos bons de réception manuellement</p>
        </div>
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
