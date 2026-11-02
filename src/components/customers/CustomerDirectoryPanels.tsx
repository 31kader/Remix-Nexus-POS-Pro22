import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { CustomerDirectorySplitView } from './CustomerDirectorySplitView';

interface CustomerDirectoryPanelsProps {
  customers: Customer[];
  filteredCustomers: Customer[];
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedCustomer: Customer | null;
  search: string;
  setSearch: (s: string) => void;
  filterStatus: any;
  setFilterStatus: (f: any) => void;
  sortBy: any;
  setSortBy: (s: any) => void;
  debtorCount: number;
  kpiStats: any;
  isDetailExpanded: boolean;
  setIsDetailExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  setDirectoryLayout: (layout: 'split' | 'table') => void;
  setFinancialOpType: (type: any) => void;
  setFinancialMethod: (method: any) => void;
  setFinancialNote: (note: string) => void;
  setIsTopUpModalOpen: (open: boolean) => void;
  handleLaunchSale: (c: Customer) => void;
  handlePrintStatement: (c: Customer) => void;
  openWhatsApp: (phone: string, text: string) => void;
  setEditingCustomer: (c: Customer | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setCustomerToDelete: (c: Customer | null) => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  t: (k: string) => string;
}

export const CustomerDirectoryPanels: React.FC<CustomerDirectoryPanelsProps> = (props) => {
  const {
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomer,
    isDetailExpanded
  } = props;

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
      {/* Panneau de gauche (liste) : masqué sur mobile si un client est sélectionné */}
      <div className={cn(
        "w-full md:w-1/3 flex flex-col gap-3 bg-white/5 p-4 sm:p-5 rounded-xl shadow-xs/5 border border-white/5 h-full overflow-hidden transition-all duration-300",
        selectedCustomerId ? "hidden md:flex" : "flex",
        isDetailExpanded && "md:hidden"
      )}>
        <CustomerDirectorySplitView
          view="list"
          {...props}
        />
      </div>

      {/* Panneau de droite (détail) */}
      <div className={cn(
        "bg-workspace rounded-xl shadow-xs/5 border border-white/5 flex flex-col overflow-hidden transition-all duration-300",
        selectedCustomerId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full",
        isDetailExpanded && "md:w-full"
      )}>
        {selectedCustomer && (
          <button
            type="button"
            onClick={() => setSelectedCustomerId(null)}
            className="md:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-black uppercase shadow-xs min-h-[38px] m-2 self-start"
            title="Retour à la liste"
          >
            <ArrowLeft className="w-5 h-5 text-indigo-400" />
            <span>Retour à la liste</span>
          </button>
        )}

        <CustomerDirectorySplitView
          view="detail"
          {...props}
        />
      </div>
    </div>
  );
};
