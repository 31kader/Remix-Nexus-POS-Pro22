import React from 'react';
import { 
  Timer, 
  Shield, 
  CheckCircle2, 
  Activity 
} from 'lucide-react';
import { CompanySettings, RolePermissions } from '../../types';
import { cn } from '../../lib/utils';
import { DEFAULT_PERMISSIONS } from '../../constants';
import { toast } from 'sonner';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function StaffSection({ formData, setFormData }: SectionProps) {
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between p-6 bg-slate-900 border border-white/5 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <Timer size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Pointage des Heures (Check-in)</p>
            <p className="text-[9px] text-slate-500 uppercase mt-0.5 tracking-widest">Activer la pointeuse numérique pour le personnel</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={formData.enableTimeClock}
            onChange={e => setFormData({ ...formData, enableTimeClock: e.target.checked })}
          />
          <div className="w-14 h-7 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
        </label>
      </div>

      <div className="space-y-6">
        <h4 className="text-sm font-bold text-white flex items-center gap-2 ml-1">
          <Shield size={18} className="text-indigo-500" />
          Matrice des Rôles & Permissions
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['manager', 'cashier', 'delivery', 'camera_agent'].map(role => (
            <div key={role} className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
              <div className={cn(
                "px-6 py-4 border-l-4 flex items-center justify-between bg-white/[0.02]",
                role === 'manager' ? "border-amber-500" : 
                role === 'cashier' ? "border-emerald-500" : 
                role === 'delivery' ? "border-blue-500" : "border-slate-500"
              )}>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">{role === 'camera_agent' ? 'AGENT AUDIT' : role}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter mt-0.5">Configuration des accès système</p>
                </div>
                <Shield size={16} className="text-white/10" />
              </div>
              
              <div className="p-4 space-y-2">
                {Object.keys(DEFAULT_PERMISSIONS.cashier).slice(0, 8).map(perm => {
                  const isGranted = (formData.rolePermissions?.[role as keyof typeof DEFAULT_PERMISSIONS] as any)?.[perm];
                  return (
                    <button 
                      key={perm}
                      onClick={() => togglePermission(role, perm as any)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left",
                        isGranted 
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" 
                          : "bg-black/20 border-white/5 text-slate-600 grayscale opacity-60"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        {perm.replace('canAccess', '').replace(/([A-Z])/g, ' $1').replace('canApply', '').replace('canModify', '').replace('Discount', 'Remise').replace('Sales', 'Ventes').replace('Inventory', 'Stocks').replace('Customers', 'Clients').replace('Analytics', 'Rapports').replace('Shifts', 'Sessions')}
                      </span>
                      {isGranted ? <CheckCircle2 size={14} className="text-indigo-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 ml-1">
            <Activity size={18} className="text-indigo-500" />
            Maintenance du personnel
          </h4>
          <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Réinitialisation d'urgence</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Supprimer tous les comptes personnels sauf l'administrateur principal</p>
            </div>
            <button 
              type="button"
              onClick={() => {
                if (confirm("ACTION CRITIQUE : Voulez-vous vraiment supprimer tous les comptes personnels ? Cette action est irréversible.")) {
                  toast.error("Fonctionnalité restreinte à l'administrateur système principal.");
                }
              }}
              className="px-6 py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
            >
              Réinitialiser le personnel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
