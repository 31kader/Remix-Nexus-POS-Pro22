import { Product, CompanySettings } from '../types';
import { formatPrice } from '../lib/utils';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export const printLabels = async (products: Product[], rawSettings: CompanySettings) => {
  const settings = rawSettings as any;

  // Toujours utiliser une iframe d'impression invisible pour éviter les blocages de popups
  // et empêcher Chromium d'imprimer les marges/URLs d'une fenêtre externe
  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const tpl = (settings.labelTemplate as string) || 'standard';
  
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
  // `80mm auto` fait dérouler 7 à 9 étiquettes dans le vide sur les rouleaux d'étiquettes car la hauteur est non bornée.
  const isExplicitReceipt = settings.labelPrinterType === 'receipt_printer';
  const isLabelDimensions = widthVal <= 65 && heightVal <= 45;
  const isReceiptPrinterMode = isExplicitReceipt && !isLabelDimensions;

  // Sur une imprimante thermique de ticket de caisse 80mm, la zone chauffante réelle est de 72mm maximum.
  if (isReceiptPrinterMode && widthVal > 72) {
    widthVal = 72;
  }

  const width = `${widthVal}mm`;
  const height = `${heightVal}mm`;
  // Marge de sécurité anti-arrondi : un bloc de hauteur EXACTEMENT égale à la page déborde de quelques
  // fractions de pixel => Chromium ajoute une page blanche => l'imprimante éjecte des étiquettes vides.
  const safeHeight = isReceiptPrinterMode ? height : `${Math.max(heightVal - 0.4, 1).toFixed(2)}mm`;
  // Default to '0' (no rotation) unless explicitly configured by user
  const rot = (settings.labelRotation !== undefined && settings.labelRotation !== null && settings.labelRotation !== '') ? settings.labelRotation : '0';

  // Format compact mini-étiquette (ex: 40x20 mm, IDIPOS)
  const isMiniLabel = heightVal <= 25 || widthVal <= 25;

  // Custom template configs
  const showBarcode = settings.customShowBarcode !== false;
  const showQr = settings.customShowQr === true;
  let bHeight = settings.customBarcodeHeight || (isMiniLabel ? 13 : 30);
  if (isMiniLabel && bHeight > 16) {
    bHeight = 13; // Verrou anti-débordement sur étiquette 20mm
  }
  const bWidthVal = settings.customBarcodeWidth || (isMiniLabel ? 1.0 : 1.2);

  // Pre-generate barcodes and QR codes offline
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

  const assetMap = new Map(offlineAssets.map((a) => [a.id, a]));
  let labelsHtml = '';

  products.forEach((p) => {
    let contentHtml = '';
    const assets = assetMap.get(p.id);
    const barcodeHtml = assets?.barcodeSvg || '';
    const qrHtml = assets?.qrSvg || '';

    if (tpl === 'price-only') {
      contentHtml = `<div class="price-only">${formatPrice(p.price)} ${settings.currency}</div>`;
    } else if (tpl === 'shelf-standard') {
      contentHtml = `
        <div class="shelf-tag shelf-standard">
          <div class="name">${p.name}</div>
          <div class="main-price">${formatPrice(p.price)} <span class="currency">${settings.currency}</span></div>
          <div class="footer-meta">
            <div class="qr-box-inlined">${qrHtml}</div>
            <div class="ref">REF: ${p.sku || String(p.id || "").slice(-6).toUpperCase()}</div>
          </div>
        </div>
      `;
    } else if (tpl === 'shelf-large') {
      contentHtml = `
        <div class="shelf-tag shelf-large">
          <div class="brand">${settings.name}</div>
          <div class="name">${p.name}</div>
          <div class="price-row">
            <div class="main-price">${formatPrice(p.price)} <span class="currency">${settings.currency}</span></div>
            <div class="unit-price">${formatPrice(p.price)} ${settings.currency}/${p.unit || 'u'}</div>
          </div>
          <div class="barcode-row">
            <div class="qr-box-inlined">${qrHtml}</div>
            <div class="sku">${p.sku || p.id}</div>
          </div>
        </div>
      `;
    } else if (tpl === 'shelf-promo') {
      const oldPriceVal = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : (Number(p.price) * 1.2);
      contentHtml = `
        <div class="shelf-tag shelf-promo">
          <div class="promo-badge">PROMO</div>
          <div class="name">${p.name}</div>
          <div class="price-box">
            <div class="old-price">${formatPrice(oldPriceVal)} ${settings.currency}</div>
            <div class="new-price">${formatPrice(p.price)} <span>${settings.currency}</span></div>
          </div>
        </div>
      `;
    } else if (tpl === 'custom') {
      const showName = settings.customShowName !== false;
      const showPrice = settings.customShowPrice !== false;
      const showBarcode = settings.customShowBarcode !== false;
      const showQr = settings.customShowQr === true;
      const showImage = settings.customShowImage === true;
      const customText = settings.customText || '';
      const borderStyle = settings.customBorder ? '1px solid #000' : 'none';
      
      let nameSize = settings.customNameSize || (isMiniLabel ? 8 : 11);
      let priceSize = settings.customPriceSize || (isMiniLabel ? 12 : 16);
      let textSize = settings.customTextSize || (isMiniLabel ? 7 : 9);
      let paddingVal = settings.customPadding !== undefined ? settings.customPadding : (isMiniLabel ? 1 : 2);
      
      if (isMiniLabel) {
        if (nameSize > 9) nameSize = 8;
        if (priceSize > 13) priceSize = 12;
        if (textSize > 8) textSize = 7;
        if (paddingVal > 1) paddingVal = 1;
      }
      
      // Directional margins / alignments (haut, bas, gauche, droite)
      const pTop = settings.customPaddingTop !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingTop, 1) : settings.customPaddingTop) : paddingVal;
      const pBottom = settings.customPaddingBottom !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingBottom, 1) : settings.customPaddingBottom) : paddingVal;
      const pLeft = settings.customPaddingLeft !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingLeft, 1) : settings.customPaddingLeft) : paddingVal;
      const pRight = settings.customPaddingRight !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingRight, 1) : settings.customPaddingRight) : paddingVal;

      const struct = settings.customLayoutStructure || 'classic';
      const align = settings.customAlignment || 'center';

      const tAlign = settings.customTextAlign || 'center';
      const isBold = settings.customTextBold ? 'bold' : 'normal';
      const isItalic = settings.customTextItalic ? 'italic' : 'normal';

      const customGap = settings.customGap !== undefined ? (isMiniLabel ? Math.min(settings.customGap, 1) : settings.customGap) : (isMiniLabel ? 1 : 4);
      const nameLineClamp = settings.nameLineClamp !== undefined ? settings.nameLineClamp : 1;
      const customLetterSpacing = settings.customLetterSpacing !== undefined ? settings.customLetterSpacing : 0;

      const imgSize = isMiniLabel ? 20 : 32;
      const imageHtml = showImage && (p.imageUrl || p.image) ? `<div style="width: ${imgSize}px; height: ${imgSize}px; display: inline-flex; align-items: center; justify-content: center; background: #fff; border-radius: 3px; border: 1px solid #ddd; overflow: hidden;"><img src="${p.imageUrl || p.image}" style="max-width: 100%; max-height: 100%; object-fit: contain;" referrerpolicy="no-referrer" /></div>` : '';

      const crossedPriceHtml = (p.originalPrice && Number(p.originalPrice) > Number(p.price))
        ? `<span style="font-size: ${Math.max(7, Math.round(priceSize * 0.65))}px; text-decoration: line-through; color: #555; font-weight: bold; margin-right: 3px;">${formatPrice(p.originalPrice)}</span>`
        : '';

      if (struct === 'split') {
        // Two-Column Layout organization: left side details, right side code
        contentHtml = `
          <div class="label-custom" style="
            display: flex; 
            flex-direction: row; 
            align-items: center; 
            justify-content: space-between; 
            height: 100%; 
            width: 100%; 
            padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
            box-sizing: border-box;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            border: ${borderStyle};
            gap: ${customGap}px;
          ">
            <!-- Left part: details -->
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; height: 100%;">
              ${showName ? `
                <div class="name" style="
                  font-weight: bold; 
                  font-size: ${nameSize}px; 
                  width: 100%; 
                  margin-bottom: 2px;
                  letter-spacing: ${customLetterSpacing}px;
                  ${nameLineClamp === 2 ? `
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    white-space: normal;
                  ` : `
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                ">${p.name}</div>
              ` : ''}
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; margin: 3px 0; width: 100%;">
                ${imageHtml}
                ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 900; margin: 0; white-space: nowrap;">${crossedPriceHtml}${formatPrice(p.price)} ${settings.currency}</div>` : ''}
              </div>
              ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; margin: 1px 0; width: 100%; word-break: break-word;">${customText}</div>` : ''}
            </div>

            <!-- Right part: barcode or QR -->
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; max-width: 48%; min-width: 32%; gap: 4px;">
              ${showBarcode ? `
                <div style="display: flex; justify-content: center; overflow: hidden; width: 100%;">
                  ${barcodeHtml}
                </div>
              ` : ''}
              ${showQr ? `
                <div style="display: flex; justify-content: center; width: 100%;">
                  ${qrHtml}
                </div>
              ` : ''}
              ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${p.sku || p.id}</div>` : ''}
            </div>
          </div>
        `;
      } else if (struct === 'price-heavy') {
        // Price Dominant layout (Focus prix)
        contentHtml = `
          <div class="label-custom" style="
            display: flex; 
            flex-direction: row; 
            align-items: center; 
            justify-content: space-between; 
            height: 100%; 
            width: 100%; 
            padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
            box-sizing: border-box;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            border: ${borderStyle};
            gap: ${customGap}px;
          ">
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f1f5f9; border: 1.5px solid #000; border-radius: 4px; padding: 4px; min-width: 45%; height: 100%; box-sizing: border-box;">
              ${showPrice ? `
                ${p.originalPrice && Number(p.originalPrice) > Number(p.price) ? `<div style="font-size: ${Math.max(8, Math.round(priceSize * 0.65))}px; text-decoration: line-through; color: #555; font-weight: bold; margin-bottom: 2px;">${formatPrice(p.originalPrice)}</div>` : ''}
                <div class="price" style="font-size: ${Math.round(priceSize * 1.25)}px; font-weight: 900; line-height: 1; text-align: center; color: #000;">${formatPrice(p.price)}</div>
                <div style="font-size: 9px; font-weight: bold; margin-top: 3px; text-transform: uppercase; color: #475569;">${settings.currency}</div>
              ` : '<div style="font-weight: bold; font-size: 11px;">PROMO</div>'}
            </div>

            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; height: 100%; gap: 4px;">
              ${showName ? `
                <div class="name" style="
                  font-weight: bold; 
                  font-size: ${nameSize}px; 
                  width: 100%;
                  letter-spacing: ${customLetterSpacing}px;
                  ${nameLineClamp === 2 ? `
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    white-space: normal;
                  ` : `
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                ">${p.name}</div>
              ` : ''}
              ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${customText}</div>` : ''}
              
              <div style="width: 100%; display: flex; justify-content: flex-start; margin-top: auto;">
                ${showBarcode ? barcodeHtml : ''}
                ${showQr && !showBarcode ? qrHtml : ''}
                ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${p.sku || p.id}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      } else if (struct === 'barcode-centric') {
        // Barcode Centric (Master code - giant barcode takes center space)
        contentHtml = `
          <div class="label-custom" style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: space-between; 
            height: 100%; 
            width: 100%; 
            padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
            box-sizing: border-box;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            border: ${borderStyle};
            gap: ${customGap}px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 6px; margin-bottom: 2px;">
              ${showName ? `
                <div class="name" style="
                  font-weight: bold; 
                  font-size: ${nameSize}px; 
                  flex: 1; 
                  text-align: left;
                  letter-spacing: ${customLetterSpacing}px;
                  ${nameLineClamp === 2 ? `
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    white-space: normal;
                  ` : `
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                ">${p.name}</div>
              ` : ''}
              ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 950; text-align: right; white-space: nowrap;">${crossedPriceHtml}${formatPrice(p.price)} ${settings.currency}</div>` : ''}
            </div>

            ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; width: 100%; text-align: center; margin-bottom: 2px;">${customText}</div>` : ''}

            ${showBarcode ? `
              <div style="display: flex; justify-content: center; width: 100%; overflow: hidden; flex: 1; align-items: center;">
                ${barcodeHtml}
              </div>
            ` : ''}
            ${showQr && !showBarcode ? `
              <div style="display: flex; justify-content: center; width: 100%; flex: 1; align-items: center;">
                ${qrHtml}
              </div>
            ` : ''}
            ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.sku || p.id}</div>` : ''}
          </div>
        `;
      } else {
        // 'classic' or default: vertical stack aligned by align setting
        contentHtml = `
          <div class="label-custom" style="
            display: flex; 
            flex-direction: column; 
            align-items: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; 
            justify-content: space-between; 
            height: 100%; 
            width: 100%; 
            padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
            box-sizing: border-box;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            border: ${borderStyle};
            gap: ${customGap}px;
          ">
            ${showName ? `
              <div class="name" style="
                font-weight: bold; 
                font-size: ${nameSize}px; 
                width: 100%; 
                text-align: ${align}; 
                letter-spacing: ${customLetterSpacing}px;
                ${nameLineClamp === 2 ? `
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                  white-space: normal;
                ` : `
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                `}
              ">${p.name}</div>
            ` : ''}
            
            <div style="display: flex; align-items: center; justify-content: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; gap: 8px; margin: auto; width: 100%;">
              ${imageHtml}
              ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 900; margin: 0; white-space: nowrap;">${crossedPriceHtml}${formatPrice(p.price)} ${settings.currency}</div>` : ''}
            </div>

            ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; text-align: ${tAlign}; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; margin: 2px 0; width: 100%; word-break: break-word;">${customText}</div>` : ''}

            ${showBarcode ? `
              <div style="display: flex; justify-content: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; width: 100%; overflow: hidden; margin: 2px 0;">
                ${barcodeHtml}
              </div>
            ` : ''}
            
            ${showQr ? `
              <div style="display: flex; justify-content: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; width: 100%; margin: 2px 0;">
                ${qrHtml}
              </div>
            ` : ''}

            ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; width: 100%; text-align: ${align}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.sku || p.id}</div>` : ''}
          </div>
        `;
      }
    } else if (tpl === 'barcode-only') {
      contentHtml = `
        <div class="label-standard" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
          ${barcodeHtml}
        </div>
      `;
    } else {
      // standard template
      const name = p.name || '';
      const matchUnit = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|g|gramme|l|litre|ml|cl)\b/i);
      let unitPriceText = '';
      if (matchUnit) {
        const val = parseFloat(matchUnit[1].replace(',', '.'));
        const unit = matchUnit[2].toLowerCase();
        if (val > 0) {
          if (unit === 'kg' || unit === 'kilo') {
            unitPriceText = `(${formatPrice(p.price / val)} ${settings.currency}/kg)`;
          } else if (unit === 'g' || unit === 'gramme') {
            unitPriceText = `(${formatPrice((p.price / val) * 1000)} ${settings.currency}/kg)`;
          } else if (unit === 'l' || unit === 'litre') {
            unitPriceText = `(${formatPrice(p.price / val)} ${settings.currency}/L)`;
          } else if (unit === 'cl') {
            unitPriceText = `(${formatPrice((p.price / val) * 100)} ${settings.currency}/L)`;
          } else if (unit === 'ml') {
            unitPriceText = `(${formatPrice((p.price / val) * 1000)} ${settings.currency}/L)`;
          }
        }
      }

      const stdNameSize = isMiniLabel ? '8px' : '11px';
      const stdPriceSize = isMiniLabel ? '12px' : '16px';
      const stdImgSize = isMiniLabel ? '18px' : '28px';

      contentHtml = `
        <div class="label-standard" style="
          width: 100%; 
          height: 100%; 
          box-sizing: border-box; 
          padding: ${isMiniLabel ? '1px' : '2px'}; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: space-between; 
          overflow: hidden;
        ">
          <div style="width: 100%; text-align: center; overflow: hidden;">
            <div class="name" style="font-weight: bold; font-size: ${stdNameSize}; line-height: 1.1; margin: 0; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin: 1px 0;">
              ${(p.imageUrl || p.image) ? `<div style="width: ${stdImgSize}; height: ${stdImgSize}; display: inline-flex; align-items: center; justify-content: center; background: #fff; border-radius: 2px; border: 1px solid #ddd; overflow: hidden;"><img src="${p.imageUrl || p.image}" style="max-width: 100%; max-height: 100%; object-fit: contain;" referrerpolicy="no-referrer" /></div>` : ''}
              <div class="price" style="font-size: ${stdPriceSize}; font-weight: 900; line-height: 1.1; margin: 0;">${formatPrice(p.price)} ${settings.currency}</div>
            </div>
            ${(!isMiniLabel && unitPriceText) ? `<div style="font-size: 7.5px; font-weight: 800; color: #444; margin-top: 1px;">${unitPriceText}</div>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; overflow: hidden;">
            ${barcodeHtml}
            <div class="sku" style="font-size: ${isMiniLabel ? '7px' : '8px'}; color: #666; line-height: 1; margin: 0;">${p.sku || p.id}</div>
          </div>
        </div>
      `;
    }

    labelsHtml += `
      <div class="label-container">
        <div class="label-wrapper rot-${rot}">
          ${contentHtml}
        </div>
      </div>
    `;
  });

  // Si on imprime sur l'imprimante de ticket de caisse 80mm en mode continu, on passe 80mm auto.
  // Pour TOUTE étiquette dédiée (IDIPOS 40x20mm, etc.), on passe strictement sa largeur et hauteur exactes.
  const pageSizeCss = isReceiptPrinterMode
    ? '80mm auto'
    : `${width} ${height}`;
  const bodyWidthCss = isReceiptPrinterMode ? '72mm' : width;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Etiquettes</title>
        <style>
          @page { 
            size: ${pageSizeCss}; 
            margin: 0mm !important; 
          }
          @media print {
            @page {
              size: ${pageSizeCss};
              margin: 0mm !important;
            }
            html, body {
              width: ${bodyWidthCss} !important;
              height: auto !important;
              margin: 0mm !important;
              padding: 0mm !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * { 
            box-sizing: border-box; 
            margin: 0;
            padding: 0;
          }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
            font-family: Arial, sans-serif;
            width: ${bodyWidthCss} !important;
            height: auto !important;
            font-size: 0 !important;
            line-height: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          svg {
            max-width: 100% !important;
            max-height: 100% !important;
            display: block;
            margin: 0 auto;
          }
          .label-container {
            width: ${width} !important; 
            height: ${safeHeight} !important;
            max-width: ${width} !important;
            max-height: ${safeHeight} !important;
            min-height: ${safeHeight} !important;
            padding: 0 !important;
            margin: ${isReceiptPrinterMode ? '0 auto' : '0'} !important;
            box-sizing: border-box !important;
            background: white !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px !important;
            line-height: normal !important;
            ${isReceiptPrinterMode ? 'border-bottom: 1px dashed #ccc;' : ''}
          }
          /* Saut de page AVANT chaque étiquette sauf la 1ère : jamais de page blanche finale */
          .label-container + .label-container {
            page-break-before: always !important;
            break-before: page !important;
          }
          .label-container:last-child {
            border-bottom: none !important;
          }
          .label-wrapper {
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            background: white;
          }
          .label-wrapper.rot-90 {
            width: ${height} !important;
            height: ${width} !important;
            transform: rotate(90deg);
            transform-origin: center center;
          }
          .label-wrapper.rot-180 {
            width: 100% !important;
            height: 100% !important;
            transform: rotate(180deg);
            transform-origin: center center;
          }
          .label-wrapper.rot-270 {
            width: ${height} !important;
            height: ${width} !important;
            transform: rotate(270deg);
            transform-origin: center center;
          }
          .shelf-tag { width: 100%; height: 100%; padding: 5px; border: 1px solid #ddd; position: relative; }
          .shelf-standard .name { font-size: 10px; font-weight: bold; margin-bottom: 2px; height: 2.4em; overflow: hidden; text-align: left; }
          .shelf-standard .main-price { font-size: 18px; font-weight: 900; text-align: left; }
          .shelf-standard .currency { font-size: 10px; font-weight: 700; }
          .shelf-standard .footer-meta { display: flex; justify-content: space-between; align-items: flex-end; position: absolute; bottom: 5px; width: calc(100% - 10px); }
          .shelf-standard .ref { font-size: 7px; color: #666; font-family: monospace; }
          .shelf-large .brand { font-size: 10px; font-weight: 800; color: #4f46e5; margin-bottom: 2px; }
          .shelf-large .name { font-size: 14px; font-weight: bold; margin-bottom: 5px; text-align: left; }
          .shelf-large .price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
          .shelf-large .main-price { font-size: 32px; font-weight: 950; letter-spacing: -1px; }
          .shelf-large .unit-price { font-size: 10px; color: #666; font-weight: bold; }
          .shelf-large .barcode-row { display: flex; align-items: center; gap: 10px; }
          .shelf-large .sku { font-size: 9px; font-family: monospace; }
          .shelf-promo { background: #fee2e2; border: 2px solid #ef4444; }
          .shelf-promo .promo-badge { background: #ef4444; color: white; padding: 2px 8px; font-size: 10px; font-weight: 900; display: inline-block; margin-bottom: 5px; }
          .shelf-promo .name { font-size: 12px; font-weight: bold; text-align: left; }
          .shelf-promo .price-box { margin-top: 5px; text-align: left; }
          .shelf-promo .old-price { font-size: 11px; text-decoration: line-through; color: #991b1b; }
          .shelf-promo .new-price { font-size: 24px; font-weight: 900; color: #ef4444; }
          .label-standard { text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 2px; }
          .label-standard .name { font-weight: bold; font-size: 11px; margin-bottom: 2px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .label-standard .price { font-size: 16px; font-weight: 900; margin-bottom: 4px; }
          .label-standard .sku { font-size: 8px; color: #666; margin-top: 2px; }
          .price-only { font-size: 28px; font-weight: 900; display: flex; align-items: center; justify-content: center; height: 100%; }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {}
    }
  }, 150);
};

export const printLabel = async (p: Product, settings: CompanySettings) => {
  await printLabels([p], settings);
};
