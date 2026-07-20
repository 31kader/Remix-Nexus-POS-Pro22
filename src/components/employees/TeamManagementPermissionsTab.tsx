import React from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { CompanySettings, RolePermissions } from '../../types';
import { Card } from '../ui';
import { cn } from '../../lib/utils';
import { DEFAULT_PERMISSIONS } from '../../constants';
import { roles, permissionKeys, permissionLabels } from './useTeamManagementLogic';

interface TeamManagementPermissionsTabProps {
  settings: CompanySettings;
  isProcessing: boolean;
  handleTogglePermission: (role: 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker', permission: keyof RolePermissions) => void;
}

export function TeamManagementPermissionsTab({
  settings,
  isProcessing,
  handleTogglePermission
}: TeamManagementPermissionsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8 text-white">
      {roles.map((role, idx) => {
        const permissions = settings.rolePermissions?.[role] || DEFAULT_PERMISSIONS[role];
        return (
          <motion.div
            key={role}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="p-8 border-white/5 bg-white/5 backdrop-blur-md rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl transition-transform duration-500 group-hover:rotate-12",
                    role === 'admin' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/20 shadow-neon-indigo/20" : 
                    role === 'manager' ? "bg-amber-500/20 text-amber-400 border-amber-500/20" : 
                    "bg-white/5 text-white/40 border-white/10"
                  )}>
                    <Shield size={28} />
                  </div>
                  <div>
                    <h4 className="font-black text-white uppercase tracking-widest text-lg">{role}</h4>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.22em] mt-0.5 italic">Nexus Permission Profile</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {permissionKeys.map(key => (
                  <div key={String(key)} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/[0.03] hover:border-white/10 transition-colors">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest text-left">{permissionLabels[key]}</span>
                    <button
                      disabled={role === 'admin' || isProcessing}
                      onClick={() => handleTogglePermission(role, key)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none disabled:opacity-30 active:scale-90",
                        permissions[key] ? "bg-indigo-600 shadow-neon-indigo/40" : "bg-white/10 border border-white/10"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
                        permissions[key] ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
              
              {role === 'admin' && (
                <div className="mt-8 p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest leading-loose text-center italic">
                     ACCÈS NO-LIMIT : Le rôle Administrateur est protégé par le noyau Nexus System. Toutes les permissions sont actives nativement.
                  </p>
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 blur-[40px] pointer-events-none rounded-full -mb-12 -mr-12" />
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
