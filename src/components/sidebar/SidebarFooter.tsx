import React from 'react';
import { Download, X, LogOut } from 'lucide-react';
import { SafeImage } from '../ui/SafeImage';
import { cn } from '../../lib/utils';

export interface SidebarFooterProps {
  deferredPrompt: any;
  isCollapsed: boolean;
  isMobile: boolean;
  user: any;
  profile: any;
  handleInstallApp: () => void;
  handleLogout: () => void;
  onCloseSidebar: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  deferredPrompt,
  isCollapsed,
  isMobile,
  user,
  profile,
  handleInstallApp,
  handleLogout,
  onCloseSidebar
}) => {
  return (
    <div className={cn(
      "border-t border-white/5 bg-[#050508]/50 relative z-10 shrink-0",
      isCollapsed ? "p-2" : "p-4 space-y-3"
    )}>
      {deferredPrompt && !isCollapsed && (
        <button 
          onClick={handleInstallApp}
          className="w-full p-2.5 rounded-xl flex items-center justify-center gap-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 transition-all font-black text-[9px] uppercase tracking-widest ring-1 ring-indigo-500/20 cursor-pointer"
        >
          <Download size={14} />
          <span>Installer l'App</span>
        </button>
      )}

      {/* Bouton Fermer direct (1-clic) sur PC */}
      {!isMobile && (
        <button 
          type="button"
          tabIndex={-1}
          onClick={onCloseSidebar}
          aria-label="Fermer le menu latéral"
          title="Fermer le menu latéral (1 clic)"
          className={cn(
            "w-full p-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors bg-white/[0.03] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer border border-white/5 hover:border-rose-500/30 text-[10px] font-bold uppercase tracking-wider",
            isCollapsed && "px-0 w-10 h-10 mx-auto"
          )}
        >
          <X size={15} />
          {!isCollapsed && <span>Fermer le menu</span>}
        </button>
      )}

      {/* Profil Utilisateur */}
      <div className={cn(
        "flex items-center transition-colors rounded-xl border border-white/5 shadow-inner bg-white/[0.02]",
        isCollapsed ? "p-1.5 justify-center" : "gap-3 p-3"
      )}>
        {user.photoURL ? (
          <SafeImage 
            src={user.photoURL} 
            className="w-9 h-9 rounded-xl border border-white/10 shadow-lg object-cover shrink-0" 
            alt={user.displayName}
            fallback={
              <div className="w-9 h-9 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            }
          />
        ) : (
          <div className="w-9 h-9 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0">
            {user.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-white uppercase tracking-tight">{user.displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                <p className="text-[8px] text-slate-500 truncate uppercase font-bold tracking-widest">{profile?.role || 'User'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              aria-label="Se déconnecter" 
              className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" 
              title="Se déconnecter"
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
