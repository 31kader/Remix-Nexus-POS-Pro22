import React from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderThemeMenuProps {
  theme: string;
  setTheme: (theme: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toast: any;
}

export const THEME_OPTIONS = [
  { 
    id: 'titanium', 
    name: 'Nexus Slate Titanium', 
    badge: 'Titanium',
    desc: 'Ambiance moderne sombre ardoise & cyan haute lisibilité', 
    color: 'bg-cyan-500',
    ring: 'border-cyan-400' 
  },
  { 
    id: 'brutalist', 
    name: 'Néo-Brutalisme Industriel', 
    badge: 'Industriel',
    desc: 'Typographie monospace, grille de tableau marquée & angles vifs', 
    color: 'bg-amber-500',
    ring: 'border-amber-400' 
  },
  { 
    id: 'albatros', 
    name: 'Albâtre Minimaliste', 
    badge: 'Albâtre',
    desc: 'Clarté scandinave pure, blanc perle & tableaux aérés élégants', 
    color: 'bg-slate-200',
    ring: 'border-slate-400' 
  }
];

export const HeaderThemeMenu: React.FC<HeaderThemeMenuProps> = ({
  theme,
  setTheme,
  isOpen,
  setIsOpen,
  toast
}) => {
  const currentTheme = THEME_OPTIONS.find(t => t.id === theme) || THEME_OPTIONS[0];

  return (
    <div className="relative hidden md:block">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        title="Changer le style visuel de l'application"
      >
        <Palette size={16} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">
          {currentTheme.badge}
        </span>
        <ChevronDown size={13} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 shadow-xl z-50">
            <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 dark:text-zinc-400 px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1.5">
              3 STYLES VISUELS D'EXCELLENCE
            </p>
            
            {THEME_OPTIONS.map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                onClick={() => {
                  setTheme(tItem.id as any);
                  setIsOpen(false);
                  toast.success(`Style activé : ${tItem.name}`);
                }}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer mb-1",
                  theme === tItem.id && "bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0", tItem.color, tItem.ring)}>
                  {theme === tItem.id && <div className="w-1.5 h-1.5 bg-white dark:bg-zinc-900 rounded-full" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {tItem.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">{tItem.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
