import React from 'react';
import { AuditLog, CompanySettings, Product, Transaction } from '../types';
import { Card, ConfirmDialog } from './ui';
import {
  Search,
  FileSpreadsheet,
  Database,
  ShieldAlert,
  AlertTriangle,
  Clock,
  RotateCcw,
  Filter,
  Printer,
  X,
  User,
  Calendar,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import { exportToExcel, exportToCSV, cn, formatSafe } from '../lib/utils';
import { EditLogModal } from './audit-logs/EditLogModal';
import { UndoLogModal } from './audit-logs/UndoLogModal';
import { AuditLogsTable } from './audit-logs/AuditLogsTable';
import { useAuditLogsLogic, inferLogSeverity } from '../hooks/useAuditLogsLogic';

interface AuditLogsProps {
  logs: AuditLog[];
  settings: CompanySettings;
  products?: Product[];
  transactions?: Transaction[];
}

export function AuditLogs({ logs = [], settings, products = [], transactions = [] }: AuditLogsProps) {
  const {
    searchTerm,
    setSearchTerm,
    moduleFilter,
    setModuleFilter,
    userFilter,
    setUserFilter,
    severityFilter,
    setSeverityFilter,
    actionCategoryFilter,
    setActionCategoryFilter,
    statusFilter,
    setStatusFilter,
    periodFilter,
    setPeriodFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    shiftHourFilter,
    setShiftHourFilter,
    minAmountFilter,
    setMinAmountFilter,
    sortBy,
    setSortBy,
    resetAllFilters,
    stats,
    usersList,
    viewingLog,
    setViewingLog,
    editingLog,
    setEditingLog,
    editUserName,
    setEditUserName,
    editAction,
    setEditAction,
    editModule,
    setEditModule,
    editDetails,
    setEditDetails,
    editSeverity,
    setEditSeverity,
    deletingLog,
    setDeletingLog,
    cancellingLog,
    setCancellingLog,
    undoTransactionDetails,
    shouldRestoreStock,
    setShouldRestoreStock,
    isProcessingUndo,
    filteredLogs,
    modules,
    handleOpenEdit,
    handleSaveEdit,
    handleDeleteConfirm,
    handleOpenCancelUndo,
    handleConfirmCancelUndo
  } = useAuditLogsLogic(logs, products, transactions);

  const hasActiveFilters =
    searchTerm !== '' ||
    moduleFilter !== 'all' ||
    userFilter !== 'all' ||
    severityFilter !== 'all' ||
    actionCategoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    periodFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    shiftHourFilter !== 'all' ||
    minAmountFilter !== '' ||
    sortBy !== 'newest';

  const handlePrintAuditReport = () => {
    const win = window.open('', '_blank', 'width=1050,height=800');
    if (!win) return;
    const rowsHtml = filteredLogs
      .slice(0, 500)
      .map(
        (l, idx) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${idx + 1}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${formatSafe(l.timestamp, 'dd/MM/yyyy HH:mm:ss')}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;">${inferLogSeverity(l).toUpperCase()}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;">${l.userName || 'Système'}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${l.action || ''}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${l.module || ''}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${l.details || ''}</td>
        </tr>`
      )
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Rapport Officiel des Journaux d'Audit — ${settings.name || 'Nexus POS Pro'}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #1e293b; color: white; padding: 8px; font-size: 11px; text-align: left; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h2 style="margin:0;">RAPPORT D'INVESTIGATION & JOURNAUX D'AUDIT</h2>
          <p style="margin:4px 0 12px;font-size:12px;color:#475569;">
            Établissement : <strong>${settings.name || 'Nexus POS Pro'}</strong> • Généré le ${new Date().toLocaleString('fr-FR')} • Total filtré : <strong>${filteredLogs.length}</strong> événement(s)
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date & Heure</th>
                <th>Criticité</th>
                <th>Utilisateur</th>
                <th>Opération</th>
                <th>Module</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Journaux d'Audit & Investigation Sécurité
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {filteredLogs.length} / {logs.length} Événements
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Traçabilité intégrale multi-critères : opérations caisse, suppressions, modifications de prix, horaires tardifs et annulations (Rollback).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrintAuditReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all font-black uppercase text-[10px] tracking-wider border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-500" />
            Imprimer Rapport A4
          </button>
          <button
            onClick={() => exportToExcel(filteredLogs, 'audit_logs_filtres')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-black uppercase text-[10px] tracking-wider shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel ({filteredLogs.length})
          </button>
          <button
            onClick={() => exportToCSV(filteredLogs, 'audit_logs_filtres')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-black uppercase text-[10px] tracking-wider shadow-sm cursor-pointer"
          >
            <Database className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 5 Cartes KPIs Interactives Cliquables */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={resetAllFilters}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer",
            !hasActiveFilters
              ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-indigo-500/40"
          )}
        >
          <p className={cn("text-[10px] font-black uppercase tracking-wider", !hasActiveFilters ? "text-indigo-100" : "text-slate-500 dark:text-zinc-400")}>
            Total Journalisé
          </p>
          <p className={cn("text-2xl font-black mt-1", !hasActiveFilters ? "text-white" : "text-slate-900 dark:text-white")}>
            {stats.total}
          </p>
          <p className={cn("text-[10px] mt-1 font-bold", !hasActiveFilters ? "text-indigo-200" : "text-indigo-600 dark:text-indigo-400")}>
            Voir tout l'historique
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            resetAllFilters();
            setSeverityFilter('critical');
          }}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer",
            severityFilter === 'critical'
              ? "bg-rose-600 text-white border-rose-500 shadow-md"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-rose-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <p className={cn("text-[10px] font-black uppercase tracking-wider", severityFilter === 'critical' ? "text-rose-100" : "text-rose-600 dark:text-rose-400")}>
              Critiques & Sensibles
            </p>
            <ShieldAlert size={15} className={severityFilter === 'critical' ? "text-white" : "text-rose-500"} />
          </div>
          <p className={cn("text-2xl font-black mt-1", severityFilter === 'critical' ? "text-white" : "text-slate-900 dark:text-white")}>
            {stats.criticalCount}
          </p>
          <p className={cn("text-[10px] mt-1 font-bold", severityFilter === 'critical' ? "text-rose-100" : "text-slate-500 dark:text-zinc-400")}>
            Isoler les alertes critiques
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            resetAllFilters();
            setActionCategoryFilter('price_discount');
          }}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer",
            actionCategoryFilter === 'price_discount' || actionCategoryFilter === 'deletions'
              ? "bg-amber-600 text-white border-amber-500 shadow-md"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <p className={cn("text-[10px] font-black uppercase tracking-wider", actionCategoryFilter === 'price_discount' ? "text-amber-100" : "text-amber-600 dark:text-amber-400")}>
              Prix, Remises & Suppr.
            </p>
            <AlertTriangle size={15} className={actionCategoryFilter === 'price_discount' ? "text-white" : "text-amber-500"} />
          </div>
          <p className={cn("text-2xl font-black mt-1", actionCategoryFilter === 'price_discount' ? "text-white" : "text-slate-900 dark:text-white")}>
            {stats.deletionsAndPriceCount}
          </p>
          <p className={cn("text-[10px] mt-1 font-bold", actionCategoryFilter === 'price_discount' ? "text-amber-100" : "text-slate-500 dark:text-zinc-400")}>
            Modifications de tarifs
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            resetAllFilters();
            setShiftHourFilter('night');
          }}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer",
            shiftHourFilter === 'night'
              ? "bg-purple-600 text-white border-purple-500 shadow-md"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-purple-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <p className={cn("text-[10px] font-black uppercase tracking-wider", shiftHourFilter === 'night' ? "text-purple-100" : "text-purple-600 dark:text-purple-400")}>
              Horaires Tardifs (22h-06h)
            </p>
            <Clock size={15} className={shiftHourFilter === 'night' ? "text-white" : "text-purple-500"} />
          </div>
          <p className={cn("text-2xl font-black mt-1", shiftHourFilter === 'night' ? "text-white" : "text-slate-900 dark:text-white")}>
            {stats.nightOpsCount}
          </p>
          <p className={cn("text-[10px] mt-1 font-bold", shiftHourFilter === 'night' ? "text-purple-100" : "text-slate-500 dark:text-zinc-400")}>
            Activités hors ouverture
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            resetAllFilters();
            setStatusFilter('cancelled');
          }}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer col-span-2 lg:col-span-1",
            statusFilter === 'cancelled'
              ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-emerald-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <p className={cn("text-[10px] font-black uppercase tracking-wider", statusFilter === 'cancelled' ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400")}>
              Actions Annulées (Rollback)
            </p>
            <RotateCcw size={15} className={statusFilter === 'cancelled' ? "text-white" : "text-emerald-500"} />
          </div>
          <p className={cn("text-2xl font-black mt-1", statusFilter === 'cancelled' ? "text-white" : "text-slate-900 dark:text-white")}>
            {stats.cancelledCount}
          </p>
          <p className={cn("text-[10px] mt-1 font-bold", statusFilter === 'cancelled' ? "text-emerald-100" : "text-slate-500 dark:text-zinc-400")}>
            Opérations inversées
          </p>
        </button>
      </div>

      {/* Panneau de Filtrage Avancé (11 Filtres Combinables) */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Périodes Rapides */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Tout' },
                { id: 'today', label: "Aujourd'hui" },
                { id: 'yesterday', label: 'Hier' },
                { id: '7d', label: '7 Jours' },
                { id: '30d', label: '30 Jours' },
                { id: 'month', label: 'Ce Mois' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id as any)}
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
                  <X size={13} /> Réinitialiser ({filteredLogs.length})
                </button>
              )}
            </div>
          </div>

          {/* Ligne 2 : Grille des 9 Sélecteurs Multi-Critères */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Utilisateur / Caissier */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                <User size={11} className="text-indigo-500" /> Utilisateur / Caissier
              </label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
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
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                value={actionCategoryFilter}
                onChange={(e) => setActionCategoryFilter(e.target.value as any)}
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
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
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
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
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
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                value={shiftHourFilter}
                onChange={(e) => setShiftHourFilter(e.target.value as any)}
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
                <DollarSign size={11} className="text-emerald-500" /> Montant Min. Détecté ({settings.currency || 'DA'})
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
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
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
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">🕒 Plus récents en premier</option>
                <option value="oldest">⏳ Plus anciens en premier</option>
                <option value="severity_desc">🚨 Plus critiques en premier</option>
                <option value="user_asc">👤 Utilisateur (A → Z)</option>
              </select>
            </div>
          </div>
        </div>

        <AuditLogsTable
          filteredLogs={filteredLogs}
          setViewingLog={setViewingLog}
          handleOpenCancelUndo={handleOpenCancelUndo}
          handleOpenEdit={handleOpenEdit}
          setDeletingLog={setDeletingLog}
        />
      </Card>

      {/* MODAL: Consulter les détails complets de l'action d'audit */}
      {viewingLog && (() => {
        const logTime = new Date(viewingLog.timestamp || 0).getTime();
        const relatedTx = transactions.find(t => {
          const txTime = new Date(t.timestamp || (t as any).date || 0).getTime();
          return !isNaN(txTime) && !isNaN(logTime) && Math.abs(txTime - logTime) < 120000;
        });
        const sev = inferLogSeverity(viewingLog);
        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setViewingLog(null)}>
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-left" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Fiche d'Investigation & Traçabilité Sécurité
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mt-0.5">
                    {viewingLog.action || 'Action Système'}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    ID Événement : #{viewingLog.id} • {formatSafe(viewingLog.timestamp, 'dd/MM/yyyy à HH:mm:ss')}
                  </p>
                </div>
                <button onClick={() => setViewingLog(null)} className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
                  <p className="text-[10px] font-black uppercase text-slate-400">Opérateur</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate">{viewingLog.userName || 'Système'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
                  <p className="text-[10px] font-black uppercase text-slate-400">Module</p>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase">{viewingLog.module || 'POS'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
                  <p className="text-[10px] font-black uppercase text-slate-400">Niveau Criticité</p>
                  <p className="text-xs font-black uppercase mt-1 text-amber-600 dark:text-amber-400">{sev}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
                  <p className="text-[10px] font-black uppercase text-slate-400">Statut</p>
                  <p className="text-xs font-black uppercase mt-1 text-emerald-600 dark:text-emerald-400">
                    {(viewingLog as any).isCancelled ? 'ANNULÉ (ROLLBACK)' : 'ACTIF & VALIDÉ'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Détails complets de l'opération enregistrée :</p>
                <p className="leading-relaxed whitespace-pre-wrap break-words text-sm text-white font-bold">
                  {String(viewingLog.details || 'Aucun détail supplémentaire')}
                </p>
              </div>

              {relatedTx && (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      🧾 Détail du Ticket / Transaction Associée (#{String(relatedTx.id).slice(-8)})
                    </span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      Total : {Number(relatedTx.total || 0).toFixed(2)} {settings.currency} ({relatedTx.paymentMethod || 'Espèces'})
                    </span>
                  </div>
                  {Array.isArray(relatedTx.items) && relatedTx.items.length > 0 && (
                    <div className="max-h-40 overflow-y-auto divide-y divide-indigo-200/50 dark:divide-indigo-800/40 text-xs">
                      {relatedTx.items.map((item: any, idx: number) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{item.name || 'Article'}</span>
                          <span className="font-mono text-slate-600 dark:text-zinc-400">
                            {item.quantity || 1} x {Number(item.price || 0).toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => {
                    const target = viewingLog;
                    setViewingLog(null);
                    handleOpenCancelUndo(target);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={14} /> {(viewingLog as any).isCancelled ? "Rétablir l'opération" : "Annuler l'opération (Rollback)"}
                </button>
                <button
                  onClick={() => setViewingLog(null)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Modifier le Log */}
      <EditLogModal
        editingLog={editingLog}
        setEditingLog={setEditingLog}
        editUserName={editUserName}
        setEditUserName={setEditUserName}
        editModule={editModule}
        setEditModule={setEditModule}
        editAction={editAction}
        setEditAction={setEditAction}
        editDetails={editDetails}
        setEditDetails={setEditDetails}
        editSeverity={editSeverity}
        setEditSeverity={setEditSeverity}
        handleSaveEdit={handleSaveEdit}
      />

      {/* CONFIRM: Deleting Log */}
      <ConfirmDialog
        isOpen={!!deletingLog}
        onClose={() => setDeletingLog(null)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer Entrée Journal"
        message={`Voulez-vous vraiment supprimer définitivement cet enregistrement du journal d'audit de ${deletingLog?.userName} (${deletingLog?.action}) ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Conserver"
        variant="danger"
      />

      {/* MODAL: Cancel / Undo / Revert Action */}
      <UndoLogModal
        cancellingLog={cancellingLog}
        setCancellingLog={setCancellingLog}
        undoTransactionDetails={undoTransactionDetails}
        settings={settings}
        shouldRestoreStock={shouldRestoreStock}
        setShouldRestoreStock={setShouldRestoreStock}
        isProcessingUndo={isProcessingUndo}
        handleConfirmCancelUndo={handleConfirmCancelUndo}
      />
    </div>
  );
}
