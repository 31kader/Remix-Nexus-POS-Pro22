export function buildCatalogCss(
  orientation: string,
  a4Width: string,
  a4Height: string,
  pageMargin: number
): string {
  return `
    <style>
      @page {
        size: A4 ${orientation};
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        width: ${a4Width} !important;
      }
      .page {
        width: ${a4Width} !important;
        height: ${a4Height} !important;
        padding: ${pageMargin}mm;
        box-sizing: border-box;
        background: white;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
        display: flex;
        flex-direction: column;
      }
      .page-content {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        justify-content: space-between;
      }
      .catalog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
        margin-bottom: 12px;
        height: 60px;
        flex-shrink: 0;
      }
      .catalog-title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        color: #1e293b;
        text-transform: uppercase;
      }
      .catalog-subtitle {
        margin: 2px 0 0 0;
        font-size: 11px;
        color: #64748b;
      }
      .catalog-date {
        font-size: 10px;
        font-weight: bold;
        color: #64748b;
        text-transform: uppercase;
      }
      .grid-item {
        background: #fff;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 8px;
        overflow: hidden;
        height: 100%;
        width: 100%;
      }
      .grid-item.border-thin {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      .grid-item.border-shadow {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      }
      .item-image-wrapper {
        width: 100%;
        overflow: hidden;
        border-radius: 4px;
        border: 1px solid #f1f5f9;
        background-color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-bottom: 4px;
      }
      .item-image-wrapper img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }
      .item-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 0;
      }
      .item-name {
        font-weight: bold;
        color: #0f172a;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }
      .item-desc {
        color: #475569;
        margin-bottom: 4px;
        line-height: 1.2;
        word-break: break-word;
      }
      .item-price {
        font-weight: 800;
        color: #4f46e5;
      }
      .item-sku {
        font-size: 8px;
        color: #64748b;
        font-family: monospace;
      }
      .item-stock {
        font-size: 9px;
        color: #059669;
        font-weight: 600;
      }
      .codes-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 4px;
        gap: 4px;
        flex-shrink: 0;
      }
      .item-barcode-wrapper {
        flex: 1;
        display: flex;
        justify-content: center;
        overflow: hidden;
      }
      .item-barcode-wrapper svg {
        width: 100%;
        height: auto;
      }
      .item-qr-wrapper {
        display: flex;
        justify-content: center;
        flex-shrink: 0;
      }
      .catalog-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 6px;
        margin-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9px;
        color: #64748b;
        height: 20px;
        flex-shrink: 0;
      }
    </style>
  `;
}
