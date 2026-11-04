import React from 'react';
import { Globe, Package, ShieldCheck } from 'lucide-react';

export interface LoginAlternativesProps {
  handleLogin: () => void;
  isLoggingIn: boolean;
}

export const LoginAlternatives: React.FC<LoginAlternativesProps> = ({
  handleLogin,
  isLoggingIn
}) => {
  const handleQuickAdminSession = () => {
    const ownerEmail = import.meta.env.VITE_OWNER_EMAIL || 'beloutchimoriss@gmail.com';
    const ownerUid = import.meta.env.VITE_OWNER_UID || 'a43893ce-112a-48c4-85b8-b24978f4e8d0';
    const session = {
      uid: ownerUid,
      email: ownerEmail,
      displayName: 'Administrateur Principal',
      role: 'admin',
      isOffline: true
    };
    try {
      sessionStorage.setItem('nexus_active_offline_session', JSON.stringify(session));
      sessionStorage.setItem('nexus_auth_user', JSON.stringify(session));
    } catch (_) {}
    window.location.hash = '#customers';
    window.location.reload();
  };

  return (
    <>
      {/* Bouton Rapide Ouvrir la Session (Admin Direct) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleQuickAdminSession}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-indigo-600/30 via-zinc-900 to-indigo-600/30 border border-indigo-500/50 hover:border-indigo-400 text-xs font-black text-indigo-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-indigo-500/10"
        >
          <ShieldCheck size={16} className="text-indigo-400" />
          <span>⚡ OUVRIR LA SESSION (ADMIN DIRECT)</span>
        </button>
      </div>

      {/* Google OAuth Option (si configuré) */}
      <div className="pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/60 text-xs font-semibold text-zinc-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
        >
          <Globe size={15} className="text-zinc-400" />
          <span>Continuer avec Google</span>
        </button>
      </div>

      {/* Raccourci Direct Mode Réception Cartons (Agent Dépôt) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#carton-reception';
            window.location.reload();
          }}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-xs font-black text-amber-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-amber-500/10"
        >
          <Package size={16} className="text-amber-400" />
          <span>📦 ACCÈS DIRECT : RÉCEPTION CARTONS (DÉPÔT)</span>
        </button>
      </div>

      {/* Footer simple */}
      <div className="text-center pt-1">
        <span className="text-[10px] text-zinc-600 font-mono">
          Nexus POS Pro v1.2.71 • Architecture Offline-First
        </span>
      </div>
    </>
  );
};
