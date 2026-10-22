import React from 'react';
import { 
  Users, Smartphone, Award, Phone, Mail, MessageSquare, 
  ShoppingCart, Printer, Filter, ArrowUpDown, Eye, Edit, ChevronLeft, ChevronRight,
  MapPin, Compass, Search, X, Table as TableIcon
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { Customer, CompanySettings } from '../../types';
import { cn, formatSafe } from '../../lib/utils';

export interface CustomerTableViewProps {
  filteredCustomers: Customer[];
  paginatedCustomers: Customer[];
  settings: CompanySettings;
  search: string;
  setSearch: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: any) => void;
  sortBy: string;
  setSortBy: (s: any) => void;
  kpiStats: {
    totalCustomers: number;
    debtorCount?: number;
    debtCount?: number;
    creditCount: number;
    appUserCount: number;
    [key: string]: any;
  };
  currentPage: number;
  totalPages: number;
  setTablePage: React.Dispatch<React.SetStateAction<number>>;
  TABLE_PAGE_SIZE: number;
  setSelectedCustomerId: (id: string | null) => void;
  setDirectoryLayout: (layout: 'split' | 'table') => void;
  setFinancialOpType: (op: any) => void;
  setFinancialMethod: (m: any) => void;
  setFinancialNote: (note: string) => void;
  setIsTopUpModalOpen: (open: boolean) => void;
  handleLaunchSale: (c: Customer) => void;
  handlePrintStatement: (c: Customer) => void;
  openWhatsApp: (phone: string, type?: 'debt' | 'reminder', customer?: Customer) => void;
  setEditingCustomer: (c: Customer) => void;
  setIsModalOpen: (open: boolean) => void;
}

