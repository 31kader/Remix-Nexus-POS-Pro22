import { Product } from '../../types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface CatalogAsset {
  id: string;
  barcodeSvg: string;
  qrSvg: string;
}

export async function generateCatalogAssets(
  products: Product[],
  showBarcode: boolean,
  barcodeWidth: number,
  barcodeHeight: number,
  showQr: boolean,
  qrSize: number
): Promise<Map<string, CatalogAsset>> {
  const offlineAssets = await Promise.all(
    products.map(async (p) => {
      const skuForBarcode = p.sku || p.id.substring(0, 8).toUpperCase();
      let barcodeSvg = '';
      let qrSvg = '';

      if (showBarcode && typeof document !== 'undefined') {
        try {
          const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          JsBarcode(tempSvg, skuForBarcode, {
            format: 'CODE128',
            width: barcodeWidth,
            height: barcodeHeight,
            displayValue: true,
            fontSize: 9,
            margin: 0
          });
          barcodeSvg = tempSvg.outerHTML;
        } catch (e) {
          console.error('Catalog Barcode generation failed:', e);
        }
      }

      if (showQr) {
        try {
          qrSvg = await QRCode.toString(p.sku || p.id, {
            type: 'svg',
            margin: 0,
            width: qrSize
          });
        } catch (e) {
          console.error('Catalog QR generation failed:', e);
        }
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
