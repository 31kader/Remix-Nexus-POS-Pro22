import {
  Store,
  ShoppingCart,
  DollarSign,
  Users,
  Gift,
  Lock,
  Printer,
  MessageSquare,
  Network
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { DEFAULT_PERMISSIONS } from '../../constants';

export type SettingsSection =
  | 'store'
  | 'pos'
  | 'receipt'
  | 'accounting'
  | 'staff'
  | 'loyalty'
  | 'whatsapp'
  | 'security'
  | 'lan';

export interface SettingsMenuItem {
  id: SettingsSection;
  label: string;
  subtitle: string;
  keywords: string;
  icon: any;
  badgeColor: string;
}

export const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  {
    id: 'store',
    label: 'Magasin & Identité Légale',
    subtitle: 'Nom, Logo, NIF/RC/AI, Multi-sites',
    keywords: 'magasin nom logo adresse téléphone whatsapp email nif nis rc ai registre horaire site',
    icon: Store,
    badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'
  },
  {
    id: 'pos',
    label: 'Caisse (POS) & Règles Stock',
    subtitle: 'Mode rapide, Remise max, Arrondi, Sons',
    keywords: 'caisse pos stock remise arrondi son bip grossiste panier session alerte',
    icon: ShoppingCart,
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'receipt',
    label: 'Tickets, Imprimantes & Tiroir',
    subtitle: 'Format 80mm/58mm/A4, Tiroir-caisse, QR',
    keywords: 'ticket impression imprimante 80mm 58mm a4 tiroir caisse qr code pied terminal',
    icon: Printer,
    badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'
  },
  {
    id: 'accounting',
    label: 'Tarifs, Marges & Fiscalité',
    subtitle: 'Devise DA, TVA 19%, Marges Détail/Gros',
    keywords: 'devise da dzd tva taxe marge détail gros en ligne ht ttc comptabilité',
    icon: DollarSign,
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'staff',
    label: 'Personnel & Droits par Rôle',
    subtitle: 'Permissions Admin, Manager, Caissier',
    keywords: 'personnel employé rôle permission accès caissier manager admin droit',
    icon: Users,
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    id: 'loyalty',
    label: 'Fidélité Clients & Paliers VIP',
    subtitle: 'Points par DA, Valeur de rachat, Tiers',
    keywords: 'fidélité client point palier vip bronze argent or cadeau remise',
    icon: Gift,
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
  },
  {
    id: 'whatsapp',
    label: 'Modèles Messages WhatsApp',
    subtitle: 'Notifications commandes, relances, reçus',
    keywords: 'whatsapp sms message modèle client commande relance',
    icon: MessageSquare,
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20'
  },
  {
    id: 'security',
    label: 'Sécurité, Cloud & Sauvegardes',
    subtitle: 'Mode silencieux, Bcrypt, Backup .json',
    keywords: 'sécurité sauvegarde backup restauration notification synchro studio caméra bcrypt audit',
    icon: Lock,
    badgeColor: 'text-slate-700 dark:text-slate-300 bg-slate-500/10 border-slate-500/20'
  },
  {
    id: 'lan',
    label: 'Réseau Local (LAN) Multi-Caisses',
    subtitle: 'Caisse Maître / Secondaires, Synchro sans Internet',
    keywords: 'lan reseau local ethernet wifi maitre master secondaire hub multi-caisses hors ligne ip cable',
    icon: Network,
    badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
  }
];

export function buildInitialSettings(src: CompanySettings): CompanySettings {
  return {
    ...src,
    name: src.name || '',
    logoUrl: src.logoUrl || '',
    address: src.address || '',
    phone: src.phone || '',
    email: src.email || '',
    taxNumber: src.taxNumber || '',
    receiptTemplate: src.receiptTemplate || 'standard',
    labelTemplate: src.labelTemplate || 'standard',
    currency: src.currency || 'DA',
    taxRate: src.taxRate ?? 19,
    loyaltyPointsPerCurrencyUnit: src.loyaltyPointsPerCurrencyUnit ?? 1,
    loyaltyPointValue: src.loyaltyPointValue ?? 0.01,
    footerText: src.footerText || '',
    accountingFormat: src.accountingFormat || 'csv',
    lockingPeriodDays: src.lockingPeriodDays ?? 0,
    paperFormat: src.paperFormat || '80mm',
    silentPrinting: src.silentPrinting ?? false,
    globalStockAlertThreshold: src.globalStockAlertThreshold || 10,
    apiKeys: src.apiKeys || { twilioSid: '', twilioToken: '', twilioNumber: '', googleMapsKey: '' },
    availableTaxes: src.availableTaxes || [],
    displayPriceHT: src.displayPriceHT ?? false,
    loyaltyTiers: src.loyaltyTiers || [],
    enableTimeClock: src.enableTimeClock ?? false,
    sessionTimeoutMinutes: src.sessionTimeoutMinutes ?? 30,
    auditLogRetentionDays: src.auditLogRetentionDays ?? 90,
    fastModeEnabled: src.fastModeEnabled ?? false,
    allowNegativeStock: src.allowNegativeStock ?? true,
    rolePermissions: src.rolePermissions || DEFAULT_PERMISSIONS
  };
}
