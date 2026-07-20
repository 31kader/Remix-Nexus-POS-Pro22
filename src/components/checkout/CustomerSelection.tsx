import React, { memo } from 'react';
import { Search, X, Gift, Wallet, DollarSign, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { Customer, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { CustomerProfile } from '../CustomerProfile';

interface CustomerSelectionProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (c: Customer | null) => void;
  customerSearch: string;
  setCustomerSearch: (s: string) => void;
  customers: Customer[];
  isWholesale: boolean;
  setIsWholesale: (v: boolean) => void;
  useLoyaltyPoints: boolean;
  setUseLoyaltyPoints: (v: boolean) => void;
  settings: CompanySettings;
  total: number;
  receivedAmount: string;
  setReceivedAmount: (s: string) => void;
  keepExcessInBalance: boolean;
  setKeepExcessInBalance: (v: boolean) => void;
  handleCheckout: (method: 'cash' | 'card' | 'balance', shouldPrint?: boolean) => void;
  addCustomerNote: (note: string) => void;
  setIsPOSCustomerModalOpen: (v: boolean) => void;
}

export const CustomerSelection = memo(function CustomerSelection({
  selectedCustomer,
  setSelectedCustomer,
  customerSearch,
  setCustomerSearch,
  customers,
  isWholesale,
  setIsWholesale,
  useLoyaltyPoints,
  setUseLoyaltyPoints,
  settings,
  total,
  receivedAmount,
  setReceivedAmount,
  keepExcessInBalance,
  setKeepExcessInBalance,
  handleCheckout,
  addCustomerNote,
  setIsPOSCustomerModalOpen
}: CustomerSelectionProps) {
  return (
    <div className="space-y-6 p-8 bg-black/40 border-b border-white/5 ring-1 ring-white/5">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-neon-indigo" />
           Identification Client
        </h4>
        <button 
          onClick={() => setIsWholesale(!isWholesale)}
          className={cn(
            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-2xl active:scale-90",
            isWholesale ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo ring-1 ring-white/20" : "bg-black/60 text-slate-500 border-white/5 hover:border-white/10"
          )}
        >
          {isWholesale ? "MODE GROS ACTIF" : "TARIF DÉTAIL"}
        </button>
      </div>

      {selectedCustomer ? (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-500">
          <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl space-y-5 relative overflow-hidden group ring-1 ring-white/5">
            <div className="absolute top-0 right-0 p-1 opacity-20">
               <div className="w-32 h-32 bg-indigo-500/10 rounded-full absolute -top-16 -right-16 blur-[40px]" />
            </div>
            <div className="flex items-center gap-5 relative">
              <div className="w-16 h-16 bg-indigo-600/10 text-indigo-400 rounded-3xl flex items-center justify-center font-black border border-indigo-500/20 shadow-2xl text-xl italic shadow-inner">
                {(selectedCustomer.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-black text-white truncate uppercase tracking-tight italic">{selectedCustomer.name || 'Client sans nom'}</p>
                <p className="text-[10px] font-black text-indigo-400/60 tracking-[0.2em] font-mono mt-1">TEL: {selectedCustomer.phone || 'NON RENSEIGNÉ'}</p>
              </div>
              <button onClick={() => { setSelectedCustomer(null); setUseLoyaltyPoints(false); }} className="text-slate-700 hover:text-rose-500 p-3 transition-all hover:bg-rose-500/10 rounded-2xl active:scale-90 border border-transparent hover:border-rose-500/20">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner group/stat">
                <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">FIDÉLITÉ</p>
                  <p className="text-base font-black text-amber-500 font-mono tracking-tighter">{selectedCustomer.loyaltyPoints} PTS</p>
                </div>
                {selectedCustomer.loyaltyPoints >= 10 && (
                  <button
                    onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                    className={cn(
                      "p-2.5 rounded-xl transition-all border active:scale-90",
                      useLoyaltyPoints ? "bg-amber-600 text-white border-amber-400 shadow-neon-indigo" : "bg-black/60 border-white/5 text-amber-500 hover:bg-amber-600 hover:text-white"
                    )}
                  >
                    <Gift size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
                <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">
                    {(selectedCustomer.balance || 0) < 0 ? "DETTE" : "SOLDE"}
                  </p>
                  <p className={cn(
                    "text-base font-black font-mono tracking-tighter",
                    (selectedCustomer.balance || 0) > 0
                      ? "text-emerald-400"
                      : (selectedCustomer.balance || 0) < 0
                        ? "text-rose-500"
                        : "text-slate-700"
                  )}>
                    {Math.abs(selectedCustomer.balance || 0).toFixed(2)}
                    <span className="text-[9px] ml-1 opacity-60 italic">{settings.currency}</span>
                  </p>
                </div>
                {(selectedCustomer.balance || 0) >= total && total > 0 && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-neon-cyan">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calculateur de Règlement */}
          {total > 0 && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-5 relative overflow-hidden text-left shadow-2xl ring-1 ring-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Terminal de Règlement
                </h4>
                {receivedAmount !== '' && (
                  <button
                    onClick={() => { setReceivedAmount(''); setKeepExcessInBalance(false); }}
                    className="text-[8px] font-black text-rose-500/60 hover:text-rose-500 uppercase tracking-[0.2em] transition-colors"
                  >
                    ANNULER SAISIE
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">MONTANT REÇU</label>
                  <div className="relative group">
                    <input
                      type="number"
                      step="any"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCheckout('cash');
                        }
                      }}
                      placeholder={(total || 0).toFixed(2)}
                      className="w-full bg-black/60 border border-white/10 text-white text-xl font-black font-mono rounded-2xl pl-4 pr-10 py-4 focus:outline-none focus:border-indigo-500/40 focus:ring-8 focus:ring-indigo-500/5 transition-all text-left placeholder:text-slate-800 shadow-inner group-hover:border-white/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-black font-mono">{settings.currency}</span>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <label className="block text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mr-1">DIFFÉRENTIEL</label>
                  <div className="w-full bg-black/30 border border-white/5 text-white rounded-2xl px-5 py-3.5 font-mono flex items-center justify-end min-h-[60px] shadow-inner">
                    {(() => {
                      const typed = parseFloat(receivedAmount);
                      if (isNaN(typed)) return <span className="text-slate-800 text-[9px] font-black uppercase tracking-[0.2em]">WAITING...</span>;
                      if (typed > total) {
                        return (
                          <div className="flex flex-col text-right">
                            <span className="text-emerald-400 text-xl font-black leading-none tracking-tighter italic">
                              +{(typed - total).toFixed(2)}
                            </span>
                            <span className="text-[7.5px] font-black text-emerald-500/60 uppercase tracking-[0.3em] mt-1.5">À RESTITUER</span>
                          </div>
                        );
                      } else if (typed < total) {
                        return (
                          <div className="flex flex-col text-right">
                            <span className="text-rose-500 text-xl font-black leading-none tracking-tighter italic">
                              -{(total - typed).toFixed(2)}
                            </span>
                            <span className="text-[7.5px] font-black text-rose-500/60 uppercase tracking-[0.3em] mt-1.5">CRÉDIT CLIENT</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex flex-col text-right">
                            <span className="text-indigo-400 text-xl font-black leading-none tracking-tighter italic">COMPLET</span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Raccourcis de paiement rapides */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => setReceivedAmount(total.toFixed(2))}
                  className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-black text-[9px] uppercase tracking-[0.2em] rounded-xl border border-indigo-500/20 transition-all shadow-2xl active:scale-90"
                >
                  SOLDE TOTAL
                </button>
                {[10, 20, 50, 100].map(val => {
                  const currentVal = parseFloat(receivedAmount) || 0;
                  return (
                    <button
                      key={val}
                      onClick={() => setReceivedAmount((currentVal + val).toString())}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 active:scale-95 text-[9px] text-slate-500 hover:text-white font-black rounded-xl border border-white/5 transition-all"
                    >
                      +{val}
                    </button>
                  );
                })}
              </div>

              {/* Explications & Options du Crédit */}
              {(() => {
                const typed = parseFloat(receivedAmount);
                if (!isNaN(typed)) {
                  if (typed < total) {
                    const diff = total - typed;
                    return (
                      <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-[1.5rem] flex items-start gap-3 ring-1 ring-rose-500/5 animate-in fade-in zoom-in-95 duration-300">
                        <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-rose-500 tracking-[0.2em]">Transaction à Crédit Détectée</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            La dette de <span className="font-black text-white">{diff.toFixed(2)} {settings.currency}</span> sera imputée au compte de <span className="font-black text-indigo-400 uppercase italic">{selectedCustomer.name}</span>.
                          </p>
                        </div>
                      </div>
                    );
                  } else if (typed > total) {
                    const diff = typed - total;
                    return (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem] flex items-start gap-3 ring-1 ring-emerald-500/5">
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em]">Surplus de Règlement</p>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                              Un excédent de <span className="font-black text-white">{diff.toFixed(2)} {settings.currency}</span> a été versé par le client.
                            </p>
                          </div>
                        </div>
                        
                        <label className="flex items-center gap-4 cursor-pointer p-4 bg-black/40 hover:bg-white/5 rounded-[1.5rem] border border-white/5 hover:border-indigo-500/30 transition-all select-none group shadow-inner">
                          <input 
                            type="checkbox"
                            checked={keepExcessInBalance}
                            onChange={(e) => setKeepExcessInBalance(e.target.checked)}
                            className="accent-indigo-500 rounded cursor-pointer w-4 h-4"
                          />
                          <div className="text-left flex-1">
                            <p className="text-[10px] font-black uppercase text-slate-200 tracking-[0.2em] group-hover:text-indigo-400 transition-colors">ABONDER LE SOLDE PRÉPAYÉ</p>
                            <p className="text-[8.5px] text-slate-600 font-black leading-none mt-1.5 uppercase tracking-tighter italic">NOUVEAU SOLDE ESTIMÉ: {((selectedCustomer.balance || 0) + diff).toFixed(2)} {settings.currency}</p>
                          </div>
                        </label>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}

          <CustomerProfile customer={selectedCustomer} onAddNote={addCustomerNote} hideHeader />
        </div>
       ) : (
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-all duration-300" size={18} />
              <input 
                type="text"
                placeholder="RECHERCHE CLIENT ACTIF..."
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-slate-800 shadow-inner group-hover:border-white/20 transition-all"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-workspace/95 border border-white/10 rounded-[2.5rem] shadow-2xl z-50 max-h-72 overflow-y-auto backdrop-blur-3xl ring-1 ring-white/10 no-scrollbar animate-in fade-in slide-in-from-top-4 duration-300">
                  {customers.length === 0 ? (
                    <div className="p-10 text-center text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Base de données clients vide</div>
                  ) : (
                    customers
                      .filter((c: Customer) => {
                        if (!customerSearch) return true;
                        const term = customerSearch.trim().toLowerCase();
                        const nameMatch = (c.name || '').toLowerCase().includes(term);
                        const phoneMatch = (c.phone || '').includes(term);
                        return nameMatch || phoneMatch;
                      })
                      .slice(0, 50)
                      .map((c: Customer) => (
                        <button
                          key={c.id}
                          className="w-full p-6 text-left hover:bg-indigo-600 hover:text-white border-b border-white/5 flex items-center justify-between transition-all group/item"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch('');
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-500 border border-white/5 group-hover/item:bg-white/20 group-hover/item:text-white transition-all italic">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight group-hover/item:text-white transition-colors italic">{c.name}</p>
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1 group-hover/item:text-white/60 font-mono transition-colors">{c.phone || 'SANS CONTACT'}</p>
                            </div>
                          </div>
                          {(c.balance || 0) !== 0 && (
                            <span className={cn(
                              "text-[10px] font-black font-mono tracking-tighter group-hover/item:text-white transition-colors px-3 py-1 rounded-lg border",
                              (c.balance || 0) > 0 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                            )}>
                              {(c.balance || 0).toFixed(2)}
                            </span>
                          )}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsPOSCustomerModalOpen(true)}
              className="px-5 bg-black/40 border border-white/10 rounded-2xl hover:bg-indigo-600 text-slate-600 hover:text-white transition-all flex items-center justify-center shadow-inner active:scale-90 group relative overflow-hidden"
              title="CRÉER NOUVEAU CLIENT"
            >
              <UserPlus size={22} className="relative z-10" />
              <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
            </button>
          </div>
       )}
    </div>
  );
});
