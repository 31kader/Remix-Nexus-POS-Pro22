import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Delete, UserCheck, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface PinLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  currentEmployeeName?: string;
  expectedPin?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onUnlock,
  currentEmployeeName = 'Caissier',
  expectedPin = '0000'
}) => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsError(false);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    setPin('');
    setIsError(false);
  };

  const verifyPin = (enteredPin: string) => {
    const customStoredPin = localStorage.getItem('nexus_pos_master_pin');
    const hasCustomConfigured = !!customStoredPin || (expectedPin && expectedPin !== '0000');

    let isValid = false;

    if (customStoredPin) {
      if (customStoredPin.startsWith('$2a$') || customStoredPin.startsWith('$2b$')) {
        try { isValid = bcrypt.compareSync(enteredPin, customStoredPin); } catch (_) {}
      } else if (customStoredPin === enteredPin) {
        isValid = true;
        try {
          const hashed = bcrypt.hashSync(enteredPin, 10);
          localStorage.setItem('nexus_pos_master_pin', hashed);
        } catch (_) {}
      }
    }

    if (!isValid && expectedPin) {
      if (expectedPin.startsWith('$2a$') || expectedPin.startsWith('$2b$')) {
        try { isValid = bcrypt.compareSync(enteredPin, expectedPin); } catch (_) {}
      } else if (expectedPin === enteredPin) {
        isValid = true;
      }
    }

    // Allow default '0000' or '1234' ONLY if no custom PIN is configured anywhere
    if (!isValid && !hasCustomConfigured && (enteredPin === '0000' || enteredPin === '1234')) {
      isValid = true;
    }

    if (isValid) {
      toast.success('Caisse déverrouillée avec succès !');
      onUnlock();
    } else {
      setIsError(true);
      toast.error('Code PIN incorrect');
      setTimeout(() => {
        setPin('');
        setIsError(false);
      }, 700);
    }
  };

  // Keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e]/95  flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 shadow-md rounded-xl w-full max-w-sm p-7 flex flex-col items-center">
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <Lock size={32} />
        </div>

        <h3 className="text-lg font-black text-white uppercase tracking-wider text-center">Caisse Verrouillée</h3>
        <p className="text-xs text-slate-400 mt-1 mb-6 text-center font-medium">
          Session : <span className="text-indigo-400 font-bold">{currentEmployeeName}</span>
        </p>

        {/* PIN Dots Display */}
        <div className={`flex items-center gap-4 mb-7 p-3 bg-slate-950/80 rounded-xl border transition-all ${isError ? 'border-rose-500 bg-rose-500/10 animate-bounce' : 'border-slate-800'}`}>
          {[0, 1, 2, 3].map((index) => {
            const filled = pin.length > index;
            return (
              <div 
                key={index} 
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  filled 
                    ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] scale-110' 
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700 text-xl font-black text-white transition-all active:scale-95 shadow-sm"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all active:scale-95"
          >
            Effacer
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700 text-xl font-black text-white transition-all active:scale-95 shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700/60 flex items-center justify-center text-slate-400 transition-all active:scale-95"
          >
            <Delete size={22} />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mt-6 text-center ">
          PIN par défaut : <span className="font-mono font-bold text-slate-400">0000</span>
        </p>

      </div>
    </div>
  );
};
