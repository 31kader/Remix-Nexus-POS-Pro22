import { useState, useRef } from 'react';
import bcrypt from 'bcryptjs';
import { localDb } from '../../services/LocalDatabase';
import { usePeopleStore } from '../../store/usePeopleStore';
import { getSecureItem } from '../../lib/security';

interface UseKioskSecurityPinProps {
  onExit?: () => void;
}

export function useKioskSecurityPin({ onExit }: UseKioskSecurityPinProps) {
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const pinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetPinModalTimeout = () => {
    if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
    pinTimeoutRef.current = setTimeout(() => {
      setShowPinModal(false);
      setEnteredPin('');
      setPinError(false);
    }, 8000);
  };

  const openPinModal = () => {
    setShowPinModal(true);
    setEnteredPin('');
    setPinError(false);
    resetPinModalTimeout();
  };

  const verifyPin = async (candidate: string) => {
    let customMaster = getSecureItem<string>('nexus_pos_master_pin');
    if (!customMaster) {
      customMaster = localStorage.getItem('nexus_pos_master_pin');
    }

    let isValid = false;

    if (customMaster && (customMaster.startsWith('$2a$') || customMaster.startsWith('$2b$'))) {
      try { isValid = bcrypt.compareSync(candidate, customMaster); } catch (_) {}
    }

    if (!isValid) {
      try {
        const [usersSnap, employeesSnap] = await Promise.all([
          localDb.get('users').catch(() => null),
          localDb.get('employees').catch(() => null),
        ]);
        const usersObj = (usersSnap?.exists() && usersSnap?.val()) ? usersSnap.val() : {};
        const employeesObj = (employeesSnap?.exists() && employeesSnap?.val()) ? employeesSnap.val() : {};
        const offlineCreds = getSecureItem<Record<string, any>>('nexus_offline_credentials') || {};
        const allStaff = [
          ...Object.values(usersObj),
          ...Object.values(employeesObj),
          ...(usePeopleStore.getState().users || []),
          ...(usePeopleStore.getState().employees || []),
          ...Object.values(offlineCreds),
        ];
        for (const u of allStaff as any[]) {
          const hash = u?.password_hash || u?.password || u?.pin_hash || u?.pin || u?.hash || u?.passwordHash;
          if (hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
            try {
              if (bcrypt.compareSync(candidate, hash)) {
                isValid = true;
                break;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (isValid) {
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
      setShowPinModal(false);
      if (onExit) {
        onExit();
      } else {
        window.location.search = '';
        window.location.hash = 'checkout';
      }
    } else if (candidate.length >= 4) {
      setPinError(true);
      setTimeout(() => {
        setEnteredPin('');
      }, 600);
    }
  };

  const handlePinDigit = (digit: string) => {
    setPinError(false);
    resetPinModalTimeout();
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length >= 4) {
        verifyPin(next);
      }
    }
  };

  const handlePinDelete = () => {
    resetPinModalTimeout();
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  return {
    showPinModal,
    setShowPinModal,
    enteredPin,
    pinError,
    handlePinDigit,
    handlePinDelete,
    openPinModal
  };
}
