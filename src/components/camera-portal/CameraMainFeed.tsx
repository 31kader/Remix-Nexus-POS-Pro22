import React, { useState } from 'react';
import { Camera, Activity, ShieldCheck, ShieldAlert, History } from 'lucide-react';
import { toast } from 'sonner';
import { cn, safeGetItems } from '../../lib/utils';
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
  const [scrubPosition, setScrubPosition] = useState<number>(60);
  const [isRewinding, setIsRewinding] = useState<boolean>(false);

  const handleInstantReplay = () => {
    setIsRewinding(true);
    setScrubPosition((prev) => Math.max(10, prev - 25));
    toast.info("Rembobinage instantané (-12 secondes) activé sur Cam-01");
    setTimeout(() => setIsRewinding(false), 1800);
  };

  return (
    <div className="flex-1 p-5 overflow-hidden flex flex-col gap-6">
      <div className="flex-1 relative rounded-xl overflow-hidden bg-black border border-white/5 shadow-md group">
         {/* Camera Feed Simulator */}
         <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="text-indigo-500/20 animate-pulse" size={120} />
         </div>
         
         {/* UI Overlays */}
         <div className="absolute inset-0 pointer-events-none">
            {/* Targeting Reticle */}
            <div className={cn(
               "absolute top-1/4 left-1/4 w-[40%] h-[40%] border-2 border-indigo-500/30 rounded-xl transition-all duration-700",
               activeAiZone ? "border-indigo-500/60 scale-105" : "scale-100"
            )}>
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
            </div>

            {/* Data Corner Left */}
            <div className="absolute top-8 left-8 flex items-center gap-4 bg-black/60  p-4 rounded-xl border border-white/10">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                   <Camera size={24} />
                </div>
                <div>
                   <p className="text-xs font-black text-white tracking-widest uppercase">Cam-01 / Sortie 1</p>
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-normal animate-pulse">{isRewinding ? 'Replay -12s...' : 'Scanning Live'}</p>
                </div>
            </div>

            {/* Data Corner Right */}
            <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
                <div className="px-6 py-2 bg-rose-600/20  border border-rose-500/30 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                   Alerte Zone Bas Chariot
                </div>
                <div className="px-6 py-2 bg-indigo-600/20  border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                   IA Trust: 94.2%
                </div>
            </div>
         </div>

         {/* Controls Overlay Bottom */}
         <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between z-10">
            <div className="flex items-center gap-4 bg-black/40  p-2 rounded-xl border border-white/5">
               <button
                  type="button"
                  onClick={handleInstantReplay}
                  title="Rembobiner de 12 secondes"
                  className={cn(
                    "p-3 rounded-xl text-white transition-all cursor-pointer",
                    isRewinding ? "bg-indigo-600 animate-pulse" : "bg-white/10 hover:bg-white/20"
                  )}
               >
                  <History size={18} />
               </button>
               <div
                  onClick={() => setScrubPosition((prev) => (prev >= 90 ? 25 : prev + 15))}
                  className="w-64 h-1.5 bg-white/10 rounded-full relative group/scrub cursor-pointer"
               >
                  <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${scrubPosition}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/scrub:opacity-100 transition-opacity" style={{ left: `${scrubPosition}%` }} />
               </div>
               <span className="text-[10px] font-mono text-white/40">-12s</span>
            </div>

            <div className="flex items-center gap-4">
               <Button 
                  onClick={() => handleAudit(selectedTransaction.id, 'verified')}
                  className={cn(
                     "h-14 px-5 rounded-xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl",
                     selectedTransaction.auditStatus === 'verified' ? "bg-emerald-600 text-white" : "bg-white/10 hover:bg-white/20 text-white "
                  )}
               >
                  <ShieldCheck size={20} /> Valider
               </Button>
               <Button 
                  onClick={() => handleAudit(selectedTransaction.id, 'suspicious')}
                  className={cn(
                     "h-14 px-5 rounded-xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl",
                     selectedTransaction.auditStatus === 'suspicious' ? "bg-rose-600 text-white" : "bg-white/10 hover:bg-white/20 text-white "
                  )}
               >
                  <ShieldAlert size={20} /> Signaler
               </Button>
            </div>
         </div>
      </div>

      {/* Horizontal Items Reel */}
      <div className="h-40 flex gap-6 mt-2 overflow-x-auto custom-scrollbar pb-4 pr-10">
         {safeGetItems(selectedTransaction).map((item, i) => (
            <div key={i} className="flex-none w-72 bg-workspace border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-all group">
               <div className="w-16 h-16 bg-black/40 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xl border border-white/5 shadow-inner">
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
