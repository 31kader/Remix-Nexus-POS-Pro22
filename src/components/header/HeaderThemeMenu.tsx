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

const THEME_OPTIONS = [
  { id: 'dark', name: 'Onyx Carbon', desc: 'Sensation haut de gamme carbone & indigo', color: 'bg-slate-900' },
  { id: 'light', name: 'Mode Clair', desc: 'Clarté lumineuse, blanc pur et contrastes nets', color: 'bg-white' },
  { id: 'emerald', name: 'Cyber Émeraude', desc: 'Vert néon sci-fi d\'inspiration Matrix', color: 'bg-emerald-950' },
  { id: 'gold', name: 'Obsidienne Or Luxe', desc: 'Noir d\'ancre poli et dorures chaleureuses', color: 'bg-amber-950' },
  { id: 'nardo', name: 'Nardo Motorsport', desc: 'Gris piste et orange course pure', color: 'bg-[#1b1c21]' }
];

export const HeaderThemeMenu: React.FC<HeaderThemeMenuProps> = ({
  theme,
  setTheme,
  isOpen,
  setIsOpen,
  toast
}) => {
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
          {theme === 'dark' ? 'Onyx' : theme === 'light' ? 'Clair' : theme === 'emerald' ? 'Émeraude' : theme === 'gold' ? 'Or Luxe' : 'Nardo'}
        </span>
        <ChevronDown size={13} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 shadow-lg z-50">
            <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 dark:text-zinc-400 px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1.5">
              MOTEUR DE THÈMES NEXUS
            </p>
            
            {THEME_OPTIONS.map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                onClick={() => {
                  setTheme(tItem.id as any);
                  setIsOpen(false);
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
  );
};
