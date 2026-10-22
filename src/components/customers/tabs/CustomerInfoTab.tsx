import React, { useState, useMemo } from 'react';
import { 
  Contact, Phone, Mail, MapPin, Briefcase, Calendar, 
  Smartphone, Plus, Quote, FileText, Search, X, Store, 
  TrendingUp, Compass, Navigation, Copy
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Customer, CompanySettings } from '../../../types';
import { cn, formatSafe, parseCashierNotes, formatPrice } from '../../../lib/utils';
import { usePeopleStore } from '../../../store/usePeopleStore';
import { localDb } from '../../../services/LocalDatabase';
import { 
  hasCustomerGps, 
  getCustomerGpsCoordinates, 
  getCustomerGoogleMapsUrl, 
  getCustomerWazeUrl 
} from '../../../lib/delivery-itinerary';

export interface ParsedNoteInfo {
  isFinancial: boolean;
  type: 'versement' | 'retrait' | 'memo';
  typeLabel: string;
  badgeClass: string;
  description: string;
  amount: number | null;
  method: string | null;
  isPositive: boolean;
}

export function parseNoteFinancialInfo(noteStr: string): ParsedNoteInfo {
  if (!noteStr) {
    return {
      isFinancial: false,
      type: 'memo',
      typeLabel: 'Mémo',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      description: 'Sans détail',
      amount: null,
      method: null,
      isPositive: true
    };
  }

  const isReglement = noteStr.includes('[REGLEMENT]');
  if (!isReglement) {
    return {
      isFinancial: false,
      type: 'memo',
      typeLabel: 'Mémo',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: noteStr,
      amount: null,
      method: null,
      isPositive: true
    };
  }

  const isEncaissement = noteStr.toLowerCase().includes('encaissement') || noteStr.toLowerCase().includes('versement');
  const isDecaissement = noteStr.toLowerCase().includes('décaissement') || noteStr.toLowerCase().includes('decaissement') || noteStr.toLowerCase().includes('sortie') || noteStr.toLowerCase().includes('retrait');

  // Match amount like "de 2000.00 DA" or "de 2000 DA"
  const amountMatch = noteStr.match(/de\s+([0-9.,]+)\s*([A-Za-z]+)?/i);
  let amount: number | null = null;
  if (amountMatch) {
    const rawNum = parseFloat(amountMatch[1].replace(',', '.'));
    if (!isNaN(rawNum)) amount = rawNum;
  }

  // Match payment method like "(CASH)" or "(CARD)"
  const methodMatch = noteStr.match(/\(([A-Z]+)\)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : null;

  // Clean description after dash " - "
  const dashIdx = noteStr.indexOf(' - ');
  let desc = dashIdx !== -1 ? noteStr.substring(dashIdx + 3).trim() : noteStr.replace('[REGLEMENT]', '').trim();
  if (!desc) desc = isEncaissement ? 'Versement / Règlement' : (isDecaissement ? 'Décaissement / Retrait' : 'Ajustement de solde');

  if (isEncaissement) {
    return {
      isFinancial: true,
      type: 'versement',
      typeLabel: 'Versement Client',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description: desc,
      amount,
      method,
      isPositive: true
    };
  }

  if (isDecaissement) {
    return {
      isFinancial: true,
      type: 'retrait',
      typeLabel: 'Retrait / Décaissement',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: desc,
      amount,
      method,
      isPositive: false
    };
  }

  return {
    isFinancial: true,
    type: 'versement',
    typeLabel: 'Règlement',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: desc,
    amount,
    method,
    isPositive: true
  };
}

export interface CustomerInfoTabProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
  historyStats: {
    storeTotal: number;
    storeCount: number;
    onlineTotal: number;
    onlineCount: number;
    netTotal: number;
    returnsCount: number;
  };
}

