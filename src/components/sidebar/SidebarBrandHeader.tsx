import React from 'react';
import { ShoppingCart, Store, X } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { WarehouseStorage } from '../../services/warehouse/warehouseStorage';
import { cn } from '../../lib/utils';

export interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
  isMobile: boolean;
  isMobileOverlayOpen: boolean;
  onCloseSidebar: () => void;
  onCloseMobileOverlay: () => void;
}

export const SidebarBrandHeader: React.FC<SidebarBrandHeaderProps> = ({
  isCollapsed,
  isMobile,
  isMobileOverlayOpen,
  onCloseSidebar,
  onCloseMobileOverlay
}) => {
  const activeWarehouse = WarehouseStorage.getActiveWarehouse();
  const warehouseName = activeWarehouse?.name || 'Magasin Principal';

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/95 relative z-10 shrink-0 select-none",
        isCollapsed ? "p-3 justify-center" : "p-3.5 sm:px-4 sm:py-3.5"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
          <ShoppingCart size={18} className="text-indigo-400" />
        </div>

        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-white tracking-tight uppercase truncate">
                NEXUS POS
              </span>
              <span className="text-[9px] font-mono font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-md">
                v{APP_CONFIG.version}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 truncate mt-0.5" title={warehouseName}>
              <Store size={10} className="text-emerald-400 shrink-0" />
              <span className="truncate max-w-[130px] text-zinc-300">{warehouseName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bouton de Fermeture Mobile */}
      {isMobile && isMobileOverlayOpen && (
        <button
          type="button"
          onClick={onCloseMobileOverlay}
          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          aria-label="Fermer le menu"
        >
          <X size={16} />
        </button>
      )}

      {/* Bouton Fermer 1-clic sur PC / Tablette (Échap / 0px) */}
      {!isMobile && !isCollapsed && (
        <button
          type="button"
          onClick={onCloseSidebar}
          className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer shrink-0"
          title="Fermer le menu latéral (Échap)"
          aria-label="Fermer le menu"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
