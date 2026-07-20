import React from 'react';
import { Maximize2 } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Product, CompanySettings } from '../../types';
import { LabelPrinterState } from './types';

interface LabelSimulatorProps {
  state: LabelPrinterState;
  previewProduct: Product;
  settings: CompanySettings;
}

export function LabelSimulator({ state, previewProduct, settings }: LabelSimulatorProps) {
  const simulatorZoomFactor = 4;
  const simWidth = state.customWidth * simulatorZoomFactor;
  const simHeight = state.customHeight * simulatorZoomFactor;

  const contentAlignValues = {
    'left': 'flex-start',
    'center': 'center',
    'right': 'flex-end'
  };

  // Reusable styling for the name to match max lines and letter spacing settings
  const nameStyle: React.CSSProperties = {
    fontSize: `${state.nameFontSize}px`,
    fontWeight: 'bold',
    width: '100%',
    lineHeight: '1.2',
    letterSpacing: `${state.customLetterSpacing}px`,
    ...(state.nameLineClamp === 2 ? {
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      whiteSpace: 'normal',
    } : {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    })
  };

  return (
    <div className="space-y-5 flex flex-col h-[580px] bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      <div>
        <h3 className="font-bold text-white text-sm uppercase mb-1 flex items-center gap-2">
          <Maximize2 size={15} className="text-indigo-400" /> 3. Aperçu Physique Temps Réel
        </h3>
        <p className="text-xs text-slate-400">Rendu exact de l'étiquette finale (Simulateur Thermique).</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-auto min-h-[300px]">
        {/* The Physical Simulated Label */}
        <div 
          id="simulated-label-tag"
          style={{
            width: `${simWidth}px`,
            height: `${simHeight}px`,
            paddingTop: `${state.paddingTop * simulatorZoomFactor}px`,
            paddingBottom: `${state.paddingBottom * simulatorZoomFactor}px`,
            paddingLeft: `${state.paddingLeft * simulatorZoomFactor}px`,
            paddingRight: `${state.paddingRight * simulatorZoomFactor}px`,
            border: state.showBorder ? '1.5px solid #000000' : '1px dashed rgb(100, 116, 139)',
            borderRadius: '4px',
            backgroundColor: 'white',
            color: 'black',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: (state.layoutStructure === 'split' || state.layoutStructure === 'price-heavy') ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: (state.layoutStructure === 'split' || state.layoutStructure === 'price-heavy') ? 'space-between' : 'center',
            cursor: 'default',
            userSelect: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease-in-out',
            gap: `${state.customGap}px`
          }}
        >
          {state.layoutStructure === 'split' ? (
            <>
              {/* Left Column Description */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', textAlign: 'left', height: '100%' }}>
                {state.showName && (
                  <div style={nameStyle}>
                    {previewProduct.name}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', margin: '4px 0 2px 0', width: '100%' }}>
                  {state.showImage && (previewProduct.imageUrl || previewProduct.image) && (
                    <img 
                      src={previewProduct.imageUrl || previewProduct.image} 
                      style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} 
                      referrerPolicy="no-referrer"
                      alt="preview"
                    />
                  )}
                  {state.showPrice && (
                    <div style={{ fontSize: `${state.priceFontSize}px`, fontWeight: '900', lineHeight: '1.1' }}>
                      {previewProduct.price.toFixed(2)} {settings.currency}
                    </div>
                  )}
                </div>
                {state.customText && (
                  <div style={{ fontSize: `${state.customTextSize}px`, fontWeight: state.customTextBold ? 'bold' : 'normal', fontStyle: state.customTextItalic ? 'italic' : 'normal', color: '#333333', lineBreak: 'anywhere' }}>
                    {state.customText}
                  </div>
                )}
              </div>
              {/* Right Column Code */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', maxWidth: '48%', gap: '4px' }}>
                {state.showBarcode && (
                  <div style={{ transform: `scale(${Math.min(0.9, simWidth / 220)})`, transformOrigin: 'center center' }}>
                    <Barcode 
                      value={previewProduct.sku || previewProduct.id.substring(0,6).toUpperCase()} 
                      format="CODE128" 
                      width={state.barcodeWidth} 
                      height={Math.round(state.barcodeHeight * 0.9)} 
                      margin={0} 
                      displayValue={false} 
                    />
                  </div>
                )}
                {state.showQr && (
                  <QRCodeSVG 
                    value={previewProduct.sku || previewProduct.id} 
                    size={Math.min(36, simHeight / 2.5)} 
                  />
                )}
                {!state.showBarcode && !state.showQr && (
                  <div style={{ fontSize: '8px', color: '#666', textAlign: 'center' }}>
                    {previewProduct.sku || previewProduct.id.substring(0,6).toUpperCase()}
                  </div>
                )}
              </div>
            </>
          ) : state.layoutStructure === 'price-heavy' ? (
            <>
              {/* Left Big Border-Price Tag block */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1.5px solid #000', borderRadius: '4px', padding: '4px', minWidth: '45%', height: '100%', boxSizing: 'border-box' }}>
                {state.showPrice ? (
                  <>
                    <div style={{ fontSize: `${Math.round(state.priceFontSize * 1.25)}px`, fontWeight: '900', color: '#000', lineHeight: 1 }}>
                      {previewProduct.price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '2px', color: '#475569', textTransform: 'uppercase' }}>
                      {settings.currency}
                    </div>
                  </>
                ) : (
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#000' }}>PROMO</div>
                )}
              </div>
              {/* Right description + barcode block */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', height: '100%', paddingLeft: '8px', gap: '4px' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {state.showName && (
                    <div style={nameStyle}>
                      {previewProduct.name}
                    </div>
                  )}
                  {state.customText && (
                    <div style={{ fontSize: `${state.customTextSize}px`, fontWeight: state.customTextBold ? 'bold' : 'normal', fontStyle: state.customTextItalic ? 'italic' : 'normal', color: '#64748b', marginTop: '2px' }}>
                      {state.customText}
                    </div>
                  )}
                </div>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginTop: 'auto' }}>
                  {state.showBarcode && (
                    <div style={{ transform: 'scale(0.8)', transformOrigin: 'bottom left' }}>
                      <Barcode 
                        value={previewProduct.sku || previewProduct.id.substring(0,6).toUpperCase()} 
                        format="CODE128" 
                        width={state.barcodeWidth} 
                        height={state.barcodeHeight} 
                        margin={0} 
                        displayValue={false} 
                      />
                    </div>
                  )}
                  {!state.showBarcode && state.showQr && (
                    <QRCodeSVG 
                      value={previewProduct.sku || previewProduct.id} 
                      size={Math.min(32, simHeight / 3)} 
                    />
                  )}
                </div>
              </div>
            </>
          ) : state.layoutStructure === 'barcode-centric' ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', gap: `${state.customGap}px` }}>
               {state.showName && (
                  <div style={{ ...nameStyle, textAlign: 'center' }}>
                    {previewProduct.name}
                  </div>
               )}
               {state.showBarcode && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                     <div style={{ transform: `scale(${Math.min(1.2, simWidth / 200)})`, transformOrigin: 'center center' }}>
                       <Barcode 
                         value={previewProduct.sku || previewProduct.id.substring(0,6).toUpperCase()} 
                         format="CODE128" 
                         width={state.barcodeWidth} 
                         height={Math.max(40, state.barcodeHeight * 1.5)} 
                         margin={0} 
                         displayValue={true} 
                         fontSize={10}
                       />
                     </div>
                  </div>
               )}
               {!state.showBarcode && state.showQr && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <QRCodeSVG 
                      value={previewProduct.sku || previewProduct.id} 
                      size={Math.min(60, simHeight / 2)} 
                    />
                  </div>
               )}
               {state.showPrice && (
                  <div style={{ fontSize: `${state.priceFontSize}px`, fontWeight: '900', color: '#000', marginTop: '4px', textAlign: 'center' }}>
                    {previewProduct.price.toFixed(2)} {settings.currency}
                  </div>
               )}
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: contentAlignValues[state.contentAlignment], textAlign: state.contentAlignment, gap: `${state.customGap}px` }}>
              {state.showName && (
                <div style={nameStyle}>
                  {previewProduct.name}
                </div>
              )}
              
              {state.showImage && (previewProduct.imageUrl || previewProduct.image) && (
                <img 
                  src={previewProduct.imageUrl || previewProduct.image} 
                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', margin: '4px 0', border: '1px solid #eee' }} 
                  referrerPolicy="no-referrer"
                  alt="preview"
                />
              )}

              {state.showPrice && (
                <div style={{
                  fontSize: `${state.priceFontSize}px`,
                  fontWeight: '900',
                  margin: '2px 0 6px 0',
                  lineHeight: '1.1'
                }}>
                  {previewProduct.price.toFixed(2)} {settings.currency}
                </div>
              )}

              {!state.showQr && state.showBarcode && (
                <div style={{ transform: `scale(${Math.min(1, simWidth / 250)})`, transformOrigin: `top ${state.contentAlignment}` }}>
                  <Barcode 
                    value={previewProduct.sku || previewProduct.id.substring(0,6).toUpperCase()} 
                    format="CODE128" 
                    width={state.barcodeWidth} 
                    height={state.barcodeHeight} 
                    margin={0} 
                    displayValue={true} 
                    fontSize={10}
                  />
                </div>
              )}
              {state.showQr && (
                 <QRCodeSVG 
                   value={previewProduct.sku || previewProduct.id} 
                   size={Math.min(48, simHeight / 2)} 
                 />
              )}
              
              {state.customText && (
                <div style={{
                  fontSize: `${state.customTextSize}px`,
                  fontWeight: state.customTextBold ? 'bold' : 'normal',
                  fontStyle: state.customTextItalic ? 'italic' : 'normal',
                  textAlign: state.customTextAlign,
                  alignSelf: state.customTextAlign === 'center' ? 'center' : state.customTextAlign === 'left' ? 'flex-start' : 'flex-end',
                  marginTop: '4px',
                  lineHeight: '1.2',
                  wordBreak: 'break-word',
                  maxWidth: '100%'
                }}>
                  {state.customText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
