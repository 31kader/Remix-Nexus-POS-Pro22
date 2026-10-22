import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Delete, UserCheck, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import { getSecureItem, setSecureItem } from '../lib/security';
import { getLocalValue } from '../lib/local-db';

const PIN_LOCK_DURATION_MS = 60 * 1000;
const PIN_MAX_ATTEMPTS = 5;

const isBcryptHash = (val?: string | null): val is string =>
  typeof val === 'string' && (val.startsWith('$2a$') || val.startsWith('$2b$'));

interface PinLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  currentEmployeeName?: string;
  currentEmployeeEmail?: string;
  expectedPin?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onUnlock,
  currentEmployeeName = 'Caissier',
  currentEmployeeEmail,
  expectedPin
}) => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    setPin('');
    setIsError(false);
    const checkLockStatus = () => {
      const lockUntil = Number(getSecureItem<string>('nexus_pin_lock_until') || '0');
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockRemainingSeconds(remaining);
    };
    checkLockStatus();
    const interval = setInterval(checkLockStatus, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (lockRemainingSeconds > 0) {
      toast.error(`Terminal verrouillé. Patientez ${lockRemainingSeconds}s.`);
      return;
    }
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        void verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (lockRemainingSeconds > 0) return;
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    if (lockRemainingSeconds > 0) return;
    setPin('');
    setIsError(false);
  };

  const verifyPin = async (enteredPin: string) => {
    const lockUntil = Number(getSecureItem<string>('nexus_pin_lock_until') || '0');
    if (Date.now() < lockUntil) {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockRemainingSeconds(remaining);
      toast.error(`Terminal verrouillé. Patientez ${remaining}s.`);
      return;
    }

    const customStoredPin = getSecureItem<string>('nexus_pos_master_pin');
    let isValid = false;

    // 🛡️ Vérification cryptographique stricte Bcrypt ($2a$ / $2b$) uniquement
    if (isBcryptHash(customStoredPin)) {
      try {
        isValid = bcrypt.compareSync(enteredPin, customStoredPin);
      } catch (_) {}
    }

    if (!isValid && isBcryptHash(expectedPin)) {
      try {
        isValid = bcrypt.compareSync(enteredPin, expectedPin);
      } catch (_) {}
    }

    // Vérifier le cache d'identifiants hors-ligne chiffré (session courante)
    if (!isValid) {
      const offlineCreds = getSecureItem<Record<string, any>>('nexus_offline_credentials');
      if (offlineCreds && typeof offlineCreds === 'object') {
        const emailNorm = (currentEmployeeEmail || '').trim().toLowerCase();
        const candidateRecords = emailNorm && offlineCreds[emailNorm]
          ? [offlineCreds[emailNorm]]
          : Object.values(offlineCreds);

        for (const cred of candidateRecords) {
          const hash = cred?.hash || cred?.passwordHash;
          if (isBcryptHash(hash)) {
            try {
              if (bcrypt.compareSync(enteredPin, hash)) {
                isValid = true;
                break;
              }
            } catch (_) {}
          }
        }
      }
    }

    // Vérifier les enregistrements locaux (users / employees) disposant d'un hash bcrypt
    if (!isValid) {
      const emailNorm = (currentEmployeeEmail || '').trim().toLowerCase();
      const nameNorm = (currentEmployeeName || '').trim().toLowerCase();
      const localCollections = [getLocalValue('employees'), getLocalValue('users')];
      for (const col of localCollections) {
        if (!col || typeof col !== 'object') continue;
        for (const rec of Object.values(col) as any[]) {
          if (!rec) continue;
          const recEmail = String(rec.email || '').trim().toLowerCase();
          const recName = String(rec.name || rec.displayName || '').trim().toLowerCase();
          if ((emailNorm && recEmail === emailNorm) || (nameNorm && recName === nameNorm)) {
            const candidateHashes = [rec.pin, rec.passwordHash, rec.password_hash].filter(isBcryptHash);
            for (const h of candidateHashes) {
              try {
                if (bcrypt.compareSync(enteredPin, h)) {
                  isValid = true;
                  break;
                }
              } catch (_) {}
            }
          }
          if (isValid) break;
        }
        if (isValid) break;
      }
    }

    // Fallback serveur via l'API d'authentification si l'email de l'opérateur actif est connu
    if (!isValid && currentEmployeeEmail) {
      const tablesToTry = ['employees', 'users'];
      for (const tbl of tablesToTry) {
        try {
          const res = await fetch('/api/auth/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: tbl, email: currentEmployeeEmail, password: enteredPin }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.valid || data?.id) {
              isValid = true;
              break;
            }
          }
        } catch (_) {}
      }
    }

    if (isValid) {
      setSecureItem('nexus_pin_failures', '0');
      setSecureItem('nexus_pin_lock_until', '0');
      setLockRemainingSeconds(0);
      toast.success('Caisse déverrouillée avec succès !');
      onUnlock();
    } else {
      const currentFailures = Number(getSecureItem<string>('nexus_pin_failures') || '0') + 1;
      if (currentFailures >= PIN_MAX_ATTEMPTS) {
        const lockTarget = Date.now() + PIN_LOCK_DURATION_MS;
        setSecureItem('nexus_pin_lock_until', lockTarget.toString());
        setSecureItem('nexus_pin_failures', '0');
        setLockRemainingSeconds(60);
        toast.error('Trop de tentatives incorrectes. Terminal verrouillé pendant 60 secondes.');
      } else {
        setSecureItem('nexus_pin_failures', currentFailures.toString());
        toast.error(`Code PIN incorrect (${PIN_MAX_ATTEMPTS - currentFailures} tentative(s) restante(s))`);
      }
      setIsError(true);
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
      if (lockRemainingSeconds > 0) return;
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
  }, [isOpen, pin, lockRemainingSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#06080e]/95 flex items-center justify-center p-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-[max(env(safe-area-inset-bottom,0px),16px)] select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 shadow-md rounded-xl w-full max-w-sm p-7 flex flex-col items-center">
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <Lock size={32} />
        </div>

        <h3 className="text-lg font-black text-white uppercase tracking-wider text-center">Caisse Verrouillée</h3>
        <p className="text-xs text-slate-400 mt-1 mb-6 text-center font-medium">
          Session : <span className="text-indigo-400 font-bold">{currentEmployeeName}</span>
        </p>

        {lockRemainingSeconds > 0 && (
          <div className="w-full mb-4 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold text-center flex items-center justify-center gap-2 animate-pulse">
            <ShieldAlert size={16} />
            <span>Verrouillé : {lockRemainingSeconds}s restante(s)</span>
          </div>
        )}

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
              disabled={lockRemainingSeconds > 0}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700 text-xl font-black text-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            disabled={lockRemainingSeconds > 0}
            onClick={handleClear}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Effacer
          </button>

          <button
            type="button"
            disabled={lockRemainingSeconds > 0}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700 text-xl font-black text-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>

          <button
            type="button"
            disabled={lockRemainingSeconds > 0}
            onClick={handleDelete}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700/60 flex items-center justify-center text-slate-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Delete size={22} />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mt-6 text-center">
          Sécurité renforcée : PIN chiffré (bcrypt)
        </p>

      </div>
    </div>
  );
};
