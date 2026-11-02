import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { printLabels } from '../services/printService';
import {
  LabelPrinterProps,
  useLabelPrinter,
  ProductSelectionPanel,
  SettingsPanel,
  LabelSimulator,
  printA4StickerSheet,
  SingleLabel,
  getCommonStyles,
  RemoteLabelQueueBanner,
  LabelPrinterHeaderBar
} from './label-printer';
import { toast } from 'sonner';
import {
  RemoteLabelQueueItem,
  fetchRemoteLabelQueue,
  clearRemoteLabelQueue,
  subscribeToRemoteLabelQueue
} from '../services/remoteLabelQueueService';

export * from './label-printer/types';
export { SingleLabel, getCommonStyles };

export function LabelPrinter({ products, settings, initialSelectedProductIds = [] }: LabelPrinterProps) {
  const {
    stateContext,
    selectedProducts,
    filteredProducts,
    addProduct,
    deleteProductFromList,
    updateQuantity,
    setExactQuantity,
    updateCustomPrice,
    syncQuantitiesWithStock,
    clearAllSelected,
    itemsToPrint,
    previewProduct,
    handlePresetChange,
    handlePaddingBaseChange
  } = useLabelPrinter(products, initialSelectedProductIds);

  const [printMedium, setPrintMedium] = useState<'thermal' | 'a4_sheet'>('thermal');
  const [labelPrinterType, setLabelPrinterType] = useState<'receipt_printer' | 'dedicated_label_printer'>(() => {
    try {
      const saved = localStorage.getItem('nexus_label_printer_type');
      if (saved === 'dedicated_label_printer' || saved === 'receipt_printer') return saved;
    } catch (_) {}
    return 'dedicated_label_printer';
  });

  const handleSetLabelPrinterType = (type: 'receipt_printer' | 'dedicated_label_printer') => {
    setLabelPrinterType(type);
    try {
      localStorage.setItem('nexus_label_printer_type', type);
    } catch (_) {}
  };

  const handlePresetChangeWithAutoSwitch = (presetId: string) => {
    handlePresetChange(presetId);
    if (presetId.startsWith('preset-idipos') || presetId === 'preset-40-20' || presetId === 'preset-40-20-vert') {
      handleSetLabelPrinterType('dedicated_label_printer');
    }
  };

  const [selectedA4Sheet, setSelectedA4Sheet] = useState('a4-40');
  const [startOffset, setStartOffset] = useState(1);
  const [packDate, setPackDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [remoteQueue, setRemoteQueue] = useState<RemoteLabelQueueItem[]>([]);

  useEffect(() => {
    fetchRemoteLabelQueue().then(setRemoteQueue).catch(() => {});
    const unsub = subscribeToRemoteLabelQueue(setRemoteQueue);
    return () => unsub();
  }, []);

  const handleImportRemoteQueue = async (clearAfterImport: boolean = true) => {
    const queue = await fetchRemoteLabelQueue();
    if (!queue || queue.length === 0) {
      toast.info('Aucun article en attente dans la file du Vérificateur de Prix.');
      return;
    }

    let importedCount = 0;
    queue.forEach(item => {
      const found = (products || []).find(p => p && p.id === item.productId) ||
                    (products || []).find(p => p && p.sku === item.sku);
      if (found) {
        addProduct(found);
        setExactQuantity(found.id, Math.max(1, item.quantity || 1));
        importedCount++;
      }
    });

    if (clearAfterImport) {
      await clearRemoteLabelQueue();
      setRemoteQueue([]);
    }

    toast.success(`${importedCount} article(s) importé(s) depuis le Vérificateur de Prix avec leurs quantités !`);
  };

  useEffect(() => {
    if (sessionStorage.getItem('nexus_auto_import_remote_labels') === 'true' && products && products.length > 0) {
      sessionStorage.removeItem('nexus_auto_import_remote_labels');
      handleImportRemoteQueue(false);
    }
  }, [products]);

  const applyQuickMention = (type: 'store' | 'dates' | 'promo') => {
    if (type === 'store') {
      stateContext.setCustomText(settings.name || 'MAGASIN');
    } else if (type === 'dates') {
      const today = packDate || new Date().toLocaleDateString('fr-FR');
      const exp = expDate || 'Voir emballage';
      stateContext.setCustomText(`FAB: ${today} | EXP: ${exp}`);
    } else if (type === 'promo') {
      stateContext.setCustomText('🔥 OFFRE SPÉCIALE PROMO 🔥');
    }
    toast.success('Mention ajoutée sur le modèle d’étiquette !');
  };

  const handlePrint = async () => {
    if (printMedium === 'a4_sheet') {
      printA4StickerSheet(
        itemsToPrint,
        selectedA4Sheet,
        startOffset,
        settings.currency || 'DA',
        stateContext.customText
      );
      return;
    }

    const dynamicSettings = {
      ...settings,
      labelPrinterType,
      labelTemplate: 'custom',
      labelWidthCustom: stateContext.customWidth,
      labelHeightCustom: stateContext.customHeight,
      labelOrientation: stateContext.customOrientation,
      labelRotation: stateContext.customRotation,

      customShowName: stateContext.showName,
      customShowPrice: stateContext.showPrice,
      customShowBarcode: stateContext.showBarcode,
      customShowQr: stateContext.showQr,
      customShowImage: stateContext.showImage,
      customText: stateContext.customText,
      customBorder: stateContext.showBorder,

      customNameSize: stateContext.nameFontSize,
      customPriceSize: stateContext.priceFontSize,
      customTextSize: stateContext.customTextSize,
      customBarcodeHeight: stateContext.barcodeHeight,
      customPadding: stateContext.customPadding,
      customPaddingTop: stateContext.paddingTop,
      customPaddingBottom: stateContext.paddingBottom,
      customPaddingLeft: stateContext.paddingLeft,
      customPaddingRight: stateContext.paddingRight,
      customLayoutStructure: stateContext.layoutStructure,
      customAlignment: stateContext.contentAlignment,
      customTextAlign: stateContext.customTextAlign,
      customTextBold: stateContext.customTextBold,
      customTextItalic: stateContext.customTextItalic,

      customBarcodeWidth: stateContext.barcodeWidth,
      customGap: stateContext.customGap,
      nameLineClamp: stateContext.nameLineClamp,
      customLetterSpacing: stateContext.customLetterSpacing
    };
    await printLabels(itemsToPrint, dynamicSettings as any);
  };

  const remoteTotalLabels = remoteQueue.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const handlePrintRemoteQueueDirect = async () => {
    const queue = await fetchRemoteLabelQueue();
    if (!queue || queue.length === 0) {
      toast.info('Aucun article en attente dans la file Cloud.');
      return;
    }
    const expanded: Product[] = [];
    queue.forEach(item => {
      const found = (products || []).find(p => p && String(p.id) === String(item.productId)) ||
                    (products || []).find(p => p && p.sku === item.sku) || ({
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
        expanded.push(found);
      }
    });

    await printLabels(expanded, {
      ...settings,
      labelPrinterType
    } as any);
    await clearRemoteLabelQueue();
    setRemoteQueue([]);
    toast.success(`Impression lancée (${expanded.length} étiquette(s)) et file Cloud vidée !`);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Bannière Multi-Postes Cloud */}
      <RemoteLabelQueueBanner
        remoteQueue={remoteQueue}
        remoteTotalLabels={remoteTotalLabels}
        onPrintDirect={handlePrintRemoteQueueDirect}
        onImportToEditor={() => handleImportRemoteQueue(true)}
      />

      {/* 2. En-tête & Barre de Commandes */}
      <LabelPrinterHeaderBar
        remoteQueue={remoteQueue}
        remoteTotalLabels={remoteTotalLabels}
        handleImportRemoteQueue={handleImportRemoteQueue}
        printMedium={printMedium}
        setPrintMedium={setPrintMedium}
        labelPrinterType={labelPrinterType}
        handleSetLabelPrinterType={handleSetLabelPrinterType}
        selectedProductsCount={selectedProducts.length}
        clearAllSelected={clearAllSelected}
        handlePrint={handlePrint}
        itemsToPrintCount={itemsToPrint.length}
        selectedA4Sheet={selectedA4Sheet}
        setSelectedA4Sheet={setSelectedA4Sheet}
        startOffset={startOffset}
        setStartOffset={setStartOffset}
        packDate={packDate}
        setPackDate={setPackDate}
        expDate={expDate}
        setExpDate={setExpDate}
        applyQuickMention={applyQuickMention}
      />

      {/* 3. Grille Tripartite du Studio */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ProductSelectionPanel
          state={stateContext}
          filteredProducts={filteredProducts}
          selectedProducts={selectedProducts}
          products={products}
          itemsToPrint={itemsToPrint}
          addProduct={addProduct}
          deleteProductFromList={deleteProductFromList}
          updateQuantity={updateQuantity}
          setExactQuantity={setExactQuantity}
          updateCustomPrice={updateCustomPrice}
          syncQuantitiesWithStock={syncQuantitiesWithStock}
          currency={settings.currency || 'DA'}
        />

        <SettingsPanel
          state={stateContext}
          handlePresetChange={handlePresetChangeWithAutoSwitch}
          handlePaddingBaseChange={handlePaddingBaseChange}
        />

        <LabelSimulator
          state={stateContext}
          previewProduct={previewProduct}
          settings={settings}
        />
      </div>
    </div>
  );
}

export default LabelPrinter;
