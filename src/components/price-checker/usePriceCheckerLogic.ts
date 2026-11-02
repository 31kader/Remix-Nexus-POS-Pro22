import { useState, useEffect, useRef, useCallback } from 'react';
import { Product, CompanySettings } from '../../types';
import { playScanSound, announcePrice } from '../../lib/utils';
import { useCoreStore } from '../../store/useCoreStore';
import {
  usePriceCheckerKioskPin,
  usePriceCheckerCamera,
  usePriceCheckerRemoteQueue
} from './logic';

interface UsePriceCheckerLogicProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: CompanySettings;
}

export function usePriceCheckerLogic({
  isOpen,
  onClose,
  products,
  settings
}: UsePriceCheckerLogicProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [resetCountdown, setResetCountdown] = useState<number>(5);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastProcessedScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const focusScannerInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  // 1. Kiosk & PIN Logic
  const kioskPin = usePriceCheckerKioskPin({
    isOpen,
    onClose,
    focusScannerInput
  });

  // 2. File d'étiquettes distante
  const remoteQueueState = usePriceCheckerRemoteQueue({
    isOpen,
    onClose,
    products,
    settings,
    focusScannerInput
  });

  // Horloge en direct pour la borne
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Recherche produit au scan
  const executeProductLookup = useCallback((rawCode: string, isFromEnterOrScanner: boolean = false) => {
    const cleanTerm = String(rawCode || '').trim().toLowerCase();
    if (!cleanTerm) return false;

    const now = Date.now();
    if (
      isFromEnterOrScanner &&
      lastProcessedScanRef.current.code === cleanTerm &&
      now - lastProcessedScanRef.current.time < 400
    ) {
      return true;
    }

    const allProds = (products && products.length > 0) ? products : (useCoreStore.getState().products || []);
    const exactMatch = allProds.find(p => p && (
      (p.barcode && String(p.barcode).trim().toLowerCase() === cleanTerm) ||
      (p.sku && String(p.sku).trim().toLowerCase() === cleanTerm) ||
      ((p as any).reference && String((p as any).reference).trim().toLowerCase() === cleanTerm) ||
      (p.name && String(p.name).trim().toLowerCase() === cleanTerm)
    ));

    const partialMatch = isFromEnterOrScanner && !exactMatch
      ? allProds.find(p => p && (
          (p.barcode && String(p.barcode).toLowerCase().includes(cleanTerm)) ||
          (p.sku && String(p.sku).toLowerCase().includes(cleanTerm)) ||
          (p.name && String(p.name).toLowerCase().includes(cleanTerm))
        ))
      : undefined;

    const product = exactMatch || partialMatch;
    if (product) {
      lastProcessedScanRef.current = { code: cleanTerm, time: now };
      setFoundProduct(product);
      setNotFoundCode(null);
      setSearchTerm('');
      setResetCountdown(5);
      playScanSound();
      announcePrice(product.name, product.price, settings?.currency || 'DA');
      
      if (remoteQueueState.autoQueueOnScan && !kioskPin.isKioskMode) {
        remoteQueueState.handleAddToRemoteQueue(product, remoteQueueState.labelQty, false);
      }
      focusScannerInput();
      return true;
    } else if (isFromEnterOrScanner) {
      setFoundProduct(null);
      setNotFoundCode(rawCode.trim());
      setSearchTerm('');
      setResetCountdown(4);
      focusScannerInput();
    }
    return false;
  }, [products, settings, remoteQueueState, kioskPin.isKioskMode, focusScannerInput]);

  // 3. Caméra Scanner
  const cameraState = usePriceCheckerCamera({
    isOpen,
    foundProduct,
    onCodeScanned: executeProductLookup
  });

  // Décompte automatique de 5 secondes après affichage en Mode Borne
  useEffect(() => {
    if (!isOpen || !kioskPin.isKioskMode || (!foundProduct && !notFoundCode)) {
      setResetCountdown(5);
      if (resetTimerRef.current) clearInterval(resetTimerRef.current);
      return;
    }

    setResetCountdown(5);
    const interval = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFoundProduct(null);
          setNotFoundCode(null);
          setSearchTerm('');
          focusScannerInput();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    resetTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [foundProduct, notFoundCode, kioskPin.isKioskMode, isOpen, focusScannerInput]);

  // Wake Lock implementation (écran toujours allumé sur la borne)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (isOpen && 'wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    if (isOpen) requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
      }
    };
  }, [isOpen]);

  // Douchette globale USB / Bluetooth
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (kioskPin.showPinModal) return;

      const target = e.target as HTMLElement;
      const isPriceInput = target === inputRef.current || target?.id === 'price-checker-input';

      if (isPriceInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const currentVal = (inputRef.current?.value || searchTerm || buffer).trim();
          if (currentVal) {
            executeProductLookup(currentVal, true);
          }
          buffer = '';
        }
        return;
      }

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTimeVal = Date.now();
      if (currentTimeVal - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = currentTimeVal;

      if (e.key === 'Escape') {
        if (kioskPin.isKioskMode) {
          kioskPin.handleAttemptExit();
        } else {
          onClose();
        }
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          executeProductLookup(buffer, true);
          buffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
        if (buffer.length > 50) buffer = buffer.slice(-50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isOpen, searchTerm, kioskPin, executeProductLookup, onClose]);

  useEffect(() => {
    if (!isOpen) {
      cameraState.setIsScanning(false);
      setSearchTerm('');
      setFoundProduct(null);
      setNotFoundCode(null);
      cameraState.setCameraError(null);
      kioskPin.setShowPinModal(false);
    }
  }, [isOpen]);

  return {
    isKioskMode: kioskPin.isKioskMode,
    toggleKioskMode: kioskPin.toggleKioskMode,
    searchTerm,
    setSearchTerm,
    foundProduct,
    setFoundProduct,
    notFoundCode,
    setNotFoundCode,
    isScanning: cameraState.isScanning,
    setIsScanning: cameraState.setIsScanning,
    cameraError: cameraState.cameraError,
    facingMode: cameraState.facingMode,
    setFacingMode: cameraState.setFacingMode,
    remoteQueue: remoteQueueState.remoteQueue,
    setRemoteQueue: remoteQueueState.setRemoteQueue,
    autoQueueOnScan: remoteQueueState.autoQueueOnScan,
    setAutoQueueOnScan: remoteQueueState.setAutoQueueOnScan,
    labelQty: remoteQueueState.labelQty,
    setLabelQty: remoteQueueState.setLabelQty,
    showQueueDrawer: remoteQueueState.showQueueDrawer,
    setShowQueueDrawer: remoteQueueState.setShowQueueDrawer,
    currentTime,
    resetCountdown,
    showPinModal: kioskPin.showPinModal,
    setShowPinModal: kioskPin.setShowPinModal,
    enteredPin: kioskPin.enteredPin,
    setEnteredPin: kioskPin.setEnteredPin,
    pinError: kioskPin.pinError,
    pinDialogTimeout: kioskPin.pinDialogTimeout,
    inputRef,
    focusScannerInput,
    handleAttemptExit: kioskPin.handleAttemptExit,
    verifyEnteredPin: kioskPin.verifyEnteredPin,
    handlePinDigitPress: kioskPin.handlePinDigitPress,
    handlePinBackspace: kioskPin.handlePinBackspace,
    handleAddToRemoteQueue: remoteQueueState.handleAddToRemoteQueue,
    handlePrintQueueNow: remoteQueueState.handlePrintQueueNow,
    handleOpenInLabelStudio: remoteQueueState.handleOpenInLabelStudio,
    executeProductLookup,
    totalLabelsInQueue: remoteQueueState.totalLabelsInQueue
  };
}
