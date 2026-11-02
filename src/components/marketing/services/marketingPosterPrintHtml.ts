import { Product, CompanySettings } from '../../../types';
import { escapeHtml } from '../../../lib/utils';
import { PosterType, PosterFormat, MARKETING_THEMES } from '../marketingTypes';
import { toast } from 'sonner';

export interface MarketingPosterHtmlOptions {
  product: Product;
  posterType: PosterType;
  posterFormat: PosterFormat;
  currentBadgeText: string;
  customText?: string;
  showOldPrice: boolean;
  safeOldPrice: number;
  safePrice: number;
  currency: string;
  showImage: boolean;
  productImage?: string;
  settings: CompanySettings;
}

export function buildMarketingPosterHtml(options: MarketingPosterHtmlOptions): string {
  const {
    product,
    posterType,
    posterFormat,
    currentBadgeText,
    customText,
    showOldPrice,
    safeOldPrice,
    safePrice,
    currency,
    showImage,
    productImage,
    settings
  } = options;

  const activeTheme = MARKETING_THEMES[posterType];
  const isLandscape = posterFormat === 'a4-landscape';
  const isShelf = posterFormat === 'shelf-tag';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Affiche - ${escapeHtml(product.name)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          @page { 
            size: ${isLandscape ? 'A4 landscape' : isShelf ? 'A5 landscape' : 'A4 portrait'}; 
            margin: 0; 
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { 
            margin: 0; 
            font-family: 'Inter', sans-serif; 
            background: ${activeTheme.bgHex}; 
            color: ${posterType === 'flash' ? '#000000' : '#ffffff'}; 
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: ${isShelf ? '30px' : '50px'};
            position: relative;
            overflow: hidden;
          }
          .badge {
            display: inline-block;
            background: ${posterType === 'flash' ? '#000000' : '#ffffff'};
            color: ${posterType === 'flash' ? '#f59e0b' : '#000000'};
            padding: 12px 28px;
            font-weight: 900;
            font-size: ${isShelf ? '20px' : '28px'};
            text-transform: uppercase;
            border-radius: 12px;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            margin-bottom: 20px;
          }
          .content-row {
            display: flex;
            flex: 1;
            gap: 40px;
            align-items: center;
            justify-content: space-between;
            min-height: 0;
          }
          .info-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .product-name {
            font-size: ${isShelf ? '38px' : isLandscape ? '56px' : '64px'};
            font-weight: 900;
            line-height: 1.05;
            text-transform: uppercase;
            margin-bottom: 20px;
            letter-spacing: -0.5px;
            word-break: break-word;
          }
          .description {
            font-size: ${isShelf ? '16px' : '22px'};
            opacity: 0.9;
            line-height: 1.4;
            margin-bottom: 30px;
            max-width: 600px;
          }
          .img-container {
            width: ${isShelf ? '180px' : isLandscape ? '300px' : '360px'};
            height: ${isShelf ? '180px' : isLandscape ? '300px' : '360px'};
            background: rgba(255, 255, 255, 0.95);
            border-radius: 24px;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            flex-shrink: 0;
          }
          .img-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .price-container {
            display: flex;
            align-items: baseline;
            gap: 20px;
            margin-top: 20px;
          }
          .old-price {
            font-size: ${isShelf ? '30px' : '48px'};
            text-decoration: line-through;
            opacity: 0.6;
            font-weight: 700;
          }
          .price {
            font-size: ${isShelf ? '60px' : isLandscape ? '90px' : '110px'};
            font-weight: 900;
            line-height: 1;
            letter-spacing: -2px;
          }
          .currency {
            font-size: ${isShelf ? '28px' : '44px'};
            font-weight: 900;
            margin-left: 10px;
          }
          .footer {
            padding-top: 20px;
            border-top: 3px solid rgba(255, 255, 255, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .store-name {
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .promo-text {
            font-size: 16px;
            font-weight: 700;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div>
          <div class="badge">${escapeHtml(currentBadgeText)}</div>
        </div>
        
        <div class="content-row">
          <div className="info-col">
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="description">${escapeHtml(customText || product.description || 'Profitez de la meilleure qualité au meilleur prix en magasin.')}</div>
            
            <div class="price-container">
              ${showOldPrice && safeOldPrice > safePrice ? `<div class="old-price">${safeOldPrice.toFixed(2)}</div>` : ''}
              <div class="price">
                ${safePrice.toFixed(2)}<span class="currency">${escapeHtml(currency)}</span>
              </div>
            </div>
          </div>

          ${showImage && productImage ? `
            <div class="img-container">
              <img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.name)}" />
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>
            <div class="store-name">${escapeHtml(settings.name || 'Nexus POS Pro')}</div>
            <div class="promo-text">${escapeHtml(settings.address || 'Offre valable selon stocks disponibles')}</div>
          </div>
          <div class="promo-text">${escapeHtml(settings.phone ? 'Tél : ' + settings.phone : 'Nexus POS Pro')}</div>
        </div>

        <script>
          window.onload = () => { 
            window.print(); 
            setTimeout(() => window.close(), 600); 
          };
        </script>
      </body>
    </html>
  `;
}

export function printMarketingPoster(options: MarketingPosterHtmlOptions): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error("Veuillez autoriser les fenêtres pop-up pour imprimer.");
    return;
  }

  const html = buildMarketingPosterHtml(options);
  printWindow.document.write(html);
  printWindow.document.close();
}
