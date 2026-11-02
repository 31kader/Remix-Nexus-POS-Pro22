import React, { useState, useMemo } from 'react';
import { Customer, CompanySettings } from '../../../types';
import { FileText, Plus, Search, X } from 'lucide-react';
import { cn, formatSafe, parseCashierNotes } from '../../../lib/utils';
import { usePeopleStore } from '../../../store/usePeopleStore';
import { localDb } from '../../../services/LocalDatabase';
import { toast } from 'sonner';
import { parseNoteFinancialInfo } from './customerInfoTypes';

export interface CustomerLedgerNotesTableProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
}

export function CustomerLedgerNotesTable({
  selectedCustomer,
  settings
}: CustomerLedgerNotesTableProps) {
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteFilter, setNoteFilter] = useState<'all' | 'versement' | 'retrait' | 'memo'>('all');
  const [noteSearch, setNoteSearch] = useState<string>('');

  const currency = settings.currency || 'DA';

  const handleAddNoteSubmit = async () => {
    const trimmed = quickNoteInput.trim();
    if (!trimmed || !selectedCustomer) return;
    setIsSubmittingNote(true);
    try {
      const noteEntry = {
        note: trimmed,
        author: 'Direction/Caisse',
        timestamp: new Date().toISOString()
      };
      const currentNotes = parseCashierNotes(selectedCustomer.cashierNotes || (selectedCustomer as any).cashier_notes);
      const updatedNotes = [...currentNotes, noteEntry];
      const updatedCustomer: Customer = {
        ...selectedCustomer,
        cashierNotes: updatedNotes,
        updatedAt: new Date().toISOString()
      };
      usePeopleStore.getState().setCustomers(prev =>
        prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c)
      );
      await localDb.update(`customers/${selectedCustomer.id}`, updatedCustomer);
      setQuickNoteInput('');
      toast.success("Note ajoutée à la fiche client !");
    } catch (err: any) {
      console.warn("Erreur ajout note:", err);
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const safeNotes = useMemo(() => {
    return parseCashierNotes(selectedCustomer?.cashierNotes || (selectedCustomer as any)?.cashier_notes);
  }, [selectedCustomer?.cashierNotes, (selectedCustomer as any)?.cashier_notes]);

  const sortedNotes = useMemo(() => {
    return safeNotes.slice().sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [safeNotes]);

  const filteredNotes = useMemo(() => {
    return sortedNotes.filter(note => {
      const parsed = parseNoteFinancialInfo(note.note);
      if (noteFilter !== 'all' && parsed.type !== noteFilter) return false;
      if (noteSearch.trim()) {
        const q = noteSearch.toLowerCase().trim();
        const matchDesc = (parsed.description || '').toLowerCase().includes(q);
        const matchAuthor = (note.author || '').toLowerCase().includes(q);
        const matchNote = (note.note || '').toLowerCase().includes(q);
        if (!matchDesc && !matchAuthor && !matchNote) return false;
      }
      return true;
    });
  }, [sortedNotes, noteFilter, noteSearch]);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <FileText size={15} className="text-indigo-400" />
            Tableau des Règlements, Versements & Mémos
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Historique chronologique des mouvements et notes de compte
          </p>
        </div>

        {/* Saisie rapide de note */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input 
            type="text"
            value={quickNoteInput}
            onChange={(e) => setQuickNoteInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddNoteSubmit(); }}
            placeholder="Ajouter une note ou un mémo..."
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-full md:w-64 shadow-inner"
          />
          <button
            type="button"
            disabled={isSubmittingNote || !quickNoteInput.trim()}
            onClick={handleAddNoteSubmit}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
      </div>

      {/* Filtres et recherche pour les notes */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setNoteFilter('all')}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px] cursor-pointer",
              noteFilter === 'all'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            Tous ({sortedNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setNoteFilter('versement')}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px] cursor-pointer",
              noteFilter === 'versement'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            Versements
          </button>
          <button
            type="button"
            onClick={() => setNoteFilter('retrait')}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px] cursor-pointer",
              noteFilter === 'retrait'
                ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            )}
          >
            Retraits
          </button>
          <button
            type="button"
            onClick={() => setNoteFilter('memo')}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px] cursor-pointer",
              noteFilter === 'memo'
                ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            Mémos
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
          <input
            type="text"
            placeholder="Filtrer dans les notes..."
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
          />
          {noteSearch && (
            <button
              type="button"
              onClick={() => setNoteSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table Render */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <FileText size={30} className="mx-auto mb-2 text-slate-600" />
          <p className="font-bold text-xs text-slate-300">Aucun enregistrement correspondant</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Les versements, règlements de dette et mémos apparaîtront ici.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Date & Heure</th>
                <th className="py-2.5 px-3.5">Opération</th>
                <th className="py-2.5 px-3.5">Détails & Note</th>
                <th className="py-2.5 px-3.5">Mode</th>
                <th className="py-2.5 px-3.5">Auteur</th>
                <th className="py-2.5 px-3.5 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredNotes.map((note, idx) => {
                const parsed = parseNoteFinancialInfo(note.note);
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-300 whitespace-nowrap text-xs">
                      {formatSafe(note.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${parsed.badgeClass}`}>
                        {parsed.typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-white max-w-xs">
                      <p className="truncate text-xs" title={parsed.description}>{parsed.description}</p>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-slate-300">
                      {parsed.method ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono uppercase">
                          {parsed.method === 'CASH' ? 'Espèces' : parsed.method === 'CARD' ? 'Carte' : parsed.method}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-400 whitespace-nowrap text-xs">
                      {note.author || 'Direction/Caisse'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      {parsed.amount !== null ? (
                        <span className={`font-mono font-black text-xs ${parsed.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {parsed.isPositive ? '+ ' : '- '}
                          {parsed.amount.toFixed(2)} <span className="text-[10px] font-sans font-bold">{currency}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
