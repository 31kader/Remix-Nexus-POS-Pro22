import React from 'react';
import { AlertTriangle, TrendingDown, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Category } from '../../types';

interface ExpiryAnalyticsViewProps {
  analyzedProducts: any[];
  categories: Category[];
  stats: { criticalCount: number };
  handleBatchDiscount: (status: 'expired' | 'critical') => void;
}

export function ExpiryAnalyticsView({
  analyzedProducts,
  categories,
  stats,
  handleBatchDiscount
}: ExpiryAnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" /> Top Pertes Potentielles
          </h3>
          <div className="space-y-4">
            {analyzedProducts.slice(0, 5).map(p => (
              <div key={`loss-${p.id}`} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-white uppercase truncate">{p.name}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest">{p.stock} {p.unit} à {p.price} CFA</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-rose-500">-{(p.stock * p.price).toLocaleString()} CFA</p>
                  <p className="text-[8px] text-white/20 uppercase font-black">{p.daysLeft} jours restants</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <TrendingDown size={18} className="text-indigo-500" /> Analyse par Catégorie
          </h3>
          <div className="space-y-6">
            {categories.map(cat => {
              const catProducts = analyzedProducts.filter(p => p.categoryId === cat.id);
              if (catProducts.length === 0) return null;
              const catValue = catProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
              const totalValue = analyzedProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
              const percent = (catValue / totalValue) * 100;
              
              return (
                <div key={`cat-loss-${cat.id}`}>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-white/60">{cat.name}</span>
                    <span className="text-white">{catValue.toLocaleString()} CFA</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-[2.5rem] p-8 text-center">
         <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="text-indigo-400" size={32} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Conseil de Gestion</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Vous avez <span className="text-white font-bold">{stats.criticalCount} produits</span> qui expirent dans moins d'une semaine. 
              Une promotion flash de 20% pourrait aider à libérer ce stock tout en conservant une marge opérationnelle.
            </p>
            <div className="pt-4">
              <button 
                onClick={() => handleBatchDiscount('critical')}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-[0.2em] text-[10px] px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
              >
                Lancer la Promo Flash
              </button>
            </div>
         </div>
      </div>
    </div>
  );
}
