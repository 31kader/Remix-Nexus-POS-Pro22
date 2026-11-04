import React from 'react';
import { Package, ShieldCheck, Zap } from 'lucide-react';

export interface LoginAlternativesProps {
  handleLogin: () => void;
  isLoggingIn: boolean;
}

export function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
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
    <div className="space-y-3 pt-2">
      {/* Option 1 : Connexion Cloud Google (Gérant / Super-Admin) */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-700/80 hover:border-zinc-500 text-xs font-bold text-white transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50"
        >
          <GoogleLogo className="w-4 h-4 shrink-0" />
          <span>Connexion Gérant avec Google</span>
        </button>
        <p className="text-[10px] text-center text-zinc-500 font-mono">
          Authentification sécurisée Supabase OAuth
        </p>
      </div>

      {/* Raccourcis Caisse & Dépôt */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={handleQuickAdminSession}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-500/50 text-[11px] font-bold text-indigo-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
        >
          <Zap size={14} className="text-indigo-400 shrink-0" />
          <span>Admin Direct</span>
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.hash = '#carton-reception';
            window.location.reload();
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-[11px] font-bold text-amber-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
        >
          <Package size={14} className="text-amber-400 shrink-0" />
          <span>Dépôt Cartons</span>
        </button>
      </div>

      {/* Footer Sécurisé */}
      <div className="text-center pt-1">
        <span className="text-[10px] text-zinc-600 font-mono flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500/70 inline" />
          Nexus POS Pro v1.2.71 • Application Mère Offline-First
        </span>
      </div>
    </div>
  );
};
