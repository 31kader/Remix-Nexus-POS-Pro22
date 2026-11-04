import React, { memo, useMemo, useState } from 'react';
import { Search, X, Gift, UserPlus, FileText, Check } from 'lucide-react';
import { Customer, CompanySettings } from '../../types';
import { cn, parseCashierNotes } from '../../lib/utils';

interface CustomerSelectionProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (c: Customer | null) => void;
  customerSearch: string;
  setCustomerSearch: (s: string) => void;
  customers: Customer[];
  isWholesale: boolean;
  setIsWholesale: (v: boolean) => void;
  useLoyaltyPoints: boolean;
  setUseLoyaltyPoints: (v: boolean) => void;
  settings: CompanySettings;
  total: number;
  receivedAmount: string;
  setReceivedAmount: (s: string) => void;
  keepExcessInBalance: boolean;
  setKeepExcessInBalance: (v: boolean) => void;
  handleCheckout: (method: 'cash' | 'card' | 'balance' | 'transfer', shouldPrint?: boolean) => void;
  addCustomerNote: (note: string) => void;
  setIsPOSCustomerModalOpen: (v: boolean) => void;
}

export const CustomerSelection = memo(function CustomerSelection({
  selectedCustomer,
  setSelectedCustomer,
  customerSearch,
  setCustomerSearch,
  customers,
  isWholesale,
  setIsWholesale,
  useLoyaltyPoints,
  setUseLoyaltyPoints,
  settings,
  total,
  addCustomerNote,
  setIsPOSCustomerModalOpen
}: CustomerSelectionProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');

  const filteredCustomerResults = useMemo(() => {
    if (!customerSearch || !customerSearch.trim()) return [];
    const term = customerSearch.trim().toLowerCase();
    const safeCustomers = Array.isArray(customers) ? customers : [];
    return safeCustomers
      .filter((c: Customer) => {
        const nameMatch = (c.name || '').toLowerCase().includes(term);
        const phoneMatch = (c.phone || '').includes(term);
        return nameMatch || phoneMatch;
      })
      .slice(0, 50);
  }, [customers, customerSearch]);

  const existingNotes = useMemo(() => {
    if (!selectedCustomer) return [];
    return parseCashierNotes(selectedCustomer.cashierNotes || (selectedCustomer as any)?.cashier_notes);
  }, [selectedCustomer]);

  const handleSaveNote = () => {
    const trimmed = newNote.trim();
    if (trimmed && addCustomerNote) {
      addCustomerNote(trimmed);
      setNewNote('');
      setShowNoteInput(false);
    }
  };

  const currency = settings?.currency || 'DA';

  return (
    <div className="p-2 sm:p-2.5 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 space-y-1.5">
      {/* Barre supérieure compacte : Titre et toggle mode gros/détail */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Client
        </span>

        <button
          type="button"
          onClick={() => setIsWholesale(!isWholesale)}
          className={cn(
            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer active:scale-95",
            isWholesale
              ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
          )}
          title="Basculer entre Tarif Détail et Tarif de Gros"
        >
          {isWholesale ? "Mode Gros" : "Détail"}
        </button>
      </div>

      {selectedCustomer ? (
        /* FICHE DU CLIENT SÉLECTIONNÉ — Ultra compacte (~48px) */
        <div className="p-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 rounded-xl space-y-1 shadow-xs animate-in fade-in duration-200">
          {/* Ligne 1 : Avatar, Nom, Badges Solde & Points, Bouton Désélectionner */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                {(selectedCustomer.name || 'C').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase truncate leading-tight">
                {selectedCustomer.name || 'Client sans nom'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Badge Solde / Dette */}
              {(selectedCustomer.balance || 0) !== 0 && (
                <span
                  className={cn(
                    "text-[9px] font-mono font-black px-1.5 py-0.5 rounded border leading-none",
                    (selectedCustomer.balance || 0) > 0
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20"
                      : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-500/20"
                  )}
                  title={(selectedCustomer.balance || 0) > 0 ? "Solde créditeur" : "Dette client"}
                >
                  {(selectedCustomer.balance || 0) > 0 ? `+${Number(selectedCustomer.balance).toFixed(0)}` : `${Number(selectedCustomer.balance).toFixed(0)}`} {currency}
                </span>
              )}

              {/* Badge Fidélité */}
              {(selectedCustomer.loyaltyPoints || 0) > 0 && (
                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 leading-none">
                  {selectedCustomer.loyaltyPoints} pts
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setUseLoyaltyPoints(false);
                  setShowNoteInput(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                title="Détacher le client du panier actuel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Ligne 2 : Téléphone et actions rapides (Points & Note) */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400">
            <span className="font-mono text-[9px] truncate">
              {selectedCustomer.phone ? `Tél: ${selectedCustomer.phone}` : 'Sans numéro'}
            </span>

            <div className="flex items-center gap-1.5">
              {(selectedCustomer.loyaltyPoints || 0) >= 10 && (
                <button
                  type="button"
                  onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-black transition-all border cursor-pointer active:scale-95 flex items-center gap-0.5",
                    useLoyaltyPoints
                      ? "bg-amber-600 text-white border-amber-500 shadow-xs"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/60 hover:bg-amber-100"
                  )}
                  title={useLoyaltyPoints ? "Désactiver la déduction des points" : "Utiliser les points fidélité"}
                >
                  <Gift size={10} />
                  <span>{useLoyaltyPoints ? 'Pts Actifs' : 'Utiliser Pts'}</span>
                </button>
              )}

              {!showNoteInput && (
                <button
                  type="button"
                  onClick={() => setShowNoteInput(true)}
                  className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <FileText size={10} />
                  <span>Note</span>
                </button>
              )}
            </div>
          </div>

          {/* Formulaire Note rapide en ligne */}
          {showNoteInput && (
            <div className="flex items-center gap-1 pt-1 animate-in fade-in duration-150">
              <input
                type="text"
                placeholder="Note pour ce client..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveNote();
                  }
                }}
                className="flex-1 h-7 px-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveNote}
                className="h-7 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => { setShowNoteInput(false); setNewNote(''); }}
                className="h-7 px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ZONE DE RECHERCHE CLIENT — Simple, rapide et compacte (h-8.5) */
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 group-focus-within:text-indigo-500 transition-colors pointer-events-none"
              size={14}
            />
            <input
              type="text"
              placeholder="Rechercher client (Nom, Tél)..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full h-8.5 pl-8 pr-7 bg-slate-50 hover:bg-slate-100/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 rounded-xl outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-all shadow-xs"
            />
            {customerSearch && (
              <button
                type="button"
                onClick={() => setCustomerSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 rounded cursor-pointer"
              >
                <X size={13} />
              </button>
            )}

            {/* Menu déroulant des résultats de recherche */}
            {customerSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredCustomerResults.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-slate-400 dark:text-zinc-500">
                    Aucun client correspondant
                  </div>
                ) : (
                  filteredCustomerResults.map((c: Customer) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full p-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between transition-colors cursor-pointer group/item"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch('');
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                          {String(c?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate uppercase">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            {c.phone || 'Sans contact'}
                          </p>
                        </div>
                      </div>

                      {(c.balance || 0) !== 0 && (
                        <span
                          className={cn(
                            "text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 ml-1.5",
                            (c.balance || 0) > 0
                              ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10"
                              : "text-rose-700 dark:text-rose-400 border-rose-500/20 bg-rose-50 dark:bg-rose-500/10"
                          )}
                        >
                          {(c.balance || 0).toFixed(0)} {currency}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bouton Créer Nouveau Client */}
          <button
            type="button"
            onClick={() => setIsPOSCustomerModalOpen(true)}
            className="h-8.5 w-8.5 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            title="Créer un nouveau client (F6)"
          >
            <UserPlus size={15} />
          </button>
        </div>
      )}
    </div>
  );
});

CustomerSelection.displayName = 'CustomerSelection';
