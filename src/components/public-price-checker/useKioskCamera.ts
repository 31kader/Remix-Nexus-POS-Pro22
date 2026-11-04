import { useEffect, useRef } from 'react';
import { Product } from '../../types';

interface UseKioskCameraProps {
  isCameraActive: boolean;
  foundProduct: Product | null;
  onCodeDetected: (code: string) => void;
}

export function useKioskCamera({
  isCameraActive,
  foundProduct,
  onCodeDetected
}: UseKioskCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<any>(null);

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (_) {}
      codeReaderRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isCameraActive || foundProduct) {
      stopCamera();
      return;
    }

    let isMounted = true;
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
              video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            if (!isMounted) {
              stream.getTracks().forEach(t => t.stop());
              return;
            }

            mediaStreamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.muted = true;
              await videoRef.current.play();

              const loop = async () => {
                if (!isMounted || !videoRef.current || !mediaStreamRef.current) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    onCodeDetected(barcodes[0].rawValue);
                  }
                } catch (_) {}
                if (isMounted && !foundProduct) {
                  requestAnimationFrame(loop);
                }
              };
              requestAnimationFrame(loop);
              return;
            }
          } catch (_) {}
        }

        const { BrowserMultiFormatReader } = await import('@zxing/library');
        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();

          reader.decodeFromVideoDevice(null, videoRef.current, (res: any) => {
            if (res && res.getText()) {
              onCodeDetected(res.getText());
            }
          });
        }
      } catch (err) {
        console.warn('[Kiosk] Camera access unavailable:', err);
      }
    };

    const timer = setTimeout(initCamera, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isCameraActive, foundProduct, onCodeDetected]);

  return {
    videoRef,
    stopCamera
  };
}
