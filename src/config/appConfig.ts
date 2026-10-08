import { CompanySettings } from '../types';

export const APP_CONFIG = {
  name: 'Nexus POS Pro',
  version: '1.2.28',
  description: 'Système de point de vente intelligent et de gestion de stock omnicanale',
  developer: 'Nexus System Co.',
  contactEmail: 'contact@nexuspos.pro',
  supportedLanguages: ['fr', 'ar', 'en'],
  defaultLanguage: 'fr',
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 'default-settings',
  name: 'NEXUS STORE',
  address: 'Boulevard de la Soummam, Alger, Algérie',
  phone: '+213 550 00 00 00',
  email: 'contact@nexuspos.pro',
  currency: 'DA',
  taxRate: 19, // 19% TVA standard en Algérie
  footerText: 'Merci pour votre fidélité ! À bientôt chez NEXUS.',
  receiptTemplate: 'standard',
  labelTemplate: 'standard',
  loyaltyPointsPerCurrencyUnit: 1,
  loyaltyPointValue: 1, // 1 point = 1 DA
};

export const INTERFACE_CONFIGS = {
  defaultCurrencySymbol: 'DA',
  maxItemsPerReceiptPage: 5,
  barcodeSearchTimerDelayMs: 300,
  notificationSoundVolume: 0.3,
  themeColorHex: '#4f46e5',
  backgroundColorHex: '#020617',
};
