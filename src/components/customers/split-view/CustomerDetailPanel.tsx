import React from 'react';
import { 
  ArrowLeft, Phone, ShoppingCart, Minimize2, Maximize2, 
  Printer, MessageSquare, Edit, Trash2, User as UserIcon 
} from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../../types';
import { cn } from '../../../lib/utils';
import { CustomerDetailTabs } from '../../CustomerDetailTabs';

interface CustomerDetailPanelProps {
  selectedCustomer: Customer | null | undefined;
  isDetailExpanded: boolean;
  setIsDetailExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setFinancialOpType: (op: any) => void;
  setFinancialMethod: (m: any) => void;
  setFinancialNote: (n: any) => void;
  setIsTopUpModalOpen: (open: boolean) => void;
  handleLaunchSale: (c: Customer) => void;
  handlePrintStatement: (c: Customer) => void;
  openWhatsApp: (phone: string, type?: any, c?: Customer) => void;
  setEditingCustomer: (c: Customer | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setCustomerToDelete: (c: Customer | null) => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  activeTab: any;
  setActiveTab: (t: any) => void;
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  t: (key: string) => string;
}

export function CustomerDetailPanel({
  selectedCustomer,
  isDetailExpanded,
  setIsDetailExpanded,
  setFinancialOpType,
  setFinancialMethod,
  setFinancialNote,
  setIsTopUpModalOpen,
  handleLaunchSale,
  handlePrintStatement,
  openWhatsApp,
  setEditingCustomer,
  setIsModalOpen,
  setCustomerToDelete,
  setIsDeleteConfirmOpen,
  activeTab,
  setActiveTab,
  transactions,
  settings,
  onRestore,
  t
}: CustomerDetailPanelProps) {
  if (!selectedCustomer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-600">
        <div className="w-24 h-24 bg-slate-900 rounded-xl flex items-center justify-center mb-8 border border-white/5 shadow-inner">
          <UserIcon size={48} className="text-slate-700" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Aucun client sélectionné</h3>
        <p className="max-w-xs text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
          Sélectionnez un client dans la liste pour voir son solde de points, son historique et générer sa carte de fidélité.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Ultra-Compact Client Bar */}
      <div className="px-3.5 py-2 border-b border-white/10 bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        {/* Left: Client Mini Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isDetailExpanded && (
            <button
              type="button"
              onClick={() => setIsDetailExpanded(false)}
              className="hidden md:flex p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all items-center gap-1 text-[11px] font-black uppercase cursor-pointer"
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

        {/* Center: Inline Mini KPI Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
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
                "px-1.5 py-0.2 rounded text-[9px] font-black uppercase transition-all ml-0.5 cursor-pointer",
                (selectedCustomer.balance || 0) < 0 
                  ? "bg-rose-600 hover:bg-rose-500 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              )}
            >
              {(selectedCustomer.balance || 0) < 0 ? "Régler" : "Gérer"}
            </button>
          </div>

          <div className="px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1">
            <span className="text-[9px] uppercase text-amber-400/80">Pts:</span>
            <span>{selectedCustomer.loyaltyPoints || 0}</span>
          </div>

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
            className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            title="Charger dans le panier"
          >
            <ShoppingCart size={12} /> <span className="hidden sm:inline">Vendre</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDetailExpanded(prev => !prev)}
            className={cn(
              "p-1.5 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-1 border cursor-pointer",
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
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer"
            title="Imprimer relevé de compte"
          >
            <Printer size={13} />
          </button>

          <div className="relative group">
            <button 
              type="button"
              onClick={() => openWhatsApp(selectedCustomer.phone || '', (selectedCustomer.balance || 0) < 0 ? 'debt' : undefined, selectedCustomer)}
              className="p-1.5 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all cursor-pointer"
              title="WhatsApp"
            >
              <MessageSquare size={13} />
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-md z-50 min-w-[200px]">
              <button
                type="button"
                onClick={() => openWhatsApp(selectedCustomer.phone || '', undefined, selectedCustomer)}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                💬 Conversation libre
              </button>
              {(selectedCustomer.balance || 0) < 0 && (
                <button
                  type="button"
                  onClick={() => openWhatsApp(selectedCustomer.phone || '', 'debt', selectedCustomer)}
                  className="text-left px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  ⚠️ Rappel de dette ({Math.abs(selectedCustomer.balance || 0).toFixed(0)} {settings.currency || 'DA'})
                </button>
              )}
              <button
                type="button"
                onClick={() => openWhatsApp(selectedCustomer.phone || '', 'points', selectedCustomer)}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
              >
                ⭐ Relevé points ({selectedCustomer.loyaltyPoints || 0} PTS)
              </button>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => { setEditingCustomer(selectedCustomer); setIsModalOpen(true); }}
            className="p-1.5 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all cursor-pointer"
            title="Modifier client"
          >
            <Edit size={13} />
          </button>

          <button 
            type="button"
            onClick={() => { setCustomerToDelete(selectedCustomer); setIsDeleteConfirmOpen(true); }}
            className="p-1.5 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
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
  );
}