export const CustomerInfoTab: React.FC<CustomerInfoTabProps> = ({
  selectedCustomer,
  settings,
  historyStats
}) => {
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteFilter, setNoteFilter] = useState<'all' | 'versement' | 'retrait' | 'memo'>('all');
  const [noteSearch, setNoteSearch] = useState<string>('');

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
    <div className="space-y-5">
      {/* 1. Grille d'Informations Générales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Tableau Coordonnées & Identité */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Contact size={15} /> Identité & Coordonnées
            </h4>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              ID: {selectedCustomer.id}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px] w-1/3">Nom Complet</td>
                  <td className="py-2.5 px-3.5 font-black text-white text-xs uppercase tracking-wide">{selectedCustomer.name || 'Client sans nom'}</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Téléphone</td>
                  <td className="py-2.5 px-3.5">
                    {selectedCustomer.phone ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider">{selectedCustomer.phone}</span>
                        <a 
                          href={`tel:${selectedCustomer.phone}`}
                          className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
                          title="Appeler"
                        >
                          <Phone size={11} /> Appeler
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-500">Non renseigné</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Email</td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-200">
                    {selectedCustomer.email ? (
                      <a href={`mailto:${selectedCustomer.email}`} className="text-indigo-400 hover:underline">
                        {selectedCustomer.email}
                      </a>
                    ) : (
                      <span className="text-slate-500">Non renseigné</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px] align-top">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-rose-400" />
                      <span>Adresse & GPS</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex flex-col gap-2">
                      <div className="text-slate-200 font-medium">
                        {[selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(', ') || (
                          <span className="text-slate-500 italic">Non renseignée</span>
                        )}
                      </div>

                      {hasCustomerGps(selectedCustomer) && (() => {
                        const gps = getCustomerGpsCoordinates(selectedCustomer);
                        if (!gps) return null;
                        return (
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                🎯
                              </div>
                              <div>
                                <span className="text-[10px] font-mono font-bold text-emerald-400 block tracking-tight">
                                  GPS: {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  Adresse Principale Enregistrée
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={getCustomerGoogleMapsUrl(selectedCustomer)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                title="Ouvrir itinéraire Google Maps"
                              >
                                <Compass size={12} /> Maps
                              </a>
                              <a
                                href={getCustomerWazeUrl(selectedCustomer)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                title="Ouvrir navigation Waze"
                              >
                                <Navigation size={12} /> Waze
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${gps.latitude},${gps.longitude}`);
                                  toast.success("Coordonnées GPS copiées !");
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                                title="Copier les coordonnées GPS"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Canal d'adhésion</td>
                  <td className="py-2.5 px-3.5">
                    {selectedCustomer.isAppUser ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider">
                        <Smartphone size={12} className="text-indigo-400" />
                        Compte Créé sur l'Application Mobile
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        <Store size={12} />
                        Client Enregistré en Caisse (POS)
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Date d'adhésion</td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-300">
                    {selectedCustomer.joinDate ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-indigo-400" />
                        {formatSafe(selectedCustomer.joinDate, 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    ) : (
                      <span className="text-slate-500">Inconnue</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tableau Profil Commercial & Compte */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={15} /> Profil Commercial & Conditions
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              selectedCustomer.isWholesale 
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
            }`}>
              {selectedCustomer.isWholesale ? "Grossiste" : "Détail / Standard"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px] w-1/3">N° Carte Fidélité</td>
                  <td className="py-2.5 px-3.5">
                    <span className="font-mono font-black text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md">
                      {selectedCustomer.loyaltyCardNumber || 'NON ASSIGNÉ'}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Tarification</td>
                  <td className="py-2.5 px-3.5">
                    <span className="font-bold text-white text-xs">
                      {selectedCustomer.isWholesale ? "Prix de gros appliqué" : "Prix public normal"}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Plafond Crédit</td>
                  <td className="py-2.5 px-3.5 font-mono font-bold text-amber-400 text-xs">
                    {(selectedCustomer.creditLimit || 0) > 0 
                      ? `${Number(selectedCustomer.creditLimit).toFixed(2)} ${settings.currency || 'DA'}` 
                      : <span className="text-slate-400 font-sans font-bold">Sans plafond</span>
                    }
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Accès App Client</td>
                  <td className="py-2.5 px-3.5">
                    {selectedCustomer.isAppUser ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Smartphone size={10} /> Compte Actif
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Non enregistré sur l'App</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Situation Solde</td>
                  <td className="py-2.5 px-3.5">
                    {(Number(selectedCustomer.balance) || 0) < 0 ? (
                      <span className="font-mono font-black text-xs text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md">
                        Dette : {Math.abs(Number(selectedCustomer.balance) || 0).toFixed(2)} {settings.currency || 'DA'}
                      </span>
                    ) : (Number(selectedCustomer.balance) || 0) > 0 ? (
                      <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        Solde : +{Number(selectedCustomer.balance || 0).toFixed(2)} {settings.currency || 'DA'}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-xs">
                        À jour (0.00 {settings.currency || 'DA'})
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Note Interne si présente */}
      {selectedCustomer.notes && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-md">
          <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-1.5">
            <Quote size={14} /> Note Interne sur le Client
          </h5>
          <p className="text-xs font-medium text-amber-200/90 leading-relaxed">
            "{selectedCustomer.notes}"
          </p>
        </div>
      )}

      {/* Répartition des Achats : Magasin vs Application */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/95 border border-blue-500/20 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
              <Store size={13} /> Achats en Magasin
            </p>
            <p className="text-lg font-black text-white mt-1">
              {formatPrice(historyStats.storeTotal)} <span className="text-xs font-bold text-slate-400">{settings.currency || 'DA'}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
              {historyStats.storeCount} vente{historyStats.storeCount > 1 ? 's' : ''} en caisse physique
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <Store size={20} />
          </div>
        </div>

        <div className="bg-slate-900/95 border border-violet-500/20 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-violet-400 tracking-wider flex items-center gap-1.5">
              <Smartphone size={13} /> Sur l'Application
            </p>
            <p className="text-lg font-black text-white mt-1">
              {formatPrice(historyStats.onlineTotal)} <span className="text-xs font-bold text-slate-400">{settings.currency || 'DA'}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
              {historyStats.onlineCount} commande{historyStats.onlineCount > 1 ? 's' : ''} mobile / web
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
            <Smartphone size={20} />
          </div>
        </div>

        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <TrendingUp size={13} /> Total Net Dépensé
            </p>
            <p className="text-lg font-black text-white mt-1">
              {formatPrice(historyStats.netTotal)} <span className="text-xs font-bold text-slate-400">{settings.currency || 'DA'}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
              {historyStats.returnsCount > 0 ? `${historyStats.returnsCount} retour(s) déduit(s)` : 'Tous canaux confondus'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* 2. Le Grand TABLEAU des Règlements, Versements & Mémos */}
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
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 shadow-sm active:scale-95"
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
                "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px]",
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
                "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px]",
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
                "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px]",
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
                "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[10px]",
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                            {parsed.amount.toFixed(2)} <span className="text-[10px] font-sans font-bold">{settings.currency || 'DA'}</span>
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

    </div>
  );
};
