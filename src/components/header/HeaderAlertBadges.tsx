import React from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';

interface HeaderAlertBadgesProps {
  hasInventoryAccess: boolean;
  lowStockProducts?: any[];
  expiringProducts?: any[];
  onOpenLowStockModal: () => void;
  onOpenExpirationModal: () => void;
}

export const HeaderAlertBadges: React.FC<HeaderAlertBadgesProps> = ({
  hasInventoryAccess,
  lowStockProducts = [],
  expiringProducts = [],
  onOpenLowStockModal,
  onOpenExpirationModal,
}) => {
  if (!hasInventoryAccess) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {lowStockProducts.length > 0 && (
        <button
          type="button"
          onClick={onOpenLowStockModal}
          className="relative p-1.5 sm:p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all shrink-0 cursor-pointer group"
          title={`${lowStockProducts.length} produit(s) en stock critique (réassort requis)`}
          aria-label="Alertes stock critique"
        >
          <div className="relative">
            <AlertTriangle size={18} className="animate-pulse group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white dark:border-zinc-900 shadow-2xs">
              {lowStockProducts.length > 99 ? '99+' : lowStockProducts.length}
            </span>
          </div>
        </button>
      )}

      {expiringProducts.length > 0 && (
        <button
          type="button"
          onClick={onOpenExpirationModal}
          className="relative p-1.5 sm:p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all shrink-0 cursor-pointer group"
          title={`${expiringProducts.length} produit(s) proches de la date de péremption (DLC)`}
          aria-label="Alertes date de péremption"
        >
          <div className="relative">
            <Calendar size={18} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-amber-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white dark:border-zinc-900 shadow-2xs">
              {expiringProducts.length > 99 ? '99+' : expiringProducts.length}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};
