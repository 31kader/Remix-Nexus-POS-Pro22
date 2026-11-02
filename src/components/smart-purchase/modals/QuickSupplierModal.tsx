import React from 'react';
import { Modal, Button } from '../../ui';

interface QuickSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickSupplierData: any;
  setQuickSupplierData: (d: any) => void;
  handleQuickSupplierSubmit: (e: React.FormEvent) => void;
}

export const QuickSupplierModal: React.FC<QuickSupplierModalProps> = ({
  isOpen,
  onClose,
  quickSupplierData,
  setQuickSupplierData,
  handleQuickSupplierSubmit
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="NOUVEAU FOURNISSEUR RAPIDE" maxWidth="max-w-xl">
      <form onSubmit={handleQuickSupplierSubmit} className="space-y-4 p-1 text-left">
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm">
            🚚
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Création Express Partenaire</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Le fournisseur sera immédiatement créé dans votre base et sélectionné pour cette réception.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
              Nom de la Société / Fournisseur *
            </label>
            <input
              required
              placeholder="Ex: SARL DISTRI-ALGER / GROSSISTE..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={quickSupplierData.name || ''}
              onChange={e => setQuickSupplierData({ ...quickSupplierData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
              Nom du Contact / Commercial
            </label>
            <input
              placeholder="Ex: Amine / Représentant"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={quickSupplierData.contactName || ''}
              onChange={e => setQuickSupplierData({ ...quickSupplierData, contactName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
              Téléphone / WhatsApp
            </label>
            <input
              placeholder="Ex: 0550 00 00 00"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={quickSupplierData.phone || ''}
              onChange={e => setQuickSupplierData({ ...quickSupplierData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
              Adresse / Wilaya
            </label>
            <input
              placeholder="Ex: Zone Industrielle Rouiba, Alger"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={quickSupplierData.address || ''}
              onChange={e => setQuickSupplierData({ ...quickSupplierData, address: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
              Solde / Dette Initiale (DA)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00 DA"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-amber-600 dark:text-amber-400 outline-none focus:ring-2 focus:ring-indigo-500"
              value={quickSupplierData.balance ?? ''}
              onChange={e => setQuickSupplierData({ ...quickSupplierData, balance: e.target.value })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
              E-mail (Optionnel)
            </label>
            <input
              type="email"
              placeholder="contact@fournisseur.dz"
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={quickSupplierData.email || ''}
              onChange={e => setQuickSupplierData({ ...quickSupplierData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2 pt-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 block">
              🚚 Jours habituels de Livraison (Optionnel - pour le Tableau de Bord des Activités)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => {
                const selectedDays: string[] = Array.isArray(quickSupplierData.deliveryDays) ? quickSupplierData.deliveryDays : [];
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const next = isSelected ? selectedDays.filter(d => d !== day) : [...selectedDays, day];
                      setQuickSupplierData({ ...quickSupplierData, deliveryDays: next });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6">
            ✓ Créer & Sélectionner ce Fournisseur
          </Button>
        </div>
      </form>
    </Modal>
  );
};
