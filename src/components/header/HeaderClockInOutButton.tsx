import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderClockInOutButtonProps {
  currentEmployee: any;
  isClockedIn: boolean;
  onClockInOut: () => Promise<void>;
}

export const HeaderClockInOutButton: React.FC<HeaderClockInOutButtonProps> = ({
  currentEmployee,
  isClockedIn,
  onClockInOut,
}) => {
  if (!currentEmployee) return null;

  return (
    <button
      type="button"
      onClick={onClockInOut}
      className={cn(
        "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 border",
        isClockedIn
          ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
          : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
      )}
      title={isClockedIn ? "Terminer mon service (Pointage)" : "Démarrer mon service (Pointage)"}
    >
      {isClockedIn ? (
        <LogOut size={14} className="text-rose-600 dark:text-rose-400" />
      ) : (
        <LogIn size={14} className="text-emerald-600 dark:text-emerald-400" />
      )}
      <span className="hidden md:inline">
        {isClockedIn ? 'Fin de service' : 'Début de service'}
      </span>
    </button>
  );
};
