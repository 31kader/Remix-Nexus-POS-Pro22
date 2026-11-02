export interface CatalogPrintSettings {
  title: string;
  subtitle: string;
  footerText: string;
  showHeader: boolean;
  showFooter: boolean;
  showDate: boolean;
  showLogo: boolean;
  columns: number;
  rowsPerPage: number;
  pageMargin: number; // in mm
  cellGap: number; // in px
  cellBorder: 'none' | 'thin' | 'shadow';
  orientation: 'portrait' | 'landscape';
  
  // Element toggles
  showName: boolean;
  showPrice: boolean;
  showImage: boolean;
  showSku: boolean;
  showStock: boolean;
  showBarcode: boolean;
  showQr: boolean;
  showDescription: boolean;
  
  // Font sizes & heights
  nameFontSize: number;
  priceFontSize: number;
  imageHeight: number; // in px
  barcodeHeight: number; // in px
  barcodeWidth: number;
  qrSize: number; // in px
  descFontSize: number;

  // Extended Pro Options
  layoutMode?: 'grid' | 'table';
  priceDisplayMode?: 'retail' | 'wholesale' | 'both' | 'promo' | 'none';
  themeColor?: string;
  contactPhone?: string;
  discountPercent?: number;
  customOverrides?: Record<string, { customPrice?: number; oldPrice?: number; badge?: string }>;
}

export type SocialTarget = 'webshare' | 'whatsapp' | 'telegram' | 'email' | 'download';
