import { Product, CompanySettings } from '../../types';
import { computeLabelDimensions } from './labelDimensions';
import { generateOfflineLabelAssets } from './labelBarcodeGenerator';
import { generateLabelContentHtml } from './labelHtmlTemplates';
import { generateLabelPrintStyles } from './labelPrintCss';

export * from './labelDimensions';
export * from './labelBarcodeGenerator';
export * from './labelHtmlTemplates';
export * from './labelPrintCss';

export const printLabels = async (products: Product[], rawSettings: CompanySettings) => {
  const settings = rawSettings as any;

  // Toujours utiliser une iframe d'impression invisible pour éviter les blocages de popups
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
  const dimensions = computeLabelDimensions(settings, tpl);
  const { rot, isMiniLabel } = dimensions;

  // Pre-generate barcodes and QR codes offline
  const assetMap = await generateOfflineLabelAssets(products, settings, tpl, isMiniLabel);

  let labelsHtml = '';
  products.forEach((p) => {
    const assets = assetMap.get(p.id);
    const contentHtml = generateLabelContentHtml(p, assets, settings, tpl, isMiniLabel);

    labelsHtml += `
      <div class="label-container">
        <div class="label-wrapper rot-${rot}">
          ${contentHtml}
        </div>
      </div>
    `;
  });

  const css = generateLabelPrintStyles(dimensions);

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Etiquettes</title>
        <style>
          ${css}
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
