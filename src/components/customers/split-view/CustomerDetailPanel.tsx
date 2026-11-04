import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Phone, ShoppingCart, Minimize2, Maximize2, 
  Printer, MessageSquare, Edit, Trash2, User as UserIcon,
  Award, TrendingUp, ChevronDown
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

export const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({
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
}) => {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const whatsAppRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (whatsAppRef.current && !whatsAppRef.current.contains(e.target as Node)) {
        setIsWhatsAppOpen(false);
      }
    };
    if (isWhatsAppOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWhatsAppOpen]);

  if (!selectedCustomer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-zinc-500 select-none">
        <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:border-zinc-800 shadow-inner">
          <UserIcon size={38} className="text-slate-400 dark:text-zinc-600" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 dark:text-zinc-200 mb-1">
          Aucun client sélectionné
        </h3>
        <p className="max-w-xs text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          Sélectionnez un client dans la liste pour consulter ses encours de dette, son historique d'achats et sa carte de fidélité.
        </p>
      </div>
    );
  }

  const balance = Number(selectedCustomer.balance) || 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Carte En-tête Client Douce & Reposante */}
      <div className="px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        {/* Identité Client */}
        <div className="flex items-center gap-3 min-w-0">
          {isDetailExpanded && (
            <button
              type="button"
              onClick={() => setIsDetailExpanded(false)}
              className="hidden md:flex p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 transition-all items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Retourner à la vue scindée"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Liste</span>
            </button>
          )}

          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0">
            {(selectedCustomer.name || '?').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[180px] sm:max-w-[260px]">
                {selectedCustomer.name || 'Client sans nom'}
              </h2>
              {selectedCustomer.isAppUser && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                  App Mobile
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
              {selectedCustomer.phone ? (
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                  title="Appeler directement"
                >
                  <Phone size={11} className="text-emerald-500" />
                  <span>{selectedCustomer.phone}</span>
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">Aucun téléphone</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Indicateurs Financiers DZD & Action Rapide de Caisse */}
        <div className="flex flex-wrap items-center gap-2 font-financial">
          {/* Badge Solde / Dette */}
          <div className={cn(
            "px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-2xs",
            balance < 0 
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-400" 
              : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
          )}>
            <span className="text-[10px] uppercase font-sans font-semibold">
              {balance < 0 ? "Dette due :" : "Solde :"}
            </span>
            <span className="tabular-nums font-black text-sm">
              {balance < 0 ? `${Math.abs(balance).toFixed(0)}` : balance.toFixed(0)}
            </span>
            <span className="text-[10px] font-sans text-slate-500">{settings.currency || 'DA'}</span>

            <button 
              type="button"
              onClick={() => {
                setFinancialOpType('encaissement');
                setFinancialMethod('cash');
                setFinancialNote(balance < 0 ? 'Règlement dette client' : 'Abonder solde');
                setIsTopUpModalOpen(true);
              }}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all ml-1 cursor-pointer shadow-2xs",
                balance < 0 
                  ? "bg-rose-600 hover:bg-rose-700 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {balance < 0 ? "Régler" : "Abonder"}
            </button>
          </div>

          {/* Points Fidélité */}
          <div className="px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1 shadow-2xs">
            <Award size={13} className="text-amber-500" />
            <span className="tabular-nums">{selectedCustomer.loyaltyPoints || 0}</span>
            <span className="text-[10px] font-sans text-slate-500">pts</span>
          </div>

          {/* Volume CA */}
          <div className="hidden lg:flex px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold items-center gap-1 shadow-2xs">
            <TrendingUp size={13} className="text-emerald-500" />
            <span className="tabular-nums">{(Number(selectedCustomer.totalSpent) || 0).toFixed(0)}</span>
            <span className="text-[10px] font-sans text-slate-500">{settings.currency || 'DA'}</span>
          </div>
        </div>

        {/* 3. Actions Rapides sur le Client */}
        <div className="flex items-center gap-1.5">
          {/* Lancer Vente en Caisse */}
          <button 
            type="button"
            onClick={() => handleLaunchSale(selectedCustomer)}
            className="btn-touch-action px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Ouvrir la caisse avec ce client sélectionné"
          >
            <ShoppingCart size={14} />
            <span>Vendre</span>
          </button>

          {/* WhatsApp Menu */}
          <div className="relative" ref={whatsAppRef}>
            <button 
              type="button"
              onClick={() => setIsWhatsAppOpen(!isWhatsAppOpen)}
              className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-xl transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs"
              title="Options WhatsApp"
            >
              <MessageSquare size={14} />
              <ChevronDown size={11} className={cn("transition-transform duration-150", isWhatsAppOpen && "rotate-180")} />
            </button>

            {isWhatsAppOpen && (
              <div className="absolute right-0 top-full mt-1.5 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-xl z-50 min-w-[210px] animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(selectedCustomer.phone || '', undefined, selectedCustomer);
                    setIsWhatsAppOpen(false);
                  }}
                  className="text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  💬 Conversation WhatsApp
                </button>
                {balance < 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      openWhatsApp(selectedCustomer.phone || '', 'debt', selectedCustomer);
                      setIsWhatsAppOpen(false);
                    }}
                    className="text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    ⚠️ Rappel de dette ({Math.abs(balance).toFixed(0)} {settings.currency || 'DA'})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(selectedCustomer.phone || '', 'points', selectedCustomer);
                    setIsWhatsAppOpen(false);
                  }}
                  className="text-left px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  ⭐ Relevé des points ({selectedCustomer.loyaltyPoints || 0} pts)
                </button>
              </div>
            )}
          </div>

          {/* Imprimer Relevé */}
          <button 
            type="button"
            onClick={() => handlePrintStatement(selectedCustomer)}
            className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Imprimer relevé de compte"
          >
            <Printer size={14} />
          </button>

          {/* Bascule Plein Écran / Scindé */}
          <button
            type="button"
            onClick={() => setIsDetailExpanded(prev => !prev)}
            className={cn(
              "p-2 rounded-xl transition-all flex items-center border cursor-pointer shadow-2xs",
              isDetailExpanded
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
            )}
            title={isDetailExpanded ? "Revenir en vue scindée" : "Agrandir en plein écran"}
          >
            {isDetailExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Modifier Client */}
          <button 
            type="button"
            onClick={() => { setEditingCustomer(selectedCustomer); setIsModalOpen(true); }}
            className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Modifier la fiche client"
          >
            <Edit size={14} />
          </button>

          {/* Supprimer Client */}
          <button 
            type="button"
            onClick={() => { setCustomerToDelete(selectedCustomer); setIsDeleteConfirmOpen(true); }}
            className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Supprimer ce client"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 2. Onglets Détaillés : Coordonnées, Historique & Carte QR */}
      <CustomerDetailTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCustomer={selectedCustomer}
        transactions={transactions}
        settings={settings}
        onRestore={onRestore}
        translation={t}
      />
    </div>
  );
};
