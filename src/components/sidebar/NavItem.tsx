import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  href?: string;
  badge?: number | string;
  badgePulse?: boolean;
  shortcutKey?: string;
}

export function NavItem({
  icon,
  label,
  active,
  onClick,
  collapsed,
  href,
  badge,
  badgePulse,
  shortcutKey
}: NavItemProps) {
  return (
    <a
      href={href || "#"}
      tabIndex={-1}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || (e as any).button === 1) {
          return;
        }
        e.preventDefault();
        if (typeof onClick === 'function') {
          onClick();
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1 && href && href !== '#') {
          window.open(href, '_blank');
        }
      }}
      className={cn(
        "btn-touch-action flex items-center gap-2.5 rounded-xl transition-all duration-150 group relative cursor-pointer border select-none",
        collapsed 
          ? "justify-center px-0 w-11 h-11 mx-auto" 
          : "px-3 py-2 min-h-[42px]",
        active 
          ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/40 shadow-xs shadow-indigo-500/10 font-bold"
          : "text-zinc-400 hover:text-white hover:bg-zinc-900/90 border-transparent hover:border-zinc-800"
      )}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center transition-colors",
        active ? "text-indigo-400" : "text-zinc-400 group-hover:text-indigo-400"
      )}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 17 })}
      </div>

      {!collapsed && (
        <span className="font-semibold text-xs truncate flex-1 text-left">
          {label}
        </span>
      )}

      {/* Raccourci Clavier en ligne */}
      {!collapsed && shortcutKey && (
        <kbd className="hidden group-hover:inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 transition-opacity">
          {shortcutKey}
        </kbd>
      )}

      {/* Lien externe 2ème écran */}
      {!collapsed && href && href !== '#' && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(href, '_blank', 'width=1400,height=900');
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-300 rounded transition-opacity"
          title="Ouvrir dans une nouvelle fenêtre (2ème écran)"
        >
          <ExternalLink size={12} />
        </button>
      )}

      {/* Badge Numérique / Statut */}
      {badge !== undefined && (
        <span className={cn(
          "px-1.5 py-0.5 text-[10px] font-bold rounded-md font-financial",
          collapsed ? "absolute -top-1 -right-1 px-1 py-0 text-[8px]" : "ml-auto",
          badgePulse 
            ? "bg-amber-500 text-zinc-950 animate-pulse font-black" 
            : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
        )}>
          {badge}
        </span>
      )}

      {/* Floating Tooltip en mode réduit */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl flex items-center gap-1.5 transition-all">
          <span>{label}</span>
          {shortcutKey && (
            <kbd className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              {shortcutKey}
            </kbd>
          )}
          {href && href !== '#' && <ExternalLink size={10} className="text-indigo-400" />}
        </div>
      )}
    </a>
  );
}
