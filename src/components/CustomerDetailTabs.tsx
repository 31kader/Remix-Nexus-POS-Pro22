import React from 'react';
import { 
  Contact, User as UserIcon, Phone, Mail, 
  CreditCard as CardIcon, Quote, Clock, ShoppingBag, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Customer, Transaction, CompanySettings } from '../types';
import { cn, formatSafe } from '../lib/utils';
import { CustomerDigitalCard } from './CustomerDigitalCard';
import { useTransactionStore } from '../store/useTransactionStore';

interface CustomerDetailTabsProps {
  activeTab: 'info' | 'history' | 'card';
  setActiveTab: (tab: 'info' | 'history' | 'card') => void;
  selectedCustomer: Customer;
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore: (t: Transaction) => void;
  translation: (k: string) => string;
}

export function CustomerDetailTabs({
  activeTab,
  setActiveTab,
  selectedCustomer,
  transactions,
  settings,
  onRestore,
  translation
}: CustomerDetailTabsProps) {
  const returns = useTransactionStore(s => s.returns) || [];

  const customerTransactions = transactions.filter(t => t.customerId === selectedCustomer.id);
  const customerReturns = returns.filter(r => r.customerId === selectedCustomer.id);

  // Combine and sort chronologically desc
  const timeline = [
    ...customerTransactions.map(t => ({
      type: 'transaction' as const,
      id: t.id,
      timestamp: t.timestamp,
      total: t.total,
      items: t.items || [],
      raw: t
    })),
    ...customerReturns.map(r => ({
      type: 'return' as const,
      id: r.id,
      timestamp: r.timestamp || r.date || new Date().toISOString(),
      total: r.totalRefund || r.refundAmount || 0,
      items: r.items || [],
      raw: r
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
      {/* Tabs Navigation */}
      <div className="flex border-b border-white/5 bg-slate-900/50">
        <button 
          onClick={() => setActiveTab('info')}
          className={cn("px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'info' ? "border-indigo-500 text-indigo-400 bg-white/5" : "border-transparent text-slate-500 hover:text-white hover:bg-white/5")}
        >
          {translation("Général")}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn("px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2", activeTab === 'history' ? "border-indigo-500 text-indigo-400 bg-white/5" : "border-transparent text-slate-500 hover:text-white hover:bg-white/5")}
        >
          {translation("Journal de bord")} <span className="bg-indigo-500/20 text-indigo-400 py-0.5 px-2 rounded-lg text-[9px] border border-indigo-500/20">{timeline.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('card')}
          className={cn("px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'card' ? "border-indigo-500 text-indigo-400 bg-white/5" : "border-transparent text-slate-500 hover:text-white hover:bg-white/5")}
        >
          {translation("Digital Card")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-nardo/50">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-inner group">
              <h4 className="text-xs font-black text-indigo-400 mb-8 flex items-center gap-3 uppercase tracking-widest leading-none">
                 <Contact size={18} /> Credentials Logic
              </h4>
              <div className="space-y-6 text-sm">
                <div className="flex items-center gap-4">
                  <UserIcon className="text-white/40" size={16} />
                  <span className="text-white/60 w-28 text-[11px] font-black uppercase tracking-wider">Identité:</span>
                  <span className="text-white font-black uppercase tracking-tight">{selectedCustomer.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="text-white/40" size={16} />
                  <span className="text-white/60 w-28 text-[11px] font-black uppercase tracking-wider">Liaison Com:</span>
                  <span className="text-white font-black tracking-widest">{selectedCustomer.phone || '-' }</span>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="text-white/40" size={16} />
                  <span className="text-white/60 w-28 text-[11px] font-black uppercase tracking-wider">Interface Mail:</span>
                  <span className="text-white font-bold">{selectedCustomer.email || '-' }</span>
                </div>
                <div className="flex items-center gap-4">
                  <CardIcon className="text-white/40" size={16} />
                  <span className="text-white/60 w-28 text-[11px] font-black uppercase tracking-wider">Nexus ID:</span>
                  <span className="text-indigo-400 font-mono text-xs font-black tracking-widest">{selectedCustomer.loyaltyCardNumber || 'NOTSET' }</span>
                </div>
              </div>
            </div>

            {selectedCustomer.notes && (
              <div className="bg-amber-500/5 p-8 rounded-[2rem] border border-amber-500/20 shadow-inner group">
                <h4 className="text-xs font-black text-amber-400 mb-4 flex items-center gap-3 uppercase tracking-widest leading-none">
                  <Quote size={18} /> Notes Internes
                </h4>
                <p className="text-sm text-amber-200/80 leading-relaxed italic">{selectedCustomer.notes}</p>
              </div>
            )}

            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-inner group md:col-span-2">
              <h4 className="text-xs font-black text-indigo-400 mb-6 flex items-center gap-3 uppercase tracking-widest leading-none">
                 <Quote size={18} /> Historique des Règlements & Mémos
              </h4>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                {selectedCustomer.cashierNotes && selectedCustomer.cashierNotes.length > 0 ? (
                  [...selectedCustomer.cashierNotes].sort((a,b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).map((note, index) => (
                    <div key={index} className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-2 text-left">
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">{note.note}</p>
                      <div className="flex justify-between items-center text-[9px] text-white/40 uppercase font-bold tracking-wider pt-2 border-t border-white/[0.03]">
                        <span>Par: {note.author}</span>
                        <span>{formatSafe(note.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-white/30 uppercase tracking-wider italic text-center py-6">Aucun règlement ou mémo enregistré d'historique.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {timeline.map(item => {
              if (item.type === 'transaction') {
                const t = item.raw;
                return (
                  <div key={t.id} className="p-6 bg-[#0f111a] border border-white/5 rounded-3xl hover:bg-[#151823] hover:border-indigo-500/20 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <p className="text-sm font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                          SESSION #{t.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-white/50 font-bold flex items-center gap-2 mt-1 uppercase tracking-widest"><Clock size={12} className="text-indigo-400/80"/> {format(new Date(t.timestamp), 'dd MMM yyyy • HH:mm', { locale: fr })}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-black text-indigo-400 tracking-tight">{(t.total || 0).toFixed(2)} <span className="text-[10px] opacity-70 font-bold">{settings.currency}</span></p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestore(t);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          title="Reprendre les produits"
                        >
                          <ShoppingBag size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.03] relative z-10">
                      {(t.items || []).map((tItem: any, idx: number) => (
                        <span key={tItem.cartItemId || tItem.id || `hist-item-${idx}`} className="px-2.5 py-1 bg-white/5 text-slate-300 font-bold rounded-lg text-[10px] border border-white/5 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="text-white font-black">{tItem.quantity}X</span> {tItem.productName || tItem.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              } else {
                const r = item.raw;
                return (
                  <div key={`ret-${r.id}`} className="p-6 bg-red-500/[0.02] border border-red-500/10 rounded-3xl hover:bg-red-500/[0.04] hover:border-red-500/20 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-red-400 italic uppercase tracking-wider flex items-center gap-2">
                            RETOUR #{r.id.slice(-6).toUpperCase()}
                          </p>
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[8px] font-black uppercase rounded border border-red-500/20">Retourné</span>
                        </div>
                        <p className="text-[10px] text-white/50 font-bold flex items-center gap-2 mt-1.5 uppercase tracking-widest"><Clock size={12} className="text-red-400/80"/> {format(new Date(item.timestamp), 'dd MMM yyyy • HH:mm', { locale: fr })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-red-400 tracking-tight">-{((r.totalRefund || r.refundAmount || 0)).toFixed(2)} <span className="text-[10px] opacity-70 font-bold">{settings.currency}</span></p>
                        {r.reason && <p className="text-[9px] font-medium text-white/40 italic mt-1">Motif: {r.reason}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-red-500/[0.04] relative z-10">
                      {(r.items || []).map((rItem: any, idx: number) => (
                        <span key={`ret-item-${idx}`} className="px-2.5 py-1 bg-red-500/10 text-red-300 font-bold rounded-lg text-[10px] border border-red-500/10 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="text-red-400 font-black">{rItem.quantity}X</span> {rItem.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
            })}
            {timeline.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">Aucun achat effectué.</p>
                <p className="text-sm mt-1">Les achats et retours liés à ce client apparaîtront ici.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'card' && (
          <CustomerDigitalCard selectedCustomer={selectedCustomer} settings={settings} />
        )}
      </div>
    </>
  );
}
