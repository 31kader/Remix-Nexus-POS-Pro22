import { Product, CompanySettings } from '../../types';
import { CatalogPrintSettings } from './catalogTypes';
import { buildCatalogHtml } from './catalogHtmlBuilder';

export * from './catalogTypes';
export * from './catalogAssetsGenerator';
export * from './catalogHtmlBuilder';
export * from './catalogSocialExporter';

export const printCatalog = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings
) => {
  let iframe = document.getElementById('print-catalog-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-catalog-iframe';
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

  const fullHtml = await buildCatalogHtml(products, companySettings, printSettings);

  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Catalog print trigger failed:', e);
      }
    }
  }, 200);
};
