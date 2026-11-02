import { useState, useMemo } from 'react';
import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { isTopUpTransaction } from '../../../types';
import { toast } from 'sonner';
import { 
  FidelityStatsReportProps, 
  FidelitySubView, 
  FidelityMarketingData, 
  PromoTransaction, 
  EnrichedCustomer 
} from './fidelityTypes';

const ITEMS_PER_PAGE = 50;

export function useFidelityStatsLogic({
  transactions = [],
  customers = [],
  marketingFilterDate,
}: Pick<FidelityStatsReportProps, 'transactions' | 'customers' | 'marketingFilterDate'>) {
  const [subView, setSubView] = useState<FidelitySubView>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const marketingData: FidelityMarketingData = useMemo(() => {
    const validTx = (transactions || []).filter(
      t => t && t.status !== 'returned' && t.status !== 'cancelled' && !isTopUpTransaction(t)
    );

    const filtered = validTx.filter(t => {
      if (marketingFilterDate === 'all') return true;
      const rawDate = t.timestamp || (t as any).date || (t as any).createdAt;
      const tDate = new Date(rawDate);
      if (isNaN(tDate.getTime())) return true;
      if (marketingFilterDate === 'today' && !isToday(tDate)) return false;
      if (marketingFilterDate === 'yesterday' && !isYesterday(tDate)) return false;
      if (marketingFilterDate === 'week' && !isThisWeek(tDate, { weekStartsOn: 1 })) return false;
      if (marketingFilterDate === 'month' && !isThisMonth(tDate)) return false;
      if (marketingFilterDate === 'year' && !isThisYear(tDate)) return false;
      return true;
    });

    let totalDiscounts = 0;
    let totalVouchers = 0;
    let totalPointsDiscount = 0;
    const transactionsWithPromos: PromoTransaction[] = [];

    const txStatsByCustomer = new Map<
      string,
      { txCount: number; spentInPeriod: number; discountsReceived: number; lastPurchase?: string }
    >();

    filtered.forEach(t => {
      const d = Number(t.discountAmount ?? (t as any).discount ?? 0);
      const v = Number(t.voucherDiscount ?? 0);
      const p = Number(t.pointsDiscount ?? 0);

      if (d > 0 || v > 0 || p > 0) {
        totalDiscounts += d;
        totalVouchers += v;
        totalPointsDiscount += p;
        transactionsWithPromos.push({ ...t, computedDiscount: d });
      }

      const custKey = t.customerId || (t.customerName ? `name:${t.customerName.toLowerCase().trim()}` : '');
      if (custKey) {
        const prev = txStatsByCustomer.get(custKey) || {
          txCount: 0,
          spentInPeriod: 0,
          discountsReceived: 0,
          lastPurchase: undefined
        };
        prev.txCount += 1;
        prev.spentInPeriod += Number(t.total || 0);
        prev.discountsReceived += d + v + p;
        const ts = String(t.timestamp || (t as any).date || '');
        if (!prev.lastPurchase || ts > prev.lastPurchase) {
          prev.lastPurchase = ts;
        }
        txStatsByCustomer.set(custKey, prev);
      }
    });

    transactionsWithPromos.sort(
      (a, b) => (new Date(b.timestamp || 0).getTime() || 0) - (new Date(a.timestamp || 0).getTime() || 0)
    );

    const enrichedCustomers: EnrichedCustomer[] = (customers || []).map(c => {
      const byId = txStatsByCustomer.get(c.id);
      const byName = c.name ? txStatsByCustomer.get(`name:${c.name.toLowerCase().trim()}`) : undefined;
      const txCount = (byId?.txCount || 0) + (byName?.txCount || 0);
      const computedSpent = Math.max(Number(c.totalSpent || 0), (byId?.spentInPeriod || 0) + (byName?.spentInPeriod || 0));
      const points = Number(c.loyaltyPoints ?? (c as any).points ?? Math.floor(computedSpent / 100));
      const discountsReceived = (byId?.discountsReceived || 0) + (byName?.discountsReceived || 0);
      const tier =
        points >= 500 || computedSpent >= 50000
          ? { label: 'Diamant VIP', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' }
          : points >= 200 || computedSpent >= 20000
            ? { label: 'Or', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
            : points >= 50 || computedSpent >= 5000
              ? { label: 'Argent', color: 'bg-slate-400/20 text-slate-200 border-slate-400/30' }
              : { label: 'Standard', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };

      return {
        ...c,
        points,
        computedSpent,
        txCount: Math.max(txCount, computedSpent > 0 ? 1 : 0),
        discountsReceived,
        lastPurchase: byId?.lastPurchase || byName?.lastPurchase || (c as any).updatedAt,
        tier
      };
    });

    enrichedCustomers.sort((a, b) => b.points - a.points || b.computedSpent - a.computedSpent);

    const totalActivePoints = enrichedCustomers.reduce((sum, c) => sum + c.points, 0);
    const totalCustomerRevenue = enrichedCustomers.reduce((sum, c) => sum + c.computedSpent, 0);

    return {
      totalDiscounts,
      totalVouchers,
      totalPointsDiscount,
      totalSavings: totalDiscounts + totalVouchers + totalPointsDiscount,
      totalActivePoints,
      totalCustomerRevenue,
      transactions: transactionsWithPromos,
      enrichedCustomers
    };
  }, [transactions, customers, marketingFilterDate]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return marketingData.enrichedCustomers;
    return marketingData.enrichedCustomers.filter(
      c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [marketingData.enrichedCustomers, searchQuery]);

  const filteredPromoTx = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return marketingData.transactions;
    return marketingData.transactions.filter(
      t =>
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.id && String(t.id).toLowerCase().includes(q))
    );
  }, [marketingData.transactions, searchQuery]);

  const activeListLength = subView === 'customers' ? filteredCustomers.length : filteredPromoTx.length;
  const totalPages = Math.max(1, Math.ceil(activeListLength / ITEMS_PER_PAGE));

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPromoTx.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPromoTx, currentPage]);

  const handleExportFidelityCSV = () => {
    const headers = ['Client', 'Telephone', 'Palier Fidelite', 'Points Cumules', 'Total Achats (DA)', 'Solde (DA)', 'Statut Solde', 'Nombre Commandes'];
    const rows = filteredCustomers.map(c => {
      const bal = Number(c.balance || 0);
      const statusLabel = bal < 0 ? 'Dette' : bal > 0 ? 'Avoir' : 'Solde nul';
      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        `"${c.tier.label}"`,
        c.points,
        c.computedSpent.toFixed(2),
        bal.toFixed(2),
        statusLabel,
        c.txCount
      ];
    });
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rapport_Fidelite_Clients_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Rapport Fidélité Clients exporté en CSV !');
  };

  return {
    subView,
    setSubView,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    activeListLength,
    marketingData,
    filteredCustomers,
    filteredPromoTx,
    paginatedCustomers,
    paginatedTransactions,
    handleExportFidelityCSV,
    ITEMS_PER_PAGE
  };
}
