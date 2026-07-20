import React from 'react';
import { RefreshCw, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SyncIndicatorProps {
  syncInfo: {
    active: boolean;
    progress: number;
    currentTable: string;
  };
  isOnline: boolean;
  bgSyncActive: boolean;
  bgPendingChanges: number;
}

export const SyncIndicator = ({ 
  syncInfo, 
  isOnline, 
  bgSyncActive, 
  bgPendingChanges 
}: SyncIndicatorProps) => {
  const isSyncing = syncInfo.active || bgSyncActive;

  return (
    <div className="fixed bottom-24 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-full shadow-2xl mb-2 ring-1 ring-white/20"
          >
            <CloudOff size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest italic">OFFLINE</span>
          </motion.div>
        )}

        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-black/80 backdrop-blur-md border border-white/5 p-3 rounded-2xl shadow-2xl ring-1 ring-white/10 flex items-center gap-3"
          >
            <div className="relative">
              <RefreshCw size={16} className="text-indigo-400 animate-spin" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-white uppercase tracking-[0.2em] italic">Synchronisation...</span>
               <div className="w-24 h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${syncInfo.progress}%` }}
                    className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]"
                  />
               </div>
            </div>
          </motion.div>
        )}

        {bgPendingChanges > 0 && !isSyncing && isOnline && (
           <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xl"
           >
              <AlertCircle size={12} className="text-amber-500" />
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{bgPendingChanges} en attente</span>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
