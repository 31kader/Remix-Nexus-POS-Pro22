import React from 'react';
import { Smartphone, Eye, EyeOff } from 'lucide-react';
import { Button, Modal } from './ui';

interface CustomersEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: any;
  formData: any;
  setFormData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function CustomersEditModal({
  isOpen,
  onClose,
  editingCustomer,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  handleSubmit
}: CustomersEditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingCustomer ? "Modifier le client" : "Nouveau client"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Nom Complet *</label>
          <input 
            required 
            className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
            <input 
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input 
              type="email" 
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })} 
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Numéro de Carte de Fidélité</label>
          <div className="relative">
            <input 
              className="w-full p-2 pr-24 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono" 
              value={formData.loyaltyCardNumber} 
              onChange={e => setFormData({ ...formData, loyaltyCardNumber: e.target.value })} 
            />
            <button
              type="button"
              onClick={() => {
                let digits = "";
                for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10).toString();
                let sum = 0;
                for (let i = 0; i < 12; i++) {
                  sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
                }
                const checkDigit = (10 - (sum % 10)) % 10;
                setFormData({ ...formData, loyaltyCardNumber: digits + checkDigit });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded"
            >
              Générer
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
          <textarea 
            className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24" 
            value={formData.notes} 
            onChange={e => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>
        <div className="flex flex-col gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Accès Application Client</p>
              <p className="text-xs text-slate-500">Permet au client de voir ses points et l'historique en ligne</p>
            </div>
            <input 
              type="checkbox" 
              className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              checked={formData.isAppUser}
              onChange={e => setFormData({ ...formData, isAppUser: e.target.checked })}
            />
          </div>
          
          {formData.isAppUser && (
            <div className="mt-2 pt-3 border-t border-indigo-100/50">
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Mot de passe pour l'accès App</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder={editingCustomer ? "Laisser vide pour ne pas changer..." : "Définir un mot de passe..."}
                  className="w-full p-2.5 pr-24 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  value={formData.password || ''}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                      let retVal = "";
                      for (let i = 0, n = charset.length; i < 8; ++i) {
                        retVal += charset.charAt(Math.floor(Math.random() * n));
                      }
                      setFormData({ ...formData, password: retVal });
                      setShowPassword(true);
                    }}
                    className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md hover:bg-slate-200 font-bold uppercase transition-colors"
                  >
                    Générer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-indigo-500 font-medium mt-1.5 flex items-start gap-1">
                <span className="text-lg leading-none">&bull;</span>
                L'email ci-dessus servira d'identifiant de connexion.
              </p>
            </div>
          )}
        </div>
        <Button type="submit" className="w-full py-3">
          {editingCustomer ? "Enregistrer les modifications" : "Créer le client"}
        </Button>
      </form>
    </Modal>
  );
}
