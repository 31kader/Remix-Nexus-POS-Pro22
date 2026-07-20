import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, Gift, Printer, MessageSquare } from 'lucide-react';
import { CompanySettings, Customer } from '../../types';

interface CheckoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastTransaction: any;
  settings: CompanySettings;
  customers: Customer[];
  printReceipt: (transaction: any, settings: CompanySettings) => void;
}

export function CheckoutSuccessModal({
  isOpen,
  onClose,
  lastTransaction,
  settings,
  customers,
  printReceipt
}: CheckoutSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/30 text-white px-8 py-6 rounded-[2.5rem] shadow-neon-cyan flex flex-col gap-4 z-50 min-w-[360px] backdrop-blur-2xl ring-1 ring-white/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-black uppercase tracking-widest">Nexus System</p>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Vente enregistrée avec succès</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/40 rounded-xl">
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-slate-950/60 rounded-3xl p-4 border border-slate-800/60 shadow-inner">
             <div className="flex justify-between items-baseline mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction ID</span>
                <span className="text-[10px] font-mono font-black text-slate-400">#{(lastTransaction?.id || 'NX-0000').slice(-6)}</span>
             </div>
             <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-white tracking-tighter">{(lastTransaction?.total || 0).toFixed(2)}</span>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{settings.currency}</span>
             </div>
             {lastTransaction?.pointsEarned ? (
               <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Points Fidélité</span>
                  <span className="text-[10px] font-black text-amber-500 flex items-center gap-1"><Gift size={12} />+{lastTransaction.pointsEarned} PTS</span>
               </div>
             ) : null}
          </div>
          
          {lastTransaction && (
            <div className="flex gap-3">
              <button 
                onClick={() => printReceipt(lastTransaction, settings)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-neon-indigo active:scale-95"
              >
                <Printer size={18} /> Imprimer Reçu
              </button>
              {lastTransaction.customerId && (
                <button 
                  onClick={() => {
                    const customer = customers.find((c: Customer) => c.id === lastTransaction.customerId);
                    if (customer) {
                      const text = `Bonjour ${customer.name}, merci pour votre achat de ${lastTransaction.total.toFixed(2)} ${settings.currency} chez nexus. POS. Votre nouveau solde est de ${customer.loyaltyPoints} pts.`;
                      window.open(`https://wa.me/${(customer.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all border border-slate-700 shadow-sm active:scale-95"
                >
                  <MessageSquare size={18} /> WhatsApp
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
