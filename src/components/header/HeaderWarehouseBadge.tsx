import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, Store } from 'lucide-react';
import { WarehouseStorage } from '../../services/warehouse/warehouseStorage';
import type { Warehouse } from '../../types/warehouseTypes';
import { cn } from '../../lib/utils';

interface HeaderWarehouseBadgeProps {
  onWarehouseChange?: (warehouse: Warehouse) => void;
  className?: string;
}

export const HeaderWarehouseBadge: React.FC<HeaderWarehouseBadgeProps> = ({
  onWarehouseChange,
  className,
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshWarehouseData = () => {
    const list = WarehouseStorage.getWarehouses();
    setWarehouses(list);
    setActiveWarehouse(WarehouseStorage.getActiveWarehouse());
  };

  useEffect(() => {
    refreshWarehouseData();

    const handleWarehouseChange = () => refreshWarehouseData();
    window.addEventListener('warehouse-changed', handleWarehouseChange);
    return () => {
      window.removeEventListener('warehouse-changed', handleWarehouseChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectWarehouse = (w: Warehouse) => {
    WarehouseStorage.setActiveWarehouseId(w.id);
    setActiveWarehouse(w);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('warehouse-changed', { detail: { warehouseId: w.id } }));
    if (onWarehouseChange) {
      onWarehouseChange(w);
    }
  };

  if (!activeWarehouse) return null;

  return (
    <div className={cn("relative shrink-0", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/60 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-all cursor-pointer shadow-2xs group"
        title={`Dépôt actif : ${activeWarehouse.name} (${activeWarehouse.code})`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0 animate-pulse" />
        <Building2 size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
        <span className="hidden lg:inline truncate max-w-[130px] font-medium">
          {activeWarehouse.name}
        </span>
        <span className="lg:hidden text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-500">
          {activeWarehouse.code}
        </span>
        {warehouses.length > 1 && (
          <ChevronDown
            size={12}
            className={cn(
              "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-transform duration-150 shrink-0",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {isOpen && warehouses.length > 1 && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/80">
            Dépôts & Magasins (BLT)
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {warehouses.map((w) => {
              const isSelected = w.id === activeWarehouse.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleSelectWarehouse(w)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold"
                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {w.isCentral ? (
                      <Building2 size={14} className="text-indigo-500 shrink-0" />
                    ) : (
                      <Store size={14} className="text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">{w.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase">
                      ({w.code})
                    </span>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
