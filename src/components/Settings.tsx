import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  ShoppingCart,
  DollarSign,
  Users,
  Gift,
  Lock,
  Save,
  Printer,
  MessageSquare,
  Download,
  UploadCloud,
  Search,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { createBackupArchive, restoreBackupArchive } from '../services/backupRestoreService';
import { useTranslation } from '../translations';
import { localDb } from '../services/LocalDatabase';
import { useCoreStore } from '../store/useCoreStore';
import { CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { DEFAULT_PERMISSIONS } from '../constants';
import { toast } from 'sonner';
import {
  StoreSection,
  PosSection,
  AccountingSection,
  StaffSection,
  LoyaltySection,
  SecuritySection,
  ReceiptSection,
  WhatsAppSection
} from './SettingsSections';

interface SettingsProps {
  settings: CompanySettings;
}

type SettingsSection =
  | 'store'
  | 'pos'
  | 'receipt'
  | 'accounting'
  | 'staff'
  | 'loyalty'
  | 'whatsapp'
  | 'security';

export function Settings({ settings }: SettingsProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');
  const [isSaving, setIsSaving] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const buildInitialData = (src: CompanySettings): CompanySettings => ({
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
  });

  const [formData, setFormData] = useState<CompanySettings>(() => buildInitialData(settings));

  useEffect(() => {
    setFormData(buildInitialData(settings));
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await localDb.insert('settings/company', formData);
      useCoreStore.getState().setSettings(formData);
      toast.success(t('Paramètres enregistrés et appliqués en temps réel !'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t("Erreur lors de l'enregistrement."));
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems: {
    id: SettingsSection;
    label: string;
    subtitle: string;
    keywords: string;
    icon: any;
    badgeColor: string;
  }[] = [
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
    }
  ];

  // Auto-filter/jump when user types in Quick Search
  const filteredMenuItems = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      m =>
        m.label.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.keywords.toLowerCase().includes(q)
    );
  }, [quickSearch]);

  useEffect(() => {
    if (quickSearch.trim().length >= 2 && filteredMenuItems.length > 0) {
      if (!filteredMenuItems.some(m => m.id === activeSection)) {
        setActiveSection(filteredMenuItems[0].id);
      }
    }
  }, [quickSearch, filteredMenuItems, activeSection]);

  const currentMenuMeta = menuItems.find(m => m.id === activeSection) || menuItems[0];

  const renderSection = () => {
    switch (activeSection) {
      case 'store':
        return <StoreSection formData={formData} setFormData={setFormData} />;
      case 'pos':
        return <PosSection formData={formData} setFormData={setFormData} />;
      case 'receipt':
        return <ReceiptSection formData={formData} setFormData={setFormData} />;
      case 'accounting':
        return <AccountingSection formData={formData} setFormData={setFormData} />;
      case 'staff':
        return <StaffSection formData={formData} setFormData={setFormData} />;
      case 'loyalty':
        return <LoyaltySection formData={formData} setFormData={setFormData} />;
      case 'whatsapp':
        return <WhatsAppSection formData={formData} setFormData={setFormData} />;
      case 'security':
        return <SecuritySection formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12">
      {/* Top Bar Compacte & Professionnelle */}
      <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sliders size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Paramètres Généraux & Configuration POS
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 size={11} /> v1.2.20
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Personnalisez l'identité fiscale de votre magasin, le comportement de la caisse, vos imprimantes et la sécurité Cloud
            </p>
          </div>
        </div>

        {/* Actions Globales : Recherche Rapide + Backup + Enregistrer */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[230px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
              placeholder="Rechercher un réglage (TVA, NIF, Tiroir...)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => createBackupArchive()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            title="Télécharger une sauvegarde complète .nexus-backup"
          >
            <Download size={14} className="text-emerald-500" />
            <span>Backup</span>
          </button>

          <label
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            title="Restaurer une archive .nexus-backup"
          >
            <UploadCloud size={14} className="text-indigo-500" />
            <span>Restaurer</span>
            <input
              type="file"
              accept=".json,.nexus-backup"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (file) {
                  await restoreBackupArchive(file);
                  e.target.value = '';
                }
              }}
            />
          </label>

          <button
            disabled={isSaving}
            onClick={handleSave}
            className={cn(
              "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer",
              isSaving && "opacity-60 cursor-not-allowed"
            )}
          >
            <Save size={15} />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </div>

      {/* Layout Principal : Navigation Latérale Compacte (3 cols) + Contenu de la Section Active (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar des Rubriques */}
        <nav className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-2.5 space-y-1.5 shadow-sm lg:sticky lg:top-4">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer border",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                    : "bg-transparent text-slate-700 dark:text-zinc-300 border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                    isActive ? "bg-white/20 text-white border-white/30" : item.badgeColor
                  )}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-black truncate", isActive ? "text-white" : "text-slate-900 dark:text-white")}>
                    {item.label}
                  </p>
                  <p className={cn("text-[10px] truncate mt-0.5", isActive ? "text-indigo-100" : "text-slate-500 dark:text-zinc-400")}>
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Zone Principale de la Section */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* En-tête de la section sélectionnée */}
          <div className="bg-white dark:bg-zinc-900 px-5 py-4 rounded-2xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", currentMenuMeta.badgeColor)}>
                {React.createElement(currentMenuMeta.icon, { size: 19 })}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                  {currentMenuMeta.label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {currentMenuMeta.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-500/20 transition-all cursor-pointer"
            >
              Sauvegarder
            </button>
          </div>

          {/* Contenu du module */}
          <form onSubmit={handleSave} className="space-y-6">
            {renderSection()}
          </form>
        </div>
      </div>
    </div>
  );
}