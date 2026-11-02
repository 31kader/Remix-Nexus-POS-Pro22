import React from 'react';
import { Search, X, User, Filter, ShieldAlert, Clock, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import { Card } from '../ui';
import { cn } from '../../lib/utils';
import { 
  AuditPeriodFilter, 
  AuditActionCategory, 
  AuditShiftHourFilter, 
  AuditSortBy 
} from '../../hooks/useAuditLogsLogic';

interface AuditLogsFilterPanelProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  periodFilter: AuditPeriodFilter;
  setPeriodFilter: (p: AuditPeriodFilter) => void;
  userFilter: string;
  setUserFilter: (u: string) => void;
  usersList: string[];
  actionCategoryFilter: AuditActionCategory;
  setActionCategoryFilter: (c: AuditActionCategory) => void;
  moduleFilter: string;
  setModuleFilter: (m: string) => void;
  modules: string[];
  severityFilter: string;
  setSeverityFilter: (s: string) => void;
  shiftHourFilter: AuditShiftHourFilter;
  setShiftHourFilter: (h: AuditShiftHourFilter) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  minAmountFilter: string;
  setMinAmountFilter: (a: string) => void;
  statusFilter: 'all' | 'active' | 'cancelled';
  setStatusFilter: (s: 'all' | 'active' | 'cancelled') => void;
  sortBy: AuditSortBy;
  setSortBy: (s: AuditSortBy) => void;
  hasActiveFilters: boolean;
  resetAllFilters: () => void;
  filteredLogsCount: number;
  currency: string;
}

const PERIOD_PRESETS: Array<{ id: AuditPeriodFilter; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: '7d', label: '7 Jours' },
  { id: '30d', label: '30 Jours' },
  { id: 'month', label: 'Ce Mois' },
];

export const AuditLogsFilterPanel: React.FC<AuditLogsFilterPanelProps> = ({
  searchTerm,
  setSearchTerm,
  periodFilter,
  setPeriodFilter,
  userFilter,
  setUserFilter,
  usersList,
  actionCategoryFilter,
  setActionCategoryFilter,
  moduleFilter,
  setModuleFilter,
  modules,
  severityFilter,
  setSeverityFilter,
  shiftHourFilter,
  setShiftHourFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  minAmountFilter,
  setMinAmountFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  hasActiveFilters,
  resetAllFilters,
  filteredLogsCount,
  currency,
}) => {
  return (
    <Card className="p-0 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
      <div className="p-5 bg-slate-50/70 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 space-y-4">
        {/* Ligne 1 : Recherche + Périodes Rapides + Bouton Reset */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Rechercher par utilisateur, opération, article, N° ticket, montant ou détail..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Périodes Rapides */}
          <div className="flex flex-wrap items-center gap-1.5">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodFilter(p.id)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer border",
                  periodFilter === p.id
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                    : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-indigo-400"
                )}
              >
                {p.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-2 rounded-xl text-[11px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-1 cursor-pointer"
              >
                <X size={13} /> Réinitialiser ({filteredLogsCount})
              </button>
            )}
          </div>
        </div>

        {/* Ligne 2 : Grille des Sélecteurs Multi-Critères */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Utilisateur / Caissier */}
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <User size={11} className="text-indigo-500" /> Utilisateur / Caissier
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="all">Tous les utilisateurs ({usersList.length})</option>
              {usersList.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* 2. Catégorie d'Opération */}
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Filter size={11} className="text-indigo-500" /> Type d'Opération
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={actionCategoryFilter}
              onChange={(e) => setActionCategoryFilter(e.target.value as AuditActionCategory)}
            >
              <option value="all">Toutes les catégories</option>
              <option value="sales">🛒 Ventes & Encaissements POS</option>
              <option value="price_discount">🏷️ Modifications Prix & Remises</option>
              <option value="deletions">🗑️ Suppressions & Purges</option>
              <option value="returns_undo">↩️ Retours & Annulations</option>
              <option value="stock">📦 Mouvements Stock & Inventaire</option>
              <option value="finance">💼 Dépenses, Clôtures & Fournisseurs</option>
              <option value="auth_security">🔐 Connexions & Sécurité</option>
            </select>
          </div>

          {/* 3. Module Système */}
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1">
              Module Système
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="all">Tous les modules ({modules.length})</option>
              {modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 4. Niveau de Criticité */}
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <ShieldAlert size={11} className="text-rose-500" /> Niveau de Criticité
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">Toutes criticités</option>
              <option value="critical">🚨 Critique (Suppression / Annulation)</option>
              <option value="high">🔶 Élevé (Prix / Remise / Stock)</option>
              <option value="warning">⚠️ Attention (Modification / Dépense)</option>
              <option value="info">ℹ️ Information standard</option>
            </select>
          </div>

          {/* 5. Tranche Horaire (Shift) */}
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Clock size={11} className="text-purple-500" /> Tranche Horaire / Shift
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={shiftHourFilter}
              onChange={(e) => setShiftHourFilter(e.target.value as AuditShiftHourFilter)}
            >
              <option value="all">Toutes les heures (24h/24)</option>
              <option value="morning">🌅 Équipe Matin (06h00 - 14h00)</option>
              <option value="afternoon">☀️ Équipe Après-Midi (14h00 - 22h00)</option>
              <option value="night">🌙 Nuit / Hors-Horaires (22h00 - 06h00)</option>
            </select>
          </div>
        </div>

        {/* Ligne 3 : Dates exactes Du / Au + Montant Minimum + Statut Rollback + Tri */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-200/70 dark:border-zinc-800">
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar size={11} /> Date Début (Du)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar size={11} /> Date Fin (Au)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <DollarSign size={11} className="text-emerald-500" /> Montant Min. Détecté ({currency})
            </label>
            <input
              type="number"
              placeholder="Ex: 5000 DA..."
              value={minAmountFilter}
              onChange={(e) => setMinAmountFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1">
              Statut d'Annulation
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Tous (Actifs + Annulés)</option>
              <option value="active">✅ Actions Actives uniquement</option>
              <option value="cancelled">↩️ Actions Annulées (Rollback)</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <ArrowUpDown size={11} className="text-indigo-500" /> Ordre de Tri
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AuditSortBy)}
            >
              <option value="newest">🕒 Plus récents en premier</option>
              <option value="oldest">⏳ Plus anciens en premier</option>
              <option value="severity_desc">🚨 Plus critiques en premier</option>
              <option value="user_asc">👤 Utilisateur (A → Z)</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
};
