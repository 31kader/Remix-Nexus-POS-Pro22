import React, { useMemo, useState } from 'react';
import { Gift, Tag, Award, Users, Search, Crown, TrendingUp, Download } from 'lucide-react';
import { formatSafe, cn } from '../../lib/utils';
import { Card } from '../ui';
import { Transaction, CompanySettings, Customer } from '../../types';
import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { toast } from 'sonner';

interface FidelityStatsReportProps {
  transactions: Transaction[];
  customers?: Customer[];
  settings: CompanySettings;
  marketingFilterDate: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';
  setMarketingFilterDate: (date: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all') => void;
}

export const FidelityStatsReport = React.memo(function FidelityStatsReport({
  transactions = [],
  customers = [],
  settings,
  marketingFilterDate,
  setMarketingFilterDate,
}: FidelityStatsReportProps) {
  const [subView, setSubView] = useState<'customers' | 'promos'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // 1. Calcul des statistiques des avantages sur les ventes (Remises + Bons + Points)
  const marketingData = useMemo(() => {
    const validTx = (transactions || []).filter(
      t => t && t.status !== 'returned' && t.status !== 'cancelled'
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
    const transactionsWithPromos: Array<Transaction & { computedDiscount: number }> = [];

    // Agrégation par client à partir des transactions réelles
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

    // Enrichissement de la liste des clients avec leurs points, leur CA et leur palier
    const enrichedCustomers = (customers || []).map(c => {
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
    const headers = ['Client', 'Telephone', 'Palier Fidelite', 'Points Cumules', 'Total Achats (DA)', 'Solde Dette (DA)', 'Nombre Commandes'];
    const rows = filteredCustomers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.tier.label}"`,
      c.points,
      c.computedSpent.toFixed(2),
      Number(c.balance || 0).toFixed(2),
      c.txCount
    ]);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barre de filtres et sélecteur de vue haute lisibilité */}
      <Card className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSubView('customers');
                setCurrentPage(1);
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer',
                subView === 'customers'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              )}
            >
              <Crown size={15} className={subView === 'customers' ? 'text-amber-300' : 'text-zinc-400'} />
              Classement Clients Fidèles ({marketingData.enrichedCustomers.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setSubView('promos');
                setCurrentPage(1);
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer',
                subView === 'promos'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              )}
            >
              <Tag size={15} />
              Ventes avec Remises & Bons ({marketingData.transactions.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input
                type="text"
                placeholder="Rechercher un client ou N° ticket..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Période:</label>
              <select
                value={marketingFilterDate}
                onChange={e => {
                  setMarketingFilterDate(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs font-bold bg-zinc-950 text-white border-none outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900 text-white">Toutes les périodes</option>
                <option value="today" className="bg-zinc-900 text-white">Aujourd&apos;hui</option>
                <option value="yesterday" className="bg-zinc-900 text-white">Hier</option>
                <option value="week" className="bg-zinc-900 text-white">Cette semaine</option>
                <option value="month" className="bg-zinc-900 text-white">Ce mois-ci</option>
                <option value="year" className="bg-zinc-900 text-white">Cette année</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportFidelityCSV}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download size={14} /> Exporter CSV
            </button>
          </div>
        </div>
      </Card>

      {/* 4 Cartes KPIs haute visibilité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card id="card-fidelity-clients" className="p-5 border-l-4 border-l-indigo-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={14} /> Clients Fidélisés
            </p>
            <Award size={18} className="text-indigo-400" />
          </div>
          <h4 className="text-2xl font-black text-white">
            {marketingData.enrichedCustomers.length} <span className="text-xs text-zinc-400 font-bold">Clients</span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            CA cumulé : <strong className="text-indigo-300">{marketingData.totalCustomerRevenue.toLocaleString()} {settings.currency}</strong>
          </p>
        </Card>

        <Card id="card-fidelity-points" className="p-5 border-l-4 border-l-amber-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Crown size={14} /> Total Points Fidélité
            </p>
            <TrendingUp size={18} className="text-amber-400" />
          </div>
          <h4 className="text-2xl font-black text-amber-400">
            {marketingData.totalActivePoints.toLocaleString()} <span className="text-xs text-zinc-400 font-bold">Pts</span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            Points utilisés en caisse : <strong className="text-white">{marketingData.totalPointsDiscount.toFixed(2)} {settings.currency}</strong>
          </p>
        </Card>

        <Card id="card-fidelity-discounts" className="p-5 border-l-4 border-l-rose-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Remises Accordées</p>
            <Tag size={18} className="text-rose-400" />
          </div>
          <h4 className="text-2xl font-black text-rose-400">
            {marketingData.totalDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            Sur {marketingData.transactions.length} vente(s) avec remise
          </p>
        </Card>

        <Card id="card-fidelity-saved" className="p-5 border-l-4 border-l-emerald-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <Gift size={14} /> Total Avantages Clients
            </p>
          </div>
          <h4 className="text-2xl font-black text-emerald-400">
            {marketingData.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            Bons d&apos;achat utilisés : <strong className="text-emerald-300">{marketingData.totalVouchers.toFixed(2)} {settings.currency}</strong>
          </p>
        </Card>
      </div>

      {/* Tableau 1 : Classement des Clients Fidèles */}
      {subView === 'customers' ? (
        <Card className="overflow-hidden bg-zinc-900/90 border border-zinc-800">
          <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Crown size={18} className="text-amber-400" />
              <h4 className="font-black text-white uppercase tracking-tight text-sm">
                Palmarès Fidélité Clients & Points Cumulés
              </h4>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {filteredCustomers.length} Client(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800">
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Rang & Client</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Téléphone</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-center">Palier Fidélité</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-center">Achats</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Points Fidélité</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Total Dépensé</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Solde / Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {paginatedCustomers.map((c, idx) => {
                  const rank = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                              rank === 1
                                ? 'bg-amber-500 text-zinc-950'
                                : rank === 2
                                  ? 'bg-slate-300 text-zinc-950'
                                  : rank === 3
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-zinc-800 text-zinc-400'
                            )}
                          >
                            #{rank}
                          </span>
                          <div>
                            <p className="font-bold text-white">{c.name || 'Client Sans Nom'}</p>
                            {c.lastPurchase && (
                              <p className="text-[10px] text-zinc-500">
                                Dernier achat : {formatSafe(c.lastPurchase, 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-zinc-300">{c.phone || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase border', c.tier.color)}>
                          {c.tier.label}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-zinc-300">{c.txCount}</td>
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-black text-xs border border-amber-500/30">
                          {c.points.toLocaleString()} Pts
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-emerald-400">
                        {c.computedSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={cn(
                            'font-bold text-xs',
                            Number(c.balance || 0) > 0 ? 'text-rose-400' : 'text-zinc-400'
                          )}
                        >
                          {Number(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="font-semibold">Aucun client trouvé pour cette recherche.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Tableau 2 : Historique des Ventes avec Remises / Bons / Points */
        <Card id="card-fidelity-promo-table" className="overflow-hidden bg-zinc-900/90 border border-zinc-800">
          <div className="bg-zinc-950/60 p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag size={18} className="text-amber-400" />
              <h4 className="font-black text-white uppercase tracking-tight text-sm">
                Historique des Ventes avec Remises, Bons d&apos;Achat & Points
              </h4>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {filteredPromoTx.length} Transaction(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800">
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Date / Ticket</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest">Client</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Remise Directe</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Bon d&apos;Achat</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Points Utilisés</th>
                  <th className="p-4 font-black uppercase text-[10px] text-zinc-400 tracking-widest text-right">Net Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {paginatedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white">{formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">#{String(t.id || '').slice(-8)}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-zinc-200">{t.customerName || 'Client de passage'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={cn(
                          'font-bold text-sm',
                          t.computedDiscount > 0 ? 'text-rose-400' : 'text-zinc-600'
                        )}
                      >
                        -{t.computedDiscount.toFixed(2)} {settings.currency}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={cn(
                          'font-bold text-sm',
                          (t.voucherDiscount || 0) > 0 ? 'text-emerald-400' : 'text-zinc-600'
                        )}
                      >
                        -{(t.voucherDiscount || 0).toFixed(2)} {settings.currency}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={cn(
                          'font-bold text-sm',
                          (t.pointsDiscount || 0) > 0 ? 'text-amber-400' : 'text-zinc-600'
                        )}
                      >
                        -{(t.pointsDiscount || 0).toFixed(2)} {settings.currency}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-white text-base">
                        {Number(t.total || 0).toFixed(2)} {settings.currency}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredPromoTx.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400">
                      <Gift className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="font-medium">Aucune vente avec remise ou bon d&apos;achat sur cette période.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination commune 50 éléments/page */}
      {activeListLength > ITEMS_PER_PAGE && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
            Affichage {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, activeListLength)} sur{' '}
            {activeListLength}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Précédent
            </button>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black border border-indigo-500/30">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
