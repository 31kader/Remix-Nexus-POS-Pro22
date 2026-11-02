import React, { memo } from 'react';
import { Plus, Package, ClipboardCheck } from 'lucide-react';
import { InventoryAudit as InventoryAuditType, Product, CompanySettings } from '../types';
import { formatSafe, cn, safeGetItems } from '../lib/utils';
import { Button, Card } from './ui';
import { useInventoryAuditLogic } from './inventory/audit/useInventoryAuditLogic';
import { InventoryAuditKpis } from './inventory/audit/InventoryAuditKpis';
import { InventoryAuditModal } from './inventory/audit/InventoryAuditModal';

interface InventoryAuditProps {
  audits: InventoryAuditType[];
  products: Product[];
  user: any;
  settings: CompanySettings;
}

export const InventoryAudit = memo(function InventoryAudit({
  audits = [],
  products = [],
  user,
  settings
}: InventoryAuditProps) {
  const {
    isModalOpen,
    setIsModalOpen,
    activeAudit,
    setActiveAudit,
    auditItems,
    setAuditItems,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    search,
    setSearch,
    categoryToAdd,
    setCategoryToAdd,
    itemFilter,
    setItemFilter,
    blindCountMode,
    setBlindCountMode,
    currency,
    uniqueCategories,
    globalKpis,
    filteredProducts,
    visibleAuditItems,
    currentAuditDiscrepancyValue,
    startNewAudit,
    addProductToAudit,
    handleAddCategoryToAudit,
    handleAddLowStockProducts,
    updateActualStock,
    updateItemNote,
    removeItemFromAudit,
    handlePrintInventorySheetA4,
    handleConfirmAudit
  } = useInventoryAuditLogic({ audits, products, user, settings });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-left">
      {/* En-tête de la Fiche d'Inventaire */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Fiches d'Inventaire Physique & Réconciliation Stock
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Créez une fiche de comptage par rayon, imprimez la feuille A4 (avec ou sans stock théorique) et validez les écarts
            </p>
          </div>
        </div>

        <Button
          onClick={startNewAudit}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Plus size={18} /> Nouvelle Fiche d'Inventaire
        </Button>
      </div>

      {/* 4 KPIs Synthétiques */}
      <InventoryAuditKpis globalKpis={globalKpis} currency={currency} />

      {/* Liste des Fiches d'Inventaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {audits.length === 0 ? (
          <div className="col-span-full py-16 bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
            <Package size={42} className="mb-3 text-indigo-400 opacity-60" />
            <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Aucune fiche d'inventaire enregistrée</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Cliquez sur « + Nouvelle Fiche d'Inventaire » pour démarrer un comptage physique.
            </p>
          </div>
        ) : (
          audits.map(audit => {
            const auditRecords = safeGetItems(audit);
            const discrepanciesCount = auditRecords.filter((i: any) => Number(i.discrepancy) !== 0).length;
            return (
              <Card
                key={audit.id}
                className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/40 transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fiche du</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {formatSafe(audit.startDate, 'dd/MM/yyyy à HH:mm')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-black uppercase border',
                      audit.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {audit.status === 'completed' ? 'Validée' : 'En cours'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700">
                  <div>
                    <span className="block text-[9px] font-black uppercase text-slate-400">Articles Comptés</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{auditRecords.length} Réf.</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase text-slate-400">Écarts Détectés</span>
                    <span
                      className={cn(
                        'text-sm font-black',
                        discrepanciesCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {discrepanciesCount} écart(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                  {audit.status === 'completed' && audit.totalDiscrepancyValue !== undefined ? (
                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400">Impact Valorisé</span>
                      <span
                        className={cn(
                          'text-base font-black',
                          audit.totalDiscrepancyValue < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {audit.totalDiscrepancyValue >= 0 ? '+' : ''}
                        {audit.totalDiscrepancyValue.toFixed(2)} {currency}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Comptage ouvert</span>
                  )}

                  <Button
                    variant="secondary"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white cursor-pointer"
                    onClick={() => {
                      setActiveAudit(audit);
                      setAuditItems(safeGetItems(audit));
                      setIsModalOpen(true);
                    }}
                  >
                    {audit.status === 'completed' ? 'Ouvrir / Réimprimer' : 'Continuer la Fiche'}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Fiche d'Inventaire Opérationnelle */}
      <InventoryAuditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeAudit={activeAudit}
        auditItems={auditItems}
        isConfirmModalOpen={isConfirmModalOpen}
        setIsConfirmModalOpen={setIsConfirmModalOpen}
        search={search}
        setSearch={setSearch}
        filteredProducts={filteredProducts}
        categoryToAdd={categoryToAdd}
        setCategoryToAdd={setCategoryToAdd}
        uniqueCategories={uniqueCategories}
        itemFilter={itemFilter}
        setItemFilter={setItemFilter}
        blindCountMode={blindCountMode}
        setBlindCountMode={setBlindCountMode}
        currency={currency}
        visibleAuditItems={visibleAuditItems}
        currentAuditDiscrepancyValue={currentAuditDiscrepancyValue}
        products={products}
        addProductToAudit={addProductToAudit}
        handleAddCategoryToAudit={handleAddCategoryToAudit}
        handleAddLowStockProducts={handleAddLowStockProducts}
        updateActualStock={updateActualStock}
        updateItemNote={updateItemNote}
        removeItemFromAudit={removeItemFromAudit}
        handlePrintInventorySheetA4={handlePrintInventorySheetA4}
        handleConfirmAudit={handleConfirmAudit}
      />
    </div>
  );
});

export default InventoryAudit;
