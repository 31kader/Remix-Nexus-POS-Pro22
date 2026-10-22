import React, { useState, useMemo } from 'react';
import { Edit, FileText, Printer, RotateCcw, ShoppingBag, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, XCircle, User, Clock, Package } from 'lucide-react';
import { Transaction, CompanySettings, RolePermissions } from '../../types';
import { formatSafe, isLocked, cn } from '../../lib/utils';
import { Card, SortableHeader } from '../ui';

interface Props {
  transactions: Transaction[];
  settings: CompanySettings;
  onReturn: (t: Transaction) => void;
  onMarkAsDelivered?: (idOrTx: any) => void | Promise<void>;
  onEdit: (t: Transaction) => void;
  onRestore?: (idOrTx: any) => void | Promise<void>;
  canAccess: (permission: keyof RolePermissions) => boolean;
  requestSort: (key: any) => void;
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  generateInvoicePDF: (t: Transaction) => void;
  handlePrint: (t: Transaction) => void;
}

export const TransactionTable: React.FC<Props> = ({
  transactions, settings, onReturn, onMarkAsDelivered, onEdit, onRestore, canAccess, requestSort, sortConfig, generateInvoicePDF, handlePrint
}) => {
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil((transactions?.length || 0) / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const displayedTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const from = (validPage - 1) * pageSize;
    return transactions.slice(from, from + pageSize);
  }, [transactions, pageSize, validPage]);

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-400 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
        Aucune transaction trouvée
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* ============================================================== */}
      {/* 1. VUE MOBILE : Cartes de Ventes Tactiles 100% Largeur Écran   */}
      {/* ============================================================== */}
      <div className="block lg:hidden space-y-3">
        {displayedTransactions.map((t) => {
          const locked = isLocked(t.timestamp, settings?.lockingPeriodDays || 0);
          const displayId = t.id ? String(t.id || "").slice(-8).toUpperCase() : '—';
          const itemsCount = Array.isArray(t.items) ? t.items.length : 0;
          const isReturned = t.status === 'returned';
          const isPartiallyReturned = t.status === 'partially_returned';
          const isCancelled = t.status === 'cancelled';

          return (
            <div 
              key={`mobile-tx-${t.id}`}
              className={cn(
                "p-4 rounded-2xl bg-zinc-900/80 border transition-all space-y-3 text-left shadow-sm",
                isCancelled ? "border-rose-900/40 bg-rose-950/10" : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              {/* En-tête : ID, Date & Badge Statut */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    #{displayId}
                  </span>
                  <p className="text-[11px] text-zinc-400 font-mono mt-1">
                    {formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <XCircle size={12} className="text-rose-400" /> Annulé
                    </span>
                  )}
                  {isReturned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <RotateCcw size={12} className="text-rose-400" /> Retourné
                    </span>
                  )}
                  {isPartiallyReturned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <RotateCcw size={12} className="text-amber-400" /> Partiel
                    </span>
                  )}
                  {!isReturned && !isPartiallyReturned && !isCancelled && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 size={12} className="text-emerald-400" /> Payé
                    </span>
                  )}
                  {t.isEdited && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Modifié
                    </span>
                  )}
                </div>
              </div>

              {/* Ligne 2 : Caissier & Détail articles */}
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <User size={13} className="text-indigo-400 shrink-0" />
                  <span className="font-bold truncate">{t.employeeName || 'Système'}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 font-medium">
                  <Package size={13} className="text-zinc-500 shrink-0" />
                  <span>{itemsCount} article{itemsCount > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Ligne 3 : Total financier */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Montant Net :</span>
                <span className={cn(
                  "text-xl font-black font-mono tracking-tight",
                  isCancelled ? "text-zinc-500 line-through" : "text-white"
                )}>
                  {Number(t.total || 0).toFixed(2)} <span className="text-xs text-indigo-400 font-bold">{settings?.currency || 'DA'}</span>
                </span>
              </div>

              {/* Ligne 4 : Boutons d'Action Tactiles */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => handlePrint(t)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  title="Imprimer le ticket de caisse"
                >
                  <Printer size={15} /> Ticket
                </button>

                <button
                  type="button"
                  onClick={() => generateInvoicePDF(t)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  title="Télécharger la facture PDF"
                >
                  <FileText size={15} /> Facture PDF
                </button>

                {(canAccess('canModifyPrices') || canAccess('canVoidTransaction')) && (
                  <button 
                    type="button"
                    onClick={() => onRestore?.(t)} 
                    className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
                    title="Modifier la vente en caisse"
                    aria-label="Modifier"
                  >
                    <ShoppingBag size={16} />
                  </button>
                )}

                {canAccess('canAccessReturns') && !isReturned && !isCancelled && (
                  <button
                    type="button"
                    onClick={() => !locked && onReturn(t)}
                    disabled={locked}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    title="Enregistrer un retour de marchandise"
                    aria-label="Retour"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 2. VUE DESKTOP : Tableau Complet pour Écrans d'Ordinateur        */}
      {/* ============================================================== */}
      <Card className="hidden lg:block overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800/40 flex w-full">
                <SortableHeader className="w-1/6" label="Date" sortKey="timestamp" currentSort={sortConfig} onSort={() => requestSort('timestamp')} />
                <SortableHeader className="w-1/6" label="Utilisateur" sortKey="employeeName" currentSort={sortConfig} onSort={() => requestSort('employeeName')} />
                <SortableHeader className="w-1/6" label="ID" sortKey="id_display" currentSort={sortConfig} onSort={() => requestSort('id_display')} />
                <th className="w-1/12 p-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase">Articles</th>
                <SortableHeader className="w-1/12" label="Statut" sortKey="status" currentSort={sortConfig} onSort={() => requestSort('status')} />
                <SortableHeader className="w-1/6" label="Total" sortKey="total" currentSort={sortConfig} onSort={() => requestSort('total')} />
                <th className="w-1/6 p-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 block w-full">
              {displayedTransactions.map((t) => {
                const locked = isLocked(t.timestamp, settings?.lockingPeriodDays || 0);
                const displayId = t.id ? String(t.id || "").slice(-8).toUpperCase() : '—';
                const itemsCount = Array.isArray(t.items) ? t.items.length : 0;
                const isReturned = t.status === 'returned';
                const isPartiallyReturned = t.status === 'partially_returned';
                const isCancelled = t.status === 'cancelled';

                return (
                  <tr key={t.id} className={cn(
                    "flex w-full items-center transition-colors",
                    isCancelled 
                      ? "bg-rose-500/5 dark:bg-rose-950/20 hover:bg-rose-500/10 opacity-75"
                      : "hover:bg-slate-50 dark:hover:bg-white/5"
                  )}>
                    <td className="w-1/6 p-4 text-sm text-slate-600 dark:text-white/60 truncate">{formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="w-1/6 p-4 text-sm font-bold text-slate-900 dark:text-white truncate">{t.employeeName || 'Système'}</td>
                    <td className="w-1/6 p-4 text-sm font-mono text-slate-400 dark:text-white/40 truncate">#{displayId}</td>
                    <td className="w-1/12 p-4 text-sm text-slate-600 dark:text-white/60 truncate">{itemsCount} art.</td>
                    <td className="w-1/12 p-4">
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40">
                          <XCircle size={11} className="text-rose-500 dark:text-rose-400" /> Annulé
                        </span>
                      )}
                      {isReturned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40">
                          <RotateCcw size={11} className="text-rose-500 dark:text-rose-400" /> Retourné
                        </span>
                      )}
                      {isPartiallyReturned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                          <RotateCcw size={11} className="text-amber-500 dark:text-amber-400" /> Partiel
                        </span>
                      )}
                      {!isReturned && !isPartiallyReturned && !isCancelled && (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 size={11} className="text-emerald-500 dark:text-emerald-400" /> Payé
                          </span>
                          {t.isEdited && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30" title={`Modifié le ${t.editedAt ? new Date(t.editedAt).toLocaleString('fr-FR') : ''}${t.editedBy ? ` par ${t.editedBy}` : ''}`}>
                              Modifié
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={cn(
                      "w-1/6 p-4 font-bold truncate",
                      isCancelled ? "text-slate-400 dark:text-zinc-500 line-through" : "text-slate-900 dark:text-white"
                    )}>
                      {Number(t.total || 0).toFixed(2)} {settings?.currency || 'DA'}
                    </td>
                    <td className="w-1/6 p-4 text-right flex items-center justify-end gap-2 pr-6">
                      {canAccess('canAccessReturns') && !isReturned && !isCancelled && (
                        <button
                          type="button"
                          onClick={() => !locked && onReturn(t)}
                          disabled={locked}
                          className="p-2 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Enregistrer un retour de marchandise"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      {(canAccess('canModifyPrices') || canAccess('canVoidTransaction')) && (
                        <button 
                          type="button"
                          onClick={() => onRestore?.(t)} 
                          className="p-2 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg transition-colors"
                          title="Modifier la vente en caisse"
                        >
                          <ShoppingBag size={16} />
                        </button>
                      )}
                      {t.status === 'pending' && (
                        <button type="button" onClick={() => !locked && onEdit(t)} className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg">
                          <Edit size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => generateInvoicePDF(t)} className="p-2 text-slate-400 hover:text-emerald-400" title="Télécharger PDF">
                        <FileText size={18} />
                      </button>
                      <button type="button" onClick={() => handlePrint(t)} className="p-2 text-slate-400 hover:text-indigo-400" title="Imprimer Ticket">
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Barre de contrôle d'affichage et pagination responsive */}
      <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 font-bold">Lignes :</span>
          {[25, 50, 100].map(size => (
            <button
              key={size}
              type="button"
              onClick={() => { setPageSize(size); setCurrentPage(1); }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${pageSize === size ? 'bg-indigo-600 text-white shadow-xs' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              {size}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <ChevronLeft size={15} /> Précédent
            </button>
            <span className="text-xs font-mono font-bold text-indigo-400 px-1">
              {validPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              Suivant <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionTable;
