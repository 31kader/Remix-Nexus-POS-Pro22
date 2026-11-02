import React from 'react';
import { Phone } from 'lucide-react';
import { CompanySettings } from '../../../types';
import { formatSafe } from '../../../lib/utils';
import { ParsedGeneralNote } from './journalTypes';

export interface GeneralNoteMobileCardProps {
  noteItem: ParsedGeneralNote;
  settings: CompanySettings;
  name?: string;
  typeLabel?: string;
  author?: string;
}

export function GeneralNoteMobileCard({
  noteItem,
  settings,
  name,
  typeLabel,
  author
}: GeneralNoteMobileCardProps) {
  const currency = settings.currency || 'DA';
  const customerName = name || noteItem.customerName;
  const label = typeLabel || noteItem.typeLabel;
  const noteAuthor = author || noteItem.author;

  return (
    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${noteItem.badgeClass}`}>
          {label}
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          {formatSafe(noteItem.timestamp, 'dd/MM/yyyy HH:mm')}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-black text-white text-xs uppercase">{customerName}</p>
          {noteItem.customerPhone && (
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <Phone size={10} className="text-indigo-400" /> {noteItem.customerPhone}
            </p>
          )}
        </div>

        {noteItem.amount !== null && (
          <div className="text-right">
            <span className={`font-mono font-black text-sm ${noteItem.type === 'versement' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {noteItem.type === 'versement' ? '+' : '-'}{noteItem.amount.toFixed(2)} {currency}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-200 bg-slate-950 p-2 rounded-lg border border-slate-800 font-medium break-words">
        {noteItem.description}
      </p>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
        <span>Auteur : {noteAuthor || 'Caisse'}</span>
        {noteItem.method && (
          <span className="font-mono uppercase font-bold text-slate-500">
            {noteItem.method}
          </span>
        )}
      </div>
    </div>
  );
}
