import React from 'react';
import { History, Clock, Barcode, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, Button } from '../../ui';
import { formatSafe } from '../../../lib/utils';
import { LossItem } from './lossesTypes';

interface LossesTableProps {
  losses: LossItem[];
  totalFilteredCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((p: number) => number)) => void;
  currency: string;
  itemsPerPage: number;
}

export const LossesTable: React.FC<LossesTableProps> = ({
  losses,
  totalFilteredCount,
  currentPage,
  totalPages,
  onPageChange,
  currency,
  itemsPerPage,
}) => {
  return (
    <Card id="card-loss-history" className="overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
      <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-rose-500" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Historique des Pertes ({totalFilteredCount})
          </h4>
        </div>

        {/* Contrôles de pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/80 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              <th className="p-3.5 whitespace-nowrap">Date & Heure</th>
              <th className="p-3.5">Code-barres</th>
              <th className="p-3.5">Article</th>
              <th className="p-3.5 text-center">Quantité</th>
              <th className="p-3.5 text-right">Coût Unit.</th>
              <th className="p-3.5 text-right">Valeur Perte</th>
              <th className="p-3.5">Motif</th>
              <th className="p-3.5 text-right">Opérateur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {losses.map((item, idx) => (
              <tr 
                key={`loss-row-${item.id || idx}`} 
                className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
              >
                {/* Date & Heure */}
                <td className="p-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock size={12} className="text-slate-400" />
                    {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm')}
                  </div>
                </td>

                {/* Code-barres */}
                <td className="p-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-slate-200 dark:border-zinc-700 w-fit">
                    <Barcode size={13} className="text-slate-400" />
                    {item.barcode}
                  </div>
                </td>

                {/* Nom du produit & Catégorie */}
                <td className="p-3.5">
                  <p className="font-bold text-slate-900 dark:text-white text-xs">
                    {item.productName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{item.productId.slice(0, 8)}
                    </span>
                  </div>
                </td>

                {/* Quantité */}
                <td className="p-3.5 text-center font-black text-rose-600 dark:text-rose-400 text-xs font-mono whitespace-nowrap">
                  -{item.quantity} {item.unit}
                </td>

                {/* Coût unitaire */}
                <td className="p-3.5 text-right font-medium text-slate-600 dark:text-zinc-300 font-mono text-xs whitespace-nowrap">
                  {item.costPrice.toLocaleString('fr-DZ')} {currency}
                </td>

                {/* Valeur Perte */}
                <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400 font-mono text-xs whitespace-nowrap">
                  {item.lossValue.toLocaleString('fr-DZ')} {currency}
                </td>

                {/* Motif */}
                <td className="p-3.5">
                  <span className="inline-block px-2.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-full text-[10px] font-black uppercase border border-rose-500/20 whitespace-nowrap">
                    {item.reason}
                  </span>
                </td>

                {/* Opérateur */}
                <td className="p-3.5 text-slate-600 dark:text-zinc-400 text-xs font-semibold text-right whitespace-nowrap">
                  {item.userName}
                </td>
              </tr>
            ))}

            {losses.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400 dark:text-zinc-500 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertTriangle size={24} className="opacity-30 text-rose-500" />
                    <span>Aucune perte enregistrée sur cette période ou correspondant à votre recherche.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pied de pagination */}
      {totalPages > 1 && (
        <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalFilteredCount)} sur {totalFilteredCount} déclarations</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(p => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
