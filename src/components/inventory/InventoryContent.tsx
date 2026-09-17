import React, { useState, Suspense, lazy } from 'react';
import { InventoryHeader } from './InventoryHeader';
import { InventoryProductsTab } from './InventoryProductsTab';
import { InventoryModalsGroup } from './InventoryModalsGroup';
import { ConfirmAction, InventoryTab } from '../../types';
import { cn } from '../../lib/utils';

const StockHistory = lazy(() => import('../StockHistory').then(m => ({ default: m.StockHistory })));
const LabelPrinter = lazy(() => import('../LabelPrinter').then(m => ({ default: m.LabelPrinter })));
const CatalogPrinter = lazy(() => import('../CatalogPrinter').then(m => ({ default: m.CatalogPrinter })));
const MarketingPosters = lazy(() => import('../MarketingPosters').then(m => ({ default: m.MarketingPosters })));
const LossReport = lazy(() => import('../LossReport').then(m => ({ default: m.LossReport })));
const SupplierSyncManager = lazy(() => import('../SupplierSyncManager').then(m => ({ default: m.SupplierSyncManager })));

interface InventoryContentProps {
  inventoryTab: InventoryTab;
  setInventoryTab: (tab: InventoryTab) => void;
  products: any[];
  setEditingProduct: (p: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
  isProcessing: boolean;
  generateLowStockOrder: () => void;
  handleCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  productTabProps: any;
  stockAdjustments: any[];
  user: any;
  settings: any;
  damagedRecords: any[];
  selectedProductIds: string[];
  supplierSyncs: any[];
  allSuppliers: any[];
  modalsProps: any;
  setConfirmAction: (action: ConfirmAction | null) => void;
  onExportExcel?: () => void;
}

export const InventoryContent: React.FC<InventoryContentProps> = ({
  inventoryTab,
  setInventoryTab,
  products,
  setEditingProduct,
  setIsProductModalOpen,
  isProcessing,
  generateLowStockOrder,
  handleCSVImport,
  productTabProps,
  stockAdjustments,
  user,
  settings,
  damagedRecords,
  selectedProductIds,
  supplierSyncs,
  allSuppliers,
  modalsProps,
  setConfirmAction,
  onExportExcel
}) => {
  const [activeCatalogSubTab, setActiveCatalogSubTab] = useState<'pdf' | 'marketing'>('pdf');

  return (
    <div className="space-y-6">
      <InventoryHeader 
        inventoryTab={inventoryTab}
        setInventoryTab={setInventoryTab}
        products={products}
        settings={settings}
        onAddProduct={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
        onExportExcel={onExportExcel || (() => productTabProps.onExportExcel?.())}
        onCSVImport={handleCSVImport}
        onLowStockOrder={generateLowStockOrder}
        isProcessing={isProcessing}
      />

      <Suspense fallback={null}>
        {inventoryTab === 'products' ? (
          <InventoryProductsTab {...productTabProps} />
        ) : inventoryTab === 'history' ? (
          <StockHistory adjustments={stockAdjustments} products={products} user={user} />
        ) : inventoryTab === 'labels' ? (
          <div className="space-y-4">
            <LabelPrinter products={products} settings={settings} initialSelectedProductIds={selectedProductIds} />
          </div>
        ) : inventoryTab === 'catalog' ? (
          <div className="space-y-6">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit shadow-sm">
              <button
                onClick={() => setActiveCatalogSubTab('pdf')}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeCatalogSubTab === 'pdf' 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Catalogue PDF
              </button>
              <button
                onClick={() => setActiveCatalogSubTab('marketing')}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeCatalogSubTab === 'marketing' 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Affiches Marketing
              </button>
            </div>

            <div className="animate-in fade-in duration-300">
              {activeCatalogSubTab === 'pdf' ? (
                <CatalogPrinter products={products} settings={settings} initialSelectedProductIds={selectedProductIds} />
              ) : (
                <MarketingPosters products={products} settings={settings} />
              )}
            </div>
          </div>
        ) : inventoryTab === 'losses' ? (
          <LossReport 
            damagedRecords={damagedRecords} 
            products={products} 
            categories={productTabProps.categories || []}
            onPrintReport={() => window.print()}
          />
        ) : (
          <div className="space-y-4">
            <SupplierSyncManager supplierSyncs={supplierSyncs} suppliers={allSuppliers} products={products} />
            
            <div className="mt-8 p-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
              <div>
                <h3 className="text-slate-900 dark:text-white font-bold mb-1">Restauration Complète</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Si vous rencontrez des problèmes d'affichage ou que certains produits semblent manquer, forcez une récupération depuis le cloud.</p>
              </div>
              <button
                onClick={() => {
                  setConfirmAction({
                    title: "Restauration Complète",
                    message: "Êtes-vous sûr de vouloir forcer la récupération de vos produits depuis le cloud ?",
                    onConfirm: () => {
                      localStorage.setItem('nexus_products_last_sync', '2000-01-01T00:00:00Z');
                      window.location.reload();
                    }
                  });
                }}
                className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border border-amber-200 dark:border-amber-500/20 px-4 py-2 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer shadow-sm"
              >
                Forcer la Synchronisation
              </button>
            </div>
          </div>
        )}
      </Suspense>
      
      <InventoryModalsGroup {...modalsProps} />
    </div>
  );
};
