import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, Gift, Printer, MessageSquare, Clock } from 'lucide-react';
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
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(8);
      return;
    }

    setSecondsLeft(8);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-emerald-500/40 text-white px-8 py-6 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.9)] flex flex-col gap-4 z-50 min-w-[380px] backdrop-blur-2xl ring-2 ring-emerald-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div className="flex-1">
              <p className="text-base font-black uppercase tracking-widest text-white">Vente Validée !</p>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <Clock size={12} className="animate-pulse" />
                Fermeture auto dans {secondsLeft}s
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-slate-900/90 rounded-3xl p-4 border border-white/5 shadow-inner">
             <div className="flex justify-between items-baseline mb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">N° Transaction</span>
                <span className="text-[10px] font-mono font-black text-indigo-400">#{(lastTransaction?.id || 'NX-0000').slice(-8).toUpperCase()}</span>
             </div>
             <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-white tracking-tighter">{(lastTransaction?.total || 0).toFixed(2)}</span>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">{settings?.currency || 'DA'}</span>
             </div>
             {lastTransaction?.pointsEarned ? (
               <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Points Fidélité</span>
                  <span className="text-[10px] font-black text-amber-400 flex items-center gap-1"><Gift size={12} />+{lastTransaction.pointsEarned} PTS</span>
               </div>
             ) : null}
          </div>
          
          {lastTransaction && (
            <div className="flex gap-3">
              <button 
                onClick={() => printReceipt(lastTransaction, settings)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 border border-indigo-400"
              >
                <Printer size={16} /> Imprimer Reçu
              </button>
              {lastTransaction.customerId && (
                <button 
                  onClick={() => {
                    const customer = customers.find((c: Customer) => c.id === lastTransaction.customerId);
                    if (customer) {
                      let cleanPhone = (customer.phone || '').replace(/\D/g, '');
                      if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
                        cleanPhone = '213' + cleanPhone.substring(1);
                      } else if (cleanPhone.startsWith('00213')) {
                        cleanPhone = cleanPhone.substring(2);
                      }
                      const text = `Bonjour ${customer.name}, merci pour votre achat de ${lastTransaction.total.toFixed(2)} ${settings?.currency || 'DA'} chez ${settings?.name || 'notre magasin'}.`;
                      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all border border-emerald-400 shadow-sm active:scale-95"
                >
                  <MessageSquare size={16} /> WhatsApp
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
