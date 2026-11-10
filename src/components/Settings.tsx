import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../translations';
import { localDb } from '../services/LocalDatabase';
import { useCoreStore } from '../store/useCoreStore';
import { CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  StoreSection,
  PosSection,
  ShortcutsSection,
  AccountingSection,
  StaffSection,
  LoyaltySection,
  SecuritySection,
  ReceiptSection,
  WhatsAppSection,
  LanSyncSection
} from './SettingsSections';
import {
  SettingsSection,
  SETTINGS_MENU_ITEMS,
  buildInitialSettings
} from './settings/settingsMenuItems';
import { SettingsTopBar } from './settings/SettingsTopBar';

interface SettingsProps {
  settings: CompanySettings;
}

export function Settings({ settings }: SettingsProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');
  const [isSaving, setIsSaving] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const [formData, setFormData] = useState<CompanySettings>(() => buildInitialSettings(settings));

  useEffect(() => {
    setFormData(buildInitialSettings(settings));
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

  // Auto-filter/jump when user types in Quick Search
  const filteredMenuItems = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return SETTINGS_MENU_ITEMS;
    return SETTINGS_MENU_ITEMS.filter(
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

  const currentMenuMeta = SETTINGS_MENU_ITEMS.find(m => m.id === activeSection) || SETTINGS_MENU_ITEMS[0];

  const renderSection = () => {
    switch (activeSection) {
      case 'store':
        return <StoreSection formData={formData} setFormData={setFormData} />;
      case 'pos':
        return <PosSection formData={formData} setFormData={setFormData} />;
      case 'shortcuts':
        return <ShortcutsSection formData={formData} setFormData={setFormData} />;
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
      case 'lan':
        return <LanSyncSection />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12">
      {/* Top Bar Compacte & Professionnelle */}
      <SettingsTopBar
        quickSearch={quickSearch}
        setQuickSearch={setQuickSearch}
        isSaving={isSaving}
        onSave={handleSave}
      />

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