export const CustomerTableView: React.FC<CustomerTableViewProps> = ({
  filteredCustomers,
  paginatedCustomers,
  settings,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  kpiStats,
  currentPage,
  totalPages,
  setTablePage,
  TABLE_PAGE_SIZE,
  setSelectedCustomerId,
  setDirectoryLayout,
  setFinancialOpType,
  setFinancialMethod,
  setFinancialNote,
  setIsTopUpModalOpen,
  handleLaunchSale,
  handlePrintStatement,
  openWhatsApp,
  setEditingCustomer,
  setIsModalOpen
}) => {
  return (
    <div className="flex-1 flex flex-col gap-4 bg-slate-900/95 border border-slate-800 rounded-xl p-6 shadow-md overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <TableIcon className="text-indigo-400" size={22} /> Grand Tableau des Clients
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Vue panoramique complète avec gestion de solde, dettes, points et actions rapides
          </p>
        </div>

        {/* Search Input in Table view */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Rechercher client, tél, email..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table Filter Tabs & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap",
              filterStatus === 'all'
                ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            Tous ({kpiStats.totalCustomers})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('debt')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5",
              filterStatus === 'debt'
                ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            )}
          >
            Dettes ({kpiStats.debtorCount ?? kpiStats.debtCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('credit')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5",
              filterStatus === 'credit'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            Avoirs ({kpiStats.creditCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('app_users')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5",
              filterStatus === 'app_users'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
            )}
          >
            <Smartphone size={13} /> App ({kpiStats.appUserCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('vip')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5",
              filterStatus === 'vip'
                ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
            )}
          >
            <Award size={13} /> VIP
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap",
              filterStatus === 'inactive'
                ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            Inactifs
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 text-xs text-slate-300 font-bold uppercase">
          <span className="flex items-center gap-1 text-slate-400">
            <ArrowUpDown size={13} className="text-indigo-400" /> Trier :
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 outline-none text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            <option value="name_asc">Nom (A → Z)</option>
            <option value="name_desc">Nom (Z → A)</option>
            <option value="debt_desc">Dette la plus forte</option>
            <option value="spent_desc">Volume d'achat (CA)</option>
            <option value="points_desc">Points de fidélité</option>
            <option value="recent_visit">Dernière visite</option>
          </select>
        </div>
      </div>

      {/* Table Container with Overflow */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60">
        {paginatedCustomers.length > 0 ? (
          <>
            {/* Vue Cartes Tactiles Mobiles (< lg) */}
            <div className="block lg:hidden space-y-3 p-3">
              {paginatedCustomers.map((cust) => {
                const balance = Number(cust.balance || 0);
                return (
                  <div
                    key={cust.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm space-y-3 transition-all"
                  >
                    {/* Header : Avatar, Nom, Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                          {(cust.name || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-white text-sm uppercase tracking-wide truncate">
                            {cust.name || 'Client sans nom'}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {cust.isAppUser && (
                              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase flex items-center gap-1 border border-indigo-500/30">
                                <Smartphone size={10} /> App
                              </span>
                            )}
                            {cust.isWholesale && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase border border-purple-500/30">
                                Gros
                              </span>
                            )}
                            {(cust.loyaltyPoints || 0) >= 500 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/30">
                                VIP
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Points badge */}
                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-xl text-xs font-black uppercase shrink-0">
                        <Award size={13} />
                        <span>{cust.loyaltyPoints || 0} pts</span>
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      {cust.phone ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone size={12} className="text-indigo-400" /> {cust.phone}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Pas de téléphone</span>
                      )}
                      {cust.email && (
                        <span className="flex items-center gap-1 truncate text-slate-400">
                          <Mail size={12} className="text-indigo-400" /> {cust.email}
                        </span>
                      )}
                    </div>

                    {/* Situation Financière : Solde / Dette & CA */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Solde / Dette</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {balance < 0 ? (
                            <span className="font-mono font-black text-rose-400 text-sm">
                              -{Math.abs(balance).toFixed(2)} {settings.currency || 'DA'}
                            </span>
                          ) : balance > 0 ? (
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              +{balance.toFixed(2)} {settings.currency || 'DA'}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 text-xs">0.00 {settings.currency || 'DA'}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Volume d'Achat</span>
                        <span className="font-mono font-black text-indigo-300 text-sm mt-0.5 block">
                          {(Number(cust.totalSpent) || 0).toFixed(2)} {settings.currency || 'DA'}
                        </span>
                      </div>
                    </div>

                    {/* Actions tactiles confortables (>= 38x38px) */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setDirectoryLayout('split');
                        }}
                        className="flex-1 min-h-[38px] px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Eye size={15} /> Voir Fiche
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchSale(cust)}
                        className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all flex items-center justify-center"
                        title="Vendre"
                      >
                        <ShoppingCart size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openWhatsApp(cust.phone || '', balance < 0 ? 'debt' : undefined, cust)}
                        className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all flex items-center justify-center"
                        title="WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => { setEditingCustomer(cust); setIsModalOpen(true); }}
                        className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-center"
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tableau Grand Écran (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="py-4 px-4">Client</th>
                <th className="py-4 px-4">Téléphone & Email</th>
                <th className="py-4 px-4">Situation Solde / Dette</th>
                <th className="py-4 px-4">Points</th>
                <th className="py-4 px-4">CA Total</th>
                <th className="py-4 px-4">Dernière Visite</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {paginatedCustomers.map((cust) => {
                const balance = Number(cust.balance || 0);
                return (
                  <tr 
                    key={cust.id} 
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      setDirectoryLayout('split');
                    }}
                  >
                    {/* Client Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
                          {(cust.name || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm uppercase tracking-wide group-hover:text-indigo-300 transition-colors">
                              {cust.name || 'Client sans nom'}
                            </span>
                            {cust.isAppUser && (
                              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase flex items-center gap-1 border border-indigo-500/30">
                                <Smartphone size={10} /> App
                              </span>
                            )}
                            {cust.isWholesale && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase border border-purple-500/30">
                                Gros
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                            ID: {cust.id.slice(0, 8)}... {cust.loyaltyCardNumber ? `• N° ${cust.loyaltyCardNumber}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Coordonnées Column */}
                    <td className="py-3.5 px-4">
                      {cust.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider">
                            {cust.phone}
                          </span>
                          <a
                            href={`tel:${cust.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
                            title="Appeler"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[11px]">Pas de téléphone</span>
                      )}
                      {cust.email && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">{cust.email}</p>
                      )}
                      {(cust.latitude || cust.address) && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1",
                            cust.latitude 
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" 
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          )}>
                            <MapPin size={10} className={cust.latitude ? "text-emerald-400" : "text-slate-400"} />
                            {cust.latitude ? `GPS: ${Number(cust.latitude).toFixed(4)}` : (cust.city || 'Adresse')}
                          </span>
                          {cust.latitude && cust.longitude && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${cust.latitude},${cust.longitude}&travelmode=driving`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-0.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                              title="Guidage Google Maps"
                            >
                              <Compass size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Solde / Dette Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {balance < 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                            Dette : {Math.abs(balance).toFixed(2)} {settings.currency || 'DA'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerId(cust.id);
                              setFinancialOpType('encaissement');
                              setFinancialMethod('cash');
                              setFinancialNote('Règlement dette client');
                              setIsTopUpModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-[10px] font-black uppercase transition-all"
                          >
                            Régler
                          </button>
                        </div>
                      ) : balance > 0 ? (
                        <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          Solde : +{balance.toFixed(2)} {settings.currency || 'DA'}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono font-bold text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          0.00 {settings.currency || 'DA'}
                        </span>
                      )}
                    </td>

                    {/* Loyalty Points */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-lg text-xs font-black font-mono">
                        <Award size={13} /> {cust.loyaltyPoints || 0}
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-white text-xs">
                      {(Number(cust.totalSpent) || 0).toFixed(0)} <span className="text-[10px] text-slate-400 font-sans">{settings.currency || 'DA'}</span>
                    </td>

                    {/* Last Visit */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-xs font-medium font-mono">
                      {cust.lastVisit ? formatSafe(cust.lastVisit, 'dd/MM/yyyy', { locale: fr }) : 'Aucune'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setDirectoryLayout('split');
                          }}
                          className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
                          title="Voir la fiche détaillée"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchSale(cust)}
                          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-sm"
                          title="Vendre (charger en caisse)"
                        >
                          <ShoppingCart size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintStatement(cust)}
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
                          title="Imprimer relevé de compte"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(cust.phone || '', balance < 0 ? 'debt' : undefined, cust)}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                          title="Envoyer WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingCustomer(cust); setIsModalOpen(true); }}
                          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
                          title="Modifier la fiche"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    ) : (
          <div className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 text-slate-600" />
            <p className="font-bold text-sm text-slate-300">Aucun client trouvé</p>
            <p className="text-xs text-slate-500 mt-1">Modifiez vos critères de recherche ou vos filtres.</p>
          </div>
        )}
      </div>

      {/* Table Pagination Controls */}
      {filteredCustomers.length > TABLE_PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-slate-400 font-medium">
            Affichage de <span className="font-bold text-white">{(currentPage - 1) * TABLE_PAGE_SIZE + 1}</span> à <span className="font-bold text-white">{Math.min(currentPage * TABLE_PAGE_SIZE, filteredCustomers.length)}</span> sur <span className="font-bold text-white">{filteredCustomers.length}</span> clients
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setTablePage(p => Math.max(1, p - 1))}
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
              onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
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
