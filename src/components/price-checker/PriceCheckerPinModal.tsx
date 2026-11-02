import React from 'react';
import { Lock, Unlock, X } from 'lucide-react';
import { Modal } from '../ui';

interface PriceCheckerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  enteredPin: string;
  pinError: boolean;
  pinDialogTimeout: number;
  handlePinDigitPress: (digit: string) => void;
  handlePinBackspace: () => void;
}

export const PriceCheckerPinModal: React.FC<PriceCheckerPinModalProps> = ({
  isOpen,
  onClose,
  enteredPin,
  pinError,
  pinDialogTimeout,
  handlePinDigitPress,
  handlePinBackspace
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Code PIN Requis"
      maxWidth="max-w-xs"
    >
      <div className="p-4 space-y-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          {enteredPin.length === 4 ? <Unlock size={24} /> : <Lock size={24} />}
        </div>

        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
            Sortie Sécurisée de la Borne
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Entrez votre Code PIN gérant ou employé pour déverrouiller.
          </p>
        </div>

        {/* Affichage des points PIN */}
        <div className={`flex justify-center gap-3 py-2 ${pinError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                enteredPin.length > idx
                  ? 'bg-indigo-600 border-indigo-600 scale-110'
                  : 'bg-transparent border-slate-300 dark:border-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Pavé Numérique */}
        <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handlePinDigitPress(d)}
              className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-lg font-black text-slate-900 dark:text-white transition-all cursor-pointer active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-500 transition-all cursor-pointer flex items-center justify-center"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={() => handlePinDigitPress('0')}
            className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-lg font-black text-slate-900 dark:text-white transition-all cursor-pointer active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handlePinBackspace}
            className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-500 transition-all cursor-pointer flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          Fermeture automatique dans {pinDialogTimeout}s
        </p>
      </div>
    </Modal>
  );
};
