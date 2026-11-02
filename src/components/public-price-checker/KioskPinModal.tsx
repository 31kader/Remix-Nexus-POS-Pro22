import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, X } from 'lucide-react';

interface KioskPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  enteredPin: string;
  pinError: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
}

export const KioskPinModal: React.FC<KioskPinModalProps> = ({
  isOpen,
  onClose,
  enteredPin,
  pinError,
  onDigit,
  onDelete
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
            <Lock size={22} />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Code PIN Administrateur</h3>
          <p className="text-xs text-slate-400 mb-6 text-center">
            Saisissez votre code personnel pour quitter le mode kiosque
          </p>

          {/* Points PIN */}
          <div className="flex gap-3 mb-6">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                  pinError 
                    ? 'border-rose-500 bg-rose-500 animate-pulse' 
                    : enteredPin.length > idx 
                      ? 'border-cyan-400 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' 
                      : 'border-slate-700 bg-slate-950'
                }`}
              />
            ))}
          </div>

          {/* Clavier Tactile */}
          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => onDigit(d)}
                className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={() => onDigit('0')}
              className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="h-14 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <Delete size={20} />
            </button>
          </div>

          {pinError && (
            <p className="text-xs text-rose-400 font-bold animate-shake">
              Code PIN incorrect
            </p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
