import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { generateUniqueId, logAction } from '../../lib/utils';
import { scanInvoice } from '../../services/geminiService';
import { matchProductInCatalog } from './invoiceParser';
import { parseImportedFile } from './importFileParser';
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

  const applyExtractedInvoice = (results: any) => {
    setExtractedData(results);
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

      const newItems: PurchaseCartItem[] = results.items
        .map((item: any) => {
          const matchedProduct = item.productId 
            ? products.find(p => p.id === item.productId)
            : matchProductInCatalog({ 
                name: item.name || '', 
                barcode: item.barcode || item.code || '', 
                sku: item.sku || '' 
              }, products);

          if (matchedProduct) {
            mappedCount++;
            return {
              lineId: generateUniqueId(),
              productId: matchedProduct.id,
              productName: matchedProduct.name,
              quantity: item.qty || item.quantity || 1,
              costPrice: item.price > 0 ? item.price : (matchedProduct.costPrice || matchedProduct.price || 0),
              taxRate: matchedProduct.taxRate || 0,
              discount: item.discount || 0,
              imageUrl: matchedProduct.imageUrl,
              isDraft: false
            };
          }
          
          unmappedCount++;
          const calcPrice = item.price > 0 
            ? item.price 
            : (item.total && (item.qty || item.quantity) ? item.total / (item.qty || item.quantity) : 0);

          return {
            lineId: generateUniqueId(),
            productId: '',
            productName: item.name || 'Article Importé',
            quantity: item.qty || item.quantity || 1,
            costPrice: calcPrice > 0 ? calcPrice : 0,
            taxRate: 19,
            discount: item.discount || 0,
            isDraft: true
          };
        })
        .filter((item: any): item is PurchaseCartItem => item !== null && !!item.productName);
      
      setCart(newItems);

      if (mappedCount > 0 && unmappedCount > 0) {
        toast.success(`${mappedCount} articles associés, ${unmappedCount} nouveaux à créer.`);
      } else if (mappedCount > 0) {
        toast.success(`${mappedCount} articles associés automatiquement au catalogue !`);
      } else if (unmappedCount > 0) {
        toast.info(`${unmappedCount} articles importés (prêts à être ajoutés au catalogue).`);
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

  // ═══ NEW: Import CSV / Excel / PDF ═══
  const processFileOffline = async (selectedFile: File) => {
    setIsOfflineScanning(true);
    setOfflineScanProgress("Lecture du fichier...");
    setError(null);
    setFile(selectedFile);
    
    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      
      if (['csv', 'txt', 'tsv', 'xlsx', 'xls'].includes(ext)) {
        setOfflineScanProgress(`Import du fichier ${ext.toUpperCase()}...`);
        const results = await parseImportedFile(selectedFile, suppliers, products);
        
        setRawOcrText(results.columnMapping || '');
        applyExtractedInvoice(results);
        setIsOfflineScanning(false);

        const source = results.importSource === 'excel' ? 'Excel' : 'CSV';
        toast.success(`Fichier ${source} importé : ${(results.items || []).length} articles extraits !`, { icon: '📂' });
      } else if (ext === 'pdf') {
        setOfflineScanProgress("Extraction du texte PDF...");
        const results = await parseImportedFile(selectedFile, suppliers, products);
        
        setRawOcrText(results.columnMapping || '');
        applyExtractedInvoice(results);
        setIsOfflineScanning(false);
        
        toast.success(`PDF importé : ${(results.items || []).length} articles extraits !`, { icon: '📄' });
      } else {
        throw new Error("Format non supporté. Utilisez CSV, Excel (.xlsx) ou PDF.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Échec de l'import du fichier");
      setIsOfflineScanning(false);
    }
  };

  // ═══ AI Scan (Gemini - requires internet) ═══
  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsScanning(true);
    setError(null);
    setShowMockOption(false);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const results = await scanInvoice(base64, selectedFile.type);
          
          if (results) {
            applyExtractedInvoice(results);
            toast.success("Facture analysée avec succès via l'IA !");
          }
        } catch (err: any) {
          const errMsg = err.message || "Erreur lors de l'analyse";
          setError(errMsg);
          if (errMsg.includes("Quota") || errMsg.includes("crédit") || errMsg.includes("exhausted") || errMsg.includes("429")) {
            setShowMockOption(true);
          }
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError("Impossible de lire le fichier");
      setIsScanning(false);
    }
  };

  const simulateInvoiceScanning = () => {
    toast.error("Veuillez sélectionner un vrai fichier.", { icon: '🚫', duration: 4000 });
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
    file, setFile,
    isScanning, setIsScanning,
    extractedData, setExtractedData,
    error, setError,
    showMockOption, setShowMockOption,
    isOfflineScanning, setIsOfflineScanning,
    offlineScanProgress, setOfflineScanProgress,
    rawOcrText, setRawOcrText,
    isOcrInspectorOpen, setIsOcrInspectorOpen,
    detectedOcrType, setDetectedOcrType,
    fileInputRef,
    handleFileChange,
    processFile,
    processFileOffline,
    simulateInvoiceScanning,
  };
}
