import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KioskSecurityPinModalProps {
  showPinModal: boolean;
  setShowPinModal: (show: boolean) => void;
  enteredPin: string;
  setEnteredPin: (pin: string) => void;
  pinError: boolean;
  handlePinDigitPress: (digit: string) => void;
  handlePinBackspace: () => void;
  toggleKioskMode: (enabled: boolean) => void;
  pinDialogTimeout: number;
}

export const KioskSecurityPinModal: React.FC<KioskSecurityPinModalProps> = ({
  showPinModal,
  setShowPinModal,
  enteredPin,
  setEnteredPin,
  pinError,
  handlePinDigitPress,
  handlePinBackspace,
  toggleKioskMode,
  pinDialogTimeout
}) => {
  if (!showPinModal) return null;

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-7 w-full max-w-sm flex flex-col items-center shadow-2xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <Lock size={28} />
        </div>

        <div className="text-center space-y-1">
          <h4 className="text-base font-black uppercase text-white tracking-wide">Accès Réservé au Personnel</h4>
          <p className="text-xs text-slate-400">Entrez votre code PIN pour déverrouiller la borne</p>
        </div>

        <div className={cn(
          "flex items-center gap-3 p-3 bg-slate-950 rounded-2xl border transition-all",
          pinError ? "border-rose-500 bg-rose-500/10 animate-bounce" : "border-slate-800"
        )}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={cn(
                "w-4 h-4 rounded-full transition-all",
                enteredPin.length > idx 
                  ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] scale-110" 
                  : "bg-slate-800 border border-slate-700"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handlePinDigitPress(digit)}
              className="py-3.5 bg-slate-800/80 hover:bg-indigo-600 rounded-xl font-black text-lg text-white transition-colors cursor-pointer border border-slate-700/60 active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handlePinBackspace}
            className="py-3.5 bg-slate-800/50 hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/40"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={() => handlePinDigitPress('0')}
            className="py-3.5 bg-slate-800/80 hover:bg-indigo-600 rounded-xl font-black text-lg text-white transition-colors cursor-pointer border border-slate-700/60 active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => {
              toggleKioskMode(false);
              setShowPinModal(false);
              setEnteredPin('');
            }}
            className="py-3.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl font-black text-[10px] uppercase transition-colors cursor-pointer border border-indigo-500/40"
            title="Passer en mode gestion rayon"
          >
            Gestion
          </button>
        </div>

        <div className="w-full pt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            Anti-intrusion
          </span>
          <span className="text-indigo-400 font-mono font-bold">Retour borne dans {pinDialogTimeout}s</span>
        </div>
      </div>
    </div>
  );
};
