import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../supabase';
import { generateUniqueId, logAction } from '../../lib/utils';
import { scanInvoice } from '../../services/geminiService';
import Tesseract from 'tesseract.js';
import { 
  reconcileOcrLine, isFuzzyNameMatch, preprocessImageForOcr 
} from '../../utils/ocrUtils';
import { parseRawInvoiceText } from './invoiceParser';
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
        s.name.toLowerCase().includes((results.supplierName || '').toLowerCase())
      );
      if (matchedSupplier) {
        setSelectedSupplierId(matchedSupplier.id);
      }
    }
    
    if (results.invoiceNumber && !invoiceNumber) {
      setInvoiceNumber(results.invoiceNumber);
    }
    
    if (results.date) {
      const parsedDate = new Date(results.date);
      if (!isNaN(parsedDate.getTime())) {
        setReceptionDate(results.date.split('T')[0]);
      }
    }
    
    if (results.previousBalance !== undefined && results.previousBalance !== null) {
      toast.info(`Ancien solde détecté : ${results.previousBalance} DA`, {
        icon: '💰'
      });
    }
    
    if (results.items && Array.isArray(results.items)) {
      const newItems: PurchaseCartItem[] = results.items
        .map((item: any) => {
          const product = products.find(p => {
            if (item.productId && p.id === item.productId) return true;
            return isFuzzyNameMatch(p.name, item.name);
          });
          
          if (!product) {
            const expectedCost = item.price || (item.total && item.quantity ? item.total / item.quantity : 50);
            return {
              lineId: generateUniqueId(),
              productId: '',
              productName: item.name,
              quantity: item.quantity || 1,
              costPrice: expectedCost,
              taxRate: 19,
              discount: 0,
              isDraft: true
            };
          }
          
          const expectedCost = product.costPrice || product.price * 0.7 || 50;
          const { qty, price } = reconcileOcrLine(item.quantity, item.price, item.total, expectedCost);
          
          return {
            lineId: generateUniqueId(),
            productId: product.id,
            productName: product.name,
            quantity: qty,
            costPrice: price,
            taxRate: product.taxRate || 0,
            discount: 0,
            imageUrl: product.imageUrl,
            isDraft: false
          };
        })
        .filter((item: any): item is PurchaseCartItem => item !== null);
      
      setCart(newItems);
    }
    
    setMode('manual');
    logAction(
      user?.uid || user?.id || 'system', 
      user?.displayName || 'Utilisateur', 
      'Local OCR Scan', 
      'SmartPurchase', 
      `Analyse hors-ligne réussie pour la facture`
    );
  };

  const processFileOffline = async (selectedFile: File) => {
    setIsOfflineScanning(true);
    setOfflineScanProgress("Initialisation...");
    setError(null);
    setFile(selectedFile);
    
    try {
      if (selectedFile.type === 'application/pdf') {
        setOfflineScanProgress("Lecture du PDF numérique local...");
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const rawText = reader.result as string;
            const matches = rawText.match(/\((.*?)\)\s*T[jJ]/g) || rawText.match(/\(([^)]+)\)/g);
            let cleanedText = '';
            
            if (matches) {
              cleanedText = matches.map(m => {
                const val = m.trim();
                if (val.startsWith('(') && val.endsWith(') Tj')) {
                  return val.slice(1, -4);
                } else if (val.startsWith('(') && val.endsWith(') TJ')) {
                  return val.slice(1, -4);
                } else if (val.startsWith('(') && val.endsWith(')')) {
                  return val.slice(1, -1);
                }
                return val;
              }).join(' ');
            } else {
              const alphanumeric = rawText.match(/[A-Za-zÀ-ÿ0-9\s\-:.,\/]{5,}/g);
              if (alphanumeric) {
                cleanedText = alphanumeric.join('\n');
              }
            }

            if (cleanedText && cleanedText.trim().length > 15) {
              setRawOcrText(cleanedText);
              const results = parseRawInvoiceText(cleanedText, suppliers, products);
              applyExtractedInvoice(results);
              setIsOfflineScanning(false);
              toast.success("Facture PDF numérique analysée avec succès en local !");
            } else {
              throw new Error("Ce PDF ne contient pas de texte direct extractible (c'est probablement une image scannée). Veuillez plutôt l'importer sous format d'image (PNG/JPG) pour que le moteur OCR local Tesseract puisse le lire.");
            }
          } catch (e: any) {
            setError(e.message || "Erreur lors du décodage du PDF");
            setIsOfflineScanning(false);
          }
        };
        reader.readAsText(selectedFile);
      } else {
        setOfflineScanProgress("Optimisation de l'image (Binarisation & Contraste)...");
        const processedImage = await preprocessImageForOcr(selectedFile);
        
        setOfflineScanProgress("Initialisation de l'OCR Tesseract...");
        const result = await Tesseract.recognize(
          processedImage,
          'fra+eng',
          {
            logger: m => {
              if (m.status === 'recognizing') {
                setOfflineScanProgress(`Numérisation de l'image (OCR) : ${Math.round(m.progress * 100)}%`);
              } else if (m.status === 'loading tesseract api') {
                setOfflineScanProgress("Chargement de l'intelligence OCR...");
              } else if (m.status === 'loaded tesseract api') {
                setOfflineScanProgress("Analyse de la mise en page de la facture...");
              }
            }
          }
        );
        
        const rawText = result.data.text;
        setRawOcrText(rawText);
        if (rawText && rawText.trim().length > 10) {
          const results = parseRawInvoiceText(rawText, suppliers, products);
          applyExtractedInvoice(results);
          setIsOfflineScanning(false);
          toast.success("Facture numérisée avec succès via l'OCR local !");
        } else {
          throw new Error("L'OCR local n'a pas pu extraire de texte lisible de cette image. Veuillez utiliser un scan plus net.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Échec de la numérisation hors-ligne: " + (err.message || String(err)));
      setIsOfflineScanning(false);
    }
  };

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
    setIsScanning(true);
    setError(null);
    setShowMockOption(false);
    
    setTimeout(() => {
      try {
        let randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        let supplierName = randomSupplier ? randomSupplier.name : "Fournisseur Démo";
        if (randomSupplier) setSelectedSupplierId(randomSupplier.id);
        
        const randomInvoiceNum = "FA-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
        setInvoiceNumber(randomInvoiceNum);
        
        const todayStr = new Date().toISOString().split('T')[0];
        setReceptionDate(todayStr);

        let selectedProducts = [...products];
        const count = 20 + Math.floor(Math.random() * 6);
        
        if (selectedProducts.length < count) {
          const needed = count - selectedProducts.length;
          for (let i = 1; i <= needed; i++) {
            selectedProducts.push({
              id: `demo-fill-${i}`,
              name: `Article Démo Haute Qualité #${100 + i}`,
              price: parseFloat((10 + Math.random() * 40).toFixed(2)),
              costPrice: parseFloat((5 + Math.random() * 20).toFixed(2)),
              sku: `DK-SKU-${1000 + i}`,
              taxRate: 20,
              stock: Math.floor(Math.random() * 10) + 1,
              minStock: 5,
              categoryId: '',
              brandId: '',
              supplier: randomSupplier ? randomSupplier.id : '',
              description: 'Généré pour la simulation grand volume',
              status: 'active',
              unit: 'pcs',
              updatedAt: new Date().toISOString()
            } as any);
          }
        }
        
        selectedProducts = selectedProducts.sort(() => 0.5 - Math.random()).slice(0, count);

        const newItems: PurchaseCartItem[] = selectedProducts.map(p => {
          const randQty = Math.floor(Math.random() * 30) + 5;
          const cost = p.costPrice || parseFloat((p.price * 0.7).toFixed(2));
          return {
            lineId: generateUniqueId(),
            productId: p.id.startsWith('demo-fill-') ? '' : p.id,
            productName: p.name,
            quantity: randQty,
            costPrice: cost,
            taxRate: p.taxRate || 0,
            discount: 0,
            imageUrl: p.imageUrl
          };
        });

        setCart(newItems);
        setExtractedData({
          supplierName,
          invoiceNumber: randomInvoiceNum,
          date: todayStr,
          items: newItems.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.costPrice
          }))
        });

        setMode('manual');
        logAction(
          user?.uid || user?.id || 'system', 
          user?.displayName || 'Utilisateur', 
          'Simulation Facture', 
          'SmartPurchase', 
          `Simulation réussie pour la facture ${randomInvoiceNum}`
        );
      } catch (err: any) {
        setError("Erreur de simulation : " + err.message);
      } finally {
        setIsScanning(false);
      }
    }, 1200);
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
