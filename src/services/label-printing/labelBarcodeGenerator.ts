import { Product } from '../../types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface LabelAsset {
  id: string;
  barcodeSvg: string;
  qrSvg: string;
}

export async function generateOfflineLabelAssets(
  products: Product[],
  settings: any,
  tpl: string,
  isMiniLabel: boolean
): Promise<Map<string, LabelAsset>> {
  const showBarcode = settings.customShowBarcode !== false;
  const showQr = settings.customShowQr === true;
  let bHeight = settings.customBarcodeHeight || (isMiniLabel ? 13 : 30);
  if (isMiniLabel && bHeight > 16) {
    bHeight = 13; // Verrou anti-débordement sur étiquette 20mm
  }
  const bWidthVal = settings.customBarcodeWidth || (isMiniLabel ? 1.0 : 1.2);

  const offlineAssets = await Promise.all(
    products.map(async (p) => {
      const skuForBarcode = p.sku || p.id.substring(0, 8).toUpperCase();
      let barcodeSvg = '';
      let qrSvg = '';

      let finalBHeight = bHeight;
      let finalBWidth = bWidthVal;
      let showBarcodeText = !isMiniLabel;

      if (tpl === 'barcode-only') {
        finalBHeight = isMiniLabel ? 16 : 40;
        finalBWidth = isMiniLabel ? 1.0 : 1.5;
        showBarcodeText = true;
      } else if (tpl === 'standard') {
        finalBHeight = isMiniLabel ? 12 : 30;
        finalBWidth = isMiniLabel ? 1.0 : 1.2;
        showBarcodeText = !isMiniLabel;
      } else if (tpl === 'custom') {
        finalBHeight = isMiniLabel ? Math.min(bHeight, 14) : bHeight;
        finalBWidth = isMiniLabel ? Math.min(bWidthVal, 1.0) : bWidthVal;
        const struct = settings.customLayoutStructure || 'classic';
        // En format 20mm ou compact, cacher le texte sous les barres pour éviter tout chevauchement
        if (struct === 'split' || struct === 'price-heavy' || isMiniLabel) {
          showBarcodeText = false;
        } else {
          showBarcodeText = true;
        }
      }

      // Generate Barcode SVG
      if (typeof document !== 'undefined') {
        try {
          const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          JsBarcode(tempSvg, skuForBarcode, {
            format: 'CODE128',
            width: finalBWidth,
            height: finalBHeight,
            displayValue: showBarcodeText,
            fontSize: isMiniLabel ? 8 : 10,
            margin: 0
          });
          barcodeSvg = tempSvg.outerHTML;
        } catch (e) {
          console.error('Offline Barcode generation error:', e);
        }
      }

      // Generate QR Code SVG
      try {
        let qrWidth = 48;
        if (tpl === 'shelf-standard') {
          qrWidth = 36;
        } else if (tpl === 'shelf-large') {
          qrWidth = 48;
        } else if (tpl === 'custom') {
          const struct = settings.customLayoutStructure || 'classic';
          qrWidth = struct === 'split' ? 36 : 48;
        }

        qrSvg = await QRCode.toString(p.sku || p.id, {
          type: 'svg',
          margin: 0,
          width: qrWidth
        });
      } catch (e) {
        console.error('Offline QR generation error:', e);
      }

      return {
        id: p.id,
        barcodeSvg,
        qrSvg
      };
    })
  );

  return new Map(offlineAssets.map((a) => [a.id, a]));
}
