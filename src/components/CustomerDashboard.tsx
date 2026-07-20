import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo } from 'react';
import { ShoppingBag, LogOut, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { CompanySettings, Transaction, Customer } from '../types';
import { CustomerTransactionHistory } from './customer/CustomerTransactionHistory';
import { CustomerInfoSidebar } from './customer/CustomerInfoSidebar';
import { RewardLogicCard } from './customer/RewardLogicCard';

export function CustomerDashboard({ 
  customer, 
  transactions, 
  settings, 
  onLogout 
}: { 
  customer: Customer, 
  transactions: Transaction[], 
  settings: CompanySettings,
  onLogout: () => void
}) {
  const customerTransactions = useMemo(() => {
    return transactions.filter(t => t.customerId === customer.id);
  }, [transactions, customer.id]);

  const stats = useMemo(() => {
    const totalSpent = customerTransactions.reduce((sum, t) => sum + t.total, 0);
    const lastVisit = customerTransactions.length > 0 
      ? new Date(customerTransactions[0].timestamp) 
      : null;
    return { totalSpent, lastVisit };
  }, [customerTransactions]);

  return (
    <div className="min-h-screen bg-nardo flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Header */}
      <header className="bg-workspace/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-neon-indigo border border-indigo-400/50">
              <ShoppingBag size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-black text-white uppercase italic tracking-tighter text-xl leading-none">Nexus <span className="text-indigo-400">Portal</span></h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{settings.name}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-all active:scale-90"
            title="Se déconnecter"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* Welcome Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group"
        >
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-2 italic tracking-tighter uppercase">Bonjour, {customer.name} !</h2>
            <p className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] opacity-80">Membre Nexus Privilège • Accès Autorisé</p>
            
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Crédits Fidélité</p>
                <div className="flex items-center gap-2">
                  <Award className="text-amber-400 w-7 h-7 drop-shadow-md" />
                  <p className="text-4xl font-black tracking-tighter">{customer.loyaltyPoints}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Valeur Nexus</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black tracking-tighter">{(customer.loyaltyPoints * (settings.loyaltyPointValue || 0.01)).toFixed(2)}</p>
                  <span className="text-xs font-black opacity-60 uppercase">{settings.currency}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Volume Total</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-4xl font-black tracking-tighter">{stats.totalSpent.toFixed(0)}</p>
                   <span className="text-xs font-black opacity-60 uppercase">{settings.currency}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Opérations</p>
                <p className="text-4xl font-black tracking-tighter">{customerTransactions.length}</p>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-[80px]"></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 space-y-6">
            <CustomerTransactionHistory transactions={customerTransactions} settings={settings} />
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            <CustomerInfoSidebar customer={customer} lastVisit={stats.lastVisit} />
            <RewardLogicCard loyaltyPoints={customer.loyaltyPoints} settings={settings} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-workspace/40 border-t border-white/5 py-10 mt-16">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs font-black text-white uppercase italic tracking-[0.3em]">{settings.name}</p>
          <div className="flex items-center justify-center gap-4 opacity-30">
             <div className="h-px w-12 bg-slate-500"></div>
             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Nexus System Core &copy; {new Date().getFullYear()}</p>
             <div className="h-px w-12 bg-slate-500"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
