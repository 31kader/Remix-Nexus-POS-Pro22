import React from 'react';
import { History, ChevronUp, Edit2, Trash2 } from 'lucide-react';
import { cn, formatSafe } from '../../../lib/utils';
import { Card, SortableHeader } from '../../ui';
import { StockAdjustment } from '../../../types';

interface StockHistoryTableProps {
  adjustments: StockAdjustment[];
  paginatedAdjustments: StockAdjustment[];
  sortConfig: { key: keyof StockAdjustment; direction: 'asc' | 'desc' } | null;
  requestSort: (key: keyof StockAdjustment) => void;
  currentPage: number;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  totalPages: number;
  pageSize: number;
  onEditClick: (adj: StockAdjustment) => void;
  onDeleteClick: (adj: StockAdjustment) => void;
}

export function StockHistoryTable({
  adjustments,
  paginatedAdjustments,
  sortConfig,
  requestSort,
  currentPage,
  setCurrentPage,
  totalPages,
  pageSize,
  onEditClick,
  onDeleteClick
}: StockHistoryTableProps) {
  return (
    <Card className="overflow-hidden bg-workspace border border-industrial-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-industrial-750">
              <SortableHeader label="Date" sortKey="timestamp" currentSort={sortConfig} onSort={() => requestSort('timestamp')} />
              <SortableHeader label="Produit" sortKey="productName" currentSort={sortConfig} onSort={() => requestSort('productName')} />
              <SortableHeader label="Ancien" sortKey="oldQuantity" currentSort={sortConfig} onSort={() => requestSort('oldQuantity')} />
              <SortableHeader label="Nouveau" sortKey="newQuantity" currentSort={sortConfig} onSort={() => requestSort('newQuantity')} />
              <SortableHeader label="Ajustement" sortKey="adjustment" currentSort={sortConfig} onSort={() => requestSort('adjustment')} />
              <SortableHeader label="Cause" sortKey="reason" currentSort={sortConfig} onSort={() => requestSort('reason')} />
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedAdjustments.map((adj) => {
              const isPositive = adj.adjustment > 0;
              return (
                <tr key={adj.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 text-sm text-slate-300">
                    {formatSafe(adj.timestamp, 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold text-white">{adj.productName}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-400">{adj.oldQuantity}</td>
                  <td className="p-4 text-sm text-slate-200 font-bold">{adj.newQuantity}</td>
                  <td className="p-4">
                    <span className={cn("px-2 py-1 rounded-full text-xs font-bold shadow-inner border", 
                      isPositive 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" 
                        : "bg-rose-500/15 text-rose-400 border-rose-500/20"
                    )}>
                      {isPositive ? '+' : ''}{adj.adjustment}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-300 max-w-xs truncate" title={adj.reason}>{adj.reason}</p>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditClick(adj)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                        title="Modifier le motif ou la valeur de cet ajustement"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteClick(adj)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-all"
                        title="Supprimer ou annuler cet ajustement de stock"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {adjustments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 bg-white/5">
                  <div className="flex flex-col items-center gap-3">
                    <History size={48} className="text-slate-600" strokeWidth={1.5} />
                    <p className="text-sm font-medium">Aucun ajustement de stock enregistré</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-industrial-700 flex items-center justify-between bg-black/40">
          <p className="text-xs text-slate-500 font-medium">
            Affichage de <span className="font-bold text-white">{Math.min(adjustments.length, (currentPage - 1) * pageSize + 1)}</span> à <span className="font-bold text-white">{Math.min(adjustments.length, currentPage * pageSize)}</span> sur <span className="font-bold text-white">{adjustments.length}</span> ajustements
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-industrial-700 disabled:opacity-30 hover:bg-white/5 text-slate-400 transition-colors"
            >
              <ChevronUp className="-rotate-90" size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                if (pageNum <= 0 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === pageNum 
                        ? "bg-indigo-600 text-white shadow-neon-indigo border border-indigo-400/50" 
                        : "text-slate-400 hover:bg-white/5"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-industrial-700 disabled:opacity-30 hover:bg-white/5 text-slate-400 transition-colors"
            >
              <ChevronUp className="rotate-90" size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
