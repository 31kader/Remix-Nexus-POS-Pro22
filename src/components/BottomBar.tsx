import React from 'react';
import { ShoppingCart, Package, ShoppingBag, FileText, Tag, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function BottomNavItem({ icon, label, active, onClick }: BottomNavItemProps) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all relative active:scale-95 cursor-pointer",
        active
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      <div className={cn(
        "px-3 py-1 rounded-xl transition-all",
        active ? "bg-indigo-50 dark:bg-indigo-500/15" : "bg-transparent"
      )}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
          strokeWidth: active ? 2.5 : 2,
          size: 20 
        })}
      </div>
      <span className={cn(
        "text-[9px] font-extrabold uppercase tracking-tight leading-none",
        active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-zinc-400"
      )}>
        {label}
      </span>
      {active && (
        <span className="absolute top-0.5 w-5 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
      )}
    </button>
  );
}

interface BottomBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMenu?: () => void;
}

export const BottomBar = ({ activeTab, setActiveTab, onOpenMenu }: BottomBarProps) => {
  return (
    <nav className="shrink-0 w-full bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-around px-1 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <BottomNavItem 
        icon={<ShoppingCart size={20} />} 
        label="Caisse" 
        active={activeTab === 'checkout'} 
        onClick={() => setActiveTab('checkout')} 
      />
      <BottomNavItem 
        icon={<Package size={20} />} 
        label="Stock" 
        active={activeTab === 'inventory'} 
        onClick={() => setActiveTab('inventory')} 
      />
      <BottomNavItem 
        icon={<ShoppingBag size={20} />} 
        label="Ventes" 
        active={activeTab === 'transactions'} 
        onClick={() => setActiveTab('transactions')} 
      />
      <BottomNavItem 
        icon={<Tag size={20} />} 
        label="Étiquettes" 
        active={activeTab === 'label_printer'} 
        onClick={() => setActiveTab('label_printer')} 
      />
      <BottomNavItem 
        icon={<FileText size={20} />} 
        label="Rapports" 
        active={activeTab === 'reports'} 
        onClick={() => setActiveTab('reports')} 
      />
      {onOpenMenu && (
        <BottomNavItem 
          icon={<Menu size={20} />} 
          label="Menu" 
          active={false} 
          onClick={onOpenMenu} 
        />
      )}
    </nav>
  );
};
