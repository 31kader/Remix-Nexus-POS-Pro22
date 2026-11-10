import React, { useState } from 'react';
import { 
  Timer, 
  Shield, 
  CheckCircle2, 
  RotateCcw, 
  Users, 
  Check, 
  X, 
  ChevronRight 
} from 'lucide-react';
import { CompanySettings, RolePermissions } from '../../types';
import { cn } from '../../lib/utils';
import { DEFAULT_PERMISSIONS } from '../../constants';
import { PERMISSION_CATEGORIES, ROLE_LABELS } from './staff/permissionCategories';
import { toast } from 'sonner';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function StaffSection({ formData, setFormData }: SectionProps) {
  const [selectedRole, setSelectedRole] = useState<keyof typeof DEFAULT_PERMISSIONS>('cashier');

  const togglePermission = (role: string, permission: keyof RolePermissions) => {
    if (role === 'admin') return;
    const roleKey = role as keyof typeof DEFAULT_PERMISSIONS;
    const currentPermissions = formData.rolePermissions?.[roleKey] || DEFAULT_PERMISSIONS[roleKey];
    
    setFormData({
      ...formData,
      rolePermissions: {
        ...formData.rolePermissions,
        [role]: {
          ...currentPermissions,
          [permission]: !currentPermissions[permission]
        }
      } as any
    });
  };

  const handleResetRoleDefaults = (role: keyof typeof DEFAULT_PERMISSIONS) => {
    setFormData({
      ...formData,
      rolePermissions: {
        ...formData.rolePermissions,
        [role]: { ...DEFAULT_PERMISSIONS[role] }
      } as any
    });
    toast.success(`Permissions du rôle ${ROLE_LABELS[role]?.label || role} réinitialisées.`);
  };

  const currentRoleMeta = ROLE_LABELS[selectedRole] || { label: selectedRole, badge: 'bg-zinc-800 text-white', desc: '' };
  const currentPermissions = (formData.rolePermissions?.[selectedRole] || DEFAULT_PERMISSIONS[selectedRole]) as any;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. Pointage des Heures */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-white/5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
            <Timer size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Pointage des Heures (Check-in)</p>
            <p className="text-xs text-slate-400 mt-0.5">Activer la pointeuse numérique pour le personnel en caisse</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={formData.enableTimeClock ?? false}
            onChange={e => setFormData({ ...formData, enableTimeClock: e.target.checked })}
          />
          <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* 2. En-tête Matrice & Onglets des Rôles */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2 tracking-wide uppercase">
              <Shield size={18} className="text-indigo-400" />
              Matrice Granulaire des Droits par Rôle
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Configurez précisément ce que chaque employé peut faire sur le système POS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleResetRoleDefaults(selectedRole)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
            title="Rétablir les permissions recommandées pour ce rôle"
          >
            <RotateCcw size={13} />
            <span>Rétablir ce rôle</span>
          </button>
        </div>

        {/* Barre d'onglets de rôles */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/90 border border-white/5 rounded-2xl">
          {(['cashier', 'manager', 'delivery', 'picker', 'camera_agent'] as const).map(role => {
            const isSelected = selectedRole === role;
            const meta = ROLE_LABELS[role];
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span>{meta?.label || role}</span>
              </button>
            );
          })}
        </div>

        {/* Bannière du Rôle Sélectionné */}
        <div className="p-4 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("px-2.5 py-1 rounded-lg text-xs font-black uppercase border", currentRoleMeta.badge)}>
              {currentRoleMeta.label}
            </span>
            <p className="text-xs text-slate-300">{currentRoleMeta.desc}</p>
          </div>
        </div>
      </div>

      {/* 3. Catégories Détaillées de Permissions */}
      <div className="space-y-4">
        {PERMISSION_CATEGORIES.map(category => (
          <div 
            key={category.id} 
            className="bg-slate-900/80 border border-white/5 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <span className={cn("text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border", category.badgeColor)}>
                {category.title}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {category.permissions.filter(p => currentPermissions?.[p.key]).length} / {category.permissions.length} actifs
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {category.permissions.map(perm => {
                const isGranted = Boolean(currentPermissions?.[perm.key]);
                return (
                  <div
                    key={perm.key}
                    onClick={() => togglePermission(selectedRole, perm.key)}
                    className={cn(
                      "px-5 py-3 flex items-center justify-between gap-4 transition-colors cursor-pointer group",
                      isGranted ? "hover:bg-indigo-500/[0.04]" : "hover:bg-white/[0.02] opacity-75"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-xs font-bold transition-colors",
                          isGranted ? "text-white group-hover:text-indigo-300" : "text-slate-400"
                        )}>
                          {perm.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {perm.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                        isGranted 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                          : "border border-white/10 bg-slate-800 text-transparent"
                      )}>
                        <Check size={14} className={isGranted ? "opacity-100" : "opacity-0"} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
