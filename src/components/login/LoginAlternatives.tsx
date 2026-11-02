import React from 'react';
import { Globe, Package } from 'lucide-react';

export interface LoginAlternativesProps {
  handleLogin: () => void;
  isLoggingIn: boolean;
}

export const LoginAlternatives: React.FC<LoginAlternativesProps> = ({
  handleLogin,
  isLoggingIn
}) => {
  return (
    <>
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
          Nexus POS Pro v1.2.59 • Architecture Offline-First
        </span>
      </div>
    </>
  );
};
