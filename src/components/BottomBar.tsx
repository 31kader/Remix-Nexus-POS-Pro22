import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Package, ShoppingBag, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
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
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 min-w-[64px] transition-all relative active:scale-90",
        active ? "text-indigo-400" : "text-white"
      )}
    >
      <div className={cn(
        "p-2.5 rounded-2xl transition-all duration-300",
        active ? "bg-indigo-500/10 shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]" : "bg-transparent"
      )}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
          strokeWidth: active ? 2.5 : 2,
          size: 24 
        })}
      </div>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest transition-all",
        active ? "opacity-100 scale-100" : "opacity-40 scale-95"
      )}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="bottomNavDot"
          className="absolute -top-1 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]"
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
        />
      )}
    </button>
  );
}

interface BottomBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomBar = ({ activeTab, setActiveTab }: BottomBarProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-workspace/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-4 z-40 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <BottomNavItem 
        icon={<ShoppingCart size={24} />} 
        label="Caisse" 
        active={activeTab === 'checkout'} 
        onClick={() => setActiveTab('checkout')} 
      />
      <BottomNavItem 
        icon={<Package size={24} />} 
        label="Stock" 
        active={activeTab === 'inventory'} 
        onClick={() => setActiveTab('inventory')} 
      />
      <BottomNavItem 
        icon={<ShoppingBag size={24} />} 
        label="Ventes" 
        active={activeTab === 'transactions'} 
        onClick={() => setActiveTab('transactions')} 
      />
       <BottomNavItem 
        icon={<LayoutDashboard size={24} />} 
        label="Stats" 
        active={activeTab === 'dashboard'} 
        onClick={() => setActiveTab('dashboard')} 
      />
      <BottomNavItem 
        icon={<SettingsIcon size={24} />} 
        label="Configs" 
        active={activeTab === 'settings'} 
        onClick={() => setActiveTab('settings')} 
      />
    </nav>
  );
};
