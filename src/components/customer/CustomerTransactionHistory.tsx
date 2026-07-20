import React from 'react';
import { motion } from 'motion/react';
import { Customer, CompanySettings, Transaction } from '../../types';
import { formatSafe } from '../../lib/utils';
import { History, ShoppingCart, Calendar } from 'lucide-react';
import { fr } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  settings: CompanySettings;
}

export const CustomerTransactionHistory: React.FC<Props> = ({ transactions, settings }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-white flex items-center gap-3 uppercase italic tracking-wider text-sm">
          <History size={18} className="text-indigo-400" />
          Journal d'activité
        </h3>
      </div>
      
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-16 text-center shadow-inner">
            <ShoppingCart size={48} className="mx-auto text-slate-800 mb-4 opacity-50" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Aucune donnée transactionnelle enregistrée.</p>
          </div>
        ) : (
          transactions.map((t) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all cursor-pointer group relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-700 group-hover:text-indigo-400 border border-white/5 transition-all shadow-inner">
                      <ShoppingCart size={24} />
                    </div>
                    <div>
                      <p className="font-black text-white italic tracking-widest uppercase text-sm">Session #{t.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <Calendar size={12} className="text-indigo-500" />
                        {formatSafe(t.timestamp, 'dd MMMM yyyy • HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white tracking-tighter leading-none">{t.total.toFixed(2)}</p>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">{settings.currency}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
