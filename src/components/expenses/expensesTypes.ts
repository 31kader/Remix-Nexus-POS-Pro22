import { Expense, CompanySettings } from '../../types';

export interface ExpensesProps {
  expenses: Expense[];
  user: any;
  settings: CompanySettings;
}

export const EXPENSE_CATEGORIES = [
  'Fournitures',
  'Transport / Carburant',
  'Repas / Café',
  'Loyer',
  'Électricité',
  'Eau',
  'Salaires',
  'Marketing',
  'Maintenance',
  'Taxes',
  'Retour Client',
  'Autre'
] as const;

// Détecte si une écriture de dépense correspond à un Retour Client / Remboursement
export function isReturnOrRefundExpense(e: Expense): boolean {
  if (!e) return false;
  const cat = (e.category || '').toLowerCase();
  const desc = (e.description || '').toLowerCase();
  return (
    cat.includes('retour') ||
    cat.includes('remboursement') ||
    cat.includes('avoir') ||
    desc.includes('retour') ||
    desc.includes('remboursement') ||
    desc.includes('avoir client') ||
    desc.includes('annulation ticket')
  );
}
