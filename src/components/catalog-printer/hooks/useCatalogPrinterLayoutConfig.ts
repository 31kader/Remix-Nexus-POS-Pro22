import { useState } from 'react';
import { CompanySettings } from '../../../types';
import { toast } from 'sonner';
import {
  CustomOverrides,
  LayoutMode,
  PriceDisplayMode,
  CellBorder,
  Orientation,
  ConfigSection
} from '../types';
import { CatalogPrintSettings } from '../../../services/printService';

export interface UseCatalogPrinterLayoutConfigProps {
  settings: CompanySettings;
  customOverrides: CustomOverrides;
}

export function useCatalogPrinterLayoutConfig({ settings, customOverrides }: UseCatalogPrinterLayoutConfigProps) {
  // Print Settings State
  const [title, setTitle] = useState(settings.name ? `CATALOGUE — ${settings.name.toUpperCase()}` : 'CATALOGUE PRODUITS');
  const [subtitle, setSubtitle] = useState('Sélection officielle — Offres & Tarifs en vigueur');
  const [validityBanner, setValidityBanner] = useState('');
  const [headerQrLink, setHeaderQrLink] = useState(settings.phone ? `https://wa.me/${settings.phone.replace(/\s+/g, '')}` : '');
  const [showHeaderQr, setShowHeaderQr] = useState(false);
  const [blindInventoryMode] = useState(false);
  const [contactPhone, setContactPhone] = useState(settings.phone || '');
  const [footerText, setFooterText] = useState('Nexus POS Pro — Tarification en Dinars Algériens (DA). Sous réserve de disponibilité.');

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [priceDisplayMode, setPriceDisplayMode] = useState<PriceDisplayMode>('retail');
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [themeColor, setThemeColor] = useState<string>('#4f46e5');

  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  const [columns, setColumns] = useState(3);
  const [rowsPerPage, setRowsPerPage] = useState(3);
  const [pageMargin] = useState(10);
  const [cellGap] = useState(10);
  const [cellBorder, setCellBorder] = useState<CellBorder>('thin');
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  // Element Toggles
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showImage, setShowImage] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showStock, setShowStock] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // Sizing Options
  const [nameFontSize, setNameFontSize] = useState(11);
  const [priceFontSize, setPriceFontSize] = useState(14);
  const [imageHeight, setImageHeight] = useState(95);
  const [barcodeHeight, setBarcodeHeight] = useState(24);
  const [barcodeWidth] = useState(1.0);
  const [qrSize, setQrSize] = useState(40);
  const [descFontSize] = useState(9);

  // Preview state
  const [zoom, setZoom] = useState(0.65);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(0);
  const [configSection, setConfigSection] = useState<ConfigSection>('template');

  const handleSaveTemplatePreset = () => {
    try {
      const presetData = {
        title,
        subtitle,
        validityBanner,
        contactPhone,
        footerText,
        layoutMode,
        priceDisplayMode,
        discountPercent,
        themeColor,
        columns,
        rowsPerPage,
        showBarcode,
        showQr,
        showStock
      };
      localStorage.setItem('nexus_catalog_saved_preset_v1', JSON.stringify(presetData));
      toast.success('Configuration du modèle A4 sauvegardée comme favori !');
    } catch {
      toast.error('Impossible de sauvegarder le modèle.');
    }
  };

  const handleLoadTemplatePreset = () => {
    try {
      const raw = localStorage.getItem('nexus_catalog_saved_preset_v1');
      if (!raw) {
        toast.info('Aucun modèle favori sauvegardé pour le moment.');
        return;
      }
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.subtitle) setSubtitle(d.subtitle);
      if (d.validityBanner !== undefined) setValidityBanner(d.validityBanner);
      if (d.contactPhone !== undefined) setContactPhone(d.contactPhone);
      if (d.footerText) setFooterText(d.footerText);
      if (d.layoutMode) setLayoutMode(d.layoutMode);
      if (d.priceDisplayMode) setPriceDisplayMode(d.priceDisplayMode);
      if (d.discountPercent !== undefined) setDiscountPercent(d.discountPercent);
      if (d.themeColor) setThemeColor(d.themeColor);
      if (d.columns) setColumns(d.columns);
      if (d.rowsPerPage) setRowsPerPage(d.rowsPerPage);
      toast.success('Modèle favori chargé avec succès !');
    } catch {
      toast.error('Erreur lors du chargement du modèle.');
    }
  };

  const buildPrintSettings = (): CatalogPrintSettings => ({
    title,
    subtitle,
    footerText,
    showHeader,
    showFooter,
    showDate,
    showLogo,
    columns: layoutMode === 'table' || layoutMode === 'inventory_sheet' ? 1 : columns,
    rowsPerPage: layoutMode === 'inventory_sheet' ? 20 : layoutMode === 'table' ? 18 : rowsPerPage,
    pageMargin,
    cellGap,
    cellBorder,
    orientation,
    showName,
    showPrice,
    showImage,
    showSku,
    showStock,
    showBarcode,
    showQr,
    showDescription,
    nameFontSize,
    priceFontSize,
    imageHeight,
    barcodeHeight,
    barcodeWidth,
    qrSize,
    descFontSize,
    layoutMode: layoutMode === 'inventory_sheet' ? 'table' : layoutMode,
    priceDisplayMode,
    themeColor,
    contactPhone,
    discountPercent,
    customOverrides
  });

  return {
    title,
    setTitle,
    subtitle,
    setSubtitle,
    validityBanner,
    setValidityBanner,
    headerQrLink,
    setHeaderQrLink,
    showHeaderQr,
    setShowHeaderQr,
    blindInventoryMode,
    contactPhone,
    setContactPhone,
    footerText,
    setFooterText,
    layoutMode,
    setLayoutMode,
    priceDisplayMode,
    setPriceDisplayMode,
    discountPercent,
    setDiscountPercent,
    themeColor,
    setThemeColor,
    showHeader,
    setShowHeader,
    showFooter,
    setShowFooter,
    showDate,
    setShowDate,
    showLogo,
    setShowLogo,
    columns,
    setColumns,
    rowsPerPage,
    setRowsPerPage,
    pageMargin,
    cellGap,
    cellBorder,
    setCellBorder,
    orientation,
    setOrientation,
    showName,
    setShowName,
    showPrice,
    setShowPrice,
    showImage,
    setShowImage,
    showSku,
    setShowSku,
    showStock,
    setShowStock,
    showBarcode,
    setShowBarcode,
    showQr,
    setShowQr,
    showDescription,
    setShowDescription,
    nameFontSize,
    setNameFontSize,
    priceFontSize,
    setPriceFontSize,
    imageHeight,
    setImageHeight,
    barcodeHeight,
    setBarcodeHeight,
    barcodeWidth,
    qrSize,
    setQrSize,
    descFontSize,
    zoom,
    setZoom,
    activePreviewPage,
    setActivePreviewPage,
    configSection,
    setConfigSection,
    handleSaveTemplatePreset,
    handleLoadTemplatePreset,
    buildPrintSettings
  };
}
