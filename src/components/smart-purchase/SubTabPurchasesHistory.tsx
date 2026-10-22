import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Printer, 
  FileText, 
  Edit, 
  Trash2, 
  Filter, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, Button } from '../ui';
import { Purchase, Supplier } from '../../types';
import { formatSafe } from '../../lib/utils';
import { printHistory } from '../../services/printService';
import { useCoreStore } from '../../store/useCoreStore';
import { 
  PurchasePaymentStatusFilter, 
  PurchaseReceiptStatusFilter, 
  PurchaseSortOption, 
  PurchasesSummary 
} from './purchaseHelpers';

const PURCHASES_PAGE_SIZE = 50;

interface SubTabPurchasesHistoryProps {
  filteredPurchases: Purchase[];
  suppliers?: Supplier[];
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
  isAdvancedFiltersOpen?: boolean;
  setIsAdvancedFiltersOpen?: (v: boolean | ((prev: boolean) => boolean)) => void;
  resetHistoryFilters?: () => void;
  activeFiltersCount?: number;
  purchasesSummary?: PurchasesSummary;
  setViewingPurchaseVoucher: (p: Purchase) => void;
  handleEditPurchaseRequest: (p: Purchase) => void;
  setPurchaseToDelete: (id: string) => void;
}

export function SubTabPurchasesHistory({
  filteredPurchases,
  suppliers = [],
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
  isAdvancedFiltersOpen,
  setIsAdvancedFiltersOpen,
  resetHistoryFilters,
  activeFiltersCount = 0,
  purchasesSummary,
  setViewingPurchaseVoucher,
  handleEditPurchaseRequest,
  setPurchaseToDelete,
}: SubTabPurchasesHistoryProps) {
  const settings = useCoreStore(s => s.settings);
  const [localFiltersOpen, setLocalFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    historySearch,
    historyStartDate,
    historyEndDate,
    historySupplierId,
    historyPaymentStatus,
    historyReceiptStatus,
    historyQuickDate,
    historyMinAmount,
    historyMaxAmount,
    historySortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PURCHASES_PAGE_SIZE));
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * PURCHASES_PAGE_SIZE;
    return filteredPurchases.slice(start, start + PURCHASES_PAGE_SIZE);
  }, [filteredPurchases, currentPage]);

  const filtersOpen = isAdvancedFiltersOpen !== undefined ? isAdvancedFiltersOpen : localFiltersOpen;
  const toggleFiltersOpen = () => {
    if (setIsAdvancedFiltersOpen) {
      setIsAdvancedFiltersOpen((prev: boolean) => !prev);
    } else {
      setLocalFiltersOpen(prev => !prev);
    }
  };

  // Calcul KPI par défaut si non fourni
  const summary: PurchasesSummary = purchasesSummary || {
    count: filteredPurchases.length,
    totalAmount: filteredPurchases.reduce((acc, p: any) => acc + Number(p.total ?? p.totalAmount ?? 0), 0),
    totalPaid: filteredPurchases.reduce((acc, p: any) => acc + Number(p.paidAmount ?? 0), 0),
    totalDebt: filteredPurchases.reduce((acc, p: any) => acc + Math.max(0, Number(p.total ?? p.totalAmount ?? 0) - Number(p.paidAmount ?? 0)), 0),
  };

  return (
    <div className="space-y-6">
      {/* 1. Synthèse chiffrée & Indicateurs KPI en temps réel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="industrial-card p-4 flex flex-col justify-between border-l-4 border-indigo-500">
          <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
            <span>Bons d'Achat</span>
            <FileText size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {summary.count}
          </div>
          <div className="text-[10px] text-industrial-500 font-bold uppercase tracking-widest mt-1">
            Résultats filtrés
          </div>
        </div>

        <div className="industrial-card p-4 flex flex-col justify-between border-l-4 border-blue-500">
          <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
            <span>Total TTC</span>
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-300 font-mono">
            {summary.totalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-industrial-400">DA</span>
          </div>
          <div className="text-[10px] text-industrial-500 font-bold uppercase tracking-widest mt-1">
            Montant global facturé
          </div>
        </div>

        <div className="industrial-card p-4 flex flex-col justify-between border-l-4 border-emerald-500">
          <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Réglé</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {summary.totalPaid.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-industrial-400">DA</span>
          </div>
          <div className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest mt-1">
            Versements effectués
          </div>
        </div>

        <div className={`industrial-card p-4 flex flex-col justify-between border-l-4 ${summary.totalDebt > 0 ? 'border-rose-500 bg-rose-950/10' : 'border-industrial-700'}`}>
          <div className="flex items-center justify-between text-industrial-400 text-xs font-bold uppercase tracking-wider">
            <span>Reste à Payer (Dette)</span>
            <AlertCircle size={16} className={summary.totalDebt > 0 ? 'text-rose-400' : 'text-industrial-500'} />
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${summary.totalDebt > 0 ? 'text-rose-400' : 'text-industrial-400'}`}>
            {summary.totalDebt.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-industrial-400">DA</span>
          </div>
          <div className="text-[10px] text-industrial-500 font-bold uppercase tracking-widest mt-1">
            {summary.totalDebt > 0 ? 'Dettes fournisseurs restantes' : 'Tous les comptes sont à jour'}
          </div>
        </div>
      </div>

      {/* 2. Barre de filtres & Actions */}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-industrial-300 p-1"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Raccourcis de dates rapides */}
          {setQuickDatePeriod && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 bg-industrial-950/60 p-1 rounded-xl border border-industrial-800">
              <button
                onClick={() => setQuickDatePeriod('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  historyQuickDate === 'all' && !historyStartDate && !historyEndDate
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setQuickDatePeriod('today')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  historyQuickDate === 'today'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setQuickDatePeriod('yesterday')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  historyQuickDate === 'yesterday'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                Hier
              </button>
              <button
                onClick={() => setQuickDatePeriod('7days')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  historyQuickDate === '7days'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                7 Jours
              </button>
              <button
                onClick={() => setQuickDatePeriod('month')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  historyQuickDate === 'month'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                Ce Mois
              </button>
            </div>
          )}

          {/* Boutons d'Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleFiltersOpen}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border transition-all ${
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
                className="px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-industrial-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
                title="Réinitialiser tous les filtres"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}

            <Button 
              onClick={() => printHistory(filteredPurchases, settings)} 
              className="industrial-button-primary bg-industrial-800 text-industrial-300 border border-industrial-700 py-2.5 px-4 shadow-none flex gap-2"
            >
              <Printer size={16}/> Rapport
            </Button>

            {filteredPurchases.length > 0 && (
              <Button
                onClick={async () => {
                  if (!window.confirm(`Voulez-vous vraiment supprimer ces ${filteredPurchases.length} bon(s) d'achat et réajuster automatiquement les stocks correspondants ?`)) return;
                  const { handleDeletePurchaseDb } = await import('./purchaseDbOperations');
                  for (const p of filteredPurchases) {
                    await handleDeletePurchaseDb({
                      purchaseId: p.id,
                      setIsProcessing: () => {},
                      setPurchaseToDelete: () => {}
                    });
                  }
                }}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
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

      {/* 3. Tableau des Bons d'Approvisionnement */}
      <Card className="industrial-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-950 border-b border-industrial-800 text-xs font-black uppercase tracking-wider text-industrial-400">
                <th className="p-4">Date</th>
                <th className="p-4">Fournisseur</th>
                <th className="p-4">N° Facture</th>
                <th className="p-4">Statut Bon</th>
                <th className="p-4">Paiement</th>
                <th className="p-4">Total TTC</th>
                <th className="p-4">Payé</th>
                <th className="p-4">Reste</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800">
              {paginatedPurchases.map(p => {
                const total = Number(p.total ?? (p as any).totalAmount ?? (p as any).total_amount ?? 0);
                const paid = Number(p.paidAmount ?? (p as any).paid_amount ?? 0);
                const debt = Math.max(0, total - paid);
                const isPaid = debt <= 0.001;
                const isPartial = !isPaid && paid > 0.001;
                const isUnpaid = !isPaid && paid <= 0.001;

                return (
                  <tr 
                    key={p.id} 
                    className="hover:bg-industrial-800/30 transition-colors cursor-pointer group" 
                    onClick={() => setViewingPurchaseVoucher(p)}
                  >
                    <td className="p-4 text-xs font-mono text-industrial-400 whitespace-nowrap">
                      {formatSafe(p.date, 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="p-4 text-sm font-black text-white uppercase tracking-tight">
                      {p.supplierName}
                    </td>
                    <td className="p-4 text-xs font-mono text-indigo-400 font-bold whitespace-nowrap">
                      {p.invoiceNumber}
                    </td>
                    <td className="p-4 text-xs">
                      {p.status === 'draft' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                          Brouillon
                        </span>
                      ) : p.status === 'ordered' ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">
                          Commandé
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                          Réceptionné
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 size={10} /> Soldé
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                          <Clock size={10} /> Partiel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider">
                          <AlertCircle size={10} /> Impayé
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-md font-black text-white font-mono whitespace-nowrap">
                      {total.toFixed(2)} <span className="text-[10px] text-industrial-500">DA</span>
                    </td>
                    <td className="p-4 text-sm text-emerald-400 font-black font-mono whitespace-nowrap">
                      {paid.toFixed(2)} <span className="text-[10px] text-emerald-500/60">DA</span>
                    </td>
                    <td className={`p-4 text-sm font-black font-mono whitespace-nowrap ${debt > 0 ? 'text-rose-400' : 'text-industrial-500'}`}>
                      {debt.toFixed(2)} <span className="text-[10px] text-industrial-500">DA</span>
                    </td>
                    <td className="p-4 text-right flex gap-2 justify-end items-center" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => setViewingPurchaseVoucher(p)} 
                        title="Voir le bon de réception"
                        className="p-2 text-industrial-400 hover:text-indigo-400 hover:bg-industrial-800 transition-all rounded-xl"
                      >
                        <FileText size={18}/>
                      </button>
                      <button 
                        onClick={() => handleEditPurchaseRequest(p)} 
                        title="Modifier ce bon" 
                        className="p-2 text-amber-500 hover:bg-amber-500/10 transition-all rounded-xl border border-amber-500/20"
                      >
                        <Edit size={18}/>
                      </button>
                      <button 
                        onClick={() => setPurchaseToDelete(p.id)} 
                        title="Supprimer ce bon"
                        className="p-2 text-rose-500 hover:bg-rose-500/10 transition-all rounded-xl border border-rose-500/20"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-industrial-800 text-industrial-400 flex items-center justify-center mx-auto">
                        <Search size={22} />
                      </div>
                      <p className="text-sm font-bold text-white uppercase tracking-wider">
                        Aucun bon d'achat correspondant
                      </p>
                      <p className="text-xs text-industrial-400">
                        {activeFiltersCount > 0 
                          ? 'Certains filtres sont actifs et restreignent les résultats.' 
                          : 'Aucun enregistrement d\'achat n\'est disponible pour le moment.'}
                      </p>
                      {resetHistoryFilters && activeFiltersCount > 0 && (
                        <button
                          onClick={resetHistoryFilters}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          <RotateCcw size={14} /> Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredPurchases.length > PURCHASES_PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-industrial-950 border-t border-industrial-800">
            <p className="text-xs font-bold text-industrial-400">
              Affichage de <span className="text-white font-black">{(currentPage - 1) * PURCHASES_PAGE_SIZE + 1}</span> à{' '}
              <span className="text-white font-black">{Math.min(currentPage * PURCHASES_PAGE_SIZE, filteredPurchases.length)}</span> sur{' '}
              <span className="text-white font-black">{filteredPurchases.length}</span> bons d'achat
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-industrial-900 border border-industrial-700 text-xs font-black text-industrial-200 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              <span className="text-xs font-mono font-black text-industrial-200 px-2">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-industrial-900 border border-industrial-700 text-xs font-black text-industrial-200 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
