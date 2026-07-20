import React from 'react';
import { Plus, X, Monitor } from 'lucide-react';
import { POSSession } from '../../types';

interface SessionTabsProps {
  posSessions: POSSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  addNewSession: () => void;
  removeSession: (id: string, e: React.MouseEvent) => void;
}

export function SessionTabs({
  posSessions,
  activeSessionId,
  setActiveSessionId,
  addNewSession,
  removeSession
}: SessionTabsProps) {
  
  // 🛡️ SÉCURITÉ ABSOLUE : Si posSessions n'est pas un tableau, on force un tableau vide
  const safeSessions = Array.isArray(posSessions) ? posSessions : [];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar max-w-full">
      {safeSessions.map((session) => {
        // Sécurité sur l'existence de la session et de son panier
        if (!session) return null;
        const safeCart = Array.isArray(session.cart) ? session.cart : [];
        const isActive = session.id === activeSessionId;

        return (
          <div
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider cursor-pointer transition-all select-none whitespace-nowrap ${
              isActive
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)]'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
            }`}
          >
            <Monitor size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
            
            <span>{session.name || 'Ticket'}</span>

            {/* 🛡️ SÉCURISÉ : Plus aucun risque de lire .length sur de l'undefined */}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              isActive ? 'bg-indigo-700 text-indigo-200' : 'bg-slate-800 text-slate-500'
            }`}>
              {safeCart.length}
            </span>

            {/* Bouton de fermeture d'onglet (uniquement s'il y a plus d'une session) */}
            {safeSessions.length > 1 && (
              <button
                onClick={(e) => removeSession(session.id, e)}
                className={`p-0.5 rounded-md transition-colors ${
                  isActive ? 'hover:bg-indigo-700 text-indigo-300 hover:text-white' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {/* Bouton pour ajouter un nouveau ticket */}
      <button
        onClick={addNewSession}
        className="p-2.5 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-500 hover:text-slate-300 transition-all active:scale-95 flex items-center justify-center"
        title="Nouveau Ticket"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default SessionTabs;