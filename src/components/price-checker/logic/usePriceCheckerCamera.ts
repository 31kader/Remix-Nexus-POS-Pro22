import { useState, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Product } from '../../../types';

interface UsePriceCheckerCameraProps {
  isOpen: boolean;
  foundProduct: Product | null;
  onCodeScanned: (code: string, isFromEnterOrScanner: boolean) => boolean;
}

export function usePriceCheckerCamera({
  isOpen,
  foundProduct,
  onCodeScanned
}: UsePriceCheckerCameraProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Caméra Barcode Scanner (pour tablettes/mobiles/webcam)
  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;
    let activeStream: MediaStream | null = null;
    let lastScannedText = '';
    let lastScanTime = 0;
    
    if (isScanning && isOpen && !foundProduct) {
      setCameraError(null);
      const startScanner = async () => {
        const videoElement = document.getElementById("camera-reader-price") as HTMLVideoElement;
        if (!videoElement) return;

        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const formats = await window.BarcodeDetector.getSupportedFormats();
            // @ts-ignore
            const detector = new window.BarcodeDetector({ formats });
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: facingMode }
            });
            activeStream = stream;
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', 'true');
            videoElement.muted = true;
            try { await videoElement.play(); } catch (_) {}

            const detect = async () => {
              if (!isOpen || !isScanning || !videoElement || !activeStream) return;
              try {
                const barcodes = await detector.detect(videoElement);
                if (barcodes.length > 0) {
                  const decodedText = barcodes[0].rawValue;
                  const now = Date.now();
                  if (decodedText !== lastScannedText || (now - lastScanTime) > 2500) {
                    onCodeScanned(decodedText, true);
                    lastScannedText = decodedText;
                    lastScanTime = now;
                  }
                }
              } catch (_) {}
              if (isOpen && isScanning && !foundProduct) {
                requestAnimationFrame(detect);
              }
            };
            detect();
            return;
          } catch (_) {}
        }

        try {
          codeReader = new BrowserMultiFormatReader();
          codeReader.decodeFromVideoDevice(
            null,
            videoElement,
            (result) => {
              if (result) {
                const decodedText = result.getText();
                const now = Date.now();
                if (decodedText !== lastScannedText || (now - lastScanTime) > 2500) {
                  onCodeScanned(decodedText, true);
                  lastScannedText = decodedText;
                  lastScanTime = now;
                }
              }
            }
          ).catch(() => {
            setIsScanning(false);
            setCameraError("Erreur d'accès à la caméra.");
          });
        } catch (_) {
          setIsScanning(false);
          setCameraError("Caméra indisponible.");
        }
      };

      setTimeout(startScanner, 200);
    }
    
    return () => {
      if (codeReader) {
        try { codeReader.reset(); } catch (_) {}
      }
      if (activeStream) {
        try {
          activeStream.getTracks().forEach(t => t.stop());
        } catch (_) {}
      }
    };
  }, [isScanning, isOpen, facingMode, foundProduct, onCodeScanned]);

  return {
    isScanning,
    setIsScanning,
    cameraError,
    setCameraError,
    facingMode,
    setFacingMode
  };
}
