import React from 'react';
import { Monitor, Server, Wifi } from 'lucide-react';
import { LanRole } from '../../../types/lanSync';
import { cn } from '../../../lib/utils';

interface LanRoleSelectorProps {
  selectedRole: LanRole;
  onSelectRole: (role: LanRole) => void;
}

export const LanRoleSelector: React.FC<LanRoleSelectorProps> = ({
  selectedRole,
  onSelectRole
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {/* Rôle 1 : Autonome */}
      <div
        onClick={() => onSelectRole('STANDALONE')}
        className={cn(
          "p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2",
          selectedRole === 'STANDALONE'
            ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
            : "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
            <Monitor size={16} className={selectedRole === 'STANDALONE' ? "text-indigo-600" : "text-slate-400"} />
            Poste Autonome
          </span>
          <div className={cn(
            "w-4 h-4 rounded-full border flex items-center justify-center",
            selectedRole === 'STANDALONE' ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-zinc-600"
          )}>
            {selectedRole === 'STANDALONE' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
          Ce poste fonctionne seul. Synchronisation uniquement via Supabase Cloud lorsqu'Internet est disponible.
        </p>
      </div>

      {/* Rôle 2 : Caisse Maître */}
      <div
        onClick={() => onSelectRole('MASTER')}
        className={cn(
          "p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2",
          selectedRole === 'MASTER'
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20"
            : "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
            <Server size={16} className={selectedRole === 'MASTER' ? "text-emerald-600" : "text-slate-400"} />
            Caisse Maître (Hub LAN)
          </span>
          <div className={cn(
            "w-4 h-4 rounded-full border flex items-center justify-center",
            selectedRole === 'MASTER' ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 dark:border-zinc-600"
          )}>
            {selectedRole === 'MASTER' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
          Ce PC sert de serveur central local. Toutes les autres caisses s'y connectent par câble ou Wi-Fi.
        </p>
      </div>

      {/* Rôle 3 : Caisse Secondaire */}
      <div
        onClick={() => onSelectRole('SECONDARY')}
        className={cn(
          "p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2",
          selectedRole === 'SECONDARY'
            ? "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20"
            : "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
            <Wifi size={16} className={selectedRole === 'SECONDARY' ? "text-cyan-600" : "text-slate-400"} />
            Caisse Secondaire (Client)
          </span>
          <div className={cn(
            "w-4 h-4 rounded-full border flex items-center justify-center",
            selectedRole === 'SECONDARY' ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 dark:border-zinc-600"
          )}>
            {selectedRole === 'SECONDARY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
          Ce poste se connecte à la Caisse Maître pour synchroniser les stocks et ventes en direct même sans Internet.
        </p>
      </div>
    </div>
  );
};
