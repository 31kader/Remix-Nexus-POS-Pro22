import React from 'react';
import { Download, LogOut, Lock, ShieldCheck } from 'lucide-react';
import { SafeImage } from '../ui/SafeImage';
import { cn } from '../../lib/utils';

export interface SidebarFooterProProps {
  deferredPrompt: any;
  isCollapsed: boolean;
  isMobile: boolean;
  user: any;
  profile: any;
  handleInstallApp: () => void;
  handleLogout: () => void;
  onCloseSidebar: () => void;
}

export const SidebarFooterPro: React.FC<SidebarFooterProProps> = ({
  deferredPrompt,
  isCollapsed,
  user,
  profile,
  handleInstallApp,
  handleLogout
}) => {
  const roleName = String(profile?.role || user?.role || 'Opérateur').toUpperCase();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <div
      className={cn(
        "border-t border-zinc-800/80 bg-zinc-950/95 relative z-10 shrink-0 select-none",
        isCollapsed ? "p-2 space-y-2" : "p-3 space-y-2.5"
      )}
    >
      {/* Bouton d'installation PWA si disponible */}
      {deferredPrompt && !isCollapsed && (
        <button
          type="button"
          onClick={handleInstallApp}
          className="w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer"
        >
          <Download size={13} />
          <span>Installer l'App Hors-ligne</span>
        </button>
      )}

      {/* Profil & Actions de Session */}
      <div
        className={cn(
          "flex items-center rounded-xl border border-zinc-800/80 bg-zinc-900/60 transition-colors shadow-inner",
          isCollapsed ? "p-1.5 justify-center flex-col gap-1.5" : "p-2.5 gap-2.5"
        )}
      >
        {/* Avatar / Initiale */}
        {user?.photoURL ? (
          <SafeImage
            src={user.photoURL}
            className="w-8 h-8 rounded-lg border border-zinc-700 object-cover shrink-0"
            alt={userName}
            fallback={
              <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
            }
          />
        ) : (
          <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Détails Utilisateur & Badges */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {userName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <ShieldCheck size={10} className="text-indigo-400 shrink-0" />
                {roleName}
              </span>
            </div>
          </div>
        )}

        {/* Boutons Déconnexion / Verrouillage */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Se déconnecter (Verrouiller)"
            aria-label="Se déconnecter"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
