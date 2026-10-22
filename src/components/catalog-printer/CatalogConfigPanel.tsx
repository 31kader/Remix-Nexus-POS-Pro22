import React from 'react';
import { LayoutGrid, Tag, Palette, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  ConfigSection,
  LayoutMode,
  PriceDisplayMode,
  Orientation,
  CellBorder,
  THEME_PRESETS
} from './types';

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

export const CatalogConfigPanel: React.FC<CatalogConfigPanelProps> = ({
  configSection,
  setConfigSection,
  layoutMode,
  setLayoutMode,
  columns,
  setColumns,
  rowsPerPage,
  setRowsPerPage,
  orientation,
  setOrientation,
  cellBorder,
  setCellBorder,
  priceDisplayMode,
  setPriceDisplayMode,
  setShowPrice,
  discountPercent,
  setDiscountPercent,
  themeColor,
  setThemeColor,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  contactPhone,
  setContactPhone,
  validityBanner,
  setValidityBanner,
  headerQrLink,
  setHeaderQrLink,
  showHeaderQr,
  setShowHeaderQr,
  footerText,
  setFooterText,
  showHeader,
  setShowHeader,
  showFooter,
  setShowFooter,
  showDate,
  setShowDate,
  showLogo,
  setShowLogo,
  showName,
  setShowName,
  showPrice,
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
  qrSize,
  setQrSize
}) => {
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

      {/* TAB 1: TEMPLATE & GRID LAYOUT */}
      {configSection === 'template' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
              Disposition Principale A4
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'grid', label: 'Grille Catalogues', desc: 'Cartes avec photos' },
                { id: 'table', label: 'Tableau Liste', desc: 'Compact type devis' },
                { id: 'inventory_sheet', label: 'Feuille Inventaire', desc: 'Comptage magasin' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLayoutMode(m.id as LayoutMode)}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all',
                    layoutMode === m.id
                      ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
                  )}
                >
                  <div className="text-xs font-black">{m.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {layoutMode === 'grid' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Colonnes ({columns})</label>
                <input
                  type="range"
                  min={2}
                  max={5}
                  value={columns}
                  onChange={e => setColumns(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Lignes / Page ({rowsPerPage})</label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={rowsPerPage}
                  onChange={e => setRowsPerPage(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-600"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Orientation A4</label>
              <select
                value={orientation}
                onChange={e => setOrientation(e.target.value as Orientation)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
              >
                <option value="portrait">Portrait (Vertical)</option>
                <option value="landscape">Paysage (Horizontal)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bordure des Cartes</label>
              <select
                value={cellBorder}
                onChange={e => setCellBorder(e.target.value as CellBorder)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
              >
                <option value="thin">Cadre Fin Pro</option>
                <option value="shadow">Ombre Légère</option>
                <option value="none">Sans Bordure</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING & PROMO OPTIONS */}
      {configSection === 'pricing' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
              Mode d'Affichage des Prix sur le Catalogue
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'retail', label: '💰 Prix Détail (Public)', desc: 'Affiche le prix de vente standard' },
                { id: 'wholesale', label: '📦 Prix de Gros', desc: 'Pour vos clients revendeurs' },
                { id: 'both', label: '⚖️ Double Prix (Public + Gros)', desc: 'Affiche les 2 tarifs sur chaque carte' },
                { id: 'promo', label: '🔥 Mode Promo (Prix Barré)', desc: 'Affiche un ancien prix barré + prix promo' },
                { id: 'none', label: '🖼️ Catalogue Vitrine (Sans Prix)', desc: 'Photos et références uniquement' }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setPriceDisplayMode(mode.id as PriceDisplayMode);
                    setShowPrice(mode.id !== 'none');
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    priceDisplayMode === mode.id
                      ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
                  )}
                >
                  <div className="text-xs font-black">{mode.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {priceDisplayMode === 'promo' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <label className="block text-xs font-black text-rose-700 dark:text-rose-300">
                Remise Promo Automatique par Défaut : -{discountPercent}%
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={discountPercent}
                onChange={e => setDiscountPercent(Number(e.target.value))}
                className="w-full accent-rose-600"
              />
              <p className="text-[10px] text-slate-600 dark:text-zinc-300">
                Simule automatiquement un ancien prix barré (+{discountPercent}%) si vous n'avez pas saisi d'ancien prix spécifique sur l'article.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HEADER, FOOTER & THEME COLOR */}
      {configSection === 'header' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              Couleur Thème du Catalogue A4
            </label>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeColor(t.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-transform',
                    t.class,
                    themeColor === t.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'opacity-80'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Titre du Catalogue</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sous-titre / Slogan</label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tél / WhatsApp Commandes</label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Bannière Promo / Validité (Optionnelle)
            </label>
            <input
              type="text"
              value={validityBanner}
              onChange={e => setValidityBanner(e.target.value)}
              placeholder="Ex: OFFRES VALABLES JUSQU'AU 31 DÉCEMBRE — DANS LA LIMITE DES STOCKS DISPONIBLES"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Lien QR Code En-Tête (WhatsApp ou Boutique)
              </label>
              <input
                type="checkbox"
                checked={showHeaderQr}
                onChange={e => setShowHeaderQr(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </div>
            {showHeaderQr && (
              <input
                type="text"
                value={headerQrLink}
                onChange={e => setHeaderQrLink(e.target.value)}
                placeholder="https://wa.me/213xxxxxxxxx ou lien catalogue"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
              />
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Texte Pied de Page A4</label>
            <input
              type="text"
              value={footerText}
              onChange={e => setFooterText(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { label: 'Afficher En-tête', val: showHeader, set: setShowHeader },
              { label: 'Afficher Pied', val: showFooter, set: setShowFooter },
              { label: 'Afficher Date', val: showDate, set: setShowDate },
              { label: 'Afficher Logo', val: showLogo, set: setShowLogo }
            ].map((t, idx) => (
              <label
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={t.val}
                  onChange={e => t.set(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded"
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ELEMENTS & SIZING */}
      {configSection === 'elements' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
              Éléments Affichés sur chaque Carte Article
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Nom Article', val: showName, set: setShowName },
                { label: 'Prix de Vente', val: showPrice, set: setShowPrice },
                { label: 'Photo Article', val: showImage, set: setShowImage },
                { label: 'Réf / SKU', val: showSku, set: setShowSku },
                { label: 'Stock Restant', val: showStock, set: setShowStock },
                { label: 'Code-Barres 1D', val: showBarcode, set: setShowBarcode },
                { label: 'QR Code Article', val: showQr, set: setShowQr },
                { label: 'Description', val: showDescription, set: setShowDescription }
              ].map((el, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={el.val}
                    onChange={e => el.set(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded"
                  />
                  <span>{el.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Police Nom ({nameFontSize}px)
              </label>
              <input
                type="range"
                min={8}
                max={16}
                value={nameFontSize}
                onChange={e => setNameFontSize(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Police Prix ({priceFontSize}px)
              </label>
              <input
                type="range"
                min={10}
                max={22}
                value={priceFontSize}
                onChange={e => setPriceFontSize(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Hauteur Photo ({imageHeight}px)
              </label>
              <input
                type="range"
                min={60}
                max={160}
                value={imageHeight}
                onChange={e => setImageHeight(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Haut. Code-Barres ({barcodeHeight}px)
              </label>
              <input
                type="range"
                min={15}
                max={50}
                value={barcodeHeight}
                onChange={e => setBarcodeHeight(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Taille QR Code ({qrSize}px)
              </label>
              <input
                type="range"
                min={25}
                max={70}
                value={qrSize}
                onChange={e => setQrSize(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
