import { Product, CompanySettings } from '../../types';

export interface LabelPrinterProps {
  products: Product[];
  settings: CompanySettings;
  initialSelectedProductIds?: string[];
}

export interface LabelPrinterState {
  search: string;
  setSearch: (val: string) => void;
  activePreset: string;
  setActivePreset: (val: string) => void;

  customWidth: number;
  setCustomWidth: (val: number) => void;
  customHeight: number;
  setCustomHeight: (val: number) => void;
  customPadding: number;
  setCustomPadding: (val: number) => void;
  paddingTop: number;
  setPaddingTop: (val: number) => void;
  paddingBottom: number;
  setPaddingBottom: (val: number) => void;
  paddingLeft: number;
  setPaddingLeft: (val: number) => void;
  paddingRight: number;
  setPaddingRight: (val: number) => void;
  showDetailedPadding: boolean;
  setShowDetailedPadding: (val: boolean) => void;

  layoutStructure: 'classic' | 'split' | 'price-heavy' | 'barcode-centric';
  setLayoutStructure: (val: 'classic' | 'split' | 'price-heavy' | 'barcode-centric') => void;
  contentAlignment: 'center' | 'left' | 'right';
  setContentAlignment: (val: 'center' | 'left' | 'right') => void;
  customOrientation: 'landscape' | 'portrait';
  setCustomOrientation: (val: 'landscape' | 'portrait') => void;
  customRotation: '0' | '90' | '180' | '270';
  setCustomRotation: (val: '0' | '90' | '180' | '270') => void;
  showBorder: boolean;
  setShowBorder: (val: boolean) => void;

  showName: boolean;
  setShowName: (val: boolean) => void;
  showPrice: boolean;
  setShowPrice: (val: boolean) => void;
  showBarcode: boolean;
  setShowBarcode: (val: boolean) => void;
  showQr: boolean;
  setShowQr: (val: boolean) => void;
  showImage: boolean;
  setShowImage: (val: boolean) => void;

  nameFontSize: number;
  setNameFontSize: (val: number) => void;
  priceFontSize: number;
  setPriceFontSize: (val: number) => void;
  barcodeHeight: number;
  setBarcodeHeight: (val: number) => void;

  customText: string;
  setCustomText: (val: string) => void;
  customTextSize: number;
  setCustomTextSize: (val: number) => void;
  customTextAlign: 'left' | 'center' | 'right';
  setCustomTextAlign: (val: 'left' | 'center' | 'right') => void;
  customTextBold: boolean;
  setCustomTextBold: (val: boolean) => void;
  customTextItalic: boolean;
  setCustomTextItalic: (val: boolean) => void;

  barcodeWidth: number;
  setBarcodeWidth: (val: number) => void;
  customGap: number;
  setCustomGap: (val: number) => void;
  nameLineClamp: 1 | 2;
  setNameLineClamp: (val: 1 | 2) => void;
  customLetterSpacing: number;
  setCustomLetterSpacing: (val: number) => void;
}
