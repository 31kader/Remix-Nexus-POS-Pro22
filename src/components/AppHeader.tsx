import React from 'react';
import { PinLockModal } from './PinLockModal';
import { IOSInstallModal } from './IOSInstallModal';
import { 
  Menu, Languages, ChevronDown, Palette, AlertTriangle, 
  Calendar, LogOut, LogIn, Monitor, Lock, Sun, Moon, Banknote,
  Cloud, CloudOff, RefreshCw, Smartphone
} from 'lucide-react';
import { cn, formatSafe } from '../lib/utils';
import { fr } from 'date-fns/locale';
import { getTerminalId, getTerminalName } from '../services/terminalService';
import { testCashDrawer } from '../services/hardwareService';
import { onBackgroundSyncStatus, flushSyncQueueImmediate } from '../services/SyncService';

interface AppHeaderProps {
  isMobile: boolean;
  setIsMobileOverlayOpen: (open: boolean) => void;
  activeTab: string;
  lowStockProducts?: any[];
  expiringProducts?: any[];
  setIsLowStockModalOpen: (open: boolean) => void;
  setIsExpirationModalOpen: (open: boolean) => void;
  currentEmployee: any;
  isClockedIn: boolean;
  handleClockInOut: () => Promise<void>;
  language: string;
  setLanguage: (lang: string) => void;
  isLangMenuOpen: boolean;
  setIsLangMenuOpen: (open: boolean) => void;
  theme: string;
  setTheme: (theme: any) => void;
  isThemeMenuOpen: boolean;
  setIsThemeMenuOpen: (open: boolean) => void;
  activeStaffId: string | null;
  employees: any[];
  profile: any;
  user: any;
  t: (key: string) => string;
  toast: any;
  deferredPrompt?: any;
  handleInstallApp?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isMobile,
  setIsMobileOverlayOpen,
  activeTab,
  lowStockProducts = [],
  expiringProducts = [],
  setIsLowStockModalOpen,
  setIsExpirationModalOpen,
  currentEmployee,
  isClockedIn,
  handleClockInOut,
  language,
  setLanguage,
  isLangMenuOpen,
  setIsLangMenuOpen,
  theme,
  setTheme,
  isThemeMenuOpen,
  setIsThemeMenuOpen,
  activeStaffId,
  employees,
  profile,
  user,
  t,
  toast,
  deferredPrompt,
  handleInstallApp
}) => {
  const [isPinLockOpen, setIsPinLockOpen] = React.useState(false);
  const [isIOSInstallModalOpen, setIsIOSInstallModalOpen] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{ isSyncing: boolean; pendingCount: number }>({ isSyncing: false, pendingCount: 0 });
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const unsub = onBackgroundSyncStatus(status => setSyncStatus(status));
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getTabTitle = (tab: string) => {
    const labels: Record<string, string> = {
      checkout: isMobile ? 'Caisse POS' : 'Terminal de Vente',
      inventory: isMobile ? 'Stock' : 'Inventaire & Catalogue',
      customers: isMobile ? 'Clients' : 'Fichier Clients',
      suppliers: 'Fournisseurs',
      smart_purchase: isMobile ? 'Achats' : 'Approvisionnement & Achats',
      transactions: isMobile ? 'Ventes' : 'Historique des Ventes',
      reports: isMobile ? 'Rapports' : 'Rapports & Statistiques',
      expenses: isMobile ? 'Dépenses' : 'Dépenses & Charges',
      employees: isMobile ? 'Personnel' : 'Personnel & Pointage',
      settings: isMobile ? 'Paramètres' : 'Paramètres Système',
      catalog_printer: isMobile ? 'Catalogue A4' : 'Impression Catalogue A4',
      label_printer: isMobile ? 'Étiquettes' : 'Étiquettes & Codes-Barres',
      cash_register: isMobile ? 'Caisse & Z' : 'Gestion de Caisse',
    };
    return labels[tab] || tab.toUpperCase();
  };

  return (
    <header className="min-h-12 sm:h-14 pt-[env(safe-area-inset-top)] border-b px-2.5 sm:px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 sticky top-0 z-[60]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isMobile && (
          <button 
            type="button"
            onClick={() => setIsMobileOverlayOpen(true)}
            className="p-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 shrink-0 cursor-pointer"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
        )}
        <h2 className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-none">
          {getTabTitle(activeTab)}
        </h2>

        {lowStockProducts.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsLowStockModalOpen(true)}
            className="relative p-1.5 sm:p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
            title="Alertes de stock bas"
          >
            <div className="relative">
              <AlertTriangle size={20} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                {lowStockProducts.length > 99 ? '99+' : lowStockProducts.length}
              </span>
            </div>
          </button>
        )}

        {expiringProducts.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsExpirationModalOpen(true)}
            className="relative p-1.5 sm:p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
            title="Alertes de péremption (DLC)"
          >
            <Calendar size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
              {expiringProducts.length > 99 ? '99+' : expiringProducts.length}
            </span>
          </button>
        )}

        {currentEmployee && (
          <button 
            type="button"
            onClick={handleClockInOut}
            className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer",
              isClockedIn 
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            )}
          >
            {isClockedIn ? <LogOut size={16} /> : <LogIn size={16} />}
            <span className="hidden md:inline">{isClockedIn ? 'Fin de service' : 'Début de service'}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Bouton Installation iPhone / Android */}
        <button
          type="button"
          onClick={() => setIsIOSInstallModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
          title="Installer Nexus POS Pro sur iPhone (iOS) ou Smartphone Android"
        >
          <Smartphone size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="hidden sm:inline">iPhone / Mobile</span>
        </button>

        {/* Badge État de Synchronisation Temps Réel */}
        <button
          type="button"
          onClick={() => {
            if (syncStatus.pendingCount > 0) {
              flushSyncQueueImmediate();
              toast.info("Envoi immédiat des modifications locales vers le Cloud...");
            } else {
              toast.success("Toutes les données sont parfaitement synchronisées avec le Cloud !");
            }
          }}
          className={cn(
            "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border shadow-xs",
            !isOnline
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
              : (syncStatus.isSyncing || syncStatus.pendingCount > 0)
                ? "bg-blue-500/15 border-blue-500/40 text-blue-500 hover:bg-blue-500/25 animate-pulse"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          )}
          title={
            !isOnline 
              ? "Mode Hors-Ligne (IndexedDB actif)" 
              : syncStatus.pendingCount > 0 
                ? `${syncStatus.pendingCount} modification(s) en cours d'envoi` 
                : "Synchronisation Cloud active et à jour"
          }
        >
          {!isOnline ? (
            <>
              <CloudOff size={14} className="text-amber-500" />
              <span className="hidden md:inline">Hors-Ligne</span>
            </>
          ) : (syncStatus.isSyncing || syncStatus.pendingCount > 0) ? (
            <>
              <RefreshCw size={14} className="animate-spin text-blue-500" />
              <span>{syncStatus.pendingCount}</span>
            </>
          ) : (
            <>
              <Cloud size={14} className="text-emerald-500" />
              <span className="hidden md:inline">Synchro</span>
            </>
          )}
        </button>

        {/* Badge Terminal / Poste Multi-Caisses (PC uniquement) */}
        <div 
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider cursor-default"
          title={`Poste de caisse actif : ${getTerminalName()} (${getTerminalId()})`}
        >
          <Monitor size={14} className="text-indigo-400" />
          <span>{getTerminalId()}</span>
        </div>

        {/* Bouton Rapide Tiroir-Caisse (PC uniquement) */}
        {activeTab === 'checkout' && (
          <button 
            type="button"
            onClick={async () => {
              const res = await testCashDrawer();
              toast.success(res.message || 'Impulsion tiroir transmise');
            }}
            className="hidden md:flex p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-xs items-center gap-2 cursor-pointer"
            title="Ouvrir manuellement le tiroir-caisse"
          >
            <Banknote size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Tiroir</span>
          </button>
        )}

        {/* Bouton Afficheur Client 2ème Écran (PC uniquement) */}
        <button 
          type="button"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}#customer-display`;
            window.open(url, 'NexusCustomerDisplay', 'width=1024,height=768,menubar=no,toolbar=no,location=no');
            toast.success("Écran Afficheur Client ouvert !");
          }}
          className="hidden md:flex p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-500 hover:border-indigo-500/30 transition-all shadow-xs items-center gap-2 cursor-pointer"
          title="Ouvrir l'afficheur client sur un 2ème écran"
        >
          <Monitor size={16} className="text-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Écran Client</span>
        </button>

        {/* Bouton Verrouillage Rapide PIN */}
        <button 
          type="button"
          onClick={() => setIsPinLockOpen(true)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          title="Verrouiller rapidement la caisse (Code PIN)"
        >
          <Lock size={16} className="text-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Verrouiller</span>
        </button>

        {/* Sélecteur de Langue */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            title="Changer de langue"
          >
            <Languages size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase hidden sm:inline">
              {language.toUpperCase()}
            </span>
          </button>

          {isLangMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsLangMenuOpen(false)}
              />
              <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 shadow-lg z-50">
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 dark:text-zinc-400 px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1.5">CHOIX DE LA LANGUE</p>
                
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('fr');
                    setIsLangMenuOpen(false);
                    toast.success("Langue : Français");
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-xl flex items-center gap-3 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 relative cursor-pointer",
                    language === 'fr' && "bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  )}
                >
                  <div className="text-sm shrink-0">🇫🇷</div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">Français</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage('ar');
                    setIsLangMenuOpen(false);
                    toast.success("اللغة الحالية: العربية");
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-xl flex items-center gap-3 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 relative cursor-pointer",
                    language === 'ar' && "bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  )}
                >
                  <div className="text-sm shrink-0">🇩🇿</div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase font-sans-arabic">العربية</p>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quick Light/Dark Mode Switch */}
        <button
          type="button"
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : 'light';
            setTheme(nextTheme);
          }}
          className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-amber-500 dark:text-indigo-400 transition-all shadow-xs flex items-center justify-center cursor-pointer"
          title={theme === 'light' ? 'Passer en Mode Sombre (Onyx)' : 'Passer en Mode Clair (Albâtre)'}
        >
          {theme === 'light' ? <Moon size={16} className="text-indigo-600" /> : <Sun size={16} className="text-amber-400" />}
        </button>

        {/* Sélecteur Multi-Thèmes (PC/Tablette uniquement) */}
        <div className="relative hidden md:block">
          <button 
            type="button"
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Changer le style visuel de l'application"
          >
            <Palette size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">
              {theme === 'dark' ? 'Onyx' : theme === 'light' ? 'Clair' : theme === 'emerald' ? 'Émeraude' : theme === 'gold' ? 'Or Luxe' : 'Nardo'}
            </span>
            <ChevronDown size={13} className={cn("transition-transform", isThemeMenuOpen && "rotate-180")} />
          </button>

          {isThemeMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsThemeMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 shadow-lg z-50">
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 dark:text-zinc-400 px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1.5">MOTEUR DE THÈMES NEXUS</p>
                
                {[
                  { id: 'dark', name: 'Onyx Carbon', desc: 'Sensation haut de gamme carbone & indigo', color: 'bg-slate-900' },
                  { id: 'light', name: 'Mode Clair', desc: 'Clarté lumineuse, blanc pur et contrastes nets', color: 'bg-white' },
                  { id: 'emerald', name: 'Cyber Émeraude', desc: 'Vert néon sci-fi d\'inspiration Matrix', color: 'bg-emerald-950' },
                  { id: 'gold', name: 'Obsidienne Or Luxe', desc: 'Noir d\'ancre poli et dorures chaleureuses', color: 'bg-amber-950' },
                  { id: 'nardo', name: 'Nardo Motorsport', desc: 'Gris piste et orange course pure', color: 'bg-[#1b1c21]' }
                ].map((tItem) => (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => {
                      setTheme(tItem.id as any);
                      setIsThemeMenuOpen(false);
                      toast.success(`Atmosphère visuelle : ${tItem.name}`);
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded-xl flex items-center gap-3 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer",
                      theme === tItem.id && "bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                    )}
                  >
                    <div className={cn("w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/20 flex items-center justify-center shrink-0", tItem.color)}>
                      {theme === tItem.id && <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-white rounded-full" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        {tItem.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{tItem.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <PinLockModal 
        isOpen={isPinLockOpen} 
        onUnlock={() => setIsPinLockOpen(false)} 
        currentEmployeeName={currentEmployee?.name || profile?.displayName || 'Caissier'} 
      />
      <IOSInstallModal
        isOpen={isIOSInstallModalOpen}
        onClose={() => setIsIOSInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onAndroidInstall={handleInstallApp}
      />
    </header>
  );
};
