import { useState, useRef } from 'react';

interface UseEmployeeSignatureParams {
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  setSignatureSaved: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useEmployeeSignature({ setFormData, setSignatureSaved }: UseEmployeeSignatureParams) {
  const [isSignDrawing, setIsSignDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const getCanvasCoords = (canvas: HTMLCanvasElement, e: any) => {
    // If rectRef is not loaded, do a lazy read (or default to getBoundingClientRect)
    const rect = rectRef.current || canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Scale coordinates accurately based on actual HTML dynamic width/height vs CSS bounding rect
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Cache bounding box to avoid heavy layout reflow (layout thrashing) on mousemove
    rectRef.current = canvas.getBoundingClientRect();
    
    ctx.beginPath();
    const coords = getCanvasCoords(canvas, e);
    ctx.moveTo(coords.x, coords.y);
    setIsSignDrawing(true);
  };

  const drawSign = (e: any) => {
    if (!isSignDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }
    
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = document.documentElement.classList.contains('light') ? '#1e1b4b' : '#a5b4fc';
    
    const coords = getCanvasCoords(canvas, e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsSignDrawing(false);
    rectRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData((prev: any) => ({ ...prev, digitalSignatureUrl: '' }));
    setSignatureSaved(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setFormData((prev: any) => ({ ...prev, digitalSignatureUrl: dataUrl }));
    setSignatureSaved(true);
  };

  return {
    isSignDrawing,
    setIsSignDrawing,
    canvasRef,
    startDrawing,
    drawSign,
    endDrawing,
    clearCanvas,
    saveSignature
  };
}
