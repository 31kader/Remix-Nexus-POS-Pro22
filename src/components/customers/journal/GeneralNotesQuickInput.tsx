import React from 'react';
import { Customer } from '../../../types';
import { Plus } from 'lucide-react';

export interface GeneralNotesQuickInputProps {
  customers: Customer[];
  activeCustomerId: string | null;
  targetCustomerId: string;
  setTargetCustomerId: (id: string) => void;
  quickNoteText: string;
  setQuickNoteText: (text: string) => void;
  isSubmittingNote: boolean;
  handleAddNote: () => Promise<void>;
}

export function GeneralNotesQuickInput({
  customers,
  activeCustomerId,
  targetCustomerId,
  setTargetCustomerId,
  quickNoteText,
  setQuickNoteText,
  isSubmittingNote,
  handleAddNote
}: GeneralNotesQuickInputProps) {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center gap-2.5">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Client :</span>
        <select
          value={targetCustomerId || activeCustomerId || ''}
          onChange={(e) => setTargetCustomerId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer w-full md:w-48"
        >
          <option value="">-- Choisir client --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 w-full flex-1">
        <input
          type="text"
          value={quickNoteText}
          onChange={(e) => setQuickNoteText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
          placeholder="Ajouter une note ou un mémo rapide sur ce client..."
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 w-full placeholder:text-slate-500 shadow-inner"
        />
        <button
          type="button"
          disabled={isSubmittingNote || !quickNoteText.trim() || (!targetCustomerId && !activeCustomerId)}
          onClick={handleAddNote}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus size={13} /> {isSubmittingNote ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>
    </div>
  );
}
