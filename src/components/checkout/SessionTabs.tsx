import React, { Dispatch, SetStateAction, MouseEvent } from 'react';
import { Plus, ShoppingCart, X, RotateCcw, Star, CreditCard, Tv, Edit3 } from 'lucide-react';
import { POSSession } from '../../types';
import { cn, formatPrice } from '../../lib/utils';

export interface SessionTabsProps {
  posSessions: POSSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  addNewSession: () => void;
  removeSession: (id: string, e?: MouseEvent<Element, globalThis.MouseEvent>) => void;
  
  // Optional toggles
  isReturnMode?: boolean;
  setIsReturnMode?: Dispatch<SetStateAction<boolean>>;
  showQuickSelect?: boolean;
  setShowQuickSelect?: Dispatch<SetStateAction<boolean>>;
  showControlsPanel?: boolean;
  setShowControlsPanel?: Dispatch<SetStateAction<boolean>>;
  onOpenCustomerDisplay?: () => void;
  [key: string]: any;
}

export const SessionTabs: React.FC<SessionTabsProps> = ({
  posSessions = [],
  activeSessionId,
  setActiveSessionId,
  addNewSession,
  removeSession,
  isReturnMode = false,
  setIsReturnMode,
  showQuickSelect = true,
  setShowQuickSelect,
  showControlsPanel = true,
  setShowControlsPanel,
  onOpenCustomerDisplay
}) => {
  const safeSessions = Array.isArray(posSessions) && posSessions.length > 0
    ? posSessions
    : [{ id: activeSessionId || 'default', name: 'Ticket 1', cart: [], selectedCustomer: null }];

  return (
    <div className="bg-white dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between gap-3 z-40 shadow-sm">
      {/* Sessions / Cart Tabs list */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1">
        {safeSessions.map((session, index) => {
          const isActive = session.id === activeSessionId || (safeSessions.length === 1 && !activeSessionId);
          const cartCount = Array.isArray(session.cart) 
            ? session.cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
            : 0;
          const cartTotal = Array.isArray(session.cart)
            ? session.cart.reduce((sum, item) => sum + ((item.overriddenPrice ?? item.price ?? 0) * (item.quantity || 1)), 0)
            : 0;

          const isEditing = Boolean(session.editingTransaction);

          return (
            <div
              key={session.id || `session-${index}`}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border select-none flex-shrink-0 shadow-sm",
                isActive
                  ? isEditing
                    ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30"
                    : isReturnMode
                      ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                      : "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                  : isEditing
                    ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              )}
              onClick={() => setActiveSessionId(session.id)}
            >
              {isEditing ? (
                <Edit3 size={13} className={isActive ? "text-white" : "text-amber-600 dark:text-amber-400"} />
              ) : (
                <ShoppingCart size={13} className={isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"} />
              )}
              
              <span className="font-bold">{session.name || `Ticket ${index + 1}`}</span>

              {isEditing && (
                <span className={cn(
                  "px-1 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                  isActive ? "bg-black/30 text-amber-200" : "bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                )}>
                  MODIF
                </span>
              )}

              {/* Items Counter Badge */}
              {cartCount > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black",
                  isActive
                    ? "bg-white/25 text-white"
                    : isEditing
                      ? "bg-amber-200 dark:bg-amber-800/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50"
                      : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                )}>
                  {cartCount} • {formatPrice(cartTotal, 0)}
                </span>
              )}

              {/* Close Tab Button (if more than 1 tab) */}
              {safeSessions.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSession(session.id, e);
                  }}
                  className={cn(
                    "p-0.5 rounded-md transition-colors ml-0.5 cursor-pointer",
                    isActive
                      ? "hover:bg-white/20 text-white/80 hover:text-white"
                      : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  )}
                  title="Fermer ce panier"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* ➕ Bouton NOUVEAU PANIER */}
        <button
          type="button"
          tabIndex={-1}
          onClick={addNewSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-600/20 dark:hover:bg-emerald-600 dark:text-emerald-300 dark:hover:text-white border border-emerald-200 dark:border-emerald-500/40 hover:border-emerald-500 transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
          title="Ouvrir un nouveau panier de vente en attente"
        >
          <Plus size={14} />
          <span>+ Panier</span>
        </button>
      </div>

      {/* Mode Controls on the Right */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Toggle Mode Retour */}
        {setIsReturnMode && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsReturnMode(!isReturnMode)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer shadow-sm",
              isReturnMode
                ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border-slate-200 dark:border-slate-800"
            )}
            title={isReturnMode ? "Mode Retour Actif" : "Activer le Mode Retour"}
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">{isReturnMode ? "Retour Actif" : "Retour"}</span>
          </button>
        )}

        {/* Toggle Favoris / Quick Select Panel (Left) */}
        {setShowQuickSelect && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              const nextState = !showQuickSelect;
              setShowQuickSelect(nextState);
              if (nextState) {
                window.dispatchEvent(new CustomEvent('nexus-collapse-sidebar'));
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-sm",
              showQuickSelect
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800"
            )}
            title="Afficher/Masquer le panneau des favoris"
          >
            <Star size={13} className={showQuickSelect ? "fill-amber-500 text-amber-500" : ""} />
            <span className="hidden md:inline">Favoris</span>
          </button>
        )}

        {/* Toggle Payment & Customer Panel (Right) */}
        {setShowControlsPanel && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              const nextState = !showControlsPanel;
              setShowControlsPanel(nextState);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-sm",
              showControlsPanel
                ? "bg-indigo-100 dark:bg-indigo-600/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800"
            )}
            title="Afficher/Masquer le panneau de paiement"
          >
            <CreditCard size={13} />
            <span className="hidden md:inline">Paiement</span>
          </button>
        )}

        {/* Bouton Afficheur Client Sans Fil */}
        {onOpenCustomerDisplay && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onOpenCustomerDisplay}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-sm bg-slate-100 hover:bg-indigo-50 dark:bg-slate-900/80 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40"
            title="Connecter un Afficheur Client (2ème écran ou Tablette sans fil)"
          >
            <Tv size={13} className="text-indigo-500" />
            <span className="hidden lg:inline">Écran Client</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionTabs;