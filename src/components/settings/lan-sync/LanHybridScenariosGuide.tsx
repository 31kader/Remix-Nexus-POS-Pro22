import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export const LanHybridScenariosGuide: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={18} className="text-indigo-500" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Fonctionnement Hybride & Basculement Automatique (Tolérance aux Pannes)
          </h4>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500">
          Automatique 100%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Situation 1 */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <p className="text-xs font-black text-slate-800 dark:text-white">
              1. Câble branché + Pas d'Internet
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
            Synchronisation locale en direct des stocks et des ventes entre les postes sans aucune coupure. Les stocks se décrémentent en temps réel sur tous les écrans.
          </p>
        </div>

        {/* Situation 2 */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <p className="text-xs font-black text-slate-800 dark:text-white">
              2. Câble débranché + Internet actif
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
            Basculement automatique et transparent via Supabase Cloud. Les caisses continuent de synchroniser les stocks et ventes à travers Internet.
          </p>
        </div>

        {/* Situation 3 */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-black text-slate-800 dark:text-white">
              3. Les deux branchés (Câble + Internet)
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
            Le meilleur des deux mondes : communication locale ultra-rapide (&lt;50ms) entre les caisses + sauvegarde continue en arrière-plan sur le Cloud.
          </p>
        </div>

        {/* Situation 4 */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <p className="text-xs font-black text-slate-800 dark:text-white">
              4. Ni Câble ni Internet (Isolé)
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
            Chaque caisse continue d'encaisser de manière 100% autonome sur sa base locale (IndexedDB). Dès qu'un câble ou la connexion revient, tout se resynchronise.
          </p>
        </div>
      </div>
    </div>
  );
};
