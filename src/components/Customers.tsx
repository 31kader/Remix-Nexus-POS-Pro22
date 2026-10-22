import React, { useState, useMemo, useRef, memo } from 'react';
import { 
  Plus, Search, Smartphone, Award, Phone, Mail, MessageSquare, 
  Trash2, User as UserIcon, Users, CreditCard as CardIcon, TrendingUp,
  ShoppingCart, Printer, Download, Upload, Filter, AlertTriangle, ArrowUpDown, X,
  LayoutGrid, Table as TableIcon, Eye, Edit, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, ArrowLeft, History, UserCheck, MapPin, Compass
} from 'lucide-react';
import { List } from 'react-window';
import { fr } from 'date-fns/locale';
import { 
  Customer, Transaction, CompanySettings, Product, Expense, StockAdjustment, Category 
} from '../types';
import { Button, ConfirmDialog } from './ui';
import { cn, formatSafe } from '../lib/utils';
import { CustomersEditModal } from './CustomersEditModal';
import { CustomerFinancialModal } from './CustomerFinancialModal';
import { CustomerDetailTabs } from './CustomerDetailTabs';
import { CustomerDebtsLedger } from './customers/CustomerDebtsLedger';
import { CustomerAnalyticsView } from './customers/CustomerAnalyticsView';
import { CustomerGlobalJournalView } from './customers/CustomerGlobalJournalView';
import { CustomerGlobalGeneralView } from './customers/CustomerGlobalGeneralView';
import { CustomerTableView } from './customers/CustomerTableView';
import { useCustomersLogic } from '../hooks/useCustomersLogic';

export interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  products?: Product[];
  expenses?: Expense[];
  stockAdjustments?: StockAdjustment[];
  categories?: Category[];
}

