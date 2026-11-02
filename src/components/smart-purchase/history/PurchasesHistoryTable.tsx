import React, { memo } from 'react';
import { 
  FileText, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card } from '../../ui';
import { Purchase } from '../../../types';
import { formatSafe } from '../../../lib/utils';

interface PurchasesHistoryTableProps {
  paginatedPurchases: Purchase[];
  filteredPurchasesCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setViewingPurchaseVoucher: (p: Purchase) => void;
  handleEditPurchaseRequest: (p: Purchase) => void;
  setPurchaseToDelete: (id: string) => void;
  activeFiltersCount?: number;
  resetHistoryFilters?: () => void;
}

export const PurchasesHistoryTable = memo(function PurchasesHistoryTable({
  paginatedPurchases,
  filteredPurchasesCount,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  setViewingPurchaseVoucher,
  handleEditPurchaseRequest,
  setPurchaseToDelete,
  activeFiltersCount = 0,
  resetHistoryFilters,
}: PurchasesHistoryTableProps) {
  return (
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
                      className="p-2 text-industrial-400 hover:text-indigo-400 hover:bg-industrial-800 transition-all rounded-xl cursor-pointer"
                    >
                      <FileText size={18}/>
                    </button>
                    <button 
                      onClick={() => handleEditPurchaseRequest(p)} 
                      title="Modifier ce bon" 
                      className="p-2 text-amber-500 hover:bg-amber-500/10 transition-all rounded-xl border border-amber-500/20 cursor-pointer"
                    >
                      <Edit size={18}/>
                    </button>
                    <button 
                      onClick={() => setPurchaseToDelete(p.id)} 
                      title="Supprimer ce bon"
                      className="p-2 text-rose-500 hover:bg-rose-500/10 transition-all rounded-xl border border-rose-500/20 cursor-pointer"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredPurchasesCount === 0 && (
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
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
      {filteredPurchasesCount > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-industrial-950 border-t border-industrial-800">
          <p className="text-xs font-bold text-industrial-400">
            Affichage de <span className="text-white font-black">{(currentPage - 1) * pageSize + 1}</span> à{' '}
            <span className="text-white font-black">{Math.min(currentPage * pageSize, filteredPurchasesCount)}</span> sur{' '}
            <span className="text-white font-black">{filteredPurchasesCount}</span> bons d'achat
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
  );
});
