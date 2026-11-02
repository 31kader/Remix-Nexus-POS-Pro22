import React from 'react';
import { CompanySettings } from '../../types';
import {
  AccountingTaxConfig,
  AccountingMarginExecutor,
  useAccountingMarginsLogic
} from './accounting';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function AccountingSection({ formData, setFormData }: SectionProps) {
  const updateField = (key: keyof CompanySettings | string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const marginsLogic = useAccountingMarginsLogic(formData, updateField);

  return (
    <div className="space-y-6">
      {/* Devise, TVA, Affichage Prix HT & Grille des taxes */}
      <AccountingTaxConfig
        formData={formData}
        setFormData={setFormData}
        updateField={updateField}
      />

      {/* Règles de Marges par Défaut + Exécuteur Multi-Filtres */}
      <AccountingMarginExecutor
        formData={formData}
        updateField={updateField}
        marginsLogic={marginsLogic}
      />
    </div>
  );
}
