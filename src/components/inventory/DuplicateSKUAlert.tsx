import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

interface DuplicateSKUAlertProps {
  duplicateGroupsCount: number;
  onOpenDetails: () => void;
  onAutoResolveAll: () => void;
  isAutoMerging: boolean;
  autoMergeProgress: number;
}

export const DuplicateSKUAlert = ({
  duplicateGroupsCount,
  onOpenDetails,
  onAutoResolveAll,
  isAutoMerging,
  autoMergeProgress
}: DuplicateSKUAlertProps) => {
  if (duplicateGroupsCount === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex flex-col gap-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-rose-950 dark:text-rose-200 uppercase tracking-tight">Codes-barres en Double détectés !</p>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">Il y a {duplicateGroupsCount} groupe(s) d'articles partageant le même code-barre.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={onOpenDetails}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
          >
            Détails
          </Button>
          <Button 
            disabled={isAutoMerging}
            onClick={onAutoResolveAll}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 border-none disabled:opacity-50"
          >
            {isAutoMerging ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />}
            {isAutoMerging ? "Fusion..." : "Tout Fusionner Direct"}
          </Button>
        </div>
      </div>
      
      {isAutoMerging && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
            <span>Traitement automatique...</span>
            <span>{Math.round(autoMergeProgress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-rose-100 dark:bg-rose-950 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${autoMergeProgress}%` }}
              className="h-full bg-rose-600"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};
