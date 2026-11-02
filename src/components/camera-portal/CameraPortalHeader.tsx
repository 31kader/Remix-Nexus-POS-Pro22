import React from 'react';
import { Camera, History, Zap, Timer, Bell } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { UserProfile, Transaction } from '../../types';

interface CameraPortalHeaderProps {
  user: UserProfile;
  currentView: 'archive' | 'live';
  setCurrentView: (view: 'archive' | 'live') => void;
  selectedTransaction: Transaction | null;
  timeSpent: number;
  callManager: () => void;
}

export const CameraPortalHeader: React.FC<CameraPortalHeaderProps> = ({
  user,
  currentView,
  setCurrentView,
  selectedTransaction,
  timeSpent,
  callManager
}) => {
  return (
    <header className="h-20 border-b border-white/5 bg-workspace/80 flex items-center justify-between px-5 shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs">
            <Camera size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase">Nexus Guard <span className="text-indigo-400">Pro</span></h1>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poste Audit: {user.displayName}</p>
            </div>
          </div>
        </div>
        
        <div className="h-10 w-px bg-white/5" />
        
        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
           <button 
              onClick={() => setCurrentView('archive')}
              className={cn(
                "px-6 py-2 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                currentView === 'archive' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
           >
              <History size={14} /> Archives
           </button>
           <button 
              onClick={() => setCurrentView('live')}
              className={cn(
                "px-6 py-2 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                currentView === 'live' ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-300"
              )}
           >
              <Zap size={14} /> Live
           </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {selectedTransaction && (
          <div className="flex items-center gap-4 px-6 py-2 bg-black/40 border border-white/5 rounded-xl">
             <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Durée Session</span>
                <span className="text-sm font-black text-white font-mono">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
             </div>
             <Timer size={20} className="text-indigo-500 animate-pulse" />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button 
             onClick={callManager}
             className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border-b-4 border-rose-900 active:border-b-0 active:translate-y-1 transition-all px-6"
          >
            <Bell size={18} /> Alerte Manager
          </Button>
        </div>
      </div>
    </header>
  );
};
