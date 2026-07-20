import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Plus, Search, Smartphone, Award, Phone, Mail, MessageSquare, 
  Trash2, Contact, User as UserIcon, Quote, Clock, ShoppingBag, 
  CreditCard as CardIcon, Eye, EyeOff, Users
} from 'lucide-react';
import { List } from 'react-window';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { convertKeysToSnake } from '../lib/db-converters';
import { 
  Customer, Transaction, CompanySettings, Product, Expense, StockAdjustment, Category 
} from '../types';
import { Button, Modal, ConfirmDialog } from './ui';
import { cn, formatSafe } from '../lib/utils';
import { CustomerProfile } from './CustomerProfile';
import { useTranslation } from '../translations';
import { CustomersEditModal } from './CustomersEditModal';
import { CustomerFinancialModal } from './CustomerFinancialModal';
import { CustomerDigitalCard } from './CustomerDigitalCard';
import { CustomerDetailTabs } from './CustomerDetailTabs';

import { useCustomerData } from '../hooks/useCustomerData';





export interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore: (t: Transaction) => void;
  products?: Product[];
  expenses?: Expense[];
  stockAdjustments?: StockAdjustment[];
  categories?: Category[];
}
import { useCustomersLogic } from './useCustomersLogic';

export const Customers = memo(function Customers(props: CustomersProps) {
  const { 
    customers, 
    transactions, 
    settings, 
    onRestore,
    products = [],
    expenses = [],
    stockAdjustments = [],
    categories = []
  } = props;

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
    requestSort,
    sortConfig,
    openWhatsApp
  } = useCustomersLogic(props);

  const CustomerRow = useMemo(() => {
    return function CustomerRowInner({ index, style, ...rest }: any) {
      const customer = filteredCustomers[index];
      if (!customer) return null;
      return (
        <div style={style} className="pr-1 pb-2">
          <div 
            onClick={() => setSelectedCustomerId(customer.id)}
            className={cn(
              "p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group h-[74px]",
              selectedCustomerId === customer.id 
                ? "bg-indigo-600/20 border-indigo-500/40 shadow-neon-indigo" 
                : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
            )}
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center font-black flex-shrink-0 text-sm transition-all shadow-inner",
                selectedCustomerId === customer.id ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 group-hover:text-indigo-400"
              )}>
                {(customer.name || '?').charAt(0)}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white truncate text-sm uppercase tracking-wider">{customer.name || 'Client sans nom'}</h4>
                  {customer.isAppUser && (
                    <Smartphone size={14} className="text-indigo-400 flex-shrink-0" />
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

  return (

    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left Panel: Customer List */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] shadow-neon-indigo/5 border border-white/5 h-1/2 md:h-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Clients</h3>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{customers.length} total</p>
          </div>
          <Button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} size="sm" className="hidden sm:flex">
            <Plus size={16} /> Nouveau
          </Button>
          <Button variant="ghost" onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="sm:hidden p-2 text-indigo-600">
            <Plus size={20} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text"
            placeholder="Rechercher un dossier client..."
            className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder:text-slate-700 shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            <div className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun client trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Detail View */}
      <div className="w-full md:w-2/3 bg-workspace rounded-[2.5rem] shadow-neon-indigo/5 border border-white/5 h-1/2 md:h-full flex flex-col overflow-hidden">
        {selectedCustomer ? (
          <>
            {/* Detail Header */}
            <div className="p-8 border-b border-white/5 bg-white/5">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/20 flex items-center justify-center font-black text-3xl shadow-neon-indigo">
                    {(selectedCustomer.name || '?').charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                       {selectedCustomer.name || 'Client sans nom'}
                       {selectedCustomer.isAppUser && (
                         <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-xl uppercase tracking-[0.2em] border border-indigo-500/20">
                           <Smartphone size={12} /> Live API
                         </span>
                       )}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-white/60 font-bold uppercase tracking-widest">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-2"><Phone size={14} className="text-indigo-400" /> {selectedCustomer.phone}</span>
                      )}
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-2"><Mail size={14} className="text-indigo-400" /> {selectedCustomer.email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedCustomer.phone && (
                    <button 
                      onClick={() => openWhatsApp(selectedCustomer.phone || '')}
                      className="p-3 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-emerald-500/5"
                    >
                      <MessageSquare size={16} /> WhatsApp
                    </button>
                  )}
                  <button 
                    onClick={() => { setEditingCustomer(selectedCustomer); setIsModalOpen(true); }}
                    className="p-3 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/5"
                  >
                    Modifier
                  </button>
                  <button 
                    onClick={() => { setCustomerToDelete(selectedCustomer); setIsDeleteConfirmOpen(true); }}
                    className="p-3 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl transition-all shadow-lg shadow-rose-500/5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 mt-8">
                <div className={cn(
                  "p-5 rounded-3xl border shadow-inner relative group transition-colors",
                  (selectedCustomer.balance || 0) < 0 
                    ? "bg-rose-500/5 border-rose-500/10" 
                    : "bg-slate-900 border-white/5"
                )}>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 leading-none">
                    {(selectedCustomer.balance || 0) < 0 ? "Dette Client (Crédit)" : "Solde Prépayé"}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-xl font-black transition-colors",
                      (selectedCustomer.balance || 0) < 0 ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {Number(selectedCustomer.balance || 0) < 0 
                        ? `${Math.abs(Number(selectedCustomer.balance) || 0).toFixed(2)}` 
                        : Number(selectedCustomer.balance || 0).toFixed(2)
                      } <span className="text-xs opacity-60 font-bold">{settings.currency}</span>
                    </p>
                    <button 
                      onClick={() => {
                        setFinancialOpType((selectedCustomer.balance || 0) < 0 ? 'encaissement' : 'encaissement'); // default
                        setFinancialMethod('cash');
                        setFinancialNote('');
                        setIsTopUpModalOpen(true);
                      }}
                      className={cn(
                        "p-1 px-3 rounded-xl text-[9px] border font-black uppercase hover:text-white transition-all opacity-0 group-hover:opacity-100",
                        (selectedCustomer.balance || 0) < 0 
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/20 hover:bg-rose-500"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500"
                      )}
                    >
                      {(selectedCustomer.balance || 0) < 0 ? "Régler / Gérer" : "Gérer"}
                    </button>
                  </div>
                </div>
                <div className="bg-slate-900 p-5 rounded-3xl border border-white/5 shadow-inner">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 leading-none">Status Points</p>
                  <p className="text-xl font-black text-amber-400">{selectedCustomer.loyaltyPoints} <span className="text-xs opacity-60 font-bold">PTS</span></p>
                </div>
                <div className="bg-slate-900 p-5 rounded-3xl border border-white/5 shadow-inner">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 leading-none">Dernière Transaction</p>
                  <p className="text-xs font-black text-white mt-1 uppercase tracking-tighter">
                    {selectedCustomer.lastVisit ? formatSafe(selectedCustomer.lastVisit, 'dd/MM/yy', { locale: fr }) : 'Aucune'}
                  </p>
                </div>
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
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-600">
            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5 shadow-inner">
              <UserIcon size={48} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-3">Aucun client sélectionné</h3>
            <p className="max-w-xs text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Sélectionnez un client dans la liste pour voir son solde de points, son historique et générer sa carte de fidélité.</p>
          </div>
        )}
      </div>

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
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
        confirmText="Supprimer définitivement"
      />
      </div>
    </div>
  );
});
