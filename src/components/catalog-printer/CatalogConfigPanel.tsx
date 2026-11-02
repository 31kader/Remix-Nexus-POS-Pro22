import React from 'react';
import { LayoutGrid, Tag, Palette, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  ConfigSection,
  LayoutMode,
  PriceDisplayMode,
  Orientation,
  CellBorder
} from './types';
import {
  TemplateLayoutSection,
  PricingConfigSection,
  HeaderFooterConfigSection,
  ElementsConfigSection
} from './config-sections';

interface CatalogConfigPanelProps {
  configSection: ConfigSection;
  setConfigSection: (s: ConfigSection) => void;
  // Template props
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;
  columns: number;
  setColumns: (c: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  cellBorder: CellBorder;
  setCellBorder: (b: CellBorder) => void;
  // Pricing props
  priceDisplayMode: PriceDisplayMode;
  setPriceDisplayMode: (m: PriceDisplayMode) => void;
  setShowPrice: (s: boolean) => void;
  discountPercent: number;
  setDiscountPercent: (d: number) => void;
  // Header props
  themeColor: string;
  setThemeColor: (t: string) => void;
  title: string;
  setTitle: (t: string) => void;
  subtitle: string;
  setSubtitle: (s: string) => void;
  contactPhone: string;
  setContactPhone: (p: string) => void;
  validityBanner: string;
  setValidityBanner: (b: string) => void;
  headerQrLink: string;
  setHeaderQrLink: (l: string) => void;
  showHeaderQr: boolean;
  setShowHeaderQr: (v: boolean) => void;
  footerText: string;
  setFooterText: (t: string) => void;
  showHeader: boolean;
  setShowHeader: (v: boolean) => void;
  showFooter: boolean;
  setShowFooter: (v: boolean) => void;
  showDate: boolean;
  setShowDate: (v: boolean) => void;
  showLogo: boolean;
  setShowLogo: (v: boolean) => void;
  // Elements props
  showName: boolean;
  setShowName: (v: boolean) => void;
  showPrice: boolean;
  showImage: boolean;
  setShowImage: (v: boolean) => void;
  showSku: boolean;
  setShowSku: (v: boolean) => void;
  showStock: boolean;
  setShowStock: (v: boolean) => void;
  showBarcode: boolean;
  setShowBarcode: (v: boolean) => void;
  showQr: boolean;
  setShowQr: (v: boolean) => void;
  showDescription: boolean;
  setShowDescription: (v: boolean) => void;
  nameFontSize: number;
  setNameFontSize: (s: number) => void;
  priceFontSize: number;
  setPriceFontSize: (s: number) => void;
  imageHeight: number;
  setImageHeight: (h: number) => void;
  barcodeHeight: number;
  setBarcodeHeight: (h: number) => void;
  qrSize: number;
  setQrSize: (s: number) => void;
}

export const CatalogConfigPanel: React.FC<CatalogConfigPanelProps> = props => {
  const { configSection, setConfigSection } = props;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4 space-y-4">
      {/* Configuration Tabs Header */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
        {[
          { id: 'template', label: 'Modèle', icon: LayoutGrid },
          { id: 'pricing', label: 'Tarifs', icon: Tag },
          { id: 'header', label: 'En-tête', icon: Palette },
          { id: 'elements', label: 'Éléments', icon: Sliders }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setConfigSection(tab.id as ConfigSection)}
              className={cn(
                'py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[11px]',
                configSection === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {configSection === 'template' && (
        <TemplateLayoutSection
          layoutMode={props.layoutMode}
          setLayoutMode={props.setLayoutMode}
          columns={props.columns}
          setColumns={props.setColumns}
          rowsPerPage={props.rowsPerPage}
          setRowsPerPage={props.setRowsPerPage}
          orientation={props.orientation}
          setOrientation={props.setOrientation}
          cellBorder={props.cellBorder}
          setCellBorder={props.setCellBorder}
        />
      )}

      {configSection === 'pricing' && (
        <PricingConfigSection
          priceDisplayMode={props.priceDisplayMode}
          setPriceDisplayMode={props.setPriceDisplayMode}
          setShowPrice={props.setShowPrice}
          discountPercent={props.discountPercent}
          setDiscountPercent={props.setDiscountPercent}
        />
      )}

      {configSection === 'header' && (
        <HeaderFooterConfigSection
          themeColor={props.themeColor}
          setThemeColor={props.setThemeColor}
          title={props.title}
          setTitle={props.setTitle}
          subtitle={props.subtitle}
          setSubtitle={props.setSubtitle}
          contactPhone={props.contactPhone}
          setContactPhone={props.setContactPhone}
          validityBanner={props.validityBanner}
          setValidityBanner={props.setValidityBanner}
          headerQrLink={props.headerQrLink}
          setHeaderQrLink={props.setHeaderQrLink}
          showHeaderQr={props.showHeaderQr}
          setShowHeaderQr={props.setShowHeaderQr}
          footerText={props.footerText}
          setFooterText={props.setFooterText}
          showHeader={props.showHeader}
          setShowHeader={props.setShowHeader}
          showFooter={props.showFooter}
          setShowFooter={props.setShowFooter}
          showDate={props.showDate}
          setShowDate={props.setShowDate}
          showLogo={props.showLogo}
          setShowLogo={props.setShowLogo}
        />
      )}

      {configSection === 'elements' && (
        <ElementsConfigSection
          showName={props.showName}
          setShowName={props.setShowName}
          showPrice={props.showPrice}
          setShowPrice={props.setShowPrice}
          showImage={props.showImage}
          setShowImage={props.setShowImage}
          showSku={props.showSku}
          setShowSku={props.setShowSku}
          showStock={props.showStock}
          setShowStock={props.setShowStock}
          showBarcode={props.showBarcode}
          setShowBarcode={props.setShowBarcode}
          showQr={props.showQr}
          setShowQr={props.setShowQr}
          showDescription={props.showDescription}
          setShowDescription={props.setShowDescription}
          nameFontSize={props.nameFontSize}
          setNameFontSize={props.setNameFontSize}
          priceFontSize={props.priceFontSize}
          setPriceFontSize={props.setPriceFontSize}
          imageHeight={props.imageHeight}
          setImageHeight={props.setImageHeight}
          barcodeHeight={props.barcodeHeight}
          setBarcodeHeight={props.setBarcodeHeight}
          qrSize={props.qrSize}
          setQrSize={props.setQrSize}
        />
      )}
    </div>
  );
};
