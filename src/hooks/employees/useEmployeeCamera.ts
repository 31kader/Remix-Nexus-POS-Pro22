import { useState, useRef, useEffect } from 'react';

interface UseEmployeeCameraParams {
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isModalOpen: boolean;
}

export function useEmployeeCamera({ setFormData, isModalOpen }: UseEmployeeCameraParams) {
  const [cameraActiveSection, setCameraActiveSection] = useState<'recto' | 'verso' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setCameraActiveSection(null);
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error("Error stopping camera track", e);
        }
      }
    }
  }, [isModalOpen]);

  const startCamera = async (section: 'recto' | 'verso') => {
    setCameraActiveSection(section);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(e => console.error("Error playing video stream", e));
        }
      } catch (err) {
        console.error("Camera access failed", err);
        alert("Impossible d'activer la caméra. Veuillez sélectionner une image manuellement.");
        setCameraActiveSection(null);
      }
    }, 120);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("Error stopping camera", e);
      }
    }
    setCameraActiveSection(null);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      if (cameraActiveSection === 'recto') {
        setFormData((prev: any) => ({ ...prev, idCardRectoUrl: dataUrl }));
      } else {
        setFormData((prev: any) => ({ ...prev, idCardVersoUrl: dataUrl }));
      }
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, section: 'recto' | 'verso') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (section === 'recto') {
          setFormData((prev: any) => ({ ...prev, idCardRectoUrl: base64String }));
        } else {
          setFormData((prev: any) => ({ ...prev, idCardVersoUrl: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return {
    cameraActiveSection,
    setCameraActiveSection,
    videoRef,
    startCamera,
    stopCamera,
    takePhoto,
    handleFileUpload
  };
}
