import React from 'react';
import { Camera, Activity, ShieldCheck, ShieldAlert, History } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { Transaction } from '../../types';

interface CameraMainFeedProps {
  selectedTransaction: Transaction;
  activeAiZone: string | null;
  handleAudit: (txId: string, status: 'verified' | 'suspicious') => void;
}

export function CameraMainFeed({
  selectedTransaction,
  activeAiZone,
  handleAudit
}: CameraMainFeedProps) {
  return (
    <div className="flex-1 p-8 overflow-hidden flex flex-col gap-6">
      <div className="flex-1 relative rounded-[3rem] overflow-hidden bg-black border border-white/5 shadow-2xl group">
         {/* Camera Feed Simulator */}
         <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="text-indigo-500/20 animate-pulse" size={120} />
         </div>
         
         {/* UI Overlays */}
         <div className="absolute inset-0 pointer-events-none">
            {/* Targeting Reticle */}
            <div className={cn(
               "absolute top-1/4 left-1/4 w-[40%] h-[40%] border-2 border-indigo-500/30 rounded-3xl transition-all duration-700",
               activeAiZone ? "border-indigo-500/60 scale-105" : "scale-100"
            )}>
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
            </div>

            {/* Data Corner Left */}
            <div className="absolute top-8 left-8 flex items-center gap-4 bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                   <Camera size={24} />
                </div>
                <div>
                   <p className="text-xs font-black text-white tracking-widest uppercase">Cam-01 / Sortie 1</p>
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] animate-pulse">Scanning Live</p>
                </div>
            </div>

            {/* Data Corner Right */}
            <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
                <div className="px-6 py-2 bg-rose-600/20 backdrop-blur-md border border-rose-500/30 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                   Alerte Zone Bas Chariot
                </div>
                <div className="px-6 py-2 bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                   IA Trust: 94.2%
                </div>
            </div>
         </div>

         {/* Controls Overlay Bottom */}
         <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between z-10">
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/5">
               <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"><History size={18} /></button>
               <div className="w-64 h-1.5 bg-white/10 rounded-full relative group/scrub cursor-pointer">
                  <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: '60%' }} />
                  <div className="absolute top-1/2 left-[60%] -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/scrub:opacity-100 transition-opacity" />
               </div>
               <span className="text-[10px] font-mono text-white/40">-12s</span>
            </div>

            <div className="flex items-center gap-4">
               <Button 
                  onClick={() => handleAudit(selectedTransaction.id, 'verified')}
                  className={cn(
                     "h-14 px-8 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl",
                     selectedTransaction.auditStatus === 'verified' ? "bg-emerald-600 text-white" : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                  )}
               >
                  <ShieldCheck size={20} /> Valider
               </Button>
               <Button 
                  onClick={() => handleAudit(selectedTransaction.id, 'suspicious')}
                  className={cn(
                     "h-14 px-8 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl",
                     selectedTransaction.auditStatus === 'suspicious' ? "bg-rose-600 text-white" : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                  )}
               >
                  <ShieldAlert size={20} /> Signaler
               </Button>
            </div>
         </div>
      </div>

      {/* Horizontal Items Reel */}
      <div className="h-40 flex gap-6 mt-2 overflow-x-auto custom-scrollbar pb-4 pr-10">
         {selectedTransaction.items.map((item, i) => (
            <div key={i} className="flex-none w-72 bg-workspace border border-white/5 rounded-3xl p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-all group">
               <div className="w-16 h-16 bg-black/40 rounded-2xl flex items-center justify-center text-indigo-500 font-black text-xl border border-white/5 shadow-inner">
                  {i + 1}
               </div>
               <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-black text-white uppercase truncate tracking-tight">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Qte: {item.quantity}</p>
                  <div className="flex items-center gap-1">
                     <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                     </div>
                     <ShieldCheck size={10} className="text-emerald-500" />
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
