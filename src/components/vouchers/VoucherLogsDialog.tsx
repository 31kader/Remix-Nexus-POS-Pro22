import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Voucher } from '../../types';

interface VoucherLogsDialogProps {
  voucher: Voucher;
  onClose: () => void;
}

export function VoucherLogsDialog({ voucher, onClose }: VoucherLogsDialogProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a24] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10"
      >
        <div className="p-6 space-y-6 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Historique du Bon</p>
              <h4 className="text-lg font-black text-white tracking-tight uppercase">{voucher.code}</h4>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {(!voucher.usageLogs || voucher.usageLogs.length === 0) ? (
              <div className="p-8 text-center text-white/20 italic text-sm uppercase tracking-widest font-black">
                Aucune utilisation enregistrée
              </div>
            ) : (
              voucher.usageLogs.map((log, idx) => (
                <div key={`voucher-log-${idx}`} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Caisse: {log.userName}</p>
                    <p className="text-[10px] text-white/20 font-bold uppercase">{log.date}</p>
                  </div>
                  <div className="text-right space-y-0.5 font-mono">
                    <p className="text-sm font-black text-amber-500">-{Number(log.amountUsed || 0).toFixed(2)} FCFA</p>
                    <p className="text-[8px] font-bold text-white/20 uppercase">Solde: {Number(log.remainingBalance || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-full py-3 bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
