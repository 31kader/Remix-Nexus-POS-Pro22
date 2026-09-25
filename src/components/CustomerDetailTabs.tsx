import React, { useState, useEffect, useMemo } from 'react';
import { 
  Contact, User as UserIcon, Phone, Mail, 
  CreditCard as CardIcon, Quote, Clock, ShoppingBag, RotateCcw, Loader2,
  MapPin, Briefcase, Calendar, ShieldCheck, FileText, Smartphone, Plus,
  UserCheck, History, CreditCard, Tag, ArrowDownRight, ArrowUpRight,
  Search, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, TrendingUp, CheckCircle2,
  Store
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Customer, Transaction, CompanySettings } from '../types';
import { cn, formatSafe, parseCashierNotes, formatPrice } from '../lib/utils';
import { CustomerDigitalCard } from './CustomerDigitalCard';
import { useTransactionStore } from '../store/useTransactionStore';
import { useCartStore } from '../store/useCartStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { localDb } from '../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../supabase';
import { convertKeysToCamel } from '../lib/db-converters';

interface ParsedNoteInfo {
  isFinancial: boolean;
  type: 'versement' | 'retrait' | 'memo';
  typeLabel: string;
  badgeClass: string;
  description: string;
  amount: number | null;
  method: string | null;
  isPositive: boolean;
}

