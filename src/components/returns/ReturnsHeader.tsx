import React from 'react';
import { RotateCcw, FileSpreadsheet, Database, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';

interface ReturnsHeaderProps {
  filteredReturnsCount: number;
  totalRefundAmount: number;
  settings: CompanySettings;
  hasReturns: boolean;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onPurgeAll: () => void;
}

export const ReturnsHeader: React.FC<ReturnsHeaderProps> = ({
  filteredReturnsCount,
  totalRefundAmount,
  settings,
  hasReturns,
  onExportExcel,
  onExportCSV,
  onPurgeAll,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2.5">
          <RotateCcw className="text-rose-500 dark:text-rose-400" size={24} />
          Gestion des Retours
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {filteredReturnsCount} retours filtrés • Total Remboursé : <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatPrice(totalRefundAmount)} {settings?.currency || 'DA'}</strong>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onExportExcel} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer" title="Exporter les articles retournés avec code-barres et désignation">
          <FileSpreadsheet size={16} /> Excel
        </Button>
        <Button variant="secondary" onClick={onExportCSV} className="flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer" title="Exporter au format CSV">
          <Database size={16} /> CSV
        </Button>
        {hasReturns && (
          <Button variant="secondary" onClick={onPurgeAll} className="flex items-center gap-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/30 cursor-pointer">
            <Trash2 size={16} /> Vider les Retours
          </Button>
        )}
      </div>
    </div>
  );
};
