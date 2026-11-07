import React from 'react';
import { ShoppingCart, Languages, ChevronDown, Wifi } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoginHeaderProps {
  language: string;
  setLanguage: (lang: string) => void;
  isLangMenuOpen: boolean;
  setIsLangMenuOpen: (val: boolean) => void;
  t: (key: string) => string;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  language,
  setLanguage,
  isLangMenuOpen,
  setIsLangMenuOpen,
  t
}) => {
  return (
    <>
      {/* Top Bar: Language Selector & Status */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs font-semibold cursor-pointer shadow-sm backdrop-blur-md"
          >
            <Languages size={14} className="text-indigo-400" />
            <span>{language === 'fr' ? 'Français' : 'العربية'}</span>
            <ChevronDown size={13} className={cn("transition-transform duration-200 text-zinc-500", isLangMenuOpen && "rotate-180")} />
          </button>
          
          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-zinc-900/95 border border-zinc-800 p-1.5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <button 
                type="button"
                onClick={() => { setLanguage('fr'); setIsLangMenuOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  language === 'fr' ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <span>Français</span>
                <span>🇫🇷</span>
              </button>
              <button 
                type="button"
                onClick={() => { setLanguage('ar'); setIsLangMenuOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  language === 'ar' ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <span>العربية</span>
                <span>🇩🇿</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Brand Header */}
      <div className="text-center space-y-2 mb-2">
        <div className="relative inline-flex">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-30 blur-sm animate-pulse" />
          <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 border border-indigo-400/30 shadow-xl shadow-indigo-600/30 text-white">
            <ShoppingCart size={26} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          NEXUS <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">POS PRO</span>
        </h1>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">{t("Application Mère")}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-mono flex items-center gap-1">
            <Wifi size={11} className="text-emerald-400" />
            {t("Terminal Caisse Sécurisé")}
          </span>
        </div>
      </div>
    </>
  );
};
