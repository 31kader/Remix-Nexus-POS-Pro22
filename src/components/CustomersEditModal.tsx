import React, { useState } from 'react';
import { Smartphone, User, Briefcase } from 'lucide-react';
import { Button, Modal } from './ui';
import { CustomerGeneralTab } from './customers/modal/CustomerGeneralTab';
import { CustomerCommercialTab } from './customers/modal/CustomerCommercialTab';
import { CustomerAppAccessTab } from './customers/modal/CustomerAppAccessTab';

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
  const [modalTab, setModalTab] = useState<'general' | 'commercial' | 'app'>('general');

  const generateFidelityCard = () => {
    let digits = "";
    for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10).toString();
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setFormData({ ...formData, loyaltyCardNumber: digits + checkDigit });
  };

  const generateRandomPassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0; i < 8; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password: retVal });
    setShowPassword(true);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingCustomer ? "Modifier la Fiche Client" : "Nouveau Client"}
    >
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
        <button
          type="button"
          onClick={() => setModalTab('general')}
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            modalTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <User size={14} /> Identité & Contact
        </button>
        <button
          type="button"
          onClick={() => setModalTab('commercial')}
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            modalTab === 'commercial'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase size={14} /> Conditions & Fidélité
        </button>
        <button
          type="button"
          onClick={() => setModalTab('app')}
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            modalTab === 'app'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Smartphone size={14} /> Accès Mobile
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-slate-900 dark:text-white">
        {modalTab === 'general' && (
          <CustomerGeneralTab
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {modalTab === 'commercial' && (
          <CustomerCommercialTab
            formData={formData}
            setFormData={setFormData}
            generateFidelityCard={generateFidelityCard}
          />
        )}

        {modalTab === 'app' && (
          <CustomerAppAccessTab
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            editingCustomer={editingCustomer}
            generateRandomPassword={generateRandomPassword}
          />
        )}

        <div className="pt-2 flex gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose} 
            className="w-1/3 py-3"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            className="w-2/3 py-3 font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {editingCustomer ? "Enregistrer les modifications" : "Créer le client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
