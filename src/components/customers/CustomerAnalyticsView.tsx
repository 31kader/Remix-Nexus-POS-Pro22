import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Award, Users, AlertTriangle, Calendar, Phone, 
  MessageSquare, DollarSign, ShoppingBag, Clock, Sparkles, 
  ChevronRight, ArrowUpRight, UserCheck, UserX, Star, Zap, Search
} from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../types';
import { cn, formatSafe } from '../../lib/utils';
import { toast } from 'sonner';

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
  const globalKPIs = useMemo(() => {
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
  const topCustomers = useMemo(() => {
    const list = customers.map(c => {
      const stats = customerStatsMap.get(c.id) || {
        totalSpent: Number(c.totalSpent) || 0,
        orderCount: 0,
        lastVisitDate: null,
        avgBasket: 0
      };
      return {
        ...c,
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
  const inactiveCustomers = useMemo(() => {
    const now = new Date().getTime();
    const thresholdMs = inactivityDaysThreshold * 24 * 60 * 60 * 1000;

    const list = customers.map(c => {
      const stats = customerStatsMap.get(c.id);
      const lastVisit = stats?.lastVisitDate || (c.lastVisit ? new Date(c.lastVisit) : null);
      
      let daysInactive = 999;
      if (lastVisit && !isNaN(lastVisit.getTime())) {
        daysInactive = Math.floor((now - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...c,
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
  const handleSendWinbackWhatsApp = (c: any) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Client Revenue */}
        <div className="p-5 bg-gradient-to-br from-indigo-500/20 via-indigo-500/5 to-slate-900 border border-indigo-500/30 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-indigo-400 tracking-wider">
            <span>CA Cumulé Clients</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {globalKPIs.totalRevenue.toFixed(0)} <span className="text-sm font-sans text-indigo-400 font-bold">{settings.currency || 'DA'}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Généré par {customers.length} clients enregistrés</p>
        </div>

        {/* Average Basket */}
        <div className="p-5 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-slate-900 border border-emerald-500/30 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400 tracking-wider">
            <span>Panier Moyen Client</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {globalKPIs.avgBasketGlobal.toFixed(0)} <span className="text-sm font-sans text-emerald-400 font-bold">{settings.currency || 'DA'}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Dépense moyenne par passage en caisse</p>
        </div>

        {/* Inactive Customers Alert */}
        <div className="p-5 bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-amber-400 tracking-wider">
            <span>Clients Inactifs ({inactivityDaysThreshold}j+)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserX size={18} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {inactiveCustomers.length} <span className="text-sm font-sans text-amber-400 font-bold">à relancer</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Opportunité de réactivation immédiate</p>
        </div>

        {/* Loyalty Points Total */}
        <div className="p-5 bg-gradient-to-br from-purple-500/20 via-purple-500/5 to-slate-900 border border-purple-500/30 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-purple-400 tracking-wider">
            <span>Points Fidélité Actifs</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {globalKPIs.totalLoyaltyPoints} <span className="text-sm font-sans text-purple-400 font-bold">pts</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Capital fidélité en circulation</p>
        </div>

      </div>

      {/* Navigation & Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 border border-slate-800 rounded-xl shadow-xl">
        
        {/* Tabs */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full lg:w-auto">
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
            <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs font-bold text-slate-300 gap-2">
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
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

      </div>

      {/* Main Content Sections */}
      {activeTab === 'top' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white uppercase  tracking-tight flex items-center gap-2">
                <Award className="text-amber-400" size={20} />
                Classement des Meilleurs Clients ({topCustomers.length})
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Les clients qui génèrent le plus de chiffre d'affaires pour votre commerce</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topCustomers.slice(0, 30).map((customer, idx) => {
              const isTop3 = idx < 3;
              return (
                <div 
                  key={customer.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 group relative overflow-hidden",
                    isTop3 
                      ? "bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-950 border-amber-500/30 hover:border-amber-500/60 shadow-lg" 
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  )}
                >
                  {/* Top Rank Badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm",
                        idx === 0 ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20" :
                        idx === 1 ? "bg-slate-300 text-slate-950" :
                        idx === 2 ? "bg-amber-700 text-white" :
                        "bg-slate-800 text-slate-400"
                      )}>
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-black text-white uppercase text-sm group-hover:text-indigo-400 transition-colors truncate max-w-[180px]">
                          {customer.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {customer.phone || 'Non renseigné'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Award size={12} /> {customer.loyaltyPoints} pts
                      </span>
                    </div>
                  </div>

                  {/* Financial Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800/60 text-xs">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">CA Total</p>
                      <p className="text-sm font-black font-mono text-emerald-400 mt-0.5">
                        {customer.calculatedSpent.toFixed(0)} <span className="text-[10px]">{settings.currency || 'DA'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Panier Moyen</p>
                      <p className="text-sm font-black font-mono text-indigo-300 mt-0.5">
                        {customer.avgBasket.toFixed(0)} <span className="text-[10px]">{settings.currency || 'DA'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer info & WhatsApp Action */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> 
                      {customer.lastVisitDate ? customer.lastVisitDate.toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </span>

                    {customer.phone && (
                      <button
                        onClick={() => handleSendWinbackWhatsApp(customer)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all"
                        title="Envoyer un message de remerciement / promotion"
                      >
                        <MessageSquare size={12} />
                        WhatsApp
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Customers View */}
      {activeTab === 'inactive' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white uppercase  tracking-tight flex items-center gap-2">
                <Clock className="text-amber-400" size={20} />
                Clients Inactifs depuis +{inactivityDaysThreshold} jours ({inactiveCustomers.length})
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Relancez vos anciens clients réguliers pour stimuler vos ventes</p>
            </div>
          </div>

          {inactiveCustomers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/40">
              <UserCheck className="mx-auto text-emerald-400 mb-3" size={40} />
              <p className="font-bold text-sm text-white uppercase">Excellente nouvelle !</p>
              <p className="text-xs text-slate-400 mt-1">Tous vos clients enregistrés sont venus récemment dans les {inactivityDaysThreshold} derniers jours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inactiveCustomers.map(customer => (
                <div 
                  key={customer.id}
                  className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-white uppercase text-sm group-hover:text-amber-400 transition-colors">
                        {customer.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {customer.phone || 'Pas de téléphone'}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase rounded-lg">
                      +{customer.daysInactive >= 900 ? '90' : customer.daysInactive} jours
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Dépense cumulée</span>
                      <span className="font-black text-white font-mono">{customer.calculatedSpent.toFixed(0)} {settings.currency || 'DA'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Dernier passage</span>
                      <span className="font-bold text-slate-300">
                        {customer.lastVisitDate ? customer.lastVisitDate.toLocaleDateString('fr-FR') : 'Inconnu'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Points fidélité : <strong className="text-purple-400">{customer.loyaltyPoints}</strong>
                    </span>

                    {customer.phone ? (
                      <button
                        onClick={() => handleSendWinbackWhatsApp(customer)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        Relancer
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 ">Pas de numéro</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
