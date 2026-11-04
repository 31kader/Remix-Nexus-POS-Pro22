import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SidebarSearchFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCollapsed: boolean;
  onExpandSidebar?: () => void;
}

export const SidebarSearchFilter: React.FC<SidebarSearchFilterProps> = ({
  searchQuery,
  setSearchQuery,
  isCollapsed,
  onExpandSidebar
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed && onExpandSidebar) {
          onExpandSidebar();
        }
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, onExpandSidebar]);

  if (isCollapsed) {
    return (
      <div className="px-2 pt-2 pb-1 flex justify-center">
        <button
          type="button"
          onClick={onExpandSidebar}
          className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer group shadow-xs"
          title="Rechercher un module (Ctrl+K)"
        >
          <Search size={16} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-2.5 pb-1">
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-2.5 text-zinc-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un module... (Ctrl+K)"
          className="w-full h-8 pl-8 pr-12 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
              title="Effacer"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 pointer-events-none">
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
};
