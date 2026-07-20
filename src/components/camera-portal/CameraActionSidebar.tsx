import React from 'react';
import { MessageSquare, Cpu, Activity, Package, FileText } from 'lucide-react';
import { Button } from '../ui';
import { Transaction } from '../../types';

interface CameraActionSidebarProps {
  sendMessageToCashier: (msg: string) => void;
  aiAnalysisLoading: boolean;
  setAiAnalysisLoading: (val: boolean) => void;
  selectedTransaction: Transaction;
  handleAddNote: (txId: string, note: string) => void;
}

export function CameraActionSidebar({
  sendMessageToCashier,
  aiAnalysisLoading,
  setAiAnalysisLoading,
  selectedTransaction,
  handleAddNote
}: CameraActionSidebarProps) {
  return (
    <div className="w-96 border-l border-white/5 bg-workspace/30 backdrop-blur-xl p-8 space-y-10 overflow-y-auto custom-scrollbar">
       <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
             <MessageSquare size={14} className="text-indigo-400" /> Ordres Flash
          </h3>
          <div className="grid grid-cols-1 gap-2">
             {[
                "Vérifiez le bas du chariot",
                "Article non scanné détecté",
                "Ralentissez le scan",
                "Alerte sécurité discrète"
             ].map((msg, i) => (
                <button 
                   key={i}
                   onClick={() => sendMessageToCashier(msg)}
                   className="w-full p-4 bg-black/20 border border-white/5 rounded-2xl text-left text-[11px] font-bold text-slate-300 hover:border-indigo-500/50 hover:bg-black/40 transition-all active:scale-[0.98]"
                >
                   {msg}
                </button>
             ))}
          </div>
       </section>

       <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
             <Cpu size={14} className="text-indigo-400" /> Analyse IA Matcher
          </h3>
          <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-6">
             <div className="flex gap-3">
                <div className="flex-1 aspect-square bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                   <Activity className="text-indigo-500/20" />
                </div>
                <div className="flex-1 aspect-square bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                   <Package className="text-slate-800" />
                </div>
             </div>
             <Button 
                onClick={() => {
                   setAiAnalysisLoading(true);
                   setTimeout(() => setAiAnalysisLoading(false), 1000);
                }}
                className="w-full bg-indigo-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-neon-indigo"
             >
                {aiAnalysisLoading ? "Matching..." : "Lancer ID-Verify"}
             </Button>
          </div>
       </section>

       <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
             <FileText size={14} className="text-indigo-400" /> Notes Observation
          </h3>
          <textarea
             placeholder="Compte-rendu d'audit..."
             className="w-full h-32 p-4 bg-black/20 border border-white/5 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-700 resize-none font-medium"
             value={selectedTransaction.auditNote || ''}
             onChange={(e) => handleAddNote(selectedTransaction.id, e.target.value)}
          />
       </section>
    </div>
  );
}
