import React from 'react';
import { ShoppingCart, Languages, ChevronDown } from 'lucide-react';
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
      <div className="absolute top-5 right-5 z-20">
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Languages size={15} className="text-indigo-400" />
            <span>{language === 'fr' ? 'Français' : 'العربية'}</span>
            <ChevronDown size={13} className={cn("transition-transform duration-200", isLangMenuOpen && "rotate-180")} />
          </button>
          
          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-zinc-900 border border-zinc-800 p-1.5 shadow-md z-50 animate-in fade-in zoom-in-95 duration-150">
              <button 
                type="button"
                onClick={() => { setLanguage('fr'); setIsLangMenuOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
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
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
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
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 shadow-lg shadow-indigo-600/30 text-white mb-1">
          <ShoppingCart size={26} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          NEXUS <span className="text-indigo-400">POS PRO</span>
        </h1>
        <p className="text-xs text-zinc-400">
          {t("Application Mère • Terminal Caisse & Gestion")}
        </p>
      </div>
    </>
  );
};
