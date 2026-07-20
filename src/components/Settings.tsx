import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Gift, 
  Lock, 
  Save, 
  ChevronRight,
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../translations';
import { localDb } from '../services/LocalDatabase';
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
  SecuritySection 
} from './SettingsSections';

interface SettingsProps {
  settings: CompanySettings;
}

type SettingsSection = 'store' | 'pos' | 'accounting' | 'staff' | 'loyalty' | 'security';



export function Settings({ settings }: SettingsProps) {
const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
    name: settings.name || '',
    logoUrl: settings.logoUrl || '',
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
    taxNumber: settings.taxNumber || '',
    receiptTemplate: settings.receiptTemplate || 'standard',
    labelTemplate: settings.labelTemplate || 'standard',
    currency: settings.currency || 'DA',
    taxRate: settings.taxRate ?? 19,
    loyaltyPointsPerCurrencyUnit: settings.loyaltyPointsPerCurrencyUnit ?? 1,
    loyaltyPointValue: settings.loyaltyPointValue ?? 0.01,
    footerText: settings.footerText || '',
    accountingFormat: settings.accountingFormat || 'csv',
    lockingPeriodDays: settings.lockingPeriodDays ?? 0,
    paperFormat: settings.paperFormat || '80mm',
    silentPrinting: settings.silentPrinting ?? false,
    globalStockAlertThreshold: settings.globalStockAlertThreshold || 10,
    apiKeys: settings.apiKeys || { twilioSid: '', twilioToken: '', twilioNumber: '', googleMapsKey: '' },
    availableTaxes: settings.availableTaxes || [],
    displayPriceHT: settings.displayPriceHT ?? false,
    loyaltyTiers: settings.loyaltyTiers || [],
    enableTimeClock: settings.enableTimeClock ?? false,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 30,
    auditLogRetentionDays: settings.auditLogRetentionDays ?? 90,
    fastModeEnabled: settings.fastModeEnabled ?? false,
    allowNegativeStock: settings.allowNegativeStock ?? true,
    rolePermissions: settings.rolePermissions || DEFAULT_PERMISSIONS
  });

  useEffect(() => {
    setFormData({
      ...settings,
      name: settings.name || '',
      logoUrl: settings.logoUrl || '',
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || '',
      taxNumber: settings.taxNumber || '',
      receiptTemplate: settings.receiptTemplate || 'standard',
      labelTemplate: settings.labelTemplate || 'standard',
      currency: settings.currency || 'DA',
      taxRate: settings.taxRate ?? 19,
      loyaltyPointsPerCurrencyUnit: settings.loyaltyPointsPerCurrencyUnit ?? 1,
      loyaltyPointValue: settings.loyaltyPointValue ?? 0.01,
      footerText: settings.footerText || '',
      accountingFormat: settings.accountingFormat || 'csv',
      lockingPeriodDays: settings.lockingPeriodDays ?? 0,
      paperFormat: settings.paperFormat || '80mm',
      silentPrinting: settings.silentPrinting ?? false,
      globalStockAlertThreshold: settings.globalStockAlertThreshold || 10,
      apiKeys: settings.apiKeys || { twilioSid: '', twilioToken: '', twilioNumber: '', googleMapsKey: '' },
      availableTaxes: settings.availableTaxes || [],
      displayPriceHT: settings.displayPriceHT ?? false,
      loyaltyTiers: settings.loyaltyTiers || [],
      enableTimeClock: settings.enableTimeClock ?? false,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 30,
      auditLogRetentionDays: settings.auditLogRetentionDays ?? 90,
      fastModeEnabled: settings.fastModeEnabled ?? false,
      allowNegativeStock: settings.allowNegativeStock ?? true,
      rolePermissions: settings.rolePermissions || DEFAULT_PERMISSIONS
    });
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      // Save to settings/company in RTDB which triggers the Supabase sync
      await localDb.insert('settings/company', formData);
      toast.success(t("Paramètres enregistrés avec succès."));
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t("Erreur lors de l'enregistrement."));
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems: { id: SettingsSection; label: string; icon: any; color: string }[] = [
    { id: 'store', label: 'Magasin & Infos', icon: Store, color: 'text-blue-500' },
    { id: 'pos', label: 'Caisse & POS', icon: ShoppingCart, color: 'text-amber-500' },
    { id: 'accounting', label: 'Tarifs, Taxes & Devises', icon: DollarSign, color: 'text-emerald-500' },
    { id: 'staff', label: 'Personnel & Droits', icon: Users, color: 'text-indigo-500' },
    { id: 'loyalty', label: 'Fidélité & Promos', icon: Gift, color: 'text-rose-500' },
    { id: 'security', label: 'Sécurité & API', icon: Lock, color: 'text-slate-500' },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'store':
        return <StoreSection formData={formData} setFormData={setFormData} />;
      case 'pos':
        return <PosSection formData={formData} setFormData={setFormData} />;
      case 'accounting':
        return <AccountingSection formData={formData} setFormData={setFormData} />;
      case 'staff':
        return <StaffSection formData={formData} setFormData={setFormData} />;
      case 'loyalty':
        return <LoyaltySection formData={formData} setFormData={setFormData} />;
      case 'security':
        return <SecuritySection formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 font-sans overflow-x-hidden bg-[#05070a]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-10 gap-8 animate-in fade-in slide-in-from-top-6 duration-700">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">System Admin v1.2.6</span>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none italic">NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">CONFIG</span></h1>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-1">Terminal de Contrôle Centralisé</p>
          </div>
          
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className={cn(
              "group relative overflow-hidden flex items-center justify-center gap-4 px-10 py-6 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-[1.75rem] transition-all hover:shadow-neon-indigo active:scale-95 shadow-2xl border border-indigo-400 ring-1 ring-white/20 italic",
              isSaving && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.div 
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full"
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              ) : (
                <Save size={20} className="relative z-10 group-hover:scale-110 transition-transform" />
              )}
            </AnimatePresence>
            <span className="relative z-10">
              {isSaving ? 'SYNCHRONISATION...' : t('DÉPLOYER MODIFICATIONS')}
            </span>
          </button>
        </header>

        <main className="flex flex-col lg:flex-row gap-12 items-start relative">
          {/* Sidebar Menu */}
          <nav className="w-full lg:w-80 flex flex-col gap-3 shrink-0 animate-in fade-in slide-in-from-left-6 duration-1000">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "relative group flex items-center gap-5 h-20 px-8 rounded-[2rem] transition-all overflow-hidden border ring-1 ring-white/5 shadow-2xl",
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo scale-[1.02]"
                      : "bg-white/5 text-slate-500 border-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-inner border",
                    isActive ? "bg-white/20 border-white/30" : "bg-black/40 border-white/5"
                  )}>
                    <Icon size={24} className={cn("transition-colors", isActive ? "text-white" : "text-slate-600 group-hover:text-indigo-400")} />
                  </div>
                  
                  <div className="flex flex-col items-start">
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-[0.2em] transition-colors italic",
                      isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                    )}>
                      {item.label}
                    </span>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-[0.3em] mt-1",
                      isActive ? "text-white/40" : "text-slate-700"
                    )}>
                      MODULE_{item.id.toUpperCase()}
                    </span>
                  </div>

                  <ChevronRight 
                    size={20}
                    className={cn(
                      "ml-auto transition-all duration-500",
                      isActive ? "text-white opacity-100 translate-x-0" : "text-slate-800 opacity-0 -translate-x-4"
                    )} 
                  />
                </button>
              );
            })}
            
            <div className="mt-8 p-8 bg-black/40 border border-white/5 rounded-[3rem] relative overflow-hidden group ring-1 ring-white/5 shadow-2xl backdrop-blur-3xl">
               <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none group-hover:rotate-12 group-hover:scale-125 transition-all duration-1000">
                  <Shield size={160} className="text-indigo-500" />
               </div>
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-neon-cyan" />
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">NEXUS SECURE</p>
               </div>
               <p className="text-[9px] font-black text-slate-500 uppercase leading-relaxed tracking-widest">Le moteur de règles RLS et les audits IA protègent l'intégrité de vos données en temps réel.</p>
               <div className="flex gap-2 mt-6">
                  <div className="h-1 flex-1 bg-indigo-500 rounded-full shadow-neon-indigo" />
                  <div className="h-1 w-4 bg-white/10 rounded-full" />
                  <div className="h-1 w-4 bg-white/10 rounded-full" />
               </div>
            </div>
          </nav>

          {/* Content Pane */}
          <section className="flex-1 w-full glass-card rounded-[4rem] p-10 md:p-16 min-h-[700px] animate-in fade-in slide-in-from-right-8 duration-1000 relative">
            <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
            <div className="max-w-4xl space-y-16 relative z-10">
               {/* Section Title Header */}
               {menuItems.map(item => item.id === activeSection && (
                  <div key={item.id} className="space-y-4 border-l-4 border-indigo-600 pl-8">
                    <div className="flex items-center gap-5">
                      <item.icon className="text-indigo-500 shadow-neon-indigo" size={32} />
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">{item.label}</h2>
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">INSTANCE_ID: <span className="text-indigo-400/60 font-mono tracking-normal not-italic">{item.id}_cluster_v4</span></p>
                  </div>
               ))}

               {/* Section Form Component */}
               <div className="card-reveal">
                 {renderSection()}
               </div>
            </div>
          </section>
        </main>

        <footer className="pt-12 text-center border-t border-white/5">
           <div className="flex flex-col items-center gap-3 opacity-20 hover:opacity-100 transition-opacity duration-700">
              <div className="flex items-center gap-4">
                <div className="w-8 h-[1px] bg-white/40" />
                <SettingsIcon size={20} className="text-white hover:rotate-180 transition-transform duration-1000" />
                <div className="w-8 h-[1px] bg-white/40" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] select-none">SYSTEM ADMINISTRATOR CONSOLE</p>
              <div className="flex gap-6 mt-2">
                 <span className="text-[8px] font-bold text-slate-600 uppercase">Latency: 24ms</span>
                 <span className="text-[8px] font-bold text-slate-600 uppercase">Region: Europe-West1</span>
                 <span className="text-[8px] font-bold text-slate-600 uppercase">Status: OK</span>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
}