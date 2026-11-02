import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { scanInvoice, getStoredAiVisionKey } from '../../services/geminiService';
import { parseImportedFile } from './importFileParser';
import { Product, Supplier, InvoicePattern, PurchaseCartItem } from '../../types';
import { applyExtractedInvoiceService } from './applyExtractedInvoiceService';
import { runLocalImageOcrService } from './runLocalImageOcrService';

interface UseSmartPurchaseScannerProps {
  products: Product[];
  suppliers: Supplier[];
  patterns: InvoicePattern[];
  user: any;
  setCart: React.Dispatch<React.SetStateAction<PurchaseCartItem[]>>;
  setSelectedSupplierId: (id: string) => void;
  setInvoiceNumber: (num: string) => void;
  setReceptionDate: (date: string) => void;
  setMode: (mode: 'manual' | 'scan') => void;
  scanMethod: 'ai' | 'ocr';
  selectedSupplierId: string;
  invoiceNumber: string;
}

export function useSmartPurchaseScanner({
  products,
  suppliers,
  patterns,
  user,
  setCart,
  setSelectedSupplierId,
  setInvoiceNumber,
  setReceptionDate,
  setMode,
  scanMethod,
  selectedSupplierId,
  invoiceNumber,
}: UseSmartPurchaseScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [scannedImageUrl, setScannedImageUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMockOption, setShowMockOption] = useState(false);
  const [isOfflineScanning, setIsOfflineScanning] = useState(false);
  const [offlineScanProgress, setOfflineScanProgress] = useState<string>('');
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [isOcrInspectorOpen, setIsOcrInspectorOpen] = useState(false);
  const [detectedOcrType, setDetectedOcrType] = useState<'pos' | 'standard'>('standard');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compresse la photo du bon d'achat (max 1100px, JPEG 0.72) pour sauvegarde dans l'historique produit & Supabase
  const createCompactInvoiceImage = (rawFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1100;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.72));
              return;
            }
          } catch (_) {}
          resolve(dataUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(rawFile);
    });
  };

  const applyExtractedInvoice = (results: any, imageOverrideUrl?: string) => {
    applyExtractedInvoiceService({
      results,
      imageOverrideUrl,
      scannedImageUrl,
      suppliers,
      products,
      patterns,
      selectedSupplierId,
      invoiceNumber,
      user,
      setExtractedData,
      setDetectedOcrType,
      setSelectedSupplierId,
      setInvoiceNumber,
      setReceptionDate,
      setCart,
      setMode
    });
  };

  /**
   * ═══ OCR Local 100% Hors-Ligne (Tesseract.js + Matching Catalogue 11 177 produits) ═══
   */
  const runLocalImageOcr = async (imageFile: File) => {
    await runLocalImageOcrService({
      imageFile,
      suppliers,
      products,
      createCompactInvoiceImage,
      setScannedImageUrl,
      setIsOfflineScanning,
      setOfflineScanProgress,
      setError,
      setRawOcrText,
      setIsOcrInspectorOpen,
      applyExtractedInvoice
    });
  };

  // ═══ Import CSV / Excel / PDF / Photo OCR Local ═══
  const processFileOffline = async (selectedFile: File) => {
    setIsOfflineScanning(true);
    setOfflineScanProgress('Lecture du fichier...');
    setError(null);
    setFile(selectedFile);

    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const isImage =
        selectedFile.type.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext);

      if (isImage) {
        await runLocalImageOcr(selectedFile);
        return;
      }

      if (['csv', 'txt', 'tsv', 'xlsx', 'xls'].includes(ext)) {
        setOfflineScanProgress(`Import du fichier ${ext.toUpperCase()}...`);
        const results = await parseImportedFile(selectedFile, suppliers, products);

        setRawOcrText(results.columnMapping || '');
        applyExtractedInvoice(results);
        setIsOfflineScanning(false);

        const source = results.importSource === 'excel' ? 'Excel' : 'CSV';
        toast.success(`Fichier ${source} importé : ${(results.items || []).length} articles extraits !`, { icon: '📂' });
      } else if (ext === 'pdf') {
        setOfflineScanProgress('Extraction du texte PDF...');
        const results = await parseImportedFile(selectedFile, suppliers, products);

        setRawOcrText(results.columnMapping || '');
        applyExtractedInvoice(results);
        setIsOfflineScanning(false);

        toast.success(`PDF importé : ${(results.items || []).length} articles extraits !`, { icon: '📄' });
      } else {
        throw new Error('Format non supporté. Utilisez une Photo (JPG, PNG, WebP), Excel (.xlsx), CSV ou PDF.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Échec de l'analyse du fichier");
      setIsOfflineScanning(false);
    }
  };

  // ═══ Scan Hybride Photo : IA Vision (Groq / OpenRouter / Gemini) + Bascule Automatique OCR Local ═══
  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setShowMockOption(false);

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (['csv', 'txt', 'tsv', 'xlsx', 'xls', 'pdf'].includes(ext) && !selectedFile.type.startsWith('image/')) {
      await processFileOffline(selectedFile);
      return;
    }

    setIsScanning(true);
    try {
      const compactImg = await createCompactInvoiceImage(selectedFile);
      if (compactImg) setScannedImageUrl(compactImg);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Impossible de lire le fichier image'));
        reader.readAsDataURL(selectedFile);
      });

      const base64 = dataUrl.split(',')[1];
      const storedKey = getStoredAiVisionKey();

      try {
        const results = await scanInvoice(base64, selectedFile.type || 'image/jpeg', storedKey);
        if (results && Array.isArray(results.items) && results.items.length > 0) {
          applyExtractedInvoice(results, compactImg);
          const providerLabel = storedKey.startsWith('gsk_')
            ? 'Groq Vision IA'
            : storedKey.startsWith('sk-or-')
              ? 'OpenRouter Vision IA'
              : 'Gemini Vision IA';
          toast.success(`Facture analysée avec succès via ${providerLabel} !`, { icon: '✨' });
          setIsScanning(false);
          return;
        }
      } catch (aiErr: any) {
        const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) || String(aiErr?.message || '').toLowerCase().includes('failed to fetch');
        if (isOffline) {
          toast.info('Mode déconnecté détecté : bascule automatique sur le moteur OCR Local...');
        } else {
          console.warn('IA Vision indisponible ou quota atteint, bascule automatique sur OCR Local:', aiErr?.message);
          toast.info('Clé IA indisponible : bascule automatique sur le moteur OCR Local...');
        }
      }

      setIsScanning(false);
      await runLocalImageOcr(selectedFile);
    } catch (err: any) {
      const isOfflineErr = (typeof navigator !== 'undefined' && !navigator.onLine) ||
        String(err?.message || '').toLowerCase().includes('failed to fetch') ||
        String(err?.message || '').toLowerCase().includes('network');
      const friendlyMsg = isOfflineErr
        ? "Connexion Internet requise pour le téléchargement initial du modèle OCR ou l'analyse IA. En mode hors-ligne, vous pouvez saisir le bon d'achat directement en mode manuel."
        : (err.message || "Erreur lors de l'analyse de la photo");
      setError(friendlyMsg);
      setShowMockOption(true);
      setIsScanning(false);
    }
  };

  const simulateInvoiceScanning = () => {
    toast.error('Veuillez sélectionner une vraie photo ou un fichier de facture.', { icon: '🚫', duration: 4000 });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (scanMethod === 'ai') {
        await processFile(selectedFile);
      } else {
        await processFileOffline(selectedFile);
      }
    }
  };

  return {
    file,
    setFile,
    isScanning,
    setIsScanning,
    extractedData,
    setExtractedData,
    error,
    setError,
    showMockOption,
    setShowMockOption,
    isOfflineScanning,
    setIsOfflineScanning,
    offlineScanProgress,
    setOfflineScanProgress,
    rawOcrText,
    setRawOcrText,
    isOcrInspectorOpen,
    setIsOcrInspectorOpen,
    detectedOcrType,
    setDetectedOcrType,
    fileInputRef,
    handleFileChange,
    processFile,
    processFileOffline,
    simulateInvoiceScanning
  };
}
