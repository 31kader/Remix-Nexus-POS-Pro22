
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Eye, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const base = "px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.2)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)]",
    secondary: "bg-industrial-800 text-industrial-400 border-2 border-industrial-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.3)]",
    ghost: "text-slate-400 hover:bg-slate-800/60 hover:text-white",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_12px_rgba(5,150,105,0.3)]"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, variants[variant], className)}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = "", onClick }: any) => (
  <div 
    onClick={onClick} 
    className={cn(
      "bg-workspace/40 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden transition-all duration-500 group",
      onClick && "cursor-pointer hover:border-indigo-500/40 hover:shadow-neon-indigo hover:-translate-y-1 active:scale-[0.99]",
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
        "relative p-6 bg-workspace overflow-hidden cursor-pointer group transition-all duration-300",
        borderClass,
        className
      )}
    >
      <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">{title}</p>
      <div className={cn(
        "transition-all duration-500",
        !isVisible ? "blur-[8px] scale-95 opacity-50 select-none pointer-events-none" : "blur-0 scale-100 opacity-100"
      )}>
        {children}
      </div>
      {!isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-industrial-900 border border-industrial-700 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-2">
            <Eye size={12} /> Cliquer pour voir
          </div>
        </div>
      )}
    </Card>
  );
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", padding = "p-6", maxHeight = "max-h-[90vh]", headerAction, className = "" }: any) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <motion.div 
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn("bg-[#05070a] lg:rounded-[2rem] shadow-2xl w-full h-full lg:h-auto overflow-hidden border border-white/5 ring-1 ring-white/5", maxWidth, className)}
      >
        {title && (
          <div className="px-6 lg:px-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
            <h3 className="text-xl font-black tracking-tight uppercase tracking-widest text-[10px] lg:text-xs text-white/80 italic">{title}</h3>
            <div className="flex items-center gap-3">
              {headerAction && (
                <div className="border-r border-white/10 pr-3 mr-1 flex items-center">
                   {headerAction}
                </div>
              )}
              <button onClick={onClose} className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all text-slate-500 active:scale-90 border border-transparent hover:border-rose-500/20">
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        <div className={cn("overflow-y-auto custom-scrollbar h-[calc(100%-60px)] lg:h-auto", maxHeight, padding)}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmer", cancelText = "Annuler", variant = "danger" }: any) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onConfirm, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-industrial-400">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary">{cancelText}</Button>
          <Button onClick={() => { onConfirm(); onClose(); }} variant={variant}>{confirmText}</Button>
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
        "p-4 text-[11px] font-bold text-industrial-500 uppercase tracking-wider cursor-pointer hover:text-indigo-400 transition-colors group",
        isActive && "text-indigo-600 bg-indigo-500/5",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <div className={cn(
          "flex flex-col -space-y-1 transition-all duration-200",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )}>
          <ChevronUp 
            size={10} 
            className={cn(isActive && currentSort.direction === 'asc' ? "text-indigo-600" : "text-industrial-700")} 
          />
          <ChevronUp 
            size={10} 
            className={cn("rotate-180", isActive && currentSort.direction === 'desc' ? "text-indigo-600" : "text-industrial-700")} 
          />
        </div>
      </div>
    </th>
  );
};

export { SafeImage } from './SafeImage';
