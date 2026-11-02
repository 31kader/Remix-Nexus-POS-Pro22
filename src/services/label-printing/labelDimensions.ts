export interface LabelDimensionsResult {
  widthVal: number;
  heightVal: number;
  width: string;
  height: string;
  safeHeight: string;
  rot: string;
  isMiniLabel: boolean;
  isReceiptPrinterMode: boolean;
  pageSizeCss: string;
  bodyWidthCss: string;
}

export function computeLabelDimensions(settings: any, tpl: string): LabelDimensionsResult {
  // Détection des dimensions de l'étiquette
  const defaultWidthNum = tpl === 'custom' ? 70 : (tpl === 'shelf-large' ? 72 : tpl === 'shelf-standard' ? 50 : 60);
  const defaultHeightNum = tpl === 'custom' ? 40 : (tpl === 'shelf-standard' ? 30 : 40);

  const uWidthNum = Number(settings.labelWidthCustom) || defaultWidthNum;
  const uHeightNum = Number(settings.labelHeightCustom) || defaultHeightNum;

  // Render Dimensions
  let widthVal = uWidthNum;
  let heightVal = uHeightNum;
  if (settings.labelOrientation === 'portrait') {
    widthVal = uHeightNum;
    heightVal = uWidthNum;
  }

  // Détection STRICTE du mode imprimante :
  // Une étiquette avec dimensions définies (comme 40x20, 50x30, 60x40) envoyée à une étiqueteuse IDIPOS / Xprinter / Zebra
  // DOIT TOUJOURS avoir sa taille exacte `@page { size: width height; }` et JAMAIS `80mm auto` !
  const isExplicitReceipt = settings.labelPrinterType === 'receipt_printer';
  const isLabelDimensions = widthVal <= 65 && heightVal <= 45;
  const isReceiptPrinterMode = isExplicitReceipt && !isLabelDimensions;

  // Sur une imprimante thermique de ticket de caisse 80mm, la zone chauffante réelle est de 72mm maximum.
  if (isReceiptPrinterMode && widthVal > 72) {
    widthVal = 72;
  }

  const width = `${widthVal}mm`;
  const height = `${heightVal}mm`;
  // Marge de sécurité anti-arrondi : évite l'éjection d'étiquettes vides
  const safeHeight = isReceiptPrinterMode ? height : `${Math.max(heightVal - 0.4, 1).toFixed(2)}mm`;
  const rot = (settings.labelRotation !== undefined && settings.labelRotation !== null && settings.labelRotation !== '') ? settings.labelRotation : '0';
  const isMiniLabel = heightVal <= 25 || widthVal <= 25;

  const pageSizeCss = isReceiptPrinterMode ? '80mm auto' : `${width} ${height}`;
  const bodyWidthCss = isReceiptPrinterMode ? '72mm' : width;

  return {
    widthVal,
    heightVal,
    width,
    height,
    safeHeight,
    rot,
    isMiniLabel,
    isReceiptPrinterMode,
    pageSizeCss,
    bodyWidthCss
  };
}
