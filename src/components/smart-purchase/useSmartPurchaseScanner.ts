import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { generateUniqueId, logAction } from '../../lib/utils';
import { scanInvoice, getStoredAiVisionKey, structureOcrTextWithGroq } from '../../services/geminiService';
import { matchProductInCatalog, parseRawInvoiceText } from './invoiceParser';
import { parseImportedFile } from './importFileParser';
import { preprocessImageForOcr, parseSmartAlgerianNumber } from '../../utils/ocrUtils';
import { Product, Supplier, InvoicePattern, PurchaseCartItem } from '../../types';

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
    const finalScannedImage = imageOverrideUrl || scannedImageUrl || results?.scannedImageUrl || '';
    setExtractedData({ ...results, scannedImageUrl: finalScannedImage });
    setDetectedOcrType(results.isPosScreenshot ? 'pos' : 'standard');

    if (results.supplierName && !selectedSupplierId) {
      const matchedSupplier = suppliers.find(s =>
        Boolean(s?.name && s.name.toLowerCase().includes((results.supplierName || '').toLowerCase()))
      );
      if (matchedSupplier) {
        setSelectedSupplierId(matchedSupplier.id);
      }
    }

    if (results.invoiceNumber && !invoiceNumber) {
      setInvoiceNumber(results.invoiceNumber);
    }

    if (results.date || results.receptionDate) {
      const dateStr = results.date || results.receptionDate;
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        setReceptionDate(dateStr.split('T')[0]);
      }
    }

    if (results.previousBalance !== undefined && results.previousBalance !== null) {
      toast.info(`Ancien solde détecté : ${results.previousBalance} DA`, { icon: '💰' });
    }

    if (results.items && Array.isArray(results.items)) {
      let mappedCount = 0;
      let unmappedCount = 0;

      // Récupérer aussi les patterns enregistrés en base (invoice_patterns) pour ce fournisseur
      const supplierPatterns = (patterns || []).filter(p => !selectedSupplierId || (p as any).supplierId === selectedSupplierId || (p as any).supplier_id === selectedSupplierId);
      const patternMappings: Record<string, string> = {};
      supplierPatterns.forEach(pat => {
        const mappings = (pat as any).itemMappings || (pat as any).item_mappings;
        if (mappings && typeof mappings === 'object') {
          Object.entries(mappings).forEach(([k, v]) => {
            if (k && v) patternMappings[k.trim().toLowerCase()] = String(v);
          });
        }
      });

      const newItems: PurchaseCartItem[] = results.items
        .map((item: any) => {
          const cleanQty = Math.max(1, parseSmartAlgerianNumber(item.qty ?? item.quantity ?? 1) || 1);
          const rawPrice = parseSmartAlgerianNumber(item.price);
          const rawTotal = parseSmartAlgerianNumber(item.total);
          const cleanDiscount = parseSmartAlgerianNumber(item.discount);
          const cleanPrice = rawPrice > 0 ? rawPrice : (rawTotal > 0 && cleanQty > 0 ? Math.round((rawTotal / cleanQty) * 100) / 100 : 0);

          const rawNameKey = String(item.name || '').trim().toLowerCase();
          const patternProductId = patternMappings[rawNameKey];

          const matchedProduct = item.productId
            ? products.find(p => p.id === item.productId)
            : patternProductId
              ? products.find(p => p.id === patternProductId)
              : matchProductInCatalog(
                  {
                    name: item.name || '',
                    barcode: item.barcode || item.code || '',
                    sku: item.sku || ''
                  },
                  products
                );

          if (matchedProduct) {
            mappedCount++;
            return {
              lineId: generateUniqueId(),
              productId: matchedProduct.id,
              productName: matchedProduct.name,
              quantity: cleanQty,
              costPrice: cleanPrice > 0 ? cleanPrice : matchedProduct.costPrice || matchedProduct.price || 0,
              taxRate: matchedProduct.taxRate || 0,
              discount: cleanDiscount,
              imageUrl: matchedProduct.imageUrl,
              isDraft: false
            };
          }

          unmappedCount++;

          return {
            lineId: generateUniqueId(),
            productId: '',
            productName: item.name || 'Article Importé',
            quantity: cleanQty,
            costPrice: cleanPrice > 0 ? cleanPrice : 0,
            taxRate: 19,
            discount: cleanDiscount,
            isDraft: true
          };
        })
        .filter((item: any): item is PurchaseCartItem => item !== null && !!item.productName);

      setCart(newItems);

      if (mappedCount > 0 && unmappedCount > 0) {
        toast.success(`${mappedCount} articles reconnus dans le catalogue, ${unmappedCount} nouveaux à créer.`);
      } else if (mappedCount > 0) {
        toast.success(`${mappedCount} articles reconnus automatiquement parmi vos ${products.length} produits !`);
      } else if (unmappedCount > 0) {
        toast.info(`${unmappedCount} articles extraits (prêts à être associés ou ajoutés au catalogue).`);
      }
    }

    setMode('manual');
    logAction(
      user?.uid || user?.id || 'system',
      user?.displayName || 'Utilisateur',
      'File Import',
      'SmartPurchase',
      `Import réussi`
    );
  };

  /**
   * ═══ OCR Local 100% Hors-Ligne (Tesseract.js + Matching Catalogue 11 177 produits) ═══
   */
  const runLocalImageOcr = async (imageFile: File) => {
    setIsOfflineScanning(true);
    setOfflineScanProgress('Prétraitement de la photo (contraste & netteté)...');
    setError(null);

    try {
      const compactImg = await createCompactInvoiceImage(imageFile);
      if (compactImg) setScannedImageUrl(compactImg);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Impossible de lire la photo.'));
        reader.readAsDataURL(imageFile);
      });

      let processedImageUrl: File | string = dataUrl;
      try {
        processedImageUrl = await preprocessImageForOcr(imageFile);
      } catch {
        // fallback to original dataUrl if canvas preprocessing fails
      }

      setOfflineScanProgress('Initialisation du moteur OCR Local (Français + Chiffres)...');
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(processedImageUrl, 'fra+eng', {
        logger: (m: any) => {
          if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
            setOfflineScanProgress(`Lecture OCR Locale de la facture : ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const extractedText = result?.data?.text || '';
      setRawOcrText(extractedText);

      if (!extractedText.trim()) {
        throw new Error("Aucun texte lisible n'a pu être détecté sur cette photo.");
      }

      setOfflineScanProgress(`Structuration intelligente des lignes avec Groq IA & Catalogue (${products.length} produits)...`);
      let parsedInvoice = parseRawInvoiceText(extractedText, suppliers, products);

      const storedKey = getStoredAiVisionKey();
      if (storedKey.startsWith('gsk_')) {
        try {
          const groqStructured = await structureOcrTextWithGroq(extractedText, storedKey);
          if (groqStructured && Array.isArray(groqStructured.items) && groqStructured.items.length > 0) {
            parsedInvoice = groqStructured;
          }
        } catch (groqErr) {
          console.warn('Groq structuring fallback to local parser:', groqErr);
        }
      }

      if (!parsedInvoice.items || parsedInvoice.items.length === 0) {
        setIsOcrInspectorOpen(true);
        throw new Error(
          "Le texte a été lu mais aucune ligne article structurée (Désignation + Quantité + Prix) n'a été isolée."
        );
      }

      applyExtractedInvoice(parsedInvoice, compactImg);
      toast.success(
        `Photo analysée (${storedKey.startsWith('gsk_') ? 'OCR + Groq IA' : 'OCR Local'}) : ${parsedInvoice.items.length} ligne(s) extraite(s) !`,
        { icon: '📸' }
      );
    } finally {
      setIsOfflineScanning(false);
    }
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
        console.warn('IA Vision indisponible ou quota atteint, bascule automatique sur OCR Local:', aiErr?.message);
        toast.info('Clé IA absente ou quota atteint : bascule automatique sur le moteur OCR Local (Hors-Ligne)...');
      }

      setIsScanning(false);
      await runLocalImageOcr(selectedFile);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'analyse de la photo");
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
