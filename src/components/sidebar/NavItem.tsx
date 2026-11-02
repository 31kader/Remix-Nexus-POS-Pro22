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
}

export function NavItem({ icon, label, active, onClick, collapsed, href, badge, badgePulse }: NavItemProps) {
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
        "flex items-center gap-2.5 py-2 rounded-lg transition-colors duration-100 group relative cursor-pointer border touch-manipulation",
        collapsed 
          ? "justify-center px-0 w-10 h-10 mx-auto" 
          : "px-3",
        active 
          ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-bold"
          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 border-transparent"
      )}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center",
        active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
      )}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </div>

      {!collapsed && (
        <span className="font-medium text-xs truncate">
          {label}
        </span>
      )}
      
      {!collapsed && href && href !== '#' && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(href, '_blank', 'width=1400,height=900');
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded transition-opacity ml-auto"
          title="Ouvrir dans une nouvelle fenêtre (2ème écran)"
        >
          <ExternalLink size={12} />
        </button>
      )}

      {badge !== undefined && Number(badge) > 0 && (
        <span className={cn(
          "px-1.5 py-0.5 text-[10px] font-bold rounded-md",
          collapsed ? "absolute -top-1 -right-1 px-1 py-0 text-[8px]" : (href && href !== '#' ? "ml-1" : "ml-auto"),
          badgePulse 
            ? "bg-amber-500 text-slate-950 animate-pulse" 
            : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
        )}>
          {badge}
        </span>
      )}

      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl flex items-center gap-1.5 transition-all">
          <span>{label}</span>
          {href && href !== '#' && <ExternalLink size={10} className="text-indigo-400" />}
        </div>
      )}
    </a>
  );
}
