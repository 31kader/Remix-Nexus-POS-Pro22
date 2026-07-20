import React from 'react';
import { Printer, FileText } from 'lucide-react';
import { Product } from '../types';
import { Button } from './ui';
import Barcode from 'react-barcode';
import { printLabels } from '../services/printService';
import { LabelPrinterProps } from './label-printer/types';
import { useLabelPrinter } from './label-printer/useLabelPrinter';
import { ProductSelectionPanel } from './label-printer/ProductSelectionPanel';
import { SettingsPanel } from './label-printer/SettingsPanel';
import { LabelSimulator } from './label-printer/LabelSimulator';

export * from './label-printer/types';

export const SingleLabel = ({ product, currency }: { product: Product, currency?: string }) => {
  return (
    <div style={{ 
      width: '40mm', 
      height: '30mm', 
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#fff',
      padding: '0', 
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      breakAfter: 'page',
      pageBreakAfter: 'always',
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
      margin: 0
    }}>
      <div style={{
        width: '30mm',
        height: '40mm',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        WebkitTransform: 'translate(-50%, -50%) rotate(90deg)',
        padding: '2mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%'
        }}>
          {product.name}
        </div>
        
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '2mm',
          marginBottom: '2mm'
        }}>
          {product.price.toFixed(2)} {currency || '€'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
            <Barcode 
              value={product.sku || product.id.substring(0,6).toUpperCase()} 
              format="CODE128" 
              width={1.2} 
              height={30} 
              margin={0} 
              displayValue={true} 
              fontSize={12}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const getCommonStyles = () => `
  @media print {
    @page { 
      size: 40mm 30mm;
      margin: 0;
    }
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 40mm !important;
      height: auto !important;
      overflow: visible !important;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #root, __next, #__next, .App {
      width: 40mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
      position: relative !important;
    }
    img, svg, .barcode {
      max-width: 100% !important;
      height: auto !important;
      display: block;
    }
  }
`;

export function LabelPrinter({ products, settings, initialSelectedProductIds = [] }: LabelPrinterProps) {
  const {
    stateContext,
    selectedProducts,
    filteredProducts,
    addProduct,
    deleteProductFromList,
    updateQuantity,
    clearAllSelected,
    itemsToPrint,
    previewProduct,
    handlePresetChange,
    handlePaddingBaseChange
  } = useLabelPrinter(products, initialSelectedProductIds);

  const handlePrint = async () => {
    const dynamicSettings = {
      ...settings,
      labelTemplate: 'custom',
      labelWidthCustom: stateContext.customWidth,
      labelHeightCustom: stateContext.customHeight,
      labelOrientation: stateContext.customOrientation,
      labelRotation: stateContext.customRotation,
      
      customShowName: stateContext.showName,
      customShowPrice: stateContext.showPrice,
      customShowBarcode: stateContext.showBarcode,
      customShowQr: stateContext.showQr,
      customShowImage: stateContext.showImage,
      customText: stateContext.customText,
      customBorder: stateContext.showBorder,
      
      customNameSize: stateContext.nameFontSize,
      customPriceSize: stateContext.priceFontSize,
      customTextSize: stateContext.customTextSize,
      customBarcodeHeight: stateContext.barcodeHeight,
      customPadding: stateContext.customPadding,
      customPaddingTop: stateContext.paddingTop,
      customPaddingBottom: stateContext.paddingBottom,
      customPaddingLeft: stateContext.paddingLeft,
      customPaddingRight: stateContext.paddingRight,
      customLayoutStructure: stateContext.layoutStructure,
      customAlignment: stateContext.contentAlignment,
      customTextAlign: stateContext.customTextAlign,
      customTextBold: stateContext.customTextBold,
      customTextItalic: stateContext.customTextItalic,

      customBarcodeWidth: stateContext.barcodeWidth,
      customGap: stateContext.customGap,
      nameLineClamp: stateContext.nameLineClamp,
      customLetterSpacing: stateContext.customLetterSpacing,
    };
    await printLabels(itemsToPrint, dynamicSettings as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white uppercase flex items-center gap-3">
            <Printer className="text-indigo-500 animate-pulse" size={24} /> Studio de Création d'Étiquettes
          </h2>
          <p className="text-xs text-slate-400 mt-1">Concevez et configurez des étiquettes de prix thermiques professionnelles à 100% sur-mesure.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedProducts.length > 0 && (
            <Button 
              onClick={clearAllSelected}
              className="bg-slate-800 hover:bg-slate-700 font-bold uppercase transition-all px-3 py-2 text-xs border border-slate-700 text-slate-300 rounded-xl"
            >
              Vider la file
            </Button>
          )}
          <Button 
            onClick={handlePrint} 
            disabled={itemsToPrint.length === 0}
            className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-bold uppercase disabled:opacity-50 text-white rounded-xl shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all text-sm py-2.5 px-5"
          >
            <Printer size={16} className="mr-2" /> Imprimer {itemsToPrint.length} étiquettes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ProductSelectionPanel 
          state={stateContext}
          filteredProducts={filteredProducts}
          selectedProducts={selectedProducts}
          products={products}
          itemsToPrint={itemsToPrint}
          addProduct={addProduct}
          deleteProductFromList={deleteProductFromList}
          updateQuantity={updateQuantity}
          currency={settings.currency || '€'}
        />

        <div className="space-y-4">
          <SettingsPanel 
            state={stateContext} 
            handlePresetChange={handlePresetChange}
            handlePaddingBaseChange={handlePaddingBaseChange}
          />

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alignement de sortie d'imprimante</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">Orientation papier :</span>
                <select 
                  value={stateContext.customOrientation}
                  onChange={(e: any) => stateContext.setCustomOrientation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                >
                  <option value="landscape">Paysage (Défaut)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">Rotation imprimante :</span>
                <select 
                  value={stateContext.customRotation}
                  onChange={(e: any) => stateContext.setCustomRotation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                >
                  <option value="0">Aucune (0°)</option>
                  <option value="90">90° horaire</option>
                  <option value="180">180°</option>
                  <option value="270">90° anti-horaire</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div>
           <LabelSimulator 
             state={stateContext} 
             previewProduct={previewProduct} 
             settings={settings}
           />
           <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl space-y-2 mt-4">
             <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
               <FileText size={12} className="text-indigo-400" /> Recommandations Thermiques
             </h4>
             <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
               <li>Pour les imprimantes de marque Zebra ou Xprinter, l'orientation paysage est conseillée.</li>
               <li>Le rotateur automatique de {stateContext.customRotation}° garantit une adaptation immédiate aux chargements de rouleaux transversaux.</li>
               <li>Conservez au moins 1.5mm de marge interne pour éviter le rognage des bordures thermiques.</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
