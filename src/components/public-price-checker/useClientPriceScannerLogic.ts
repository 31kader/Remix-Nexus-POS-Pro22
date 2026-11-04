import { useState, useEffect, useRef, useMemo } from 'react';
import { Product, CompanySettings, Promotion } from '../../types';
import { playScanBeep } from './priceUtils';

interface UseClientPriceScannerLogicProps {
  products: Product[];
  settings: CompanySettings;
  promotions?: Promotion[];
}

export function useClientPriceScannerLogic({
  products = [],
  settings,
  promotions = []
}: UseClientPriceScannerLogicProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'search'>('camera');
  const [isScanning, setIsScanning] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<Product[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<any>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const storeName = settings?.name || 'Notre Magasin';

  // Assainissement défensif des articles (suppression absolue du prix d'achat et des marges)
  const safeProducts = useMemo(() => {
    return products.map(p => {
      if (!p) return p;
      const { costPrice, cost_price, ...clean } = p as any;
      return clean as Product;
    });
  }, [products]);

  // Recherche produit dans le catalogue local
  const lookupProduct = (rawQuery: string): Product | null => {
    const term = rawQuery.trim().toLowerCase();
    if (!term) return null;

    const exact = safeProducts.find(p => p && (
      (p.barcode && String(p.barcode).trim().toLowerCase() === term) ||
      (p.sku && String(p.sku).trim().toLowerCase() === term)
    ));
    if (exact) return exact;

    const exactName = safeProducts.find(p => p && p.name && p.name.trim().toLowerCase() === term);
    if (exactName) return exactName;

    if (term.length >= 3) {
      const partial = safeProducts.find(p => p && (
        (p.barcode && String(p.barcode).toLowerCase().includes(term)) ||
        (p.name && p.name.toLowerCase().includes(term))
      ));
      if (partial) return partial;
    }

    return null;
  };

  // Traiter un code détecté (caméra ou saisie)
  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (lastScannedCodeRef.current.code === cleanCode && now - lastScannedCodeRef.current.time < 1800) {
      return;
    }
    lastScannedCodeRef.current = { code: cleanCode, time: now };

    const prod = lookupProduct(cleanCode);
    if (prod) {
      playScanBeep(true);
      setFoundProduct(prod);
      setNotFoundBarcode(null);
      setRecentScans(prev => {
        const filtered = prev.filter(p => p.id !== prod.id);
        return [prod, ...filtered].slice(0, 5);
      });
    } else {
      playScanBeep(false);
      setFoundProduct(null);
      setNotFoundBarcode(cleanCode);
    }
  };

  // Gestion du cycle de vie du lecteur caméra
  useEffect(() => {
    if (activeMode !== 'camera' || foundProduct || notFoundBarcode) {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraError(null);

    const initCamera = async () => {
      try {
        stopCamera();

        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const formats = await window.BarcodeDetector.getSupportedFormats();
            // @ts-ignore
            const detector = new window.BarcodeDetector({ formats });

            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });

            if (!isMounted) {
              stream.getTracks().forEach(t => t.stop());
              return;
            }

            mediaStreamRef.current = stream;

            const videoTrack = stream.getVideoTracks()[0];
            const capabilities: any = videoTrack?.getCapabilities?.() || {};
            setHasTorch(Boolean(capabilities?.torch));

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.muted = true;
              await videoRef.current.play();

              const detectFrame = async () => {
                if (!isMounted || !videoRef.current || !mediaStreamRef.current) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      handleBarcodeDetected(rawValue);
                    }
                  }
                } catch (_) {}

                if (isMounted && !foundProduct && !notFoundBarcode) {
                  requestAnimationFrame(detectFrame);
                }
              };

              requestAnimationFrame(detectFrame);
              setIsScanning(true);
              return;
            }
          } catch (_) {}
        }

        const { BrowserMultiFormatReader } = await import('@zxing/library');
        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        const capabilities: any = videoTrack?.getCapabilities?.() || {};
        setHasTorch(Boolean(capabilities?.torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();

          reader.decodeFromVideoDevice(null, videoRef.current, (result: any) => {
            if (result && result.getText()) {
              handleBarcodeDetected(result.getText());
            }
          });

          setIsScanning(true);
        }
      } catch (err: any) {
        console.warn('[ClientPriceScanner] Camera access error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Accès caméra refusé. Autorisez la caméra dans votre navigateur.'
            : 'Impossible d\'activer la caméra. Utilisez le mode recherche.'
        );
      }
    };

    const timer = setTimeout(initCamera, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [activeMode, facingMode, foundProduct, notFoundBarcode]);

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (_) {}
      codeReaderRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  const handleResetScan = () => {
    setFoundProduct(null);
    setNotFoundBarcode(null);
    setSearchTerm('');
    lastScannedCodeRef.current = { code: '', time: 0 };
  };

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const t = searchTerm.trim().toLowerCase();
    return safeProducts
      .filter(p => p && (
        (p.name && p.name.toLowerCase().includes(t)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(t)) ||
        (p.sku && String(p.sku).toLowerCase().includes(t))
      ))
      .slice(0, 8);
  }, [searchTerm, safeProducts]);

  return {
    activeMode,
    setActiveMode,
    isScanning,
    cameraError,
    facingMode,
    setFacingMode,
    torchOn,
    hasTorch,
    toggleTorch,
    searchTerm,
    setSearchTerm,
    searchResults,
    foundProduct,
    setFoundProduct,
    notFoundBarcode,
    recentScans,
    videoRef,
    storeName,
    handleBarcodeDetected,
    handleResetScan
  };
}
