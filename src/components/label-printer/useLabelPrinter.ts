import { useState, useMemo } from 'react';
import { Product } from '../../types';
import { LabelPrinterState } from './types';

export const PRESETS = [
  { id: 'preset-40-30', name: 'Thermique Standard (40 × 30 mm)', width: 40, height: 30, orientation: 'landscape', rotation: '0' },
  { id: 'preset-50-30', name: 'Thermique Moyen (50 × 30 mm)', width: 50, height: 30, orientation: 'landscape', rotation: '0' },
  { id: 'preset-60-40', name: 'Gondole Supermarché (60 × 40 mm)', width: 60, height: 40, orientation: 'landscape', rotation: '0' },
  { id: 'preset-40-20', name: 'Mini Prix / Cosmétique (40 × 20 mm)', width: 40, height: 20, orientation: 'landscape', rotation: '0' },
  { id: 'preset-70-40', name: 'Grand Rayon / Promo (70 × 40 mm)', width: 70, height: 40, orientation: 'landscape', rotation: '0' },
  { id: 'preset-80-50', name: 'Carton / Colisage (80 × 50 mm)', width: 80, height: 50, orientation: 'landscape', rotation: '0' },
  { id: 'preset-idipos-60-40', name: 'Idipos / Xprinter (60 × 40 mm)', width: 60, height: 40, orientation: 'landscape', rotation: '0' },
  { id: 'preset-custom', name: 'Dimensions sur-mesure...', width: 60, height: 40, orientation: 'landscape', rotation: '0' }
];

