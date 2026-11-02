import React from 'react';
import { Languages } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderLanguageMenuProps {
  language: string;
  setLanguage: (lang: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toast: any;
}

export const HeaderLanguageMenu: React.FC<HeaderLanguageMenuProps> = ({
  language,
  setLanguage,
  isOpen,
  setIsOpen,
  toast
}) => {
  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
        title="Changer de langue"
      >
        <Languages size={16} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-[10px] font-black uppercase hidden sm:inline">
          {language.toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 shadow-lg z-50">
            <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 dark:text-zinc-400 px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1.5">
              CHOIX DE LA LANGUE
            </p>
            
            <button
              type="button"
              onClick={() => {
                setLanguage('fr');
                setIsOpen(false);
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
                setIsOpen(false);
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
  );
};
