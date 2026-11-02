import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { InventoryAudit as InventoryAuditType, Product } from '../../../types';
import { Button, Modal, ConfirmDialog } from '../../ui';
import { InventoryAuditModalToolbar } from './InventoryAuditModalToolbar';
import { InventoryAuditItemsTable } from './InventoryAuditItemsTable';

interface InventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAudit: InventoryAuditType | null;
  auditItems: any[];
  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: (open: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
  filteredProducts: Product[];
  categoryToAdd: string;
  setCategoryToAdd: (c: string) => void;
  uniqueCategories: string[];
  itemFilter: 'all' | 'discrepancy' | 'ok';
  setItemFilter: (f: 'all' | 'discrepancy' | 'ok') => void;
  blindCountMode: boolean;
  setBlindCountMode: React.Dispatch<React.SetStateAction<boolean>>;
  currency: string;
  visibleAuditItems: any[];
  currentAuditDiscrepancyValue: number;
  products: Product[];
  addProductToAudit: (p: Product) => void;
  handleAddCategoryToAudit: () => void;
  handleAddLowStockProducts: () => void;
  updateActualStock: (productId: string, actual: number) => void;
  updateItemNote: (productId: string, notes: string) => void;
  removeItemFromAudit: (productId: string) => void;
  handlePrintInventorySheetA4: () => void;
  handleConfirmAudit: () => Promise<void>;
}

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({
  isOpen,
  onClose,
  activeAudit,
  auditItems,
  isConfirmModalOpen,
  setIsConfirmModalOpen,
  search,
  setSearch,
  filteredProducts,
  categoryToAdd,
  setCategoryToAdd,
  uniqueCategories,
  itemFilter,
  setItemFilter,
  blindCountMode,
  setBlindCountMode,
  currency,
  visibleAuditItems,
  currentAuditDiscrepancyValue,
  products,
  addProductToAudit,
  handleAddCategoryToAudit,
  handleAddLowStockProducts,
  updateActualStock,
  updateItemNote,
  removeItemFromAudit,
  handlePrintInventorySheetA4,
  handleConfirmAudit
}) => {
  const discrepancyCount = auditItems.filter(i => Number(i.discrepancy) !== 0).length;
  const okCount = auditItems.filter(i => Number(i.discrepancy) === 0).length;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="FICHE D'INVENTAIRE OPÉRATIONNELLE & FEUILLE DE COMPTAGE A4"
        maxWidth="max-w-7xl"
      >
        <div className="space-y-4">
          {/* Barre supérieure de la Fiche : Recherche + Ajout Rayon + Impression A4 */}
          <InventoryAuditModalToolbar
            search={search}
            setSearch={setSearch}
            filteredProducts={filteredProducts}
            addProductToAudit={addProductToAudit}
            categoryToAdd={categoryToAdd}
            setCategoryToAdd={setCategoryToAdd}
            uniqueCategories={uniqueCategories}
            handleAddCategoryToAudit={handleAddCategoryToAudit}
            handleAddLowStockProducts={handleAddLowStockProducts}
            itemFilter={itemFilter}
            setItemFilter={setItemFilter}
            auditItemsCount={auditItems.length}
            discrepancyCount={discrepancyCount}
            okCount={okCount}
            blindCountMode={blindCountMode}
            setBlindCountMode={setBlindCountMode}
            handlePrintInventorySheetA4={handlePrintInventorySheetA4}
          />

          {/* Tableau Réorganisé de la Fiche d'Inventaire */}
          <InventoryAuditItemsTable
            visibleAuditItems={visibleAuditItems}
            products={products}
            blindCountMode={blindCountMode}
            currency={currency}
            updateActualStock={updateActualStock}
            updateItemNote={updateItemNote}
            removeItemFromAudit={removeItemFromAudit}
          />

          {/* Pied de la Fiche d'Inventaire */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600 dark:text-zinc-400">
                Total Références : <strong className="text-slate-900 dark:text-white">{auditItems.length}</strong>
              </span>
              <span className="text-slate-600 dark:text-zinc-400">
                Impact Financier Estimé :{' '}
                <strong
                  className={
                    currentAuditDiscrepancyValue < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {currentAuditDiscrepancyValue >= 0 ? '+' : ''}
                  {currentAuditDiscrepancyValue.toFixed(2)} {currency}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                Fermer
              </Button>
              {activeAudit?.status !== 'completed' && (
                <Button
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={auditItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  <CheckCircle2 size={15} /> Valider l'Inventaire & Mettre à jour les Stocks
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAudit}
        title="Valider la Fiche d'Inventaire Physique"
        message={`Voulez-vous appliquer ces ${auditItems.length} comptages physiques et ajuster automatiquement les stocks en base de données ?`}
        confirmText="Valider et Ajuster le Stock"
        cancelText="Annuler"
      />
    </>
  );
};
