import React from 'react';
import { Button } from './ui';
import { Product, CompanySettings } from '../types';
import { 
  RefreshCw, CheckCircle2, X, Sparkles, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useUpdatePricesLogic } from './useUpdatePricesLogic';
import { UpdatePricesItem } from './inventory/UpdatePricesItem';

interface UpdatePricesViewProps {
  items: any[];
  onComplete: () => void;
  settings: CompanySettings;
  products: Product[];
}

export function UpdatePricesView({ items, onComplete, settings, products }: UpdatePricesViewProps) {
  const {
    isProcessing,
    isOpen,
    updates,
    setUpdates,
    activeCount,
    handleClose,
    handleUpdate
  } = useUpdatePricesLogic(items, products, onComplete);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-[6px]"
          />

          {/* Right side drawer sliding panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative w-full max-w-2xl h-full bg-industrial-950 border-l border-industrial-800 flex flex-col shadow-2xl z-10 overflow-hidden"
          >
            {/* Top Header */}
            <div className="p-6 border-b border-industrial-800/80 bg-industrial-900/60 backdrop-blur-md flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg flex items-center gap-1">
                    <Sparkles size={10} className="animate-pulse" /> IA Recommandation
                  </span>
                  <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg flex items-center gap-1">
                    <Scale size={10} /> Marges Détectées
                  </span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <RefreshCw size={20} className="text-indigo-400 animate-spin-slow" />
                  Mise à jour des prix de vente
                </h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest leading-relaxed">
                  Le coût de vos articles a changé. Ajustez vos prix de vente pour préserver la rentabilité de votre commerce.
                </p>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-white bg-industrial-800 hover:bg-industrial-700 active:scale-95 rounded-xl border border-industrial-700 transition-all ml-4 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable list of products */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {items.filter(i => i.productId).map(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;

                return (
                  <UpdatePricesItem
                    key={item.productId}
                    item={item}
                    product={product}
                    settings={settings}
                    updateData={updates[item.productId]}
                    setUpdates={setUpdates}
                  />
                );
              })}
            </div>

            {/* Bottom Footer Section */}
            <div className="p-6 border-t border-industrial-800 bg-industrial-900/90 backdrop-blur-md flex flex-col sm:flex-row gap-4">
              <Button 
                variant="secondary" 
                onClick={handleClose} 
                className="flex-1 font-black uppercase tracking-widest text-xs py-3.5 border-industrial-800 hover:bg-industrial-800 text-slate-300"
              >
                Ignorer pour l'instant
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={isProcessing || activeCount === 0} 
                className={cn(
                  "flex-[2] gap-2 font-black uppercase tracking-widest text-xs py-3.5 text-white active:scale-[0.98] transition-all duration-150 shadow-xl",
                  activeCount > 0 
                    ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20" 
                    : "bg-industrial-800 opacity-50 cursor-not-allowed border-industrial-700"
                )}
              >
                {isProcessing ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {isProcessing ? "Application..." : `Appliquer (${activeCount}) Prix`}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
