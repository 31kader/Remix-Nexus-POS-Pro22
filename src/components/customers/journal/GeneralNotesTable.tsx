import React from 'react';
import { CompanySettings } from '../../../types';
import { formatSafe } from '../../../lib/utils';
import { ParsedGeneralNote } from './journalTypes';

export interface GeneralNotesTableProps {
  paginatedNotes: ParsedGeneralNote[];
  settings: CompanySettings;
}

export function GeneralNotesTable({
  paginatedNotes,
  settings
}: GeneralNotesTableProps) {
  const currency = settings.currency || 'DA';

  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-wider">
          <th className="py-3 px-4">Date & Heure</th>
          <th className="py-3 px-4">Type</th>
          <th className="py-3 px-4">Client</th>
          <th className="py-3 px-4">Détail & Mémo</th>
          <th className="py-3 px-4">Mode</th>
          <th className="py-3 px-4">Auteur</th>
          <th className="py-3 px-4 text-right">Montant</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/60 font-medium">
        {paginatedNotes.map((item, idx) => (
          <tr key={idx} className="hover:bg-slate-900/80 transition-colors">
            <td className="py-3 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
              {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm')}
            </td>
            <td className="py-3 px-4 whitespace-nowrap">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${item.badgeClass}`}>
                {item.typeLabel}
              </span>
            </td>
            <td className="py-3 px-4 font-black text-white uppercase tracking-tight whitespace-nowrap">
              {item.customerName}
            </td>
            <td className="py-3 px-4 text-slate-200 max-w-xs">
              <p className="truncate" title={item.description}>{item.description}</p>
            </td>
            <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-300">
              {item.method ? (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono uppercase">
                  {item.method === 'CASH' ? 'Espèces' : item.method === 'CARD' ? 'Carte' : item.method}
                </span>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </td>
            <td className="py-3 px-4 font-bold text-slate-400 whitespace-nowrap">
              {item.author || 'Caisse'}
            </td>
            <td className="py-3 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
              {item.amount !== null ? (
                <span className={item.type === 'versement' ? 'text-emerald-400' : 'text-rose-400'}>
                  {item.type === 'versement' ? '+' : '-'}{item.amount.toFixed(2)} {currency}
                </span>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
