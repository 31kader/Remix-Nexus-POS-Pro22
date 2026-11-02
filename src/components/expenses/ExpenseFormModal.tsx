import React from 'react';
import { Modal, Button } from '../ui';
import { Expense, CompanySettings } from '../../types';
import { EXPENSE_CATEGORIES } from './expensesTypes';

export interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense: Expense | null;
  formData: {
    description: string;
    amount: string;
    category: string;
    date: string;
    paymentMethod: 'cash' | 'card' | 'transfer';
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    description: string;
    amount: string;
    category: string;
    date: string;
    paymentMethod: 'cash' | 'card' | 'transfer';
  }>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  settings: CompanySettings;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  editingExpense,
  formData,
  setFormData,
  handleSubmit,
  settings
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpense ? "Modifier la Dépense" : "Nouvelle Dépense Quotidienne"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Description / Motif *</label>
          <input
            type="text"
            required
            placeholder="Ex: Achat sacs emballage, Facture Sonelgaz, Transport..."
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Montant ({settings.currency || 'DA'}) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-base font-black text-rose-600 dark:text-rose-400"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Catégorie *</label>
            <select
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Date *</label>
            <input
              type="date"
              required
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Mode de Paiement *</label>
            <select
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
            >
              <option value="cash">Espèces (Caisse)</option>
              <option value="card">Carte Bancaire</option>
              <option value="transfer">Virement</option>
            </select>
          </div>
        </div>
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
            {editingExpense ? "Mettre à jour" : "Enregistrer la dépense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
