import React, { useMemo } from 'react';
import { Edit, FileText, Printer, RotateCcw, ShoppingBag } from 'lucide-react';
import { Transaction, CompanySettings, RolePermissions } from '../../types';
import { formatSafe, isLocked } from '../../lib/utils';
import { Card, SortableHeader } from '../ui';
import { List } from 'react-window';

interface Props {
  transactions: Transaction[];
  settings: CompanySettings;
  onReturn: (t: Transaction) => void;
  onMarkAsDelivered: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onRestore: (t: Transaction) => void;
  canAccess: (permission: keyof RolePermissions) => boolean;
  requestSort: (key: any) => void;
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  generateInvoicePDF: (t: Transaction) => void;
  handlePrint: (t: Transaction) => void;
}

export const TransactionTable: React.FC<Props> = ({
  transactions, settings, onReturn, onMarkAsDelivered, onEdit, onRestore, canAccess, requestSort, sortConfig, generateInvoicePDF, handlePrint
}) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-400">
        Aucune transaction trouvée
      </Card>
    );
  }

  // react-window v2 requires a rowComponent (not children render function)
  // and rowProps must be an object (not undefined) or Object.values() crashes.
  const TransactionRow = useMemo(() => {
    return function TransactionRowInner({ index, style, ...rest }: any) {
      const t = transactions[index];
      if (!t) return null;
      const locked = isLocked(t.timestamp, settings?.lockingPeriodDays || 0);
      const displayId = t.id ? t.id.slice(-8).toUpperCase() : '—';
      const itemsCount = Array.isArray(t.items) ? t.items.length : 0;
      return (
        <div
          style={style}
          className="flex w-full items-center hover:bg-white/5 transition-colors border-b border-slate-800/40"
        >
          <div className="w-1/6 p-4 text-sm text-white/60 truncate">{formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</div>
          <div className="w-1/6 p-4 text-sm font-bold text-white truncate">{t.employeeName || 'Système'}</div>
          <div className="w-1/6 p-4 text-sm font-mono text-white/40 truncate">#{displayId}</div>
          <div className="w-1/12 p-4 text-sm text-white/60 truncate">{itemsCount}</div>
          <div className="w-1/12 p-4">
            {t.status === 'returned' && <span className="px-2 py-1 rounded-full text-[10px] bg-rose-100/10 text-rose-400">Retourné</span>}
            {(t.status === 'delivered' || t.status === 'completed' || !t.status) && <span className="px-2 py-1 rounded-full text-[10px] bg-emerald-100/10 text-emerald-400">Payé</span>}
          </div>
          <div className="w-1/6 p-4 font-bold text-white truncate">{Number(t.total || 0).toFixed(2)} {settings?.currency}</div>
          <div className="w-1/6 p-4 text-right flex items-center justify-end gap-2 pr-6">
            {canAccess('canAccessReturns') && t.status !== 'returned' && (
              <button
                onClick={() => !locked && onReturn(t)}
                disabled={locked}
                className="p-2 text-rose-600 hover:bg-rose-50/10 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
                title="Enregistrer un retour de marchandise"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button onClick={() => !locked && onRestore(t)} disabled={locked} className="p-2 text-indigo-600 hover:bg-indigo-50/10 rounded-lg"><ShoppingBag size={16} /></button>
            {t.status === 'pending' && <button onClick={() => !locked && onEdit(t)} className="p-2 text-amber-600 hover:bg-amber-50/10 rounded-lg"><Edit size={16} /></button>}
            <button onClick={() => generateInvoicePDF(t)} className="p-2 text-slate-400 hover:text-emerald-400"><FileText size={18} /></button>
            <button onClick={() => handlePrint(t)} className="p-2 text-slate-400 hover:text-indigo-400"><Printer size={18} /></button>
          </div>
        </div>
      );
    };
  }, [transactions, settings, onReturn, onRestore, onEdit, canAccess, generateInvoicePDF, handlePrint]);

  return (
    <Card className="overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-800/40 flex w-full">
              <SortableHeader className="w-1/6" label="Date" sortKey="timestamp" currentSort={sortConfig} onSort={() => requestSort('timestamp')} />
              <SortableHeader className="w-1/6" label="Utilisateur" sortKey="employeeName" currentSort={sortConfig} onSort={() => requestSort('employeeName')} />
              <SortableHeader className="w-1/6" label="ID" sortKey="id_display" currentSort={sortConfig} onSort={() => requestSort('id_display')} />
              <th className="w-1/12 p-4 text-xs font-bold text-white/40 uppercase">Articles</th>
              <SortableHeader className="w-1/12" label="Statut" sortKey="status" currentSort={sortConfig} onSort={() => requestSort('status')} />
              <SortableHeader className="w-1/6" label="Total" sortKey="total" currentSort={sortConfig} onSort={() => requestSort('total')} />
              <th className="w-1/6 p-4 text-xs font-bold text-white/40 uppercase text-right">Actions</th>
            </tr>
          </thead>
        </table>

        <List
          rowCount={transactions.length}
          rowHeight={56}
          rowComponent={TransactionRow}
          rowProps={{}}
          className="min-w-[800px]"
        />
      </div>
    </Card>
  );
};
