import React, { memo } from 'react';
import { 
  Search, 
  Printer, 
  Trash2, 
  Filter, 
  RotateCcw, 
  Calendar, 
  DollarSign, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../../ui';
import { Purchase, Supplier, CompanySettings } from '../../../types';
import { printHistory } from '../../../services/printService';
import { 
  PurchasePaymentStatusFilter, 
  PurchaseReceiptStatusFilter, 
  PurchaseSortOption 
} from '../purchaseHelpers';

interface PurchasesHistoryFilterBarProps {
  filteredPurchases: Purchase[];
  suppliers: Supplier[];
  settings: CompanySettings;
  historySearch: string;
  setHistorySearch: (s: string) => void;
  historyStartDate: string;
  setHistoryStartDate: (s: string) => void;
  historyEndDate: string;
  setHistoryEndDate: (s: string) => void;
  historySupplierId?: string;
  setHistorySupplierId?: (id: string) => void;
  historyPaymentStatus?: PurchasePaymentStatusFilter;
  setHistoryPaymentStatus?: (s: PurchasePaymentStatusFilter) => void;
  historyReceiptStatus?: PurchaseReceiptStatusFilter;
  setHistoryReceiptStatus?: (s: PurchaseReceiptStatusFilter) => void;
  historyQuickDate?: string;
  setQuickDatePeriod?: (period: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'last_month') => void;
  historyMinAmount?: string;
  setHistoryMinAmount?: (v: string) => void;
  historyMaxAmount?: string;
  setHistoryMaxAmount?: (v: string) => void;
  historySortBy?: PurchaseSortOption;
  setHistorySortBy?: (s: PurchaseSortOption) => void;
  filtersOpen: boolean;
  toggleFiltersOpen: () => void;
  resetHistoryFilters?: () => void;
  activeFiltersCount?: number;
}

export const PurchasesHistoryFilterBar = memo(function PurchasesHistoryFilterBar({
  filteredPurchases,
  suppliers,
  settings,
  historySearch,
  setHistorySearch,
  historyStartDate,
  setHistoryStartDate,
  historyEndDate,
  setHistoryEndDate,
  historySupplierId = '',
  setHistorySupplierId,
  historyPaymentStatus = 'all',
  setHistoryPaymentStatus,
  historyReceiptStatus = 'all',
  setHistoryReceiptStatus,
  historyQuickDate = 'all',
  setQuickDatePeriod,
  historyMinAmount = '',
  setHistoryMinAmount,
  historyMaxAmount = '',
  setHistoryMaxAmount,
  historySortBy = 'date-desc',
  setHistorySortBy,
  filtersOpen,
  toggleFiltersOpen,
  resetHistoryFilters,
  activeFiltersCount = 0,
}: PurchasesHistoryFilterBarProps) {
  return (
    <div className="industrial-card p-5 space-y-4">
      {/* Ligne 1 : Recherche + Périodes Rapides + Boutons d'Action */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[260px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-industrial-500" />
          <input 
            type="text" 
            placeholder="Rechercher fournisseur, n° facture, produit, note..."
            className="industrial-input w-full pl-12 pr-10 py-2.5 text-sm"
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
          />
          {historySearch && (
            <button 
              onClick={() => setHistorySearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-industrial-300 p-1 cursor-pointer"
              title="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Raccourcis de dates rapides */}
        {setQuickDatePeriod && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 bg-industrial-950/60 p-1 rounded-xl border border-industrial-800">
            {(['all', 'today', 'yesterday', '7days', 'month'] as const).map(period => {
              const labels: Record<string, string> = {
                all: 'Toutes',
                today: "Aujourd'hui",
                yesterday: 'Hier',
                '7days': '7 Jours',
                month: 'Ce Mois'
              };
              const isSelected = period === 'all' 
                ? historyQuickDate === 'all' && !historyStartDate && !historyEndDate
                : historyQuickDate === period;

              return (
                <button
                  key={period}
                  onClick={() => setQuickDatePeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-industrial-400 hover:text-white'
                  }`}
                >
                  {labels[period]}
                </button>
              );
            })}
          </div>
        )}

        {/* Boutons d'Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleFiltersOpen}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
              filtersOpen || activeFiltersCount > 0
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-industrial-800 text-industrial-300 border-industrial-700 hover:bg-industrial-700'
            }`}
          >
            <Filter size={16} />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {resetHistoryFilters && activeFiltersCount > 0 && (
            <button
              onClick={resetHistoryFilters}
              className="px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-industrial-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}

          <Button 
            onClick={() => printHistory(filteredPurchases, settings)} 
            className="industrial-button-primary bg-industrial-800 text-industrial-300 border border-industrial-700 py-2.5 px-4 shadow-none flex gap-2 cursor-pointer"
          >
            <Printer size={16}/> Rapport
          </Button>

          {filteredPurchases.length > 0 && (
            <Button
              onClick={async () => {
                if (!window.confirm(`Voulez-vous vraiment supprimer ces ${filteredPurchases.length} bon(s) d'achat et réajuster automatiquement les stocks correspondants ?`)) return;
                const { handleDeletePurchaseDb } = await import('../purchaseDbOperations');
                for (const p of filteredPurchases) {
                  await handleDeletePurchaseDb({
                    purchaseId: p.id,
                    setIsProcessing: () => {},
                    setPurchaseToDelete: () => {}
                  });
                }
              }}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              title="Supprimer tous les bons affichés et ajuster les stocks"
            >
              <Trash2 size={16} /> Nettoyer ({filteredPurchases.length})
            </Button>
          )}
        </div>
      </div>

      {/* Ligne 2 : Volet des Filtres Avancés (Dépliable) */}
      {filtersOpen && (
        <div className="pt-4 border-t border-industrial-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
          {/* Filtre par Fournisseur */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Fournisseur</span>
            </label>
            <select
              className="industrial-input w-full p-2.5 text-xs font-semibold bg-industrial-900 border-industrial-700"
              value={historySupplierId}
              onChange={e => setHistorySupplierId && setHistorySupplierId(e.target.value)}
            >
              <option value="">Tous les fournisseurs</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.balance && s.balance > 0 ? `(${s.balance.toFixed(0)} DA dette)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Statut de Paiement */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Statut Paiement</span>
            </label>
            <select
              className="industrial-input w-full p-2.5 text-xs font-semibold bg-industrial-900 border-industrial-700"
              value={historyPaymentStatus}
              onChange={e => setHistoryPaymentStatus && setHistoryPaymentStatus(e.target.value as PurchasePaymentStatusFilter)}
            >
              <option value="all">Tous les statuts de paiement</option>
              <option value="paid">Payé intégralement (Soldé)</option>
              <option value="partial">Paiement partiel (Acompte)</option>
              <option value="unpaid">Impayé (0 versé)</option>
              <option value="debt">Avec Dette / Reste à payer</option>
            </select>
          </div>

          {/* Filtre par Statut de Réception */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Statut Réception</span>
            </label>
            <select
              className="industrial-input w-full p-2.5 text-xs font-semibold bg-industrial-900 border-industrial-700"
              value={historyReceiptStatus}
              onChange={e => setHistoryReceiptStatus && setHistoryReceiptStatus(e.target.value as PurchaseReceiptStatusFilter)}
            >
              <option value="all">Tous les statuts de bon</option>
              <option value="completed">Réceptionné / Validé</option>
              <option value="draft">Brouillon</option>
              <option value="ordered">Commandé / En attente</option>
            </select>
          </div>

          {/* Tri Configurable */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Trier Par</span>
            </label>
            <select
              className="industrial-input w-full p-2.5 text-xs font-semibold bg-industrial-900 border-industrial-700"
              value={historySortBy}
              onChange={e => setHistorySortBy && setHistorySortBy(e.target.value as PurchaseSortOption)}
            >
              <option value="date-desc">Date (Plus récent en premier)</option>
              <option value="date-asc">Date (Plus ancien en premier)</option>
              <option value="amount-desc">Montant TTC (Plus élevé)</option>
              <option value="amount-asc">Montant TTC (Plus faible)</option>
              <option value="debt-desc">Reste à payer (Dette la plus forte)</option>
              <option value="supplier-asc">Fournisseur (Nom A → Z)</option>
            </select>
          </div>

          {/* Dates Personnalisées : Début & Fin */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12} />
              <span>Date Début</span>
            </label>
            <input 
              type="date" 
              className="industrial-input w-full p-2.5 text-xs bg-industrial-900 border-industrial-700" 
              value={historyStartDate} 
              onChange={e => setHistoryStartDate(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12} />
              <span>Date Fin</span>
            </label>
            <input 
              type="date" 
              className="industrial-input w-full p-2.5 text-xs bg-industrial-900 border-industrial-700" 
              value={historyEndDate} 
              onChange={e => setHistoryEndDate(e.target.value)} 
            />
          </div>

          {/* Fourchette de Montants : Min & Max */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <DollarSign size={12} />
              <span>Montant Min (DA)</span>
            </label>
            <input 
              type="number" 
              placeholder="Ex: 5000"
              min="0"
              step="100"
              className="industrial-input w-full p-2.5 text-xs bg-industrial-900 border-industrial-700" 
              value={historyMinAmount} 
              onChange={e => setHistoryMinAmount && setHistoryMinAmount(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-industrial-400 uppercase tracking-widest flex items-center gap-1.5">
              <DollarSign size={12} />
              <span>Montant Max (DA)</span>
            </label>
            <input 
              type="number" 
              placeholder="Ex: 100000"
              min="0"
              step="100"
              className="industrial-input w-full p-2.5 text-xs bg-industrial-900 border-industrial-700" 
              value={historyMaxAmount} 
              onChange={e => setHistoryMaxAmount && setHistoryMaxAmount(e.target.value)} 
            />
          </div>
        </div>
      )}
    </div>
  );
});
