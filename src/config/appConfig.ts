import { CompanySettings } from '../types';

export const APP_METADATA = {
  name: 'Nexus POS Pro',
  version: '1.2.6',
  description: 'Système de point de vente intelligent et de gestion de stock omnicanale',
  developer: 'Nexus System Co.',
  contactEmail: 'hrskader305@gmail.com',
  supportedLanguages: ['fr', 'en'],
  defaultLanguage: 'fr',
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 'default-settings',
  name: 'NEXUS STORE',
  address: '123 Boulevard du Commerce, Paris, France',
  phone: '+33 1 23 45 67 89',
  email: 'contact@nexuspos.pro',
  currency: 'EUR',
  taxRate: 20, // 20% standard rate in France
  footerText: 'Merci pour votre fidélité ! À bientôt chez NEXUS.',
  receiptTemplate: 'standard',
  labelTemplate: 'standard',
  loyaltyPointsPerCurrencyUnit: 1,
  loyaltyPointValue: 0.01, // 1 point = 0.01 EUR
};

export const INTERFACE_CONFIGS = {
  defaultCurrencySymbol: '€',
  maxItemsPerReceiptPage: 5,
  barcodeSearchTimerDelayMs: 300,
  notificationSoundVolume: 0.3,
  themeColorHex: '#4f46e5',
  backgroundColorHex: '#020617',
};