export const Customers = memo(function Customers(props: CustomersProps) {
  const { 
    customers, 
    transactions, 
    settings, 
    onRestore
  } = props;

  const [customerViewMode, setCustomerViewMode] = useState<'directory' | 'journal' | 'general' | 'debts' | 'analytics'>('directory');
  const [directoryLayout, setDirectoryLayout] = useState<'split' | 'table'>('split');
  const [isDetailExpanded, setIsDetailExpanded] = useState<boolean>(false);
  const [tablePage, setTablePage] = useState<number>(1);
  const TABLE_PAGE_SIZE = 50;
  const excelInputRef = useRef<HTMLInputElement>(null);

  const {
    isModalOpen,
    setIsModalOpen,
    selectedCustomerId,
    setSelectedCustomerId,
    activeTab,
    setActiveTab,
    editingCustomer,
    setEditingCustomer,
    showPassword,
    setShowPassword,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    customerToDelete,
    setCustomerToDelete,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    topUpAmount,
    setTopUpAmount,
    isProcessingTopUp,
    setIsProcessingTopUp,
    financialOpType,
    setFinancialOpType,
    financialMethod,
    setFinancialMethod,
    financialNote,
    setFinancialNote,
    formData,
    setFormData,
    t,
    handleTopUp,
    selectedCustomer,
    handleSubmit,
    handleDeleteCustomer,
    filteredCustomers,
    openWhatsApp,
    kpiStats,
    handleLaunchSale,
    handlePrintStatement,
    exportCustomersToExcel,
    importCustomersFromExcel
  } = useCustomersLogic(props);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(tablePage, totalPages);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * TABLE_PAGE_SIZE;
    return filteredCustomers.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  const CustomerRow = useMemo(() => {
    return function CustomerRowInner({ index, style }: any) {
      const customer = filteredCustomers[index];
      if (!customer) return null;
      return (
        <div style={style} className="pr-1 pb-2">
          <div 
            onClick={() => setSelectedCustomerId(customer.id)}
            className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group h-[74px]",
              selectedCustomerId === customer.id 
                ? "bg-indigo-600/20 border-indigo-500/40 shadow-xs" 
                : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
            )}
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center font-black flex-shrink-0 text-sm transition-all shadow-inner",
                selectedCustomerId === customer.id ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 group-hover:text-indigo-400"
              )}>
                {(customer.name || '?').charAt(0)}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white truncate text-sm uppercase tracking-wider">{customer.name || 'Client sans nom'}</h4>
                  {customer.isAppUser && (
                    <span title="Client Application Mobile">
                      <Smartphone size={14} className="text-indigo-400 flex-shrink-0" />
                    </span>
                  )}
                  {customer.latitude && (
                    <span title="Position GPS enregistrée">
                      <MapPin size={13} className="text-emerald-400 flex-shrink-0" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter truncate">{customer.phone || 'Pas de téléphone'}</p>
              </div>
            </div>
            <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse">
                <Award size={12} />
                {customer.loyaltyPoints}
              </div>
              {(Number(customer.balance) || 0) < 0 && (
                <span className="text-[8px] font-black tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-mono uppercase">
                  Dette: {Math.abs(Number(customer.balance) || 0).toFixed(2)}
                </span>
              )}
              {(Number(customer.balance) || 0) > 0 && (
                <span className="text-[8px] font-black tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono uppercase">
                  Solde: {Number(customer.balance || 0).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    };
  }, [filteredCustomers, selectedCustomerId, setSelectedCustomerId]);

  const debtorCount = kpiStats.debtorCount;

  return (
    <div className="h-full flex flex-col gap-2.5">
      
      {/* Barre Supérieure Ultra-Compacte : Navigation & KPIs Inline */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2 border border-slate-800 rounded-xl flex-shrink-0 shadow-sm">
        {/* Navigation par Grands Onglets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCustomerViewMode('directory')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              customerViewMode === 'directory'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Users size={14} />
            Répertoire ({customers.length})
          </button>

          {customerViewMode === 'directory' && (
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDirectoryLayout('split')}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-bold uppercase flex items-center gap-1 transition-all",
                  directoryLayout === 'split'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Vue Fiche (2 colonnes)"
              >
                <LayoutGrid size={12} /> Fiche
              </button>
              <button
                type="button"
                onClick={() => setDirectoryLayout('table')}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-bold uppercase flex items-center gap-1 transition-all",
                  directoryLayout === 'table'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Vue Grand Tableau"
              >
                <TableIcon size={12} /> Grand Tableau
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCustomerViewMode('journal')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              customerViewMode === 'journal'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <History size={14} />
            Grand Journal
          </button>

          <button
            type="button"
            onClick={() => setCustomerViewMode('general')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              customerViewMode === 'general'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <UserCheck size={14} />
            Règlements & Mémos
          </button>

          <button
            type="button"
            onClick={() => setCustomerViewMode('debts')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 relative",
              customerViewMode === 'debts'
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <CardIcon size={14} />
            Dettes
            {debtorCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white font-mono font-bold text-[9px] rounded-full border border-rose-400/30">
                {debtorCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCustomerViewMode('analytics')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              customerViewMode === 'analytics'
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <TrendingUp size={14} />
            Stats & CRM
          </button>
        </div>

        {/* KPIs Inline Compacts + Actions */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          {kpiStats.totalDebt > 0 && (
            <div className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold flex items-center gap-1">
              <span className="text-[9px] uppercase font-sans font-black text-rose-400/80">Dette:</span>
              <span>{kpiStats.totalDebt.toFixed(0)} {settings.currency || 'DA'}</span>
            </div>
          )}
          <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-bold flex items-center gap-1">
            <span className="text-[9px] uppercase font-sans font-black text-slate-400">Pts:</span>
            <span className="text-amber-400">{kpiStats.totalPoints.toLocaleString()}</span>
          </div>
          <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-bold flex items-center gap-1">
            <span className="text-[9px] uppercase font-sans font-black text-slate-400">CA:</span>
            <span className="text-emerald-400">{kpiStats.totalSpentAll.toFixed(0)} {settings.currency || 'DA'}</span>
          </div>

          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <input
              type="file"
              ref={excelInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={importCustomersFromExcel}
            />
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Importer clients (Excel/CSV)"
            >
              <Upload size={13} />
            </button>
            <button
              type="button"
              onClick={exportCustomersToExcel}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Exporter clients (Excel)"
            >
              <Download size={13} />
            </button>
            <Button
              onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
              size="sm"
              className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
            >
              <Plus size={13} /> <span className="hidden sm:inline">Nouveau</span>
            </Button>
          </div>
        </div>
      </div>

      {customerViewMode === 'analytics' ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <CustomerAnalyticsView
            customers={customers}
            transactions={transactions}
            settings={settings}
            openWhatsApp={openWhatsApp}
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id);
              setCustomerViewMode('directory');
            }}
          />
        </div>
      ) : customerViewMode === 'debts' ? (
        <div className="flex-1 overflow-y-auto">
          <CustomerDebtsLedger
            customers={customers}
            transactions={transactions}
            settings={settings}
            onOpenFinancialModal={(c) => {
              setSelectedCustomerId(c.id);
              setFinancialOpType('encaissement');
              setFinancialMethod('cash');
              setFinancialNote('Règlement de dette');
              setIsTopUpModalOpen(true);
            }}
            openWhatsApp={openWhatsApp}
          />
        </div>
      ) : customerViewMode === 'journal' ? (
        <CustomerGlobalJournalView
          customers={customers}
          transactions={transactions}
          settings={settings}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onRestore={onRestore}
        />
      ) : customerViewMode === 'general' ? (
        <CustomerGlobalGeneralView
          customers={customers}
          settings={settings}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onOpenFinancialModal={(c) => {
            setSelectedCustomerId(c.id);
            setFinancialOpType('encaissement');
            setFinancialMethod('cash');
            setFinancialNote('Règlement de solde client');
            setIsTopUpModalOpen(true);
          }}
        />
      ) : directoryLayout === 'table' ? (
        <CustomerTableView
          filteredCustomers={filteredCustomers}
          paginatedCustomers={paginatedCustomers}
          settings={settings}
          search={search}
          setSearch={setSearch}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          kpiStats={kpiStats}
          currentPage={currentPage}
          totalPages={totalPages}
          setTablePage={setTablePage}
          TABLE_PAGE_SIZE={TABLE_PAGE_SIZE}
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
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
          {/* Left Panel: Customer List */}
          <div className={cn(
            "w-full md:w-1/3 flex flex-col gap-3 bg-white/5 p-4 sm:p-5 rounded-xl shadow-xs/5 border border-white/5 h-full overflow-hidden transition-all duration-300",
            selectedCustomerId ? "hidden md:flex" : "flex",
            isDetailExpanded && "md:hidden"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white  tracking-tight uppercase">Répertoire</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-wider">{filteredCustomers.length} affiché(s) / {customers.length}</p>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryLayout('table')}
                className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                title="Passer en vue Grand Tableau"
              >
                <TableIcon size={14} /> Grand Tableau
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input 
                type="text"
                placeholder="Rechercher nom, tél, email, carte..."
                className="w-full pl-10 pr-9 py-3 bg-slate-900/60 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap",
                  filterStatus === 'all'
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
                )}
              >
                Tous ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('debtors')}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1",
                  filterStatus === 'debtors'
                    ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                )}
              >
                Dettes ({debtorCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('credits')}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap",
                  filterStatus === 'credits'
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                )}
              >
                Avoirs
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('app_users')}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1",
                  filterStatus === 'app_users'
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
                )}
              >
                <Smartphone size={11} /> App ({kpiStats.appUserCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('vip')}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1",
                  filterStatus === 'vip'
                    ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                )}
              >
                <Award size={11} /> VIP
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('inactive')}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap",
                  filterStatus === 'inactive'
                    ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                    : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
                )}
              >
                Inactifs
              </button>
            </div>

            {/* Sorting Row */}
            <div className="flex items-center justify-between gap-2 px-1 text-[10px] text-slate-400 font-bold uppercase">
              <span className="flex items-center gap-1">
                <ArrowUpDown size={12} className="text-indigo-400" /> Trier :
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-900/80 border border-white/10 text-slate-200 rounded-lg px-2 py-1 outline-none text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                <option value="name_asc">Nom (A → Z)</option>
                <option value="name_desc">Nom (Z → A)</option>
                <option value="debt_desc">Dette la plus forte</option>
                <option value="spent_desc">Volume d'achat (CA)</option>
                <option value="points_desc">Points de fidélité</option>
                <option value="recent_visit">Dernière visite</option>
              </select>
            </div>

            <div className="flex-1 overflow-hidden pr-1 -mr-1 h-full min-h-[300px]">
              {filteredCustomers.length > 0 ? (
                <List
                  rowCount={filteredCustomers.length}
                  rowHeight={82}
                  rowComponent={CustomerRow}
                  rowProps={{}}
                />
              ) : (
                <div className="text-center py-5 text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun client trouvé</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Detail View */}
          <div className={cn(
            "bg-workspace rounded-xl shadow-xs/5 border border-white/5 flex flex-col overflow-hidden transition-all duration-300",
            selectedCustomerId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full",
            isDetailExpanded && "md:w-full"
          )}>
            {selectedCustomer ? (
              <>
                {/* Ultra-Compact Client Bar (Gain de place maximal ~48px) */}
                <div className="px-3.5 py-2 border-b border-white/10 bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                  {/* Left: Client Mini Badge */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Bouton retour mobile (< md) : réinitialise la sélection pour revenir à la liste */}
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(null)}
                      className="md:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-black uppercase shadow-xs min-h-[38px]"
                      title="Retour à la liste"
                    >
                      <ArrowLeft className="w-5 h-5 text-indigo-400" />
                      <span>Retour à la liste</span>
                    </button>

                    {/* Bouton retour desktop si panneau maximisé */}
                    {isDetailExpanded && (
                      <button
                        type="button"
                        onClick={() => setIsDetailExpanded(false)}
                        className="hidden md:flex p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all items-center gap-1 text-[11px] font-black uppercase"
                        title="Retourner à la vue scindée"
                      >
                        <ArrowLeft size={13} />
                        <span className="hidden sm:inline">Liste</span>
                      </button>
                    )}
                    <div className="w-8 h-8 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                      {(selectedCustomer.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[150px] sm:max-w-[220px]">
                          {selectedCustomer.name || 'Client sans nom'}
                        </h2>
                        {selectedCustomer.isAppUser && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-400 text-[8px] font-black rounded uppercase border border-indigo-500/20">
                            App
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        {selectedCustomer.phone && (
                          <span className="flex items-center gap-1"><Phone size={10} className="text-indigo-400" /> {selectedCustomer.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Inline Mini KPI Pills (Remplace les 4 grands rectangles) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Solde / Dette Pill */}
                    <div className={cn(
                      "px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[11px] font-mono font-black",
                      (selectedCustomer.balance || 0) < 0 
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-300" 
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    )}>
                      <span className="text-[9px] uppercase font-bold opacity-80">
                        {(selectedCustomer.balance || 0) < 0 ? "Dette:" : "Solde:"}
                      </span>
                      <span>
                        {Number(selectedCustomer.balance || 0) < 0 
                          ? `${Math.abs(Number(selectedCustomer.balance) || 0).toFixed(0)}` 
                          : Number(selectedCustomer.balance || 0).toFixed(0)
                        } <span className="text-[9px] font-sans text-slate-400">{settings.currency || 'DA'}</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setFinancialOpType('encaissement');
                          setFinancialMethod('cash');
                          setFinancialNote('Règlement de solde client');
                          setIsTopUpModalOpen(true);
                        }}
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-black uppercase transition-all ml-0.5",
                          (selectedCustomer.balance || 0) < 0 
                            ? "bg-rose-600 hover:bg-rose-500 text-white" 
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        )}
                      >
                        {(selectedCustomer.balance || 0) < 0 ? "Régler" : "Gérer"}
                      </button>
                    </div>

                    {/* Points Pill */}
                    <div className="px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1">
                      <span className="text-[9px] uppercase text-amber-400/80">Pts:</span>
                      <span>{selectedCustomer.loyaltyPoints || 0}</span>
                    </div>

                    {/* CA Pill */}
                    <div className="hidden lg:flex px-2 py-1 rounded-lg border border-white/5 bg-slate-800/80 text-slate-300 text-[11px] font-mono font-bold items-center gap-1">
                      <span className="text-[9px] uppercase text-slate-400">CA:</span>
                      <span>{(Number(selectedCustomer.totalSpent) || 0).toFixed(0)} {settings.currency || 'DA'}</span>
                    </div>
                  </div>

                  {/* Right: Compact Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={() => handleLaunchSale(selectedCustomer)}
                      className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-sm flex items-center gap-1"
                      title="Charger dans le panier"
                    >
                      <ShoppingCart size={12} /> <span className="hidden sm:inline">Vendre</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDetailExpanded(prev => !prev)}
                      className={cn(
                        "p-1.5 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-1 border",
                        isDetailExpanded
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-800 text-slate-300 hover:text-white border-slate-700"
                      )}
                      title={isDetailExpanded ? "Vue scindée" : "Plein écran"}
                    >
                      {isDetailExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    <button 
                      type="button"
                      onClick={() => handlePrintStatement(selectedCustomer)}
                      className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
                      title="Imprimer relevé de compte"
                    >
                      <Printer size={13} />
                    </button>

                    <div className="relative group">
                      <button 
                        type="button"
                        onClick={() => openWhatsApp(selectedCustomer.phone || '', (selectedCustomer.balance || 0) < 0 ? 'debt' : undefined, selectedCustomer)}
                        className="p-1.5 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all"
                        title="WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </button>
                      <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-md z-50 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => openWhatsApp(selectedCustomer.phone || '', undefined, selectedCustomer)}
                          className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          💬 Conversation libre
                        </button>
                        {(selectedCustomer.balance || 0) < 0 && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(selectedCustomer.phone || '', 'debt', selectedCustomer)}
                            className="text-left px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            ⚠️ Rappel de dette ({Math.abs(selectedCustomer.balance || 0).toFixed(0)} {settings.currency || 'DA'})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openWhatsApp(selectedCustomer.phone || '', 'points', selectedCustomer)}
                          className="text-left px-3 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                          ⭐ Relevé points ({selectedCustomer.loyaltyPoints || 0} PTS)
                        </button>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => { setEditingCustomer(selectedCustomer); setIsModalOpen(true); }}
                      className="p-1.5 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all"
                      title="Modifier client"
                    >
                      <Edit size={13} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => { setCustomerToDelete(selectedCustomer); setIsDeleteConfirmOpen(true); }}
                      className="p-1.5 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all"
                      title="Supprimer client"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <CustomerDetailTabs 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  selectedCustomer={selectedCustomer}
                  transactions={transactions}
                  settings={settings}
                  onRestore={onRestore}
                  translation={t}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-600">
                <div className="w-24 h-24 bg-slate-900 rounded-xl flex items-center justify-center mb-8 border border-white/5 shadow-inner">
                  <UserIcon size={48} className="text-slate-700" />
                </div>
                <h3 className="text-xl font-black text-white  uppercase tracking-tight mb-3">Aucun client sélectionné</h3>
                <p className="max-w-xs text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Sélectionnez un client dans la liste pour voir son solde de points, son historique et générer sa carte de fidélité.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <CustomersEditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCustomer={editingCustomer}
        formData={formData}
        setFormData={setFormData}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        handleSubmit={handleSubmit}
      />

      <CustomerFinancialModal 
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        selectedCustomer={selectedCustomer}
        settings={settings}
        financialOpType={financialOpType}
        setFinancialOpType={setFinancialOpType}
        financialMethod={financialMethod}
        setFinancialMethod={setFinancialMethod}
        financialNote={financialNote}
        setFinancialNote={setFinancialNote}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        isProcessingTopUp={isProcessingTopUp}
        handleTopUp={handleTopUp}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title={t('common.delete')}
        message={`Êtes-vous sûr de vouloir supprimer ${customerToDelete?.name} ?`}
        onConfirm={handleDeleteCustomer}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
        confirmText="Supprimer définitivement"
      />
    </div>
  );
});
