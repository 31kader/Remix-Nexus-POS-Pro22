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
    <div className="bg-white/85 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 shadow-2xs space-y-4 backdrop-blur-md select-none font-financial">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 font-sans">
            <FileText size={15} className="text-indigo-400" />
            <span>Mémos & Opérations de Compte</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-sans">
            Historique chronologique des versements, règlements de dette et notes internes
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
            className="bg-slate-100 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 w-full md:w-64 shadow-inner"
          />
          <button
            type="button"
            disabled={isSubmittingNote || !quickNoteInput.trim()}
            onClick={handleAddNoteSubmit}
            className="btn-touch-action px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 shadow-xs shadow-indigo-600/30 cursor-pointer font-sans"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
      </div>

      {/* Filtres et recherche pour les notes */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 font-sans">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setNoteFilter('all')}
            className={cn(
              "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer",
              noteFilter === 'all'
                ? "bg-indigo-600 text-white font-bold shadow-2xs"
                : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
            )}
          >
            Tous ({sortedNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setNoteFilter('versement')}
            className={cn(
              "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer",
              noteFilter === 'versement'
                ? "bg-emerald-600 text-white font-bold shadow-2xs"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            Versements
          </button>
          <button
            type="button"
            onClick={() => setNoteFilter('retrait')}
            className={cn(
              "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer",
              noteFilter === 'retrait'
                ? "bg-rose-600 text-white font-bold shadow-2xs"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            )}
          >
            Retraits
          </button>
          <button
            type="button"
            onClick={() => setNoteFilter('memo')}
            className={cn(
              "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer",
              noteFilter === 'memo'
                ? "bg-slate-700 text-white font-bold shadow-2xs"
                : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
            )}
          >
            Mémos
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={13} />
          <input
            type="text"
            placeholder="Filtrer dans les notes..."
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 shadow-inner"
          />
          {noteSearch && (
            <button
              type="button"
              onClick={() => setNoteSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table Render */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/60 dark:border-white/[0.04]">
          <FileText size={30} className="mx-auto mb-2 text-slate-400 dark:text-zinc-600 opacity-60" />
          <p className="font-bold text-xs text-slate-700 dark:text-zinc-300">Aucun enregistrement correspondant</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Les versements, règlements de dette et mémos apparaîtront ici.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white/50 dark:bg-zinc-950/60">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-zinc-400 font-bold text-[11px] uppercase tracking-wider font-sans">
                <th className="py-2.5 px-3.5">Date & Heure</th>
                <th className="py-2.5 px-3.5">Opération</th>
                <th className="py-2.5 px-3.5">Détails & Note</th>
                <th className="py-2.5 px-3.5">Mode</th>
                <th className="py-2.5 px-3.5">Auteur</th>
                <th className="py-2.5 px-3.5 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04] text-xs">
              {filteredNotes.map((note, idx) => {
                const parsed = parseNoteFinancialInfo(note.note);
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-850/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap text-xs">
                      {formatSafe(note.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${parsed.badgeClass}`}>
                        {parsed.typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-800 dark:text-zinc-200 max-w-xs font-sans">
                      <p className="truncate text-xs" title={parsed.description}>{parsed.description}</p>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-slate-600 dark:text-zinc-300 font-sans">
                      {parsed.method ? (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono">
                          {parsed.method === 'CASH' ? 'Espèces' : parsed.method === 'CARD' ? 'Carte' : parsed.method}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap text-xs font-sans">
                      {note.author || 'Direction/Caisse'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap tabular-nums">
                      {parsed.amount !== null ? (
                        <span className={`font-bold text-xs ${parsed.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {parsed.isPositive ? '+ ' : '- '}
                          {parsed.amount.toFixed(0)} <span className="text-[10px] font-sans opacity-80">{currency}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-500 font-mono text-xs">—</span>
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
