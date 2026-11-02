import React, { useState, useMemo } from 'react';
import { 
  History, Search, ShoppingBag, RotateCcw, X
} from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useCartStore } from '../../store/useCartStore';
import {
  CustomerGlobalJournalViewProps,
  JournalTimelineItem,
  JournalPagination,
  JournalCustomerHeader,
  JournalTimelineKpis,
  JournalTimelineList,
  JournalTimelineMobileCard
} from './journal';

export { type CustomerGlobalJournalViewProps } from './journal';

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
  const allTimelineItems = useMemo<JournalTimelineItem[]>(() => {
    const list: JournalTimelineItem[] = [];

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
        type: 'transaction',
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
        type: 'return',
        id: r.id,
        timestamp: r.timestamp || (r as any).date || new Date().toISOString(),
        total: Number((r as any).totalRefund || (r as any).refundAmount || 0),
        paymentMethod: (r as any).paymentMethod || (r as any).payment_method || 'cash',
        customerId: cId,
        customerName: cName,
        items,
        raw: r
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, returns, customerMap]);

  // Filter items
  const filteredTimeline = useMemo(() => {
    return allTimelineItems.filter(item => {
      if (activeCustomerId && item.customerId !== activeCustomerId) return false;
      if (filterType === 'sales' && item.type !== 'transaction') return false;
      if (filterType === 'returns' && item.type !== 'return') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.customerName || '').toLowerCase().includes(q);
        const matchId = String(item.id || '').toLowerCase().includes(q);
        const matchItems = (item.items || []).some((it: any) => (it.name || '').toLowerCase().includes(q));
        if (!matchName && !matchId && !matchItems) return false;
      }

      return true;
    });
  }, [allTimelineItems, activeCustomerId, filterType, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    let salesCount = 0;
    let salesTotal = 0;
    let returnsCount = 0;
    let refundTotal = 0;

    filteredTimeline.forEach(it => {
      if (it.type === 'transaction') {
        salesCount++;
        salesTotal += it.total;
      } else if (it.type === 'return') {
        returnsCount++;
        refundTotal += it.total;
      }
    });

    return {
      totalOps: filteredTimeline.length,
      salesCount,
      salesTotal,
      returnsCount,
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
      {/* 1. Header & Filtre Client */}
      <JournalCustomerHeader
        icon={<History size={20} />}
        title="Journal Général des Opérations"
        subtitle={`${filteredTimeline.length} opération(s) répertoriée(s) • Affichage chronologique des ventes & retours`}
        customers={customers}
        activeCustomerId={activeCustomerId}
        selectedCustomerObj={selectedCustomerObj}
        onSelectCustomer={(id) => {
          setActiveCustomerId(id);
          setPage(1);
          if (onSelectCustomer) onSelectCustomer(id);
        }}
        settings={settings}
      />

      {/* 2. Barre de KPIs */}
      <JournalTimelineKpis
        stats={stats}
        settings={settings}
      />

      {/* 3. Filtres Ventes/Retours & Recherche */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={() => { setFilterType('all'); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
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
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
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
              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Tableau & Cartes Tactiles */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60">
        {paginatedTimeline.length > 0 ? (
          <>
            {/* Vue Cartes Mobiles (< lg) */}
            <div className="block lg:hidden space-y-3 p-3">
              {paginatedTimeline.map((item) => (
                <div key={`${item.type}-${item.id}`} className="min-h-[38px] min-w-[38px]">
                  <JournalTimelineMobileCard
                    item={item}
                    expandedTxId={expandedTxId}
                    setExpandedTxId={setExpandedTxId}
                    settings={settings}
                    onRestore={onRestore}
                    loadTransactionToCart={loadTransactionToCart}
                    customerNameDisplay={item.customerName || 'Client de passage'}
                  />
                </div>
              ))}
            </div>

            {/* Vue Tableau Panoramique Bureau (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <JournalTimelineList
                paginatedTimeline={paginatedTimeline}
                expandedTxId={expandedTxId}
                setExpandedTxId={setExpandedTxId}
                settings={settings}
                onRestore={onRestore}
                loadTransactionToCart={loadTransactionToCart}
              />
            </div>
          </>
        ) : (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <History size={36} className="mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Aucune opération trouvée</p>
            <p className="text-xs text-slate-500">Modifiez vos filtres ou effectuez une recherche différente.</p>
          </div>
        )}
      </div>

      {/* 5. Pagination */}
      <JournalPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredTimeline.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
};

export default CustomerGlobalJournalView;
