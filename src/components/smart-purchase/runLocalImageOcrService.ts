import { Product, Supplier } from '../../types';
import { getStoredAiVisionKey, structureOcrTextWithGroq } from '../../services/geminiService';
import { parseRawInvoiceText } from './invoiceParser';
import { preprocessImageForOcr } from '../../utils/ocrUtils';
import { toast } from 'sonner';

export interface RunLocalImageOcrParams {
  imageFile: File;
  suppliers: Supplier[];
  products: Product[];
  createCompactInvoiceImage: (rawFile: File) => Promise<string>;
  setScannedImageUrl: (url: string) => void;
  setIsOfflineScanning: (scanning: boolean) => void;
  setOfflineScanProgress: (progress: string) => void;
  setError: (err: string | null) => void;
  setRawOcrText: (text: string) => void;
  setIsOcrInspectorOpen: (open: boolean) => void;
  applyExtractedInvoice: (results: any, imageOverrideUrl?: string) => void;
}

export async function runLocalImageOcrService({
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
  applyExtractedInvoice,
}: RunLocalImageOcrParams): Promise<void> {
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
}
