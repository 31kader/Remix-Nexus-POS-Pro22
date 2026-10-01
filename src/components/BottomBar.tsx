import React, { useMemo } from 'react';
import { ShoppingCart, Package, ShoppingBag, FileText, Menu, Users, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { RolePermissions } from '../types';
import { isTabAllowed } from '../lib/permissions';

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
  canAccess?: (permission: keyof RolePermissions) => boolean;
  isAdmin?: boolean;
  isOwner?: boolean;
  isManager?: boolean;
}

export const BottomBar = ({ 
  activeTab, 
  setActiveTab, 
  onOpenMenu,
  canAccess,
  isAdmin,
  isOwner,
  isManager
}: BottomBarProps) => {
  const navItems = useMemo(() => {
    const candidates = [
      { 
        id: 'checkout', 
        label: 'Caisse', 
        icon: <ShoppingCart size={20} />, 
        allowed: isTabAllowed('checkout', canAccess, { isAdmin, isOwner, isManager }) 
      },
      { 
        id: 'transactions', 
        label: 'Ventes', 
        icon: <ShoppingBag size={20} />, 
        allowed: isTabAllowed('transactions', canAccess, { isAdmin, isOwner, isManager }) 
      },
      { 
        id: 'customers', 
        label: 'Clients', 
        icon: <Users size={20} />, 
        allowed: isTabAllowed('customers', canAccess, { isAdmin, isOwner, isManager }) 
      },
      { 
        id: 'inventory', 
        label: 'Stock', 
        icon: <Package size={20} />, 
        allowed: isTabAllowed('inventory', canAccess, { isAdmin, isOwner, isManager }) 
      },
      { 
        id: 'reports', 
        label: 'Rapports', 
        icon: <FileText size={20} />, 
        allowed: isTabAllowed('reports', canAccess, { isAdmin, isOwner, isManager }) 
      },
      { 
        id: 'shifts', 
        label: 'Clôture', 
        icon: <Wallet size={20} />, 
        allowed: isTabAllowed('shifts', canAccess, { isAdmin, isOwner, isManager }) 
      }
    ];

    // Ne retenir que les onglets strictement autorisés (max 4 pour préserver la lisibilité mobile)
    return candidates.filter(c => c.allowed).slice(0, 4);
  }, [canAccess, isAdmin, isOwner, isManager]);

  return (
    <nav className="shrink-0 w-full bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-around px-1 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      {navItems.map(item => (
        <BottomNavItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={activeTab === item.id}
          onClick={() => setActiveTab(item.id)}
        />
      ))}
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
