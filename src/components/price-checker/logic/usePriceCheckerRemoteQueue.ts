import { useState, useEffect } from 'react';
import { Product, CompanySettings } from '../../../types';
import {
  RemoteLabelQueueItem,
  fetchRemoteLabelQueue,
  addProductToRemoteLabelQueue,
  subscribeToRemoteLabelQueue
} from '../../../services/remoteLabelQueueService';
import { useCoreStore } from '../../../store/useCoreStore';
import { printLabels } from '../../../services/labelPrintService';
import { toast } from 'sonner';

interface UsePriceCheckerRemoteQueueProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: CompanySettings;
  focusScannerInput: () => void;
}

export function usePriceCheckerRemoteQueue({
  isOpen,
  onClose,
  products,
  settings,
  focusScannerInput
}: UsePriceCheckerRemoteQueueProps) {
  const [remoteQueue, setRemoteQueue] = useState<RemoteLabelQueueItem[]>([]);
  const [autoQueueOnScan, setAutoQueueOnScan] = useState<boolean>(false);
  const [labelQty, setLabelQty] = useState<number>(1);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchRemoteLabelQueue().then(setRemoteQueue).catch(() => {});
    const unsub = subscribeToRemoteLabelQueue(setRemoteQueue);
    return () => unsub();
  }, [isOpen]);

  const handleAddToRemoteQueue = async (prod: Product, qty: number = 1, isDiscreet: boolean = false) => {
    const updated = await addProductToRemoteLabelQueue(prod, qty, 'Borne Rayon');
    setRemoteQueue(updated);
    if (isDiscreet) {
      toast.success(`🏷️ "${prod.name}" ajouté à la file d'impression distante (x${qty})`, {
        duration: 2500,
        position: 'bottom-right'
      });
    } else {
      toast.success(`"${prod.name}" (${prod.price.toFixed(2)} ${settings?.currency || 'DA'}) ajouté à la file (x${qty}) !`);
    }
    focusScannerInput();
  };

  const handlePrintQueueNow = () => {
    if (remoteQueue.length === 0) {
      toast.warning("La file d'étiquettes est vide. Bipez d'abord vos articles.");
      return;
    }
    const allProds = (products && products.length > 0) ? products : (useCoreStore.getState().products || []);
    const expandedProducts: Product[] = [];
    remoteQueue.forEach(item => {
      const fullProd = allProds.find(p => p && String(p.id) === String(item.productId)) || ({
        id: item.productId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        price: item.price,
        unit: item.unit || 'pcs',
        stock: 1,
        categoryId: 'uncategorized'
      } as Product);
      const count = Math.max(1, Number(item.quantity) || 1);
      for (let i = 0; i < count; i++) {
        expandedProducts.push(fullProd);
      }
    });

    const savedPrinterType = (() => {
      try {
        const val = localStorage.getItem('nexus_label_printer_type');
        if (val === 'dedicated_label_printer' || val === 'receipt_printer') return val;
      } catch (_) {}
      return 'dedicated_label_printer';
    })();

    printLabels(expandedProducts, {
      ...settings,
      labelPrinterType: savedPrinterType
    } as any);
    toast.success(`Impression directe lancée (${expandedProducts.length} étiquette(s)) !`);
    focusScannerInput();
  };

  const handleOpenInLabelStudio = () => {
    try {
      sessionStorage.setItem('nexus_auto_import_remote_labels', 'true');
      window.location.hash = 'labels';
      onClose();
      toast.success("Ouverture du Studio d'Étiquettes avec votre file d'articles...");
    } catch (_) {}
  };

  const totalLabelsInQueue = remoteQueue.reduce((acc, i) => acc + (i.quantity || 1), 0);

  return {
    remoteQueue,
    setRemoteQueue,
    autoQueueOnScan,
    setAutoQueueOnScan,
    labelQty,
    setLabelQty,
    showQueueDrawer,
    setShowQueueDrawer,
    totalLabelsInQueue,
    handleAddToRemoteQueue,
    handlePrintQueueNow,
    handleOpenInLabelStudio
  };
}
