import React, { useState } from 'react';
import { X, Eye, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const base = "px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs",
    secondary: "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700",
    outline: "border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-xs",
    ghost: "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
  };
  return (
    <button 
      type={type} 
      onClick={(e) => {
        if (typeof onClick === 'function') {
          onClick(e);
        }
      }} 
      disabled={disabled} 
      className={cn(base, variants[variant] || variants.primary, className)}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className = "", onClick }: any) => (
  <div 
    onClick={(e) => {
      if (typeof onClick === 'function') {
        onClick(e);
      }
    }} 
    className={cn(
      "bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden transition-colors duration-100 group",
      onClick && "cursor-pointer hover:border-indigo-500/50",
      className
    )}
  >
    {children}
  </div>
);

export const BlurCard = ({ children, title, className, borderClass }: { children: React.ReactNode, title: string, className?: string, borderClass?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <Card 
      onClick={() => setIsVisible(!isVisible)}
      className={cn(
        "relative p-4 bg-white dark:bg-zinc-900 overflow-hidden cursor-pointer group",
        borderClass,
        className
      )}
    >
      <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 group-hover:text-indigo-600">{title}</p>
      <div className={cn(
        !isVisible ? "blur-[6px] opacity-40 select-none pointer-events-none" : "blur-0 opacity-100"
      )}>
        {children}
      </div>
      {!isVisible && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-md flex items-center gap-1.5">
            <Eye size={12} /> Cliquer pour voir
          </div>
        </div>
      )}
    </Card>
  );
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", padding = "p-5", maxHeight = "max-h-[90vh]", headerAction, className = "" }: any) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  const safeClose = React.useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        safeClose();
      } else if (e.key === 'Enter') {
        if (document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        
        const container = modalRef.current;
        if (container) {
          const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement | null;
          const bgIndigoBtn = container.querySelector('button.bg-indigo-600') as HTMLButtonElement | null;
          const bgEmeraldBtn = container.querySelector('button.bg-emerald-600') as HTMLButtonElement | null;
          
          let textBtn: HTMLButtonElement | null = null;
          const allButtons = container.querySelectorAll('button');
          for (let i = 0; i < allButtons.length; i++) {
            const btn = allButtons[i];
            const text = btn.textContent?.toLowerCase() || '';
            if (
              text.includes('enregistrer') || 
              text.includes('valider') || 
              text.includes('confirmer') || 
              text.includes('ajouter') ||
              text.includes('créer') ||
              text.includes('sauvegarder')
            ) {
              if (!btn.disabled) {
                textBtn = btn;
                break;
              }
            }
          }
          
          const btnToClick = submitBtn || bgIndigoBtn || bgEmeraldBtn || textBtn;
          if (btnToClick && !btnToClick.disabled) {
            e.preventDefault();
            e.stopPropagation();
            btnToClick.click();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, safeClose]);

  if (!isOpen) return null;
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-0 lg:p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) safeClose();
      }}
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={cn("bg-white dark:bg-zinc-900 lg:rounded-2xl shadow-2xl w-full h-full lg:h-auto overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col", maxWidth, className)}
      >
        {title && (
          <div className="px-4 sm:px-5 pt-[max(env(safe-area-inset-top,0px),14px)] pb-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/90 shrink-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate pr-2">{title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {headerAction && (
                <div className="border-r border-slate-200 dark:border-zinc-800 pr-2.5 mr-1 flex items-center">
                   {headerAction}
                </div>
              )}
              <button 
                type="button" 
                onClick={safeClose} 
                aria-label="Fermer la boîte de dialogue"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/80 dark:bg-zinc-800 hover:bg-rose-500/20 text-slate-700 dark:text-zinc-200 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-300/80 dark:border-zinc-700 transition-all cursor-pointer active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
        <div className={cn("overflow-y-auto custom-scrollbar flex-1 lg:flex-initial pb-[max(env(safe-area-inset-bottom,0px),16px)]", maxHeight, padding)}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onCancel,
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmer", 
  cancelText = "Annuler", 
  variant = "danger" 
}: any) => {
  const handleClose = React.useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onCancel === 'function') {
      onCancel();
    }
  }, [onClose, onCancel]);

  const handleConfirm = React.useCallback(() => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    handleClose();
  }, [onConfirm, handleClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-5">
        <p className="text-sm text-slate-700 dark:text-zinc-300">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <Button onClick={handleClose} variant="secondary">{cancelText}</Button>
          <Button onClick={handleConfirm} variant={variant}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
};

export const SortableHeader = ({ 
  label, 
  sortKey, 
  currentSort, 
  onSort, 
  className = "" 
}: { 
  label: string, 
  sortKey: string, 
  currentSort: { key: string, direction: 'asc' | 'desc' } | null, 
  onSort: (key: any) => void,
  className?: string
}) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <th 
      className={cn(
        "px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 group",
        isActive && "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <div className={cn(
          "flex flex-col -space-y-1",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )}>
          <ChevronUp 
            size={10} 
            className={cn(isActive && currentSort.direction === 'asc' ? "text-indigo-600" : "text-slate-400")} 
          />
          <ChevronUp 
            size={10} 
            className={cn("rotate-180", isActive && currentSort.direction === 'desc' ? "text-indigo-600" : "text-slate-400")} 
          />
        </div>
      </div>
    </th>
  );
};

export { SafeImage } from './SafeImage';

