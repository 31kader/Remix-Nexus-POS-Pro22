import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SidebarNavCategoryProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  colorDot?: string;
  badge?: string | number;
}

export const SidebarNavCategory: React.FC<SidebarNavCategoryProps> = ({
  title,
  isOpen,
  onToggle,
  isCollapsed,
  colorDot = 'bg-indigo-500',
  badge
}) => {
  if (isCollapsed) {
    return <div className="h-[1px] bg-zinc-800/80 my-2.5 mx-2" />;
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-black text-zinc-400 hover:text-zinc-200 uppercase tracking-wider transition-colors mb-1.5 cursor-pointer group select-none"
    >
      <span className="flex items-center gap-1.5 truncate">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-xs", colorDot)} />
        <span className="truncate">{title}</span>
        {badge !== undefined && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
            {badge}
          </span>
        )}
      </span>

      <span className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
        {isOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </span>
    </button>
  );
};
