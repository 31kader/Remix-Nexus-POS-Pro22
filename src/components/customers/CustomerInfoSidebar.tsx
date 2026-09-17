import React from 'react';
import { UserCog, Mail, Phone, Calendar } from 'lucide-react';
import { Customer } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  customer: Customer;
  lastVisit: Date | null;
}

export const CustomerInfoSidebar: React.FC<Props> = ({ customer, lastVisit }) => {
  return (
    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-inner">
      <h3 className="font-black text-white flex items-center gap-3 uppercase italic tracking-wider text-sm">
        <UserCog size={18} className="text-indigo-400" />
        Matrice Client
      </h3>
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 border border-white/5">
            <Mail size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Passerelle Mail</p>
            <p className="text-xs font-black text-white tracking-wide">{customer.email || 'N/A'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 border border-white/5">
            <Phone size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Liaison Com</p>
            <p className="text-xs font-black text-white tracking-widest">{customer.phone || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 border border-white/5">
            <Calendar size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Dernière Sync</p>
            <p className="text-xs font-black text-white tracking-widest">
              {lastVisit 
                ? format(lastVisit, 'dd MMM yyyy', { locale: fr }).toUpperCase()
                : 'NO_DATA'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
