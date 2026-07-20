import React from 'react';
import { motion } from 'motion/react';
import { Search, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Transaction, CompanySettings } from '../../types';

interface CameraSidebarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: 'all' | 'verified' | 'suspicious' | 'pending' | 'anomaly';
  setStatusFilter: (val: 'all' | 'verified' | 'suspicious' | 'pending' | 'anomaly') => void;
  currentView: 'archive' | 'live';
  liveSessions: any[];
  filteredTransactions: Transaction[];
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (tx: Transaction) => void;
  settings: CompanySettings;
}

export function CameraSidebar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  currentView,
  liveSessions,
  filteredTransactions,
  selectedTransaction,
  setSelectedTransaction,
  settings
}: CameraSidebarProps) {
  return (
    <div className="w-80 border-r border-white/5 flex flex-col h-full bg-workspace/50 backdrop-blur-md">
      <div className="p-6 border-b border-white/5 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="N° Vente, Caissier..." 
            className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs transition-all placeholder:text-slate-600 font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
          {(['all', 'pending', 'verified', 'suspicious'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "flex-1 px-2 py-2 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                statusFilter === filter 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {filter === 'all' ? 'Tous' : 
               filter === 'pending' ? 'Attente' : 
               filter === 'verified' ? 'Fix' : 'Alert'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {currentView === 'live' ? (
           liveSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                   <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <User size={12} className="text-emerald-400" />
                   <span className="text-[10px] font-black text-white uppercase">{session.employeeName}</span>
                </div>
                <div className="space-y-1">
                   {session.items.slice(0, 2).map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-[9px] font-bold text-slate-400">
                         <span className="truncate">{it.name}</span>
                         <span className="text-emerald-500">×{it.quantity}</span>
                      </div>
                   ))}
                </div>
              </motion.div>
           ))
        ) : (
          filteredTransactions.map((tx) => (
            <motion.div
              key={tx.id}
              layout
              onClick={() => setSelectedTransaction(tx)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                selectedTransaction?.id === tx.id 
                  ? "bg-indigo-600/10 border-indigo-500/50" 
                  : "bg-black/10 border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">#{tx.id.slice(-6).toUpperCase()}</span>
                <span className="text-[9px] font-bold text-slate-500">{format(new Date(tx.timestamp), 'HH:mm')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-white">{tx.total.toFixed(2)} {settings.currency}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tx.employeeName}</p>
                </div>
                <div className={cn(
                   "w-2 h-2 rounded-full",
                   tx.auditStatus === 'verified' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                   tx.auditStatus === 'suspicious' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                   "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                )} />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
