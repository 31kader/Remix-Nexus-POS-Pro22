export * from './types/products';
export * from './types/customers';
export * from './types/sales';
export * from './types/suppliers';
export * from './types/employees';
export * from './types/settings';
export * from './types/database.types';

export interface ConfirmAction {
  title: string;
  message: string;
  onConfirm: () => void;
}
