import React, { useState, useMemo } from 'react';
import { 
  UserCheck, Search, Filter, Plus, Calendar, 
  CreditCard, ArrowDownRight, ArrowUpRight, FileText,
  User, X, CheckCircle2, ChevronLeft, ChevronRight,
  TrendingDown, TrendingUp, DollarSign
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Customer, CompanySettings } from '../../types';
import { cn, formatSafe, parseCashierNotes } from '../../lib/utils';
import { usePeopleStore } from '../../store/usePeopleStore';
import { localDb } from '../../services/LocalDatabase';

interface CustomerGlobalGeneralViewProps {
  customers: Customer[];
  settings: CompanySettings;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (id: string | null) => void;
  onOpenFinancialModal?: (customer: Customer) => void;
}

interface ParsedGeneralNote {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  timestamp: string;
  author: string;
  note: string;
  isFinancial: boolean;
  type: 'versement' | 'retrait' | 'memo';
  typeLabel: string;
  badgeClass: string;
  description: string;
  amount: number | null;
  method: string | null;
}

function parseNoteInfo(customerId: string, customerName: string, customerPhone: string | undefined, noteItem: any): ParsedGeneralNote {
  const noteStr = noteItem?.note || '';
  const timestamp = noteItem?.timestamp || new Date().toISOString();
  const author = noteItem?.author || 'Caisse';

  if (!noteStr.includes('[REGLEMENT]')) {
    return {
      customerId,
      customerName,
      customerPhone,
      timestamp,
      author,
      note: noteStr,
      isFinancial: false,
      type: 'memo',
      typeLabel: 'Mémo',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: noteStr || 'Note de compte',
      amount: null,
      method: null
    };
  }

  const isEncaissement = noteStr.toLowerCase().includes('encaissement') || noteStr.toLowerCase().includes('versement');
  const isDecaissement = noteStr.toLowerCase().includes('décaissement') || noteStr.toLowerCase().includes('decaissement') || noteStr.toLowerCase().includes('sortie') || noteStr.toLowerCase().includes('retrait');

  // Match amount
  const amountMatch = noteStr.match(/de\s+([0-9.,]+)\s*([A-Za-z]+)?/i);
  let amount: number | null = null;
  if (amountMatch) {
    const rawNum = parseFloat(amountMatch[1].replace(',', '.'));
    if (!isNaN(rawNum)) amount = rawNum;
  }

  // Match method
  const methodMatch = noteStr.match(/\(([A-Z]+)\)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : null;

  // Clean description
  const dashIdx = noteStr.indexOf(' - ');
  let desc = dashIdx !== -1 ? noteStr.substring(dashIdx + 3).trim() : noteStr.replace('[REGLEMENT]', '').trim();
  if (!desc) desc = isEncaissement ? 'Versement / Règlement' : (isDecaissement ? 'Décaissement / Retrait' : 'Ajustement');

  return {
    customerId,
    customerName,
    customerPhone,
    timestamp,
    author,
    note: noteStr,
    isFinancial: true,
    type: isDecaissement ? 'retrait' : 'versement',
    typeLabel: isDecaissement ? 'Retrait / Décaissement' : 'Versement Client',
    badgeClass: isDecaissement ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: desc,
    amount,
    method
  };
}

export const CustomerGlobalGeneralView: React.FC<CustomerGlobalGeneralViewProps> = ({
  customers: propCustomers,
  settings,
  selectedCustomerId: initialSelectedCustomerId = null,
  onSelectCustomer,
  onOpenFinancialModal
}) => {
  const storeCustomers = usePeopleStore(s => s.customers);
  const customers = propCustomers && propCustomers.length > 0 ? propCustomers : storeCustomers;

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(initialSelectedCustomerId || null);
  const [filterType, setFilterType] = useState<'all' | 'versement' | 'retrait' | 'memo'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // Quick note entry state
  const [targetCustomerId, setTargetCustomerId] = useState<string>(initialSelectedCustomerId || '');
  const [quickNoteText, setQuickNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Map of customers
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Aggregate all notes from all customers
  const allNotes = useMemo(() => {
    const list: ParsedGeneralNote[] = [];

    customers.forEach(c => {
      if (!c) return;
      const rawNotes = parseCashierNotes(c.cashierNotes || (c as any).cashier_notes);
      rawNotes.forEach(item => {
        list.push(parseNoteInfo(c.id, c.name || 'Client sans nom', c.phone, item));
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customers]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return allNotes.filter(item => {
      if (activeCustomerId && item.customerId !== activeCustomerId) return false;
      if (filterType !== 'all' && item.type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.customerName || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchNote = (item.note || '').toLowerCase().includes(q);
        const matchAuthor = (item.author || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchNote && !matchAuthor) return false;
      }

      return true;
    });
  }, [allNotes, activeCustomerId, filterType, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    let versementsCount = 0;
    let versementsTotal = 0;
    let retraitsCount = 0;
    let retraitsTotal = 0;
    let memosCount = 0;

    filteredNotes.forEach(n => {
      if (n.type === 'versement') {
        versementsCount++;
        versementsTotal += (n.amount || 0);
      } else if (n.type === 'retrait') {
        retraitsCount++;
        retraitsTotal += (n.amount || 0);
      } else {
        memosCount++;
      }
    });

    return {
      totalNotes: filteredNotes.length,
      versementsCount,
      versementsTotal,
      retraitsCount,
      retraitsTotal,
      memosCount,
      netTotal: versementsTotal - retraitsTotal
    };
  }, [filteredNotes]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredNotes.slice(start, start + PAGE_SIZE);
  }, [filteredNotes, currentPage]);

  const handleAddNote = async () => {
    const custId = targetCustomerId || activeCustomerId;
    const trimmed = quickNoteText.trim();
    if (!custId || !trimmed) {
      toast.error("Veuillez sélectionner un client et saisir une note");
      return;
    }

    const targetCustomer = customerMap.get(custId);
    if (!targetCustomer) return;

    setIsSubmittingNote(true);
    try {
      const noteEntry = {
        note: trimmed,
        author: 'Direction/Caisse',
        timestamp: new Date().toISOString()
      };
      const currentNotes = parseCashierNotes(targetCustomer.cashierNotes || (targetCustomer as any).cashier_notes);
      const updatedNotes = [...currentNotes, noteEntry];
      const updatedCustomer: Customer = {
        ...targetCustomer,
        cashierNotes: updatedNotes,
        updatedAt: new Date().toISOString()
      };

      usePeopleStore.getState().setCustomers(prev =>
        prev.map(c => c.id === targetCustomer.id ? updatedCustomer : c)
      );
      await localDb.update(`customers/${targetCustomer.id}`, updatedCustomer);
      setQuickNoteText('');
      toast.success("Note enregistrée avec succès !");
    } catch (err) {
      console.warn("Erreur ajout note:", err);
      toast.error("Erreur lors de l'enregistrement de la note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const selectedCustomerObj = activeCustomerId ? customerMap.get(activeCustomerId) : null;

  return (
    <div className="flex-1 flex flex-col gap-4 bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-2xl overflow-hidden h-full">
      
      {/* Header & Filter by Customer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
              Grand Tableau Général & Règlements
              {selectedCustomerObj && (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg normal-case font-bold flex items-center gap-1.5">
                  <User size={12} /> {selectedCustomerObj.name}
                  <button 
                    type="button" 
                    onClick={() => {
                      setActiveCustomerId(null);
                      if (onSelectCustomer) onSelectCustomer(null);
                    }}
                    className="hover:text-white ml-0.5"
                    title="Afficher tous les clients"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Versements, encaissements, décaissements & mémos clients • Affichage panoramique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client :</span>
          <select
            value={activeCustomerId || ''}
            onChange={(e) => {
              const val = e.target.value || null;
              setActiveCustomerId(val);
              setTargetCustomerId(val || '');
              setPage(1);
              if (onSelectCustomer) onSelectCustomer(val);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 outline-none text-xs font-bold uppercase tracking-wider cursor-pointer max-w-[220px]"
          >
            <option value="">Tous les clients</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Lignes</p>
            <p className="text-base font-black text-white font-mono mt-0.5">{stats.totalNotes}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs font-mono">
            Σ
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Versements ({stats.versementsCount})</p>
            <p className="text-base font-black text-emerald-400 font-mono mt-0.5">
              +{stats.versementsTotal.toFixed(2)} <span className="text-[10px] text-emerald-400/70">{settings.currency || 'DA'}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowDownRight size={14} />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Retraits ({stats.retraitsCount})</p>
            <p className="text-base font-black text-rose-400 font-mono mt-0.5">
              -{stats.retraitsTotal.toFixed(2)} <span className="text-[10px] text-rose-400/70">{settings.currency || 'DA'}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">Solde Règlements</p>
            <p className={cn(
              "text-base font-black font-mono mt-0.5",
              stats.netTotal >= 0 ? "text-indigo-400" : "text-rose-400"
            )}>
              {stats.netTotal.toFixed(2)} <span className="text-[10px] text-slate-400">{settings.currency || 'DA'}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <TrendingUp size={14} />
          </div>
        </div>
      </div>

      {/* Quick Entry Box */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-2.5">
        <select
          value={targetCustomerId || activeCustomerId || ''}
          onChange={(e) => setTargetCustomerId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none text-xs font-bold uppercase tracking-wider cursor-pointer min-w-[200px]"
        >
          <option value="">Sélectionner un client...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        
        <input
          type="text"
          placeholder="Ajouter un mémo ou une note rapide (ex: Promesse de paiement jeudi)..."
          className="flex-1 min-w-[250px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all font-medium"
          value={quickNoteText}
          onChange={(e) => setQuickNoteText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
        />

        <button
          type="button"
          disabled={isSubmittingNote || !quickNoteText.trim() || !(targetCustomerId || activeCustomerId)}
          onClick={handleAddNote}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} /> Ajouter Note
        </button>

        {onOpenFinancialModal && (targetCustomerId || activeCustomerId) && (
          <button
            type="button"
            onClick={() => {
              const cust = customerMap.get(targetCustomerId || activeCustomerId || '');
              if (cust) onOpenFinancialModal(cust);
            }}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <CreditCard size={13} /> Nouveau Règlement
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={() => { setFilterType('all'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all",
              filterType === 'all'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            Tous ({allNotes.length})
          </button>
          <button
            type="button"
            onClick={() => { setFilterType('versement'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5",
              filterType === 'versement'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            <ArrowDownRight size={13} /> Versements ({stats.versementsCount})
          </button>
          <button
            type="button"
            onClick={() => { setFilterType('retrait'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5",
              filterType === 'retrait'
                ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            )}
          >
            <ArrowUpRight size={13} /> Retraits ({stats.retraitsCount})
          </button>
          <button
            type="button"
            onClick={() => { setFilterType('memo'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5",
              filterType === 'memo'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20"
            )}
          >
            <FileText size={13} /> Mémos ({stats.memosCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Rechercher client, mémo, auteur..."
            className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold uppercase"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Panoramic Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60">
        {paginatedNotes.length > 0 ? (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="py-3 px-3.5">Date & Heure</th>
                <th className="py-3 px-3.5">Client</th>
                <th className="py-3 px-3.5">Type d'opération</th>
                <th className="py-3 px-3.5">Montant</th>
                <th className="py-3 px-3.5">Moyen</th>
                <th className="py-3 px-3.5">Détail / Note explicative</th>
                <th className="py-3 px-3.5 text-right">Auteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {paginatedNotes.map((noteItem, idx) => {
                const isVersement = noteItem.type === 'versement';
                const isRetrait = noteItem.type === 'retrait';

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Date */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                      {formatSafe(noteItem.timestamp, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="font-bold text-white uppercase text-[11px] group-hover:text-indigo-300 transition-colors">
                        {noteItem.customerName}
                      </span>
                      {noteItem.customerPhone && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {noteItem.customerPhone}
                        </span>
                      )}
                    </td>

                    {/* Operation Type Badge */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        noteItem.badgeClass
                      )}>
                        {noteItem.typeLabel}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-mono font-black text-xs">
                      {noteItem.amount !== null ? (
                        <span className={isVersement ? "text-emerald-400" : (isRetrait ? "text-rose-400" : "text-slate-300")}>
                          {isVersement ? '+' : (isRetrait ? '-' : '')}{Number(noteItem.amount).toFixed(2)} {settings.currency || 'DA'}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-normal text-[11px]">—</span>
                      )}
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {noteItem.method ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-mono uppercase font-bold">
                          {noteItem.method}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-3.5 text-slate-300 text-xs font-medium max-w-[340px] truncate">
                      {noteItem.description}
                    </td>

                    {/* Author */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-right text-slate-400 text-[11px]">
                      <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 font-mono text-[10px]">
                        {noteItem.author}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <UserCheck size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm text-slate-300">Aucun enregistrement trouvé</p>
            <p className="text-xs text-slate-500 mt-1">Modifiez vos critères de recherche ou ajoutez un nouveau mémo.</p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {filteredNotes.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-slate-400 font-medium">
            Affichage de <span className="font-bold text-white">{(currentPage - 1) * PAGE_SIZE + 1}</span> à <span className="font-bold text-white">{Math.min(currentPage * PAGE_SIZE, filteredNotes.length)}</span> sur <span className="font-bold text-white">{filteredNotes.length}</span> enregistrements
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-black uppercase text-[11px]"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-mono font-bold text-xs">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-black uppercase text-[11px]"
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
