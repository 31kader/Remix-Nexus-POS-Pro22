import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal, Button } from './ui';
import { usePeopleStore } from '../store/usePeopleStore';
import { useCoreStore } from '../store/useCoreStore';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface SupervisorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reason?: string;
  onApproved: (supervisorName: string) => void;
}

export function SupervisorPinModal({
  isOpen,
  onClose,
  title = 'Autorisation Superviseur Requise',
  reason = 'Cette action sensible nécessite la validation d’un responsable.',
  onApproved,
}: SupervisorPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const users = usePeopleStore(s => s.users);
  const settings = useCoreStore(s => s.settings);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setError(null);
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleVerify = () => {
    if (!pin) {
      setError('Veuillez saisir un code PIN');
      return;
    }

    // 1. Vérification contre le PIN maître de la société si configuré
    const configuredMasterPin = (settings as any).adminPin || (settings as any).masterPin;
    const masterPinToTest = configuredMasterPin || '1234';

    let isMasterMatch = false;
    if (masterPinToTest.startsWith('$2a$') || masterPinToTest.startsWith('$2b$')) {
      try { isMasterMatch = bcrypt.compareSync(pin, masterPinToTest); } catch (_) {}
    } else if (pin === masterPinToTest) {
      isMasterMatch = true;
    }

    if (isMasterMatch) {
      toast.success('Autorisation accordée par le Gérant');
      onApproved('Gérant (PIN Maître)');
      handleClear();
      onClose();
      return;
    }

    // 2. Vérification contre les profils Admin / Manager
    const supervisor = (users || []).find(u => {
      if (u.role !== 'admin' && u.role !== 'manager') return false;
      const uPin = (u as any).pin || (u as any).posPin || u.password;
      if (!uPin) return false;
      if (uPin.startsWith('$2a$') || uPin.startsWith('$2b$')) {
        try { return bcrypt.compareSync(pin, uPin); } catch (_) { return false; }
      }
      return uPin === pin;
    });

    if (supervisor) {
      const supervisorName = supervisor.displayName || supervisor.email || 'Superviseur';
      toast.success(`Autorisation accordée par ${supervisorName}`);
      onApproved(supervisorName);
      handleClear();
      onClose();
      return;
    }

    setError('Code PIN incorrect ou droits insuffisants');
    setPin('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col items-center p-2 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <ShieldCheck size={36} />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-300">{reason}</p>
          <p className="text-xs text-slate-500">Saisissez le PIN Administrateur ou Superviseur</p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border transition-all ${
                pin.length > i
                  ? 'bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-400/30'
                  : 'bg-slate-800 border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === '⌫') handleBackspace();
                else handleDigit(btn);
              }}
              className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-lg font-black text-white hover:text-amber-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-3 text-slate-400 hover:text-white"
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleVerify}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
          >
            Valider
          </Button>
        </div>
      </div>
    </Modal>
  );
}
