import React, { memo } from 'react';
import { 
  Calendar, Search, Sparkles 
} from 'lucide-react';
import { Supplier } from '../../types';
import { Button, Modal } from '../ui';
import { cn } from '../../lib/utils';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSupplier: Supplier | null;
  formData: {
    name: string;
    phone: string;
    email: string;
    preSaleDays: string[];
    deliveryDays: string[];
    paymentDays: string[];
    planningNotes: string;
    feedUrl: string;
    feedFormat: 'json' | 'csv';
    syncEnabled: boolean;
    isAppUser: boolean;
    hasFullInventoryAccess: boolean;
    password?: string;
    ratingQuality: number;
    ratingDelivery: number;
    ratingPrice: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export const SupplierFormModal = memo(function SupplierFormModal({
  isOpen,
  onClose,
  editingSupplier,
  formData,
  setFormData,
  handleSubmit
}: SupplierFormModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingSupplier ? "Modifier le partenaire" : "Nouveau partenaire"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Nom du Fournisseur *</label>
          <input 
            required 
            className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
            <input 
              className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input 
              type="email" 
              className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })} 
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
          <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-sans">
            <Calendar size={14} /> Agenda & Planning Opérationnel
          </h4>
          
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">📝 Jours de Pré-vente (Prise de commande)</span>
              <div className="flex gap-1.5 flex-wrap">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => {
                  const active = formData.preSaleDays?.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        const current = formData.preSaleDays || [];
                        const updated = current.includes(day)
                          ? current.filter(d => d !== day)
                          : [...current, day];
                        setFormData({ ...formData, preSaleDays: updated });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer",
                        active 
                          ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20" 
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/10"
                      )}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">🚚 Jours de Livraison</span>
              <div className="flex gap-1.5 flex-wrap">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => {
                  const active = formData.deliveryDays?.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        const current = formData.deliveryDays || [];
                        const updated = current.includes(day)
                          ? current.filter(d => d !== day)
                          : [...current, day];
                        setFormData({ ...formData, deliveryDays: updated });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer",
                        active 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/10"
                      )}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">💳 Jours de Paiement / Règlement</span>
              <div className="flex gap-1.5 flex-wrap">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => {
                  const active = formData.paymentDays?.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        const current = formData.paymentDays || [];
                        const updated = current.includes(day)
                          ? current.filter(d => d !== day)
                          : [...current, day];
                        setFormData({ ...formData, paymentDays: updated });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer",
                        active 
                          ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20" 
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/10"
                      )}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Consignes & Notes de Planning</label>
              <textarea 
                className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs dark:text-white min-h-[50px]" 
                placeholder="Ex: Passe à 10h, livrer par l'arrière, chèque à préparer..."
                value={formData.planningNotes} 
                onChange={e => setFormData({...formData, planningNotes: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Intégration Flux (Sync Auto)</h4>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase font-sans">URL du Flux (JSON/CSV)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
                placeholder="https://api.supplier.com/v1/products"
                value={formData.feedUrl} 
                onChange={e => setFormData({...formData, feedUrl: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Format</label>
              <select 
                className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
                value={formData.feedFormat}
                onChange={e => setFormData({...formData, feedFormat: e.target.value as any})}
              >
                <option value="json" className="text-black">JSON API</option>
                <option value="csv" className="text-black">CSV File</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input 
                type="checkbox"
                id="syncEnabled"
                checked={formData.syncEnabled}
                onChange={e => setFormData({...formData, syncEnabled: e.target.checked})}
                className="w-4.5 h-4.5 text-indigo-600 rounded bg-white dark:bg-white/5 cursor-pointer"
              />
              <label htmlFor="syncEnabled" className="text-xs font-bold text-slate-700 dark:text-white/70 cursor-pointer">Activer la sync</label>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Accès Portail Fournisseur</h4>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="isAppUser"
              checked={formData.isAppUser}
              onChange={e => setFormData({...formData, isAppUser: e.target.checked})}
              className="w-4.5 h-4.5 text-indigo-600 rounded bg-white dark:bg-white/5 cursor-pointer"
            />
            <label htmlFor="isAppUser" className="text-xs font-bold text-slate-700 dark:text-white/70 cursor-pointer">Autoriser l'accès au portail</label>
          </div>

          {formData.isAppUser && (
            <>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox"
                  id="hasFullInventoryAccess"
                  checked={formData.hasFullInventoryAccess}
                  onChange={e => setFormData({...formData, hasFullInventoryAccess: e.target.checked})}
                  className="w-4.5 h-4.5 text-indigo-600 rounded bg-white dark:bg-white/5 cursor-pointer"
                />
                <label htmlFor="hasFullInventoryAccess" className="text-xs font-bold text-slate-700 dark:text-white/70 cursor-pointer">Accès Total (Voir tout l'inventaire)</label>
              </div>
              <div className="space-y-1 mt-4">
                <label className="text-xs font-bold text-slate-500 uppercase">Mot de passe {editingSupplier ? "(laisser vide pour ne pas changer)" : "*"}</label>
                <input 
                  type="password"
                  required={!editingSupplier}
                  className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5 font-sans">
            <Sparkles size={14} className="text-amber-500 fill-amber-500" /> Évaluation du Partenaire (Scorecard)
          </h4>
          
          <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-150 dark:border-white/5">
            {[
              { label: 'Qualité des Produits', key: 'ratingQuality' as const },
              { label: 'Respect des Délais', key: 'ratingDelivery' as const },
              { label: 'Rapport Qualité/Prix', key: 'ratingPrice' as const },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider">{label}</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFormData({ ...formData, [key]: star })}
                      className="text-amber-400 hover:scale-110 active:scale-90 transition-all focus:outline-none cursor-pointer"
                    >
                      <span className="text-base select-none">
                        {formData[key] >= star ? "★" : "☆"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full py-3">
          {editingSupplier ? "Enregistrer" : "Créer"}
        </Button>
      </form>
    </Modal>
  );
});
