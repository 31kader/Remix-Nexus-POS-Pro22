import React from 'react';
import { Users, Smartphone, Award, Phone, Mail, Eye, ShoppingCart, MessageSquare, Edit } from 'lucide-react';
import { Customer, CompanySettings } from '../../types';
import {
  CustomerTableToolbar,
  CustomerTableRow,
  CustomerTablePagination
} from './table';

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
    <div className="flex-1 flex flex-col gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Barre d'outils : recherche, filtres et tri */}
      <CustomerTableToolbar
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        kpiStats={kpiStats}
      />

      {/* Conteneur principal du tableau */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/60">
        {paginatedCustomers.length > 0 ? (
          <>
            {/* Vue Cartes Tactiles Mobiles (< lg) */}
            <div className="block lg:hidden space-y-3 p-3">
              {paginatedCustomers.map((cust) => {
                const balance = Number(cust.balance || 0);
                return (
                  <div
                    key={cust.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm space-y-3 transition-all"
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

                      <div className="text-right font-financial">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Volume d'Achats</span>
                        <span className="font-financial font-black text-indigo-400 text-sm mt-0.5 block tabular-nums">
                          {(Number(cust.totalSpent) || 0).toFixed(0)} <span className="font-sans text-[10px]">{settings.currency || 'DA'}</span>
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
                        className="flex-1 min-h-[38px] px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Eye size={15} /> Voir Fiche
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchSale(cust)}
                        className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all flex items-center justify-center cursor-pointer"
                        title="Vendre"
                      >
                        <ShoppingCart size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openWhatsApp(cust.phone || '', balance < 0 ? 'debt' : undefined, cust)}
                        className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all flex items-center justify-center cursor-pointer"
                        title="WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => { setEditingCustomer(cust); setIsModalOpen(true); }}
                        className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-center cursor-pointer"
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
                  <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-black text-xs uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-4 px-4">Client</th>
                    <th className="py-4 px-4">Téléphone & Email</th>
                    <th className="py-4 px-4">Situation Solde / Dette</th>
                    <th className="py-4 px-4">Points</th>
                    <th className="py-4 px-4">CA Total</th>
                    <th className="py-4 px-4">Dernière Visite</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                  {paginatedCustomers.map((cust) => (
                    <CustomerTableRow
                      key={cust.id}
                      cust={cust}
                      settings={settings}
                      setSelectedCustomerId={setSelectedCustomerId}
                      setDirectoryLayout={setDirectoryLayout}
                      setFinancialOpType={setFinancialOpType}
                      setFinancialMethod={setFinancialMethod}
                      setFinancialNote={setFinancialNote}
                      setIsTopUpModalOpen={setIsTopUpModalOpen}
                      handleLaunchSale={handleLaunchSale}
                      handlePrintStatement={handlePrintStatement}
                      openWhatsApp={openWhatsApp}
                      setEditingCustomer={setEditingCustomer}
                      setIsModalOpen={setIsModalOpen}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-bold text-sm text-slate-700 dark:text-zinc-300">Aucun client trouvé</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Modifiez vos critères de recherche ou vos filtres.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <CustomerTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalFilteredCount={filteredCustomers.length}
        pageSize={TABLE_PAGE_SIZE}
        setTablePage={setTablePage}
      />
    </div>
  );
};
