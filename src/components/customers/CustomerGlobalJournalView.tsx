import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, ShoppingBag, RotateCcw, 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  TrendingUp, ArrowUpDown, User, X, CheckCircle2,
  Calendar, ShoppingCart, Eye
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { Customer, Transaction, CompanySettings } from '../../types';
import { cn, formatSafe } from '../../lib/utils';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useCartStore } from '../../store/useCartStore';

interface CustomerGlobalJournalViewProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (id: string | null) => void;
  onRestore?: (t: Transaction) => void;
}

export const CustomerGlobalJournalView: React.FC<CustomerGlobalJournalViewProps> = ({
  customers: propCustomers,
  transactions: propTransactions,
  settings,
  selectedCustomerId: initialSelectedCustomerId = null,
  onSelectCustomer,
  onRestore
}) => {
  const storeCustomers = usePeopleStore(s => s.customers);
  const storeTransactions = useTransactionStore(s => s.transactions);
  const storeReturns = useTransactionStore(s => s.returns);
  const loadTransactionToCart = useCartStore(s => s.loadTransactionToCart);

  const customers = propCustomers && propCustomers.length > 0 ? propCustomers : storeCustomers;
  const transactions = propTransactions && propTransactions.length > 0 ? propTransactions : storeTransactions;
  const returns = storeReturns || [];

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(initialSelectedCustomerId || null);
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'returns'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // Map of customers by ID
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Combine and format timeline items
  const allTimelineItems = useMemo(() => {
    const list: any[] = [];

    (transactions || []).forEach(t => {
      if (!t) return;
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      const cId = t.customerId || (t as any).customer_id || null;
      const cName = t.customerName || (t as any).customer_name || (cId ? customerMap.get(cId)?.name : null) || 'Client de passage';

      list.push({
        type: 'transaction' as const,
        id: t.id,
        timestamp: t.timestamp || (t as any).created_at || new Date().toISOString(),
        total: Number(t.total || (t as any).totalAmount || 0),
        paymentMethod: t.paymentMethod || (t as any).payment_method || 'cash',
        customerId: cId,
        customerName: cName,
        items,
        raw: t
      });
    });

    (returns || []).forEach(r => {
      if (!r) return;
      let items = r.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      const cId = r.customerId || (r as any).customer_id || null;
      const cName = (r as any).customerName || (r as any).customer_name || (cId ? customerMap.get(cId)?.name : null) || 'Client de passage';

      list.push({
        type: 'return' as const,
        id: r.id,
        timestamp: r.timestamp || r.date || new Date().toISOString(),
        total: Number(r.totalRefund || r.refundAmount || 0),
        paymentMethod: (r as any).refundMethod || 'cash',
        customerId: cId,
        customerName: cName,
        items,
        raw: r
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, returns, customerMap]);

  // Filter items based on customer, type, search
  const filteredTimeline = useMemo(() => {
    return allTimelineItems.filter(item => {
      // Customer filter
      if (activeCustomerId && item.customerId !== activeCustomerId) {
        return false;
      }

      // Type filter
      if (filterType === 'sales' && item.type !== 'transaction') return false;
      if (filterType === 'returns' && item.type !== 'return') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(item.id || '').toLowerCase().includes(q);
        const customerMatch = String(item.customerName || '').toLowerCase().includes(q);
        const itemMatch = (item.items || []).some((it: any) => 
          (it.name || it.productName || '').toLowerCase().includes(q)
        );
        if (!idMatch && !customerMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [allTimelineItems, activeCustomerId, filterType, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    let salesCount = 0;
    let returnsCount = 0;
    let salesTotal = 0;
    let refundTotal = 0;

    filteredTimeline.forEach(item => {
      if (item.type === 'transaction') {
        salesCount++;
        salesTotal += (item.total || 0);
      } else if (item.type === 'return') {
        returnsCount++;
        refundTotal += (item.total || 0);
      }
    });

    return {
      totalOps: filteredTimeline.length,
      salesCount,
      returnsCount,
      salesTotal,
      refundTotal,
      netTotal: salesTotal - refundTotal
    };
  }, [filteredTimeline]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTimeline.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTimeline = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTimeline.slice(start, start + PAGE_SIZE);
  }, [filteredTimeline, currentPage]);

  const selectedCustomerObj = activeCustomerId ? customerMap.get(activeCustomerId) : null;

  return (
    <div className="flex-1 flex flex-col gap-4 bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-md overflow-hidden h-full">
      
      {/* Top Header & Customer Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
              Grand Journal de Bord des Ventes
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
              {filteredTimeline.length} opération(s) répertoriée(s) • Affichage panoramique
            </p>
          </div>
        </div>

        {/* Customer Select Dropdown Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client :</span>
          <select
            value={activeCustomerId || ''}
            onChange={(e) => {
              const val = e.target.value || null;
              setActiveCustomerId(val);
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
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Opérations</p>
            <p className="text-base font-black text-white font-mono mt-0.5">{stats.totalOps}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs">
            #
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Ventes ({stats.salesCount})</p>
            <p className="text-base font-black text-emerald-400 font-mono mt-0.5">
              +{stats.salesTotal.toFixed(2)} <span className="text-[10px] text-emerald-400/70">{settings.currency || 'DA'}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShoppingBag size={14} />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Retours ({stats.returnsCount})</p>
            <p className="text-base font-black text-rose-400 font-mono mt-0.5">
              -{stats.refundTotal.toFixed(2)} <span className="text-[10px] text-rose-400/70">{settings.currency || 'DA'}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <RotateCcw size={14} />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">Chiffre Net</p>
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
            Toutes ({allTimelineItems.length})
          </button>
          <button
            type="button"
            onClick={() => { setFilterType('sales'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5",
              filterType === 'sales'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            <ShoppingBag size={13} /> Ventes
          </button>
          <button
            type="button"
            onClick={() => { setFilterType('returns'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5",
              filterType === 'returns'
                ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            )}
          >
            <RotateCcw size={13} /> Retours
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Rechercher ticket, client, article..."
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
      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60">
        {paginatedTimeline.length > 0 ? (
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="py-3 px-3.5">Date & Heure</th>
                <th className="py-3 px-3.5">Client</th>
                <th className="py-3 px-3.5">Réf. Ticket</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Articles</th>
                <th className="py-3 px-3.5">Paiement</th>
                <th className="py-3 px-3.5 text-right">Montant Net</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {paginatedTimeline.map((item) => {
                const isSale = item.type === 'transaction';
                const isExpanded = expandedTxId === item.id;
                const itemsCount = (item.items || []).reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);

                return (
                  <React.Fragment key={`${item.type}-${item.id}`}>
                    <tr 
                      className={cn(
                        "hover:bg-slate-800/40 transition-colors group cursor-pointer",
                        isExpanded && "bg-slate-800/30"
                      )}
                      onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>

                      {/* Client */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-white uppercase text-[11px] group-hover:text-indigo-300 transition-colors">
                          {item.customerName || 'Client de passage'}
                        </span>
                      </td>

                      {/* Ref */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        #{String(item.id).substring(0, 8)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          isSale
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        )}>
                          {isSale ? 'Vente' : 'Retour'}
                        </span>
                      </td>

                      {/* Articles summary */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5 text-slate-300 text-[11px] max-w-[240px] truncate">
                          <span className="font-black text-indigo-400 font-mono">
                            {itemsCount} art.
                          </span>
                          <span className="text-slate-400 truncate">
                            {(item.items || []).map((it: any) => it.name || it.productName).filter(Boolean).slice(0, 2).join(', ') || 'Articles divers'}
                            {(item.items || []).length > 2 ? '...' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-mono uppercase font-bold">
                          {item.paymentMethod || 'cash'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right font-mono font-black text-xs">
                        <span className={isSale ? "text-emerald-400" : "text-rose-400"}>
                          {isSale ? '+' : '-'}{Number(item.total || 0).toFixed(2)} {settings.currency || 'DA'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {isSale && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onRestore) {
                                  onRestore(item.raw);
                                } else {
                                  loadTransactionToCart(item.raw, () => {
                                    window.location.hash = '#checkout';
                                  });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                              title="Reprendre cette commande dans le panier de caisse"
                            >
                              <ShoppingCart size={11} /> Reprendre
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                            title={isExpanded ? "Masquer le détail" : "Afficher le détail des articles"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable items drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-slate-800">
                        <td colSpan={8} className="p-3.5">
                          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 pb-1.5">
                              <span>Détail du panier ({item.items?.length || 0} lignes)</span>
                              <span>Réf: #{item.id}</span>
                            </div>
                            <div className="divide-y divide-slate-800/40 max-h-48 overflow-y-auto">
                              {(item.items || []).map((it: any, idx: number) => {
                                const unitPrice = Number(it.price || it.unitPrice || 0);
                                const qte = Number(it.quantity || 1);
                                const lineTotal = Number(it.total || (unitPrice * qte));
                                return (
                                  <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-black flex items-center justify-center">
                                        {idx + 1}
                                      </span>
                                      <span className="text-white font-bold">{it.name || it.productName || 'Article'}</span>
                                      {it.barcode && <span className="text-[10px] text-slate-500 font-mono">({it.barcode})</span>}
                                    </div>
                                    <div className="flex items-center gap-3 font-mono text-[11px]">
                                      <span className="text-slate-400">{qte} × {unitPrice.toFixed(2)}</span>
                                      <span className="font-bold text-white">{lineTotal.toFixed(2)} {settings.currency || 'DA'}</span>
                                    </div>
                                  </div>
                                );
                              })}
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
        ) : (
          <div className="text-center py-16 text-slate-400">
            <History size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm text-slate-300">Aucune opération trouvée</p>
            <p className="text-xs text-slate-500 mt-1">Ajustez vos filtres ou le client sélectionné.</p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {filteredTimeline.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-slate-400 font-medium">
            Affichage de <span className="font-bold text-white">{(currentPage - 1) * PAGE_SIZE + 1}</span> à <span className="font-bold text-white">{Math.min(currentPage * PAGE_SIZE, filteredTimeline.length)}</span> sur <span className="font-bold text-white">{filteredTimeline.length}</span> opérations
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