function parseNoteFinancialInfo(noteStr: string): ParsedNoteInfo {
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

interface CustomerDetailTabsProps {
  activeTab: 'info' | 'history' | 'card';
  setActiveTab: (tab: 'info' | 'history' | 'card') => void;
  selectedCustomer: Customer;
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  translation: (k: string) => string;
}

export function CustomerDetailTabs({
  activeTab,
  setActiveTab,
  selectedCustomer,
  transactions,
  settings,
  onRestore,
  translation
}: CustomerDetailTabsProps) {
  const storeTransactions = useTransactionStore(s => s.transactions);
  const returns = useTransactionStore(s => s.returns) || [];

  const handleRestore = (t: Transaction) => {
    if (typeof onRestore === 'function') {
      onRestore(t);
    } else {
      useCartStore.getState().loadTransactionToCart(t, (tab: string) => {
        window.dispatchEvent(new CustomEvent('change-tab', { detail: tab }));
      });
    }
  };

  // Récupération directe depuis Supabase pour ce client si non présent dans le cache récent
  const [directTxs, setDirectTxs] = useState<Transaction[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCustomer?.id || !isSupabaseConfigured) return;
    let isMounted = true;
    setIsLoadingTxs(true);

    supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', selectedCustomer.id)
      .order('timestamp', { ascending: false })
      .limit(50)
      .then(({ data, error }: { data: any; error: any }) => {
        if (!error && data && isMounted) {
          const parsed = data.map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch (_) { item.items = []; }
            }
            return convertKeysToCamel(item) as Transaction;
          });
          setDirectTxs(parsed);
        }
      })
      .catch(console.warn)
      .finally(() => {
        if (isMounted) setIsLoadingTxs(false);
      });

    return () => { isMounted = false; };
  }, [selectedCustomer?.id]);

  const allTxs = useMemo(() => {
    const map = new Map<string, Transaction>();
    (transactions || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
    (storeTransactions || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
    (directTxs || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
    return Array.from(map.values());
  }, [transactions, storeTransactions, directTxs]);

  const targetCustId = String(selectedCustomer?.id || '');
  const targetCustName = String(selectedCustomer?.name || '').toLowerCase().trim();

  const customerTransactions = useMemo(() => {
    return allTxs.filter(t => {
      if (!t) return false;
      const cId = String(t.customerId || (t as any).customer_id || '');
      const cName = String(t.customerName || (t as any).customer_name || '').toLowerCase().trim();
      return (targetCustId && cId === targetCustId) || (targetCustName && cName === targetCustName);
    });
  }, [allTxs, targetCustId, targetCustName]);

  const customerReturns = useMemo(() => {
    return (returns || []).filter(r => {
      if (!r) return false;
      const cId = String(r.customerId || (r as any).customer_id || '');
      const cName = String((r as any).customerName || (r as any).customer_name || '').toLowerCase().trim();
      return (targetCustId && cId === targetCustId) || (targetCustName && cName === targetCustName);
    });
  }, [returns, targetCustId, targetCustName]);

  const storeOnlineOrders = useTransactionStore(s => s.onlineOrders) || [];

  const cleanPhone = (p?: string) => (p || '').replace(/\D/g, '');
  const custPhoneClean = cleanPhone(selectedCustomer?.phone);

  const customerOnlineOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return (storeOnlineOrders || []).filter(o => {
      if (!o) return false;
      const matchesId = targetCustId && String(o.customerId || '') === targetCustId;
      const matchesPhone = custPhoneClean && cleanPhone(o.customerPhone) === custPhoneClean;
      const matchesName = targetCustName && String(o.customerName || '').toLowerCase().trim() === targetCustName;
      return matchesId || matchesPhone || matchesName;
    });
  }, [storeOnlineOrders, selectedCustomer, targetCustId, targetCustName, custPhoneClean]);

  // Combine and sort chronologically desc
  const timeline = useMemo(() => {
    const list: any[] = [];
    const processedOnlineOrderIds = new Set<string>();

    customerTransactions.forEach(t => {
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      const isOnline = Boolean(
        t.onlineOrderId || 
        t.employeeId === 'online_sync' || 
        t.employeeName === 'Commande en ligne' ||
        (t as any).source === 'online' ||
        (t as any).source === 'app' ||
        (t as any).source === 'Site Web' ||
        (t.deliveryMethod && t.deliveryMethod !== 'in_store')
      );

      if (t.onlineOrderId) {
        processedOnlineOrderIds.add(String(t.onlineOrderId));
      }

      list.push({
        type: 'transaction' as const,
        channel: isOnline ? ('online' as const) : ('in_store' as const),
        id: t.id,
        timestamp: t.timestamp || (t as any).created_at || new Date().toISOString(),
        total: Number(t.total || (t as any).totalAmount || 0),
        items,
        onlineOrderId: t.onlineOrderId,
        deliveryMethod: t.deliveryMethod,
        raw: t
      });
    });

    customerOnlineOrders.forEach(o => {
      if (processedOnlineOrderIds.has(String(o.id)) || (o.externalOrderId && processedOnlineOrderIds.has(String(o.externalOrderId)))) {
        return; // Déjà représentée dans les transactions synchronisées
      }

      let items = o.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      list.push({
        type: 'online_order' as const,
        channel: 'online' as const,
        id: o.id,
        externalOrderId: o.externalOrderId,
        timestamp: o.timestamp || (o as any).created_at || new Date().toISOString(),
        total: Number(o.total || 0),
        items,
        status: o.status,
        paymentStatus: o.paymentStatus,
        deliveryMethod: o.deliveryMethod,
        raw: o
      });
    });

    customerReturns.forEach(r => {
      let items = r.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      list.push({
        type: 'return' as const,
        channel: 'in_store' as const,
        id: r.id,
        timestamp: r.timestamp || r.date || new Date().toISOString(),
        total: Number(r.totalRefund || r.refundAmount || 0),
        items,
        raw: r
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customerTransactions, customerOnlineOrders, customerReturns]);

  const safeTranslation = typeof translation === 'function' ? translation : ((k: string) => k);

  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteFilter, setNoteFilter] = useState<'all' | 'versement' | 'retrait' | 'memo'>('all');
  const [noteSearch, setNoteSearch] = useState<string>('');

  // States for Grand Tableau du Journal de bord
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in_store' | 'online' | 'returns'>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const HISTORY_PAGE_SIZE = 15;

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

  // Notes filtering
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

  // Statistics for Journal de bord
  const historyStats = useMemo(() => {
    let storeCount = 0;
    let storeTotal = 0;
    let onlineCount = 0;
    let onlineTotal = 0;
    let returnsCount = 0;
    let refundTotal = 0;

    timeline.forEach(item => {
      if (item.type === 'transaction') {
        if (item.channel === 'online') {
          onlineCount++;
          onlineTotal += (item.total || 0);
        } else {
          storeCount++;
          storeTotal += (item.total || 0);
        }
      } else if (item.type === 'online_order') {
        onlineCount++;
        onlineTotal += (item.total || 0);
      } else if (item.type === 'return') {
        returnsCount++;
        refundTotal += (item.total || 0);
      }
    });

    const salesTotal = storeTotal + onlineTotal;

    return {
      totalOps: timeline.length,
      salesCount: storeCount + onlineCount,
      salesTotal,
      storeCount,
      storeTotal,
      onlineCount,
      onlineTotal,
      returnsCount,
      refundTotal,
      netTotal: salesTotal - refundTotal
    };
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter(item => {
      if (historyFilter === 'in_store' && (item.channel !== 'in_store' || item.type === 'return')) return false;
      if (historyFilter === 'online' && item.channel !== 'online') return false;
      if (historyFilter === 'returns' && item.type !== 'return') return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const idMatch = String(item.id || '').toLowerCase().includes(q) ||
                        String(item.externalOrderId || '').toLowerCase().includes(q) ||
                        String(item.onlineOrderId || '').toLowerCase().includes(q);
        const itemMatch = (item.items || []).some((it: any) => 
          (it.name || it.productName || '').toLowerCase().includes(q)
        );
        if (!idMatch && !itemMatch) return false;
      }
      return true;
    });
  }, [timeline, historyFilter, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTimeline.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedTimeline = useMemo(() => {
    const start = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
    return filteredTimeline.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredTimeline, currentHistoryPage]);

  return (
    <>
      {/* Tabs Navigation (Compact ~36px) */}
      <div className="flex border-b border-slate-800 bg-slate-950/90 px-3">
        <button 
          type="button"
          onClick={() => setActiveTab('info')}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5", 
            activeTab === 'info' 
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" 
              : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <UserCheck size={14} />
          {safeTranslation("Général")}
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5", 
            activeTab === 'history' 
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" 
              : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <History size={14} />
          {safeTranslation("Journal de bord")}
          <span className="bg-indigo-500/20 text-indigo-400 py-0.2 px-1.5 rounded text-[10px] font-mono font-bold border border-indigo-500/30">
            {timeline.length}
          </span>
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('card')}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5", 
            activeTab === 'card' 
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" 
              : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <CreditCard size={14} />
          {safeTranslation("Digital Card")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 bg-slate-950/60">
        {activeTab === 'info' && (
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
                            <span className="text-slate-500 ">Non renseigné</span>
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
                            <span className="text-slate-500 ">Non renseigné</span>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Adresse / Ville</td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-300">
                          {[selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(', ') || (
                            <span className="text-slate-500 ">Non renseignée</span>
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
                            <span className="text-slate-500 ">Inconnue</span>
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
                            <span className="text-slate-500  text-xs">Non enregistré sur l'App</span>
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
                <p className="text-xs font-medium text-amber-200/90 leading-relaxed ">
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
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {isLoadingTxs && timeline.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Loader2 size={28} className="mx-auto mb-2.5 animate-spin text-indigo-400" />
                <p className="font-bold text-xs uppercase tracking-wider text-slate-400">Chargement du journal de bord...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60 p-5">
                <ShoppingBag size={40} className="mx-auto mb-3 opacity-30 text-indigo-400" />
                <p className="font-bold text-sm text-slate-300">Aucune opération enregistrée</p>
                <p className="text-xs text-slate-500 mt-1">Les achats et retours liés à ce client apparaîtront ici sous forme de tableau complet.</p>
              </div>
            ) : (
              <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 shadow-xl space-y-2.5">
                {/* Barre d'outils ultra-compacte avec statistiques intégrées (Gain de ~100px) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 text-[11px] font-black uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => { setHistoryFilter('all'); setHistoryPage(1); }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px]",
                        historyFilter === 'all'
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      )}
                    >
                      Toutes ({timeline.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHistoryFilter('in_store'); setHistoryPage(1); }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
                        historyFilter === 'in_store'
                          ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                      )}
                    >
                      <Store size={12} />
                      En Magasin ({historyStats.storeCount}) <span className="font-mono text-[10px] opacity-85">+{formatPrice(historyStats.storeTotal)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHistoryFilter('online'); setHistoryPage(1); }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
                        historyFilter === 'online'
                          ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                          : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                      )}
                    >
                      <Smartphone size={12} />
                      Sur l'Application ({historyStats.onlineCount}) <span className="font-mono text-[10px] opacity-85">+{formatPrice(historyStats.onlineTotal)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHistoryFilter('returns'); setHistoryPage(1); }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
                        historyFilter === 'returns'
                          ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                      )}
                    >
                      <RotateCcw size={12} />
                      Retours ({historyStats.returnsCount}) <span className="font-mono text-[10px] opacity-85">-{formatPrice(historyStats.refundTotal)}</span>
                    </button>

                    {/* Net Badge */}
                    <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] flex items-center gap-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold">Net:</span>
                      <span className="font-black text-white">{formatPrice(historyStats.netTotal)} {settings.currency || 'DA'}</span>
                    </div>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input
                      type="text"
                      placeholder="Rechercher ticket #, article..."
                      value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                      className="w-full pl-8 pr-6 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => { setHistorySearch(''); setHistoryPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Le Grand TABLEAU du Journal de Bord */}
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-lg">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-[11px] uppercase tracking-wider sticky top-0 z-10">
                        <th className="py-3 px-3.5">Date & Heure</th>
                        <th className="py-3 px-3.5">Réf Ticket / Cmd</th>
                        <th className="py-3 px-3.5">Origine & Type</th>
                        <th className="py-3 px-3.5">Articles & Détails</th>
                        <th className="py-3 px-3.5">Paiement</th>
                        <th className="py-3 px-3.5 text-right">Montant</th>
                        <th className="py-3 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {paginatedTimeline.map((item) => {
                        const isTx = item.type === 'transaction';
                        const isExpanded = expandedTxId === item.id;
                        const safeItems = Array.isArray(item.items) ? item.items : [];
                        const itemCount = safeItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

                        return (
                          <React.Fragment key={`${item.type}-${item.id}`}>
                            <tr className={cn(
                              "hover:bg-slate-800/40 transition-colors",
                              isExpanded && "bg-slate-900/40"
                            )}>
                              {/* Date & Heure */}
                              <td className="py-3 px-3.5 font-mono font-bold text-slate-300 whitespace-nowrap text-xs">
                                <span className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-slate-500" />
                                  {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm')}
                                </span>
                              </td>

                              {/* Réf Ticket / Commande */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md w-fit">
                                    #{String(item.externalOrderId || item.id || "").slice(-6).toUpperCase()}
                                  </span>
                                  {item.onlineOrderId && (
                                    <span className="text-[9px] font-mono text-violet-400 pl-0.5 font-bold">
                                      Cmd App #{String(item.onlineOrderId).slice(-6)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Origine & Type */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                {item.type === 'return' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                                    <RotateCcw size={11} /> Retour
                                  </span>
                                ) : item.channel === 'online' ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1 w-fit shadow-sm">
                                      <Smartphone size={11} className="text-violet-400" /> Application
                                    </span>
                                    {item.type === 'online_order' && item.status && (
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                                        {item.status === 'pending' ? 'En attente' :
                                         item.status === 'confirmed' ? 'Confirmée' :
                                         item.status === 'processing' ? 'Préparation' :
                                         item.status === 'shipped' ? 'Expédiée' :
                                         item.status === 'delivered' ? 'Livrée' : item.status}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
                                    <Store size={11} className="text-blue-400" /> Magasin
                                  </span>
                                )}
                              </td>

                              {/* Articles & Détails */}
                              <td className="py-3 px-3.5">
                                <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                  <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold text-[10px] rounded">
                                    {itemCount} art.
                                  </span>
                                  {safeItems.slice(0, 2).map((it: any, idx: number) => (
                                    <span 
                                      key={idx}
                                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 font-medium text-[11px] rounded truncate max-w-[140px]"
                                      title={it.productName || it.name}
                                    >
                                      <strong className="text-white font-bold">{it.quantity || 1}x</strong> {it.productName || it.name || 'Article'}
                                    </span>
                                  ))}
                                  {safeItems.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                                      className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-[10px] font-bold rounded transition-colors"
                                    >
                                      +{safeItems.length - 2} autres
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Paiement */}
                              <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-300 text-xs">
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono uppercase w-fit">
                                    {item.raw.paymentMethod === 'cash' ? 'Espèces' : item.raw.paymentMethod === 'card' ? 'Carte' : item.raw.paymentMethod === 'balance' ? 'Solde/Crédit' : item.raw.paymentMethod || 'Espèces'}
                                  </span>
                                  {item.type === 'online_order' && (
                                    <span className={cn(
                                      "text-[9px] font-bold uppercase",
                                      item.paymentStatus === 'paid' ? "text-emerald-400" : "text-amber-400"
                                    )}>
                                      {item.paymentStatus === 'paid' ? 'Payé' : 'À régler'}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Montant Net */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <span className={cn(
                                  "font-mono font-black text-xs",
                                  item.type === 'return' ? "text-rose-400" : "text-emerald-400"
                                )}>
                                  {item.type === 'return' ? '- ' : '+ '}
                                  {formatPrice(item.total)} <span className="text-[10px] font-sans font-bold">{settings.currency || 'DA'}</span>
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isTx && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestore(item.raw)}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                      title="Recharger cette vente dans le panier de caisse"
                                    >
                                      <ShoppingBag size={11} /> Reprendre
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                                    title={isExpanded ? "Masquer les articles" : "Voir les articles"}
                                  >
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Vue déroulante détaillée des articles du ticket */}
                            {isExpanded && (
                              <tr className="bg-slate-900/60">
                                <td colSpan={7} className="py-3 px-5 border-t border-b border-slate-800/80">
                                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <ShoppingBag size={12} /> Détail complet des articles (#{String(item.id).slice(-6).toUpperCase()})
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {safeItems.map((it: any, iIdx: number) => (
                                        <div key={iIdx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                          <div className="truncate mr-2">
                                            <p className="font-bold text-white truncate text-[11px]">{it.productName || it.name || 'Article'}</p>
                                            <p className="text-[10px] font-mono text-slate-400">
                                              PU : {Number(it.price || it.unitPrice || 0).toFixed(2)} {settings.currency || 'DA'}
                                            </p>
                                          </div>
                                          <div className="text-right flex-shrink-0">
                                            <span className="font-bold font-mono text-indigo-300 text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                                              x{it.quantity || 1}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination du Journal de bord */}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Page <strong className="text-white">{currentHistoryPage}</strong> sur <strong className="text-white">{totalHistoryPages}</strong> ({filteredTimeline.length} opérations)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentHistoryPage <= 1}
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1"
                      >
                        <ChevronLeft size={13} /> Précédent
                      </button>
                      <button
                        type="button"
                        disabled={currentHistoryPage >= totalHistoryPages}
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1"
                      >
                        Suivant <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {activeTab === 'card' && (
          <CustomerDigitalCard selectedCustomer={selectedCustomer} settings={settings} />
        )}
      </div>
    </>
  );
}
