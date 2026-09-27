import React from 'react';
import { Shield } from 'lucide-react';
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

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Gérant (Manager)',
  cashier: 'Caissier (POS)',
  delivery: 'Livreur',
  picker: 'Préparateur'
};

export function TeamManagementPermissionsTab({
  settings,
  isProcessing,
  handleTogglePermission
}: TeamManagementPermissionsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      {roles.map((role) => {
        const permissions = settings.rolePermissions?.[role] || DEFAULT_PERMISSIONS[role];
        return (
          <Card
            key={role}
            className="p-5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border",
                  role === 'admin'
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                    : role === 'manager'
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                )}>
                  <Shield size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">
                    {ROLE_LABELS[role] || role}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase">
                    Profil d'Autorisations ({role})
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {permissionKeys.map(key => (
                <div
                  key={String(key)}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/70 dark:border-zinc-700/60"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 text-left">
                    {permissionLabels[key]}
                  </span>
                  <button
                    type="button"
                    disabled={role === 'admin' || isProcessing}
                    onClick={() => handleTogglePermission(role, key)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
                      permissions[key]
                        ? "bg-indigo-600"
                        : "bg-slate-300 dark:bg-zinc-700"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-xs",
                      permissions[key] ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>
              ))}
            </div>

            {role === 'admin' && (
              <div className="mt-4 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 text-center">
                  🔒 Le rôle Administrateur dispose nativement de l'intégralité des permissions système.
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
