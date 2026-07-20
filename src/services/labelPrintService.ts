import { Product, CompanySettings } from '../types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export const printLabels = async (products: Product[], rawSettings: CompanySettings) => {
  const settings = rawSettings as any;
  const useSilent = settings.silentPrinting;

  let printWindow: Window | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let doc: Document | null = null;

  if (useSilent) {
    iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
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
    doc = iframe.contentWindow?.document || iframe.contentDocument;
  } else {
    printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    doc = printWindow.document;
  }

  if (!doc) return;

  const tpl = (settings.labelTemplate as string) || 'standard';
  
  // Base/unrotated width and height
  const defaultWidthNum = tpl === 'custom' ? 70 : (tpl === 'shelf-large' ? 80 : tpl === 'shelf-standard' ? 40 : 60);
  const defaultHeightNum = tpl === 'custom' ? 40 : (tpl === 'shelf-standard' ? 30 : 40);

  const uWidthNum = settings.labelWidthCustom || defaultWidthNum;
  const uHeightNum = settings.labelHeightCustom || defaultHeightNum;

  // Render Dimensions (width and height swapped if portrait, e.g. for label feeding rolls)
  let widthVal = uWidthNum;
  let heightVal = uHeightNum;
  if (settings.labelOrientation === 'portrait') {
    widthVal = uHeightNum;
    heightVal = uWidthNum;
  }

  const width = `${widthVal}mm`;
  const height = `${heightVal}mm`;
  // Force rotation as requested or use settings, respecting '0' if defined
  const rot = (settings.labelRotation !== undefined && settings.labelRotation !== null && settings.labelRotation !== '') ? settings.labelRotation : '90';

  // Custom template configs
  const showBarcode = settings.customShowBarcode !== false;
  const showQr = settings.customShowQr === true;
  const bHeight = settings.customBarcodeHeight || 30;
  const bWidthVal = settings.customBarcodeWidth || 1.2;

  // Pre-generate barcodes and QR codes offline
  const offlineAssets = await Promise.all(
    products.map(async (p) => {
      const skuForBarcode = p.sku || p.id.substring(0, 8).toUpperCase();
      let barcodeSvg = '';
      let qrSvg = '';

      let finalBHeight = bHeight;
      let finalBWidth = bWidthVal;
      let showBarcodeText = true;

      if (tpl === 'barcode-only') {
        finalBHeight = 40;
        finalBWidth = 1.5;
        showBarcodeText = true;
      } else if (tpl === 'standard') {
        finalBHeight = 30;
        finalBWidth = 1.2;
        showBarcodeText = true;
      } else if (tpl === 'custom') {
        finalBHeight = bHeight;
        finalBWidth = bWidthVal;
        const struct = settings.customLayoutStructure || 'classic';
        // In compact layouts, hide barcode text to prevent overlapping
        if (struct === 'split' || struct === 'price-heavy') {
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
            fontSize: 10,
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
      contentHtml = `<div class="price-only">${p.price.toFixed(2)} ${settings.currency}</div>`;
    } else if (tpl === 'shelf-standard') {
      contentHtml = `
        <div class="shelf-tag shelf-standard">
          <div class="name">${p.name}</div>
          <div class="main-price">${p.price.toFixed(2)} <span class="currency">${settings.currency}</span></div>
          <div class="footer-meta">
            <div class="qr-box-inlined">${qrHtml}</div>
            <div class="ref">REF: ${p.sku || p.id.slice(-6).toUpperCase()}</div>
          </div>
        </div>
      `;
    } else if (tpl === 'shelf-large') {
      contentHtml = `
        <div class="shelf-tag shelf-large">
          <div class="brand">${settings.name}</div>
          <div class="name">${p.name}</div>
          <div class="price-row">
            <div class="main-price">${p.price.toFixed(2)} <span class="currency">${settings.currency}</span></div>
            <div class="unit-price">${(p.price / 1).toFixed(2)} ${settings.currency}/${p.unit || 'u'}</div>
          </div>
          <div class="barcode-row">
            <div class="qr-box-inlined">${qrHtml}</div>
            <div class="sku">${p.sku || p.id}</div>
          </div>
        </div>
      `;
    } else if (tpl === 'shelf-promo') {
      contentHtml = `
        <div class="shelf-tag shelf-promo">
          <div class="promo-badge">PROMO</div>
          <div class="name">${p.name}</div>
          <div class="price-box">
            <div class="old-price">${(p.price * 1.2).toFixed(2)} ${settings.currency}</div>
            <div class="new-price">${p.price.toFixed(2)} <span>${settings.currency}</span></div>
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
      
      const nameSize = settings.customNameSize || 11;
      const priceSize = settings.customPriceSize || 16;
      const textSize = settings.customTextSize || 9;
      const paddingVal = settings.customPadding !== undefined ? settings.customPadding : 2;
      
      // Directional margins / alignments (haut, bas, gauche, droite)
      const pTop = settings.customPaddingTop !== undefined ? settings.customPaddingTop : paddingVal;
      const pBottom = settings.customPaddingBottom !== undefined ? settings.customPaddingBottom : paddingVal;
      const pLeft = settings.customPaddingLeft !== undefined ? settings.customPaddingLeft : paddingVal;
      const pRight = settings.customPaddingRight !== undefined ? settings.customPaddingRight : paddingVal;

      const struct = settings.customLayoutStructure || 'classic';
      const align = settings.customAlignment || 'center';

      const tAlign = settings.customTextAlign || 'center';
      const isBold = settings.customTextBold ? 'bold' : 'normal';
      const isItalic = settings.customTextItalic ? 'italic' : 'normal';

      const customGap = settings.customGap !== undefined ? settings.customGap : 4;
      const nameLineClamp = settings.nameLineClamp !== undefined ? settings.nameLineClamp : 1;
      const customLetterSpacing = settings.customLetterSpacing !== undefined ? settings.customLetterSpacing : 0;

      const imageHtml = showImage && (p.imageUrl || p.image) ? `<img src="${p.imageUrl || p.image}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" referrerpolicy="no-referrer" />` : '';

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
                ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 900; margin: 0; white-space: nowrap;">${p.price.toFixed(2)} ${settings.currency}</div>` : ''}
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
                <div class="price" style="font-size: ${Math.round(priceSize * 1.25)}px; font-weight: 900; line-height: 1; text-align: center; color: #000;">${p.price.toFixed(2)}</div>
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
              ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 950; text-align: right; white-space: nowrap;">${p.price.toFixed(2)} ${settings.currency}</div>` : ''}
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
              ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 900; margin: 0; white-space: nowrap;">${p.price.toFixed(2)} ${settings.currency}</div>` : ''}
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
      contentHtml = `
        <div class="label-standard" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
          <div class="name" style="font-weight: bold; font-size: 11px; margin-bottom: 2px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 2px 0;">
            ${(p.imageUrl || p.image) ? `<img src="${p.imageUrl || p.image}" style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px; border: 1.5px solid #ddd;" referrerpolicy="no-referrer" />` : ''}
            <div class="price" style="font-size: 16px; font-weight: 900; margin: 0;">${p.price.toFixed(2)} ${settings.currency}</div>
          </div>
          ${barcodeHtml}
          <div class="sku" style="font-size: 8px; color: #666; margin-top: 2px;">${p.sku || p.id}</div>
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

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Etiquettes</title>
        <style>
          @page { 
            size: ${width} ${height}; 
            margin: 0 !important; 
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
            font-family: sans-serif;
            width: ${width} !important;
            height: auto !important;
            overflow: visible !important;
            font-size: 0 !important;
            line-height: 0 !important;
          }
          svg {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 0 auto;
          }
          .label-container {
            width: ${width} !important; 
            height: ${height} !important;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            background: white;
            position: relative !important;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px !important;
            line-height: normal !important;
          }
          .label-container:not(:last-child) {
            page-break-after: always;
            break-after: page;
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
            width: 100% !important;
            height: 100% !important;
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
            width: 100% !important;
            height: 100% !important;
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
        <script>
          window.onload = () => {
            window.print();
            ${useSilent ? '' : 'setTimeout(() => window.close(), 500);'}
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  if (useSilent && iframe?.contentWindow) {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {}
  }
};

export const printLabel = async (p: Product, settings: CompanySettings) => {
  await printLabels([p], settings);
};
