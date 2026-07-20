import { useState, useMemo } from 'react';
import { Product } from '../../types';
import { LabelPrinterState } from './types';

export const PRESETS = [
  { id: 'preset-40-30', name: 'Standard (40 x 30 mm)', width: 40, height: 30, orientation: 'landscape', rotation: '0' },
  { id: 'preset-40-20', name: 'Standard (40 x 20 mm)', width: 40, height: 20, orientation: 'landscape', rotation: '0' },
  { id: 'preset-70-40', name: 'Moyen Rayon (70 x 40 mm)', width: 70, height: 40, orientation: 'landscape', rotation: '0' },
  { id: 'preset-80-50', name: 'Grand Box (80 x 50 mm)', width: 80, height: 50, orientation: 'landscape', rotation: '0' },
  { id: 'preset-50-30', name: 'Bijoux / Optique (50 x 30 mm)', width: 50, height: 30, orientation: 'landscape', rotation: '0' },
  { id: 'preset-idipos-80-50', name: 'Idipos GT-3150 (80 x 50 mm)', width: 80, height: 50, orientation: 'landscape', rotation: '0' },
  { id: 'preset-idipos-60-40', name: 'Idipos GT-3150 (60 x 40 mm)', width: 60, height: 40, orientation: 'landscape', rotation: '0' },
  { id: 'preset-idipos-40-20', name: 'Idipos GT-3150 (40 x 20 mm)', width: 40, height: 20, orientation: 'landscape', rotation: '0' },
  { id: 'preset-custom', name: 'Dimensions Personnalisées...', width: 60, height: 40, orientation: 'landscape', rotation: '0' }
];

export function useLabelPrinter(products: Product[], initialSelectedProductIds: string[] = []) {
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string, quantity: number }[]>(
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
  const [nameFontSize, setNameFontSize] = useState(12);
  const [priceFontSize, setPriceFontSize] = useState(18);
  const [barcodeHeight, setBarcodeHeight] = useState(28);

  // Custom text options
  const [customText, setCustomText] = useState('');
  const [customTextSize, setCustomTextSize] = useState(10);
  const [customTextAlign, setCustomTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [customTextBold, setCustomTextBold] = useState(false);
  const [customTextItalic, setCustomTextItalic] = useState(false);

  // Fine-grained alignment states
  const [barcodeWidth, setBarcodeWidth] = useState(1.2);
  const [customGap, setCustomGap] = useState(4);
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
      
      // Auto-apply orientation and rotation for preset if available
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );
  }, [products, search]);

  const addProduct = (p: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) {
        return prev.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: p.id, quantity: 1 }];
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
      return prev.map(item => item.productId === productId ? { ...item, quantity: newQuantity } : item);
    });
  };

  const clearAllSelected = () => {
    setSelectedProducts([]);
  };

  const itemsToPrint = useMemo(() => {
    const flatItems: Product[] = [];
    selectedProducts.forEach(sp => {
      const p = products.find(prod => prod.id === sp.productId);
      if (p) {
        for (let i = 0; i < sp.quantity; i++) {
          flatItems.push(p);
        }
      }
    });
    return flatItems;
  }, [selectedProducts, products]);

  const previewProduct = useMemo(() => {
    if (selectedProducts.length > 0) {
      const p = products.find(prod => prod.id === selectedProducts[0].productId);
      if (p) return p;
    }
    return {
      id: 'demo-id',
      name: 'T-Shirt Sport Premium Noir',
      price: 29.99,
      sku: 'TSHIRT-BLK-M',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=60'
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
    customLetterSpacing, setCustomLetterSpacing,
  };

  return {
    selectedProducts,
    search,
    setSearch,
    filteredProducts,
    addProduct,
    deleteProductFromList,
    updateQuantity,
    clearAllSelected,
    itemsToPrint,
    previewProduct,
    stateContext,
    handlePresetChange,
    handlePaddingBaseChange
  };
}
