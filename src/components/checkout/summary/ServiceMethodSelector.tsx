import React from 'react';
import { Store, Truck, ShoppingBag } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface ServiceMethodSelectorProps {
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  setDeliveryMethod: (m: 'in_store' | 'delivery' | 'pickup') => void;
}

export const ServiceMethodSelector: React.FC<ServiceMethodSelectorProps> = ({
  deliveryMethod,
  setDeliveryMethod
}) => {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        Mode de Service
      </h4>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { id: 'in_store', icon: Store, label: 'COMPTOIR' },
          { id: 'delivery', icon: Truck, label: 'LIVRER' },
          { id: 'pickup', icon: ShoppingBag, label: 'RETRAIT' }
        ].map((m) => (
          <button 
            key={m.id}
            onClick={() => setDeliveryMethod(m.id as any)}
            className={cn(
              "flex items-center justify-center border transition-all active:scale-95 group relative shadow-xs cursor-pointer gap-1 py-1.5 px-1.5 rounded-lg text-xs font-bold",
              deliveryMethod === m.id 
                ? "bg-indigo-600 text-white border-indigo-400 shadow-xs ring-1 ring-white/20"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <m.icon size={14} className="shrink-0" />
            <span className="truncate uppercase text-[10px]">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
