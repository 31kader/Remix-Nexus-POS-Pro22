import React from 'react';
import { 
  Menu, Languages, ChevronDown, Palette, AlertTriangle, 
  Calendar, LogOut, LogIn 
} from 'lucide-react';
import { cn, formatSafe } from '../lib/utils';
import { fr } from 'date-fns/locale';

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
  toast
}) => {
  return (
    <header className="h-20 border-b px-6 sm:px-10 flex items-center justify-between flex-shrink-0 bg-workspace/60 backdrop-blur-2xl border-white/5 sticky top-0 z-30">
      <div className="flex items-center gap-6">
        {isMobile && (
          <button 
            onClick={() => setIsMobileOverlayOpen(true)}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.3em] mb-0.5">Navigation Active</p>
          <h2 className="text-xl font-black uppercase tracking-tight text-white italic">
            {activeTab === 'checkout' ? (isMobile ? 'POS' : 'Terminal de Vente') : activeTab === 'dashboard' ? 'Analytics Pro' : activeTab.toUpperCase()}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {lowStockProducts.length > 0 && (
          <button 
            onClick={() => setIsLowStockModalOpen(true)}
            className="relative p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Alertes de stock bas"
          >
            <div className="relative">
              <AlertTriangle size={24} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-industrial-900">
                {lowStockProducts.length}
              </span>
            </div>
          </button>
        )}

        {expiringProducts.length > 0 && (
          <button 
            onClick={() => setIsExpirationModalOpen(true)}
            className="relative p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all animate-pulse"
            title="Alertes de péremption (DLC)"
          >
            <Calendar size={24} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-industrial-900">
              {expiringProducts.length}
            </span>
          </button>
        )}

        {currentEmployee && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClockInOut}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm",
                isClockedIn 
                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              )}
            >
              {isClockedIn ? <LogOut size={18} /> : <LogIn size={18} />}
              <span className="hidden sm:inline">{isClockedIn ? 'Fin de service' : 'Début de service'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Language Selector Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="p-2.5 rounded-xl bg-industrial-800 border border-industrial-700 text-industrial-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-sm flex items-center gap-2 group cursor-pointer"
            title="Changer de langue / تغيير اللغة"
          >
            <Languages size={18} className="group-hover:scale-110 transition-transform text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">
              {language === 'fr' ? 'FR' : 'العربية'}
            </span>
            <ChevronDown size={14} className={cn("transition-transform", isLangMenuOpen && "rotate-180")} />
          </button>

          {isLangMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsLangMenuOpen(false)}
              />
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-48 rounded-2xl bg-industrial-900 border border-industrial-800 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[9px] font-black tracking-widest uppercase text-white/40 px-3 py-1.5 border-b border-white/5 mb-1.5">MOTEUR MULTILINGUE</p>
                
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('fr');
                    setIsLangMenuOpen(false);
                    toast.success("Langue : Français");
                  }}
                  className={cn(
                    "w-full text-left rtl:text-right p-2 rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 group relative",
                    language === 'fr' && "bg-white/5 border border-white/10"
                  )}
                >
                  <div className="text-sm shrink-0">🇫🇷</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Français</p>
                  </div>
                  {language === 'fr' && (
                    <span className="absolute right-2 rtl:left-2 text-[8px] bg-indigo-500/10 text-indigo-400 font-extrabold px-1.5 py-0.2 rounded uppercase">Actif</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage('ar');
                    setIsLangMenuOpen(false);
                    toast.success("اللغة الحالية: العربية");
                  }}
                  className={cn(
                    "w-full text-left rtl:text-right p-2 rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 group relative",
                    language === 'ar' && "bg-white/5 border border-white/10"
                  )}
                >
                  <div className="text-sm shrink-0">🇩🇿</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white uppercase tracking-tight font-sans-arabic">العربية</p>
                  </div>
                  {language === 'ar' && (
                    <span className="absolute right-2 rtl:left-2 text-[8px] bg-indigo-500/10 text-indigo-400 font-extrabold px-1.5 py-0.2 rounded uppercase">نشط</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="p-2.5 rounded-xl bg-industrial-800 border border-industrial-700 text-industrial-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-sm flex items-center gap-2 group cursor-pointer"
            title="Changer le style visuel de l'application"
          >
            <Palette size={18} className="group-hover:scale-110 transition-transform text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">
              Thème: {theme === 'dark' ? 'Onyx' : theme === 'light' ? 'Albâtre' : theme === 'emerald' ? 'Émeraude' : theme === 'gold' ? 'Or Luxe' : 'Nardo'}
            </span>
            <ChevronDown size={14} className={cn("transition-transform", isThemeMenuOpen && "rotate-180")} />
          </button>

          {isThemeMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsThemeMenuOpen(false)}
              />
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-industrial-900 border border-industrial-800 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[9px] font-black tracking-widest uppercase text-white/40 px-3 py-1.5 border-b border-white/5 mb-1.5">MOTEUR DE THÈMES NEXUS</p>
                
                {[
                  { id: 'dark', name: 'Onyx Carbon', desc: 'Sensation haut de gamme carbone & indigo', color: 'bg-slate-900' },
                  { id: 'light', name: 'Alabaster Puro', desc: 'Clarté clinique et contrastes doux', color: 'bg-amber-50' },
                  { id: 'emerald', name: 'Cyber Émeraude', desc: 'Vert néon sci-fi d\'inspiration Matrix', color: 'bg-emerald-950' },
                  { id: 'gold', name: 'Obsidienne Or Luxe', desc: 'Noir d\'ancre poli et dorures chaleureuses', color: 'bg-amber-950' },
                  { id: 'nardo', name: 'Nardo Motorsport', desc: 'Gris gris piste et orange course pure', color: 'bg-[#1b1c21]' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id as any);
                      setIsThemeMenuOpen(false);
                      toast.success(`Atmosphère visuelle : ${t.name}`);
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 group relative",
                      theme === t.id && "bg-white/5 border border-white/10"
                    )}
                  >
                    <div className={cn("w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center shrink-0", t.color)}>
                      {theme === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-1.5 justify-between">
                        {t.name}
                        {theme === t.id && (
                          <span className="text-[8px] bg-indigo-500/10 text-indigo-400 font-extrabold px-1.5 py-0.2 rounded uppercase">Actif</span>
                        )}
                      </p>
                      <p className="text-[10px] text-white/40 truncate mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-white/40">{formatSafe(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
          <div className="flex items-center gap-2 justify-end">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-sm font-medium text-white">
              {activeStaffId 
                ? `Opéré par: ${employees.find(e => e.id === activeStaffId)?.name}`
                : `Caisse: ${profile?.displayName || user?.displayName || 'Principal'}`
              }
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
