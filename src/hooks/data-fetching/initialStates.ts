import { CompanySettings } from '../../types';

export const DEFAULT_SETTINGS: CompanySettings = {
  name: 'NEXUS POS PRO',
  footerText: 'Merci de votre visite !',
  receiptTemplate: 'classic',
  labelTemplate: 'standard',
  labelOrientation: 'landscape',
  labelRotation: '0',
  labelWidthCustom: 60,
  labelHeightCustom: 40,
  currency: '€',
  taxRate: 20,
  loyaltyPointsPerCurrencyUnit: 1, 
  loyaltyPointValue: 0.01, 
  accountingFormat: 'csv',
  allowNegativeStock: true,
  closeGridOnSelect: false,
  enableVoiceGuidance: false,
  paperFormat: '80mm',
  silentPrinting: false,
  siteLocations: [],
  roleKPIs: {},
  quickSelectGroups: []
};
