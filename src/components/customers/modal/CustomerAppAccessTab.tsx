import React from 'react';
import { Smartphone, Eye, EyeOff } from 'lucide-react';

interface CustomerAppAccessTabProps {
  formData: any;
  setFormData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  editingCustomer: any;
  generateRandomPassword: () => void;
}

export const CustomerAppAccessTab: React.FC<CustomerAppAccessTabProps> = ({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  editingCustomer,
  generateRandomPassword,
}) => {
  return (
    <div className="flex flex-col gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone size={24} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Accès Application Client
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Permet au client de consulter son solde, ses points et son historique en ligne
          </p>
        </div>
        <input 
          type="checkbox" 
          className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
          checked={formData.isAppUser}
          onChange={e => setFormData({ ...formData, isAppUser: e.target.checked })}
        />
      </div>
      
      {formData.isAppUser && (
        <div className="mt-2 pt-4 border-t border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div>
            <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Mot de passe de Connexion
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder={editingCustomer ? "Laisser vide pour conserver le mot de passe..." : "Définir un mot de passe..."}
                className="w-full p-3 pr-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold text-slate-900 dark:text-white"
                value={formData.password || ''}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-bold uppercase transition-colors"
                >
                  Générer
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
            L'adresse email <strong className="font-bold">{formData.email || '(non renseignée)'}</strong> servira d'identifiant de connexion pour le client sur l'application.
          </div>
        </div>
      )}
    </div>
  );
};
