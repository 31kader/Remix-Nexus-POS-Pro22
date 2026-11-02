import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Product, CompanySettings, Promotion } from '../../types';
import { announcePrice } from '../../lib/utils';
import { getProductPriceDetails, playScanBeep } from './priceUtils';
import { useKioskCamera } from './useKioskCamera';
import { useKioskSecurityPin } from './useKioskSecurityPin';

interface UseKioskPriceLogicProps {
  products: Product[];
  settings: CompanySettings;
  promotions?: Promotion[];
  onExit?: () => void;
}

export function useKioskPriceLogic({
  products = [],
  settings,
  promotions = [],
  onExit
}: UseKioskPriceLogicProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Compte à rebours 5 secondes pour réinitialisation automatique
  const [countdown, setCountdown] = useState<number>(5);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const storeName = settings?.name || 'Notre Magasin';

  // 1. Horloge en direct
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // Assainissement défensif des articles (suppression absolue du prix d'achat et des marges)
  const safeProducts = useMemo(() => {
    return products.map(p => {
      if (!p) return p;
      const { costPrice, cost_price, ...clean } = p as any;
      return clean as Product;
    });
  }, [products]);

  // 2. Recherche produit dans le catalogue
  const executeLookup = useCallback((rawCode: string) => {
    const clean = rawCode.trim().toLowerCase();
    if (!clean) return;

    const now = Date.now();
    if (lastScanRef.current.code === clean && now - lastScanRef.current.time < 1200) {
      return;
    }
    lastScanRef.current = { code: clean, time: now };

    const match = safeProducts.find(p => p && (
      (p.barcode && String(p.barcode).trim().toLowerCase() === clean) ||
      (p.sku && String(p.sku).trim().toLowerCase() === clean) ||
      (p.name && p.name.trim().toLowerCase() === clean)
    )) || (clean.length >= 3 ? safeProducts.find(p => p && (
      (p.barcode && String(p.barcode).toLowerCase().includes(clean)) ||
      (p.name && p.name.toLowerCase().includes(clean))
    )) : null);

    if (match) {
      playScanBeep(true);
      setFoundProduct(match);
      setNotFoundCode(null);
      setCountdown(5);

      if (voiceEnabled) {
        const details = getProductPriceDetails(match, promotions);
        announcePrice(match.name, details.finalPrice, settings?.currency || 'DA');
      }
    } else {
      playScanBeep(false);
      setFoundProduct(null);
      setNotFoundCode(clean);
      setCountdown(4);
    }
  }, [safeProducts, voiceEnabled, promotions, settings]);

  // Sous-hook Caméra
  const { videoRef } = useKioskCamera({
    isCameraActive,
    foundProduct,
    onCodeDetected: executeLookup
  });

  // Sous-hook Sécurité PIN
  const {
    showPinModal,
    setShowPinModal,
    enteredPin,
    pinError,
    handlePinDigit,
    handlePinDelete,
    openPinModal
  } = useKioskSecurityPin({ onExit });

  // 3. Écoute globale de la Douchette Code-barres USB / Bluetooth (Clavier HID)
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPinModal) return;

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 150) {
        keyBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 2) {
          e.preventDefault();
          executeLookup(keyBuffer);
          keyBuffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        keyBuffer += e.key;
        if (keyBuffer.length > 50) keyBuffer = keyBuffer.slice(-50);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showPinModal, executeLookup]);

  // 5. Compte à rebours de réinitialisation automatique (5s)
  useEffect(() => {
    if (!foundProduct && !notFoundCode) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          setFoundProduct(null);
          setNotFoundCode(null);
          lastScanRef.current = { code: '', time: 0 };
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [foundProduct, notFoundCode]);

  // 6. Gestion du Plein Écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return {
    currentTime,
    foundProduct,
    setFoundProduct,
    notFoundCode,
    setNotFoundCode,
    voiceEnabled,
    setVoiceEnabled,
    isCameraActive,
    setIsCameraActive,
    isFullscreen,
    toggleFullscreen,
    countdown,
    showPinModal,
    setShowPinModal,
    enteredPin,
    pinError,
    handlePinDigit,
    handlePinDelete,
    openPinModal,
    videoRef,
    storeName,
    executeLookup
  };
}