export function useLabelPrinter(products: Product[], initialSelectedProductIds: string[] = []) {
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string; quantity: number; customPrice?: number; oldPrice?: number }[]>(
    initialSelectedProductIds.map(id => ({ productId: id, quantity: 1 }))
  );

  const [search, setSearch] = useState('');
  const [activePreset, setActivePreset] = useState('preset-40-30');

  // Dimension Controls
  const [customWidth, setCustomWidth] = useState(40);
  const [customHeight, setCustomHeight] = useState(30);
  const [customPadding, setCustomPadding] = useState(2);
  const [paddingTop, setPaddingTop] = useState(2);
  const [paddingBottom, setPaddingBottom] = useState(2);
  const [paddingLeft, setPaddingLeft] = useState(2);
  const [paddingRight, setPaddingRight] = useState(2);
  const [showDetailedPadding, setShowDetailedPadding] = useState(false);

  // Layout structures
  const [layoutStructure, setLayoutStructure] = useState<'classic' | 'split' | 'price-heavy' | 'barcode-centric'>('classic');
  const [contentAlignment, setContentAlignment] = useState<'center' | 'left' | 'right'>('center');

  const [customOrientation, setCustomOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [customRotation, setCustomRotation] = useState<'0' | '90' | '180' | '270'>('0');
  const [showBorder, setShowBorder] = useState(false);

  // Contents Configuration
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showImage, setShowImage] = useState(false);

  // Sizing controls
  const [nameFontSize, setNameFontSize] = useState(11);
  const [priceFontSize, setPriceFontSize] = useState(16);
  const [barcodeHeight, setBarcodeHeight] = useState(26);

  // Custom text options (e.g. Store Name, FAB/EXP dates, Promo mention)
  const [customText, setCustomText] = useState('');
  const [customTextSize, setCustomTextSize] = useState(9);
  const [customTextAlign, setCustomTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [customTextBold, setCustomTextBold] = useState(true);
  const [customTextItalic, setCustomTextItalic] = useState(false);

  // Fine-grained alignment states
  const [barcodeWidth, setBarcodeWidth] = useState(1.2);
  const [customGap, setCustomGap] = useState(3);
  const [nameLineClamp, setNameLineClamp] = useState<1 | 2>(1);
  const [customLetterSpacing, setCustomLetterSpacing] = useState(0);

  const handlePresetChange = (presetId: string) => {
    setActivePreset(presetId);
    const selected = PRESETS.find(p => p.id === presetId);
    if (selected && presetId !== 'preset-custom') {
      setCustomWidth(selected.width);
      setCustomHeight(selected.height);
      setCustomPadding(2);
      setPaddingTop(2);
      setPaddingBottom(2);
      setPaddingLeft(2);
      setPaddingRight(2);
      if ('orientation' in selected && selected.orientation) {
        setCustomOrientation(selected.orientation as any);
      }
      if ('rotation' in selected && selected.rotation) {
        setCustomRotation(selected.rotation as any);
      }
    }
  };

  const handlePaddingBaseChange = (val: number) => {
    setCustomPadding(val);
    if (!showDetailedPadding) {
      setPaddingTop(val);
      setPaddingBottom(val);
      setPaddingLeft(val);
      setPaddingRight(val);
    }
  };

  // STRICT SEARCH-ONLY: Never load the 11,177 products when search is empty!
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const matches: Product[] = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p) continue;
      if (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
        (p.sku && String(p.sku).toLowerCase().includes(q))
      ) {
        matches.push(p);
        if (matches.length >= 25) break;
      }
    }
    return matches;
  }, [products, search]);

  const addProduct = (p: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) {
        return prev.map(item => (item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { productId: p.id, quantity: 1, customPrice: p.price }];
    });
  };

  const deleteProductFromList = (id: string) => {
    setSelectedProducts(prev => prev.filter(item => item.productId !== id));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedProducts(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;
      const newQuantity = Math.max(0, existing.quantity + delta);
      if (newQuantity === 0) return prev.filter(item => item.productId !== productId);
      return prev.map(item => (item.productId === productId ? { ...item, quantity: newQuantity } : item));
    });
  };

  const setExactQuantity = (productId: string, quantity: number) => {
    const validQty = Math.max(1, Math.min(500, Math.round(Number(quantity) || 1)));
    setSelectedProducts(prev =>
      prev.map(item => (item.productId === productId ? { ...item, quantity: validQty } : item))
    );
  };

  const updateCustomPrice = (productId: string, customPrice?: number, oldPrice?: number) => {
    setSelectedProducts(prev =>
      prev.map(item =>
        item.productId === productId
          ? {
              ...item,
              ...(customPrice !== undefined ? { customPrice } : {}),
              ...(oldPrice !== undefined ? { oldPrice } : {})
            }
          : item
      )
    );
  };

  const syncQuantitiesWithStock = () => {
    setSelectedProducts(prev =>
      prev.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const stockQty = Math.max(1, Math.min(200, Math.round(Number(prod?.stock) || 1)));
        return { ...item, quantity: stockQty };
      })
    );
  };

  const clearAllSelected = () => {
    setSelectedProducts([]);
  };

  const itemsToPrint = useMemo(() => {
    const flatItems: Product[] = [];
    selectedProducts.forEach(sp => {
      const p = products.find(prod => prod.id === sp.productId);
      if (p) {
        const effectiveProduct: Product = {
          ...p,
          price: sp.customPrice !== undefined ? sp.customPrice : p.price,
          originalPrice: sp.oldPrice !== undefined ? sp.oldPrice : p.originalPrice
        };
        for (let i = 0; i < sp.quantity; i++) {
          flatItems.push(effectiveProduct);
        }
      }
    });
    return flatItems;
  }, [selectedProducts, products]);

  const previewProduct = useMemo(() => {
    if (selectedProducts.length > 0) {
      const sp = selectedProducts[0];
      const p = products.find(prod => prod.id === sp.productId);
      if (p) {
        return {
          ...p,
          price: sp.customPrice !== undefined ? sp.customPrice : p.price,
          originalPrice: sp.oldPrice !== undefined ? sp.oldPrice : p.originalPrice
        };
      }
    }
    return {
      id: 'demo-id',
      name: 'Huile d’Olive Vierge Extra 1L',
      price: 950,
      sku: '6130001234567',
      barcode: '6130001234567'
    } as Product;
  }, [selectedProducts, products]);

  const stateContext: LabelPrinterState = {
    search, setSearch,
    activePreset, setActivePreset,
    customWidth, setCustomWidth,
    customHeight, setCustomHeight,
    customPadding, setCustomPadding,
    paddingTop, setPaddingTop,
    paddingBottom, setPaddingBottom,
    paddingLeft, setPaddingLeft,
    paddingRight, setPaddingRight,
    showDetailedPadding, setShowDetailedPadding,
    layoutStructure, setLayoutStructure,
    contentAlignment, setContentAlignment,
    customOrientation, setCustomOrientation,
    customRotation, setCustomRotation,
    showBorder, setShowBorder,
    showName, setShowName,
    showPrice, setShowPrice,
    showBarcode, setShowBarcode,
    showQr, setShowQr,
    showImage, setShowImage,
    nameFontSize, setNameFontSize,
    priceFontSize, setPriceFontSize,
    barcodeHeight, setBarcodeHeight,
    customText, setCustomText,
    customTextSize, setCustomTextSize,
    customTextAlign, setCustomTextAlign,
    customTextBold, setCustomTextBold,
    customTextItalic, setCustomTextItalic,
    barcodeWidth, setBarcodeWidth,
    customGap, setCustomGap,
    nameLineClamp, setNameLineClamp,
    customLetterSpacing, setCustomLetterSpacing
  };

  return {
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
  };
}
