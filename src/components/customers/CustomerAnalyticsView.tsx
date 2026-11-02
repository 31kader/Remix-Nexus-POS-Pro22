import React, { useState, useMemo } from 'react';
import { Star, Clock, Search } from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { CustomerAnalyticsKpis, GlobalCustomerKPIs } from './analytics/CustomerAnalyticsKpis';
import { CustomerAnalyticsTopList, CustomerAnalyticsTopItem } from './analytics/CustomerAnalyticsTopList';
import { CustomerAnalyticsInactiveList, CustomerAnalyticsInactiveItem } from './analytics/CustomerAnalyticsInactiveList';

interface CustomerAnalyticsViewProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  openWhatsApp?: (phone: string, text: string) => void;
  onSelectCustomer?: (customerId: string) => void;
}

export const CustomerAnalyticsView: React.FC<CustomerAnalyticsViewProps> = ({
  customers,
  transactions,
  settings,
  openWhatsApp,
  onSelectCustomer
}) => {
  const [activeTab, setActiveTab] = useState<'top' | 'inactive' | 'kpis'>('top');
  const [search, setSearch] = useState('');
  const [inactivityDaysThreshold, setInactivityDaysThreshold] = useState<30 | 60 | 90>(30);

  const currency = settings.currency || 'DA';

  // 1. Calculate Per-Customer Aggregated Metrics from transactions
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalSpent: number;
      orderCount: number;
      lastVisitDate: Date | null;
      avgBasket: number;
    }>();

    // Initialize with customer static data as baseline
    customers.forEach(c => {
      const parsedLastVisit = c.lastVisit ? new Date(c.lastVisit) : (c.joinDate ? new Date(c.joinDate) : null);
      map.set(c.id, {
        totalSpent: Number(c.totalSpent) || 0,
        orderCount: 0,
        lastVisitDate: parsedLastVisit && !isNaN(parsedLastVisit.getTime()) ? parsedLastVisit : null,
        avgBasket: 0
      });
    });

    // Aggregate from transactions if present
    transactions.forEach(t => {
      if (!t.customerId) return;
      const current = map.get(t.customerId) || {
        totalSpent: 0,
        orderCount: 0,
        lastVisitDate: null,
        avgBasket: 0
      };

      const tDate = new Date(t.timestamp);
      current.totalSpent += Number(t.total) || 0;
      current.orderCount += 1;

      if (!current.lastVisitDate || tDate > current.lastVisitDate) {
        current.lastVisitDate = tDate;
      }
      map.set(t.customerId, current);
    });

    // Compute average basket
    map.forEach(val => {
      val.avgBasket = val.orderCount > 0 ? (val.totalSpent / val.orderCount) : val.totalSpent;
    });

    return map;
  }, [customers, transactions]);

  // 2. Global KPIs
  const globalKPIs: GlobalCustomerKPIs = useMemo(() => {
    let totalRevenue = 0;
    let totalTransactions = 0;
    let totalLoyaltyPoints = 0;
    let totalDebts = 0;

    customers.forEach(c => {
      const stats = customerStatsMap.get(c.id);
      totalRevenue += stats ? stats.totalSpent : (Number(c.totalSpent) || 0);
      totalTransactions += stats ? stats.orderCount : 0;
      totalLoyaltyPoints += Number(c.loyaltyPoints) || 0;
      if ((Number(c.balance) || 0) < 0) {
        totalDebts += Math.abs(Number(c.balance) || 0);
      }
    });

    const avgBasketGlobal = totalTransactions > 0 ? (totalRevenue / totalTransactions) : (customers.length > 0 ? totalRevenue / customers.length : 0);

    return {
      totalRevenue,
      totalCustomers: customers.length,
      avgBasketGlobal,
      totalLoyaltyPoints,
      totalDebts
    };
  }, [customers, customerStatsMap]);

  // 3. Top Customers Ranking (Top 15)
  const topCustomers: CustomerAnalyticsTopItem[] = useMemo(() => {
    const list = customers.map(c => {
      const stats = customerStatsMap.get(c.id) || {
        totalSpent: Number(c.totalSpent) || 0,
        orderCount: 0,
        lastVisitDate: null,
        avgBasket: 0
      };
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        loyaltyPoints: c.loyaltyPoints,
        calculatedSpent: stats.totalSpent,
        orderCount: stats.orderCount,
        lastVisitDate: stats.lastVisitDate,
        avgBasket: stats.avgBasket
      };
    });

    return list
      .filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search))
      .sort((a, b) => b.calculatedSpent - a.calculatedSpent);
  }, [customers, customerStatsMap, search]);

  // 4. Inactive / Lost Customers
  const inactiveCustomers: CustomerAnalyticsInactiveItem[] = useMemo(() => {
    const now = new Date().getTime();

    const list = customers.map(c => {
      const stats = customerStatsMap.get(c.id);
      const lastVisit = stats?.lastVisitDate || (c.lastVisit ? new Date(c.lastVisit) : null);
      
      let daysInactive = 999;
      if (lastVisit && !isNaN(lastVisit.getTime())) {
        daysInactive = Math.floor((now - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        loyaltyPoints: c.loyaltyPoints,
        calculatedSpent: stats?.totalSpent || (Number(c.totalSpent) || 0),
        orderCount: stats?.orderCount || 0,
        lastVisitDate: lastVisit,
        daysInactive
      };
    });

    return list
      .filter(c => c.daysInactive >= inactivityDaysThreshold)
      .filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search))
      .sort((a, b) => b.daysInactive - a.daysInactive);
  }, [customers, customerStatsMap, inactivityDaysThreshold, search]);

  // Handle WhatsApp Marketing / Win-back message
  const handleSendWinbackWhatsApp = (c: { name: string; phone?: string }) => {
    if (!c.phone) {
      toast.error("Ce client n'a pas de numéro de téléphone enregistré.");
      return;
    }
    const storeName = settings.name || 'notre magasin';
    const message = `Bonjour M./Mme ${c.name} ! 😊 Vous nous manquez chez ${storeName}. Venez découvrir nos nouvelles arrivées et offres spéciales en magasin. À très bientôt !`;

    if (openWhatsApp) {
      openWhatsApp(c.phone, message);
    } else {
      const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Summary KPIs */}
      <CustomerAnalyticsKpis
        globalKPIs={globalKPIs}
        customersCount={customers.length}
        inactiveCount={inactiveCustomers.length}
        inactivityDaysThreshold={inactivityDaysThreshold}
        currency={currency}
      />

      {/* Navigation & Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 border border-slate-800 rounded-xl shadow-xl">
        {/* Tabs */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('top')}
            className={cn(
              "flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
              activeTab === 'top' 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                : "text-slate-400 hover:text-white"
            )}
          >
            <Star size={15} className={activeTab === 'top' ? "text-amber-300 fill-amber-300" : ""} />
            Top Clients Meilleurs Acheteurs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inactive')}
            className={cn(
              "flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative",
              activeTab === 'inactive' 
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/20" 
                : "text-slate-400 hover:text-white"
            )}
          >
            <Clock size={15} />
            Clients Inactifs & Relance
            {inactiveCustomers.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full ml-1">
                {inactiveCustomers.length}
              </span>
            )}
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {activeTab === 'inactive' && (
            <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Inactivité :</span>
              {[30, 60, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setInactivityDaysThreshold(days as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all",
                    inactivityDaysThreshold === days 
                      ? "bg-amber-500 text-slate-950 shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  +{days}j
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Rechercher client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      {activeTab === 'top' && (
        <CustomerAnalyticsTopList
          topCustomers={topCustomers}
          currency={currency}
          onSendWinbackWhatsApp={handleSendWinbackWhatsApp}
        />
      )}

      {/* Inactive Customers View */}
      {activeTab === 'inactive' && (
        <CustomerAnalyticsInactiveList
          inactiveCustomers={inactiveCustomers}
          inactivityDaysThreshold={inactivityDaysThreshold}
          currency={currency}
          onSendWinbackWhatsApp={handleSendWinbackWhatsApp}
        />
      )}
    </div>
  );
};
