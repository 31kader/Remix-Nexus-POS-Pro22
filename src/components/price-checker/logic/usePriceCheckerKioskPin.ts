import { useState, useEffect, useRef } from 'react';
import bcrypt from 'bcryptjs';
import { get as getIDB } from 'idb-keyval';
import { getSecureItem } from '../../../lib/security';
import { toast } from 'sonner';

interface UsePriceCheckerKioskPinProps {
  isOpen: boolean;
  onClose: () => void;
  focusScannerInput: () => void;
}

export function usePriceCheckerKioskPin({
  isOpen,
  onClose,
  focusScannerInput
}: UsePriceCheckerKioskPinProps) {
  // Mode Borne Client (Kiosque plein écran) vs Mode Gestion Rayon
  const [isKioskMode, setIsKioskMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_price_checker_kiosk_mode');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [pinDialogTimeout, setPinDialogTimeout] = useState<number>(5);
  const pinTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleKioskMode = (enabled: boolean) => {
    setIsKioskMode(enabled);
    try {
      localStorage.setItem('nexus_price_checker_kiosk_mode', enabled ? 'true' : 'false');
    } catch (_) {}
    focusScannerInput();
  };

  // Décompte de sécurité de 5 secondes sur la boîte de PIN
  useEffect(() => {
    if (!showPinModal) {
      setPinDialogTimeout(5);
      if (pinTimerRef.current) clearInterval(pinTimerRef.current);
      return;
    }

    setPinDialogTimeout(5);
    const interval = setInterval(() => {
      setPinDialogTimeout((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowPinModal(false);
          setEnteredPin('');
          setPinError(false);
          focusScannerInput();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    pinTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [showPinModal]);

  // Tentative de fermeture / sortie de la borne
  const handleAttemptExit = () => {
    if (isKioskMode) {
      setShowPinModal(true);
      setEnteredPin('');
      setPinError(false);
      setPinDialogTimeout(5);
    } else {
      onClose();
    }
  };

  // Vérification sécurisée du Code PIN
  const verifyEnteredPin = async (candidatePin: string) => {
    const customStoredPin = getSecureItem<string>('nexus_pos_master_pin');
    let isValid = false;

    // 1. Vérification contre Master PIN (Bcrypt $2a$ / $2b$ uniquement)
    if (customStoredPin && (customStoredPin.startsWith('$2a$') || customStoredPin.startsWith('$2b$'))) {
      try { isValid = bcrypt.compareSync(candidatePin, customStoredPin); } catch (_) {}
    }

    // 2. Vérification contre n'importe quel employé/utilisateur local (Bcrypt $2a$ / $2b$ uniquement)
    if (!isValid) {
      try {
        const [usersObj, employeesObj] = await Promise.all([
          getIDB<Record<string, any>>('nexus_db_users').catch(() => null),
          getIDB<Record<string, any>>('nexus_db_employees').catch(() => null)
        ]);
        const allStaff = [
          ...(usersObj ? Object.values(usersObj) : []),
          ...(employeesObj ? Object.values(employeesObj) : [])
        ];
        for (const u of allStaff) {
          const hash = u?.password_hash || u?.pin_hash;
          if (hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
            try {
              if (bcrypt.compareSync(candidatePin, hash)) {
                isValid = true;
                break;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (isValid) {
      toast.success("Borne déverrouillée avec succès !");
      setShowPinModal(false);
      setEnteredPin('');
      onClose();
    } else {
      setPinError(true);
      toast.error("Code PIN incorrect");
      setTimeout(() => {
        setEnteredPin('');
        setPinError(false);
      }, 700);
    }
  };

  const handlePinDigitPress = (digit: string) => {
    setPinDialogTimeout(5);
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        verifyEnteredPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinDialogTimeout(5);
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  // Clavier physique pour la modale PIN
  useEffect(() => {
    if (!showPinModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      setPinDialogTimeout(5);
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        setShowPinModal(false);
        setEnteredPin('');
        focusScannerInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, enteredPin]);

  return {
    isKioskMode,
    toggleKioskMode,
    showPinModal,
    setShowPinModal,
    enteredPin,
    setEnteredPin,
    pinError,
    pinDialogTimeout,
    handleAttemptExit,
    verifyEnteredPin,
    handlePinDigitPress,
    handlePinBackspace
  };
}
