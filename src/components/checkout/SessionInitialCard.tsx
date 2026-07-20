import React from 'react';
import { Card, Button } from '../ui';
import { Wallet, Banknote, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface SessionInitialCardProps {
  initialCashInput: string;
  setInitialCashInput: (v: string) => void;
  isOpeningSession: boolean;
  handleDirectOpenShift: () => void;
  settings: any;
  role: string;
  setActiveTab: (tab: string) => void;
}

export function SessionInitialCard({
  initialCashInput,
  setInitialCashInput,
  isOpeningSession,
  handleDirectOpenShift,
  settings,
  role,
  setActiveTab
}: SessionInitialCardProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 space-y-8 bg-slate-900/50 border-white/5 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto rotate-12 group-hover:rotate-0 transition-transform">
              <Wallet size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Session Close</h3>
              <p className="text-slate-400 text-sm font-medium">
                Initialisez votre fond de caisse pour commencer à vendre.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-left">
            <div className="space-y-2">
              {/* 🛡️ SÉCURISÉ : settings?.currency évite le crash si les paramètres ne sont pas chargés */}
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Fond de caisse initial ({settings?.currency || 'DZD'})
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Banknote size={20} />
                </div>
                <input 
                  type="number"
                  autoFocus
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-12 pr-6 text-2xl font-black text-white placeholder:text-white/10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && initialCashInput && handleDirectOpenShift()}
                />
              </div>
            </div>

            <Button 
              onClick={handleDirectOpenShift}
              disabled={!initialCashInput || isOpeningSession}
              className="w-full py-6 text-sm font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isOpeningSession ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <>
                  Commencer le travail
                  <ArrowRight size={20} />
                </>
              )}
            </Button>

            {role === 'admin' && (
              <button 
                onClick={() => setActiveTab('shifts')}
                className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
              >
                Voir l'historique des sessions
              </button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}