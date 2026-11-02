import React from 'react';
import { Product } from '../../types';
import { PriceDisplayMode } from './types';

interface CatalogA4InventorySheetTableProps {
  currentPageItems: Product[];
  pages: Product[][];
  activePreviewPage: number;
  themeColor: string;
}

export function CatalogA4InventorySheetTable({
  currentPageItems,
  pages,
  activePreviewPage,
  themeColor
}: CatalogA4InventorySheetTableProps) {
  return (
    <div className="space-y-3">
      <table className="w-full border-collapse border border-slate-300 text-left">
        <thead>
          <tr style={{ backgroundColor: themeColor }} className="text-white text-[9px] font-black uppercase">
            <th className="p-1.5">N°</th>
            <th className="p-1.5">Code / SKU</th>
            <th className="p-1.5">Désignation Article</th>
            <th className="p-1.5">Rayon</th>
            <th className="p-1.5 text-center">Stock Théorique</th>
            <th className="p-1.5 text-center">Comptage Physique</th>
            <th className="p-1.5 text-center">Écart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-[10px]">
          {currentPageItems.map((p, idx) => (
            <tr key={p.id}>
              <td className="p-1.5 font-mono text-slate-500">
                {pages.slice(0, activePreviewPage).reduce((acc, pg) => acc + pg.length, 0) + idx + 1}
              </td>
              <td className="p-1.5 font-mono text-slate-600">{p.sku || p.barcode || p.id.slice(0, 8)}</td>
              <td className="p-1.5 font-bold text-slate-900">{p.name}</td>
              <td className="p-1.5 text-slate-500">{p.categoryId || (p as any).category || 'Général'}</td>
              <td className="p-1.5 text-center font-black text-slate-800">{p.stock} {p.unit || 'u'}</td>
              <td className="p-1.5 text-center">
                <div className="h-4 border-b border-dashed border-slate-400 mx-auto w-16" />
              </td>
              <td className="p-1.5 text-center">
                <div className="h-4 border-b border-dashed border-slate-400 mx-auto w-12" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CatalogA4SummaryTableProps {
  currentPageItems: Product[];
  customOverrides: Record<string, any>;
  themeColor: string;
  priceDisplayMode: PriceDisplayMode;
  discountPercent: number;
  currency: string;
}

export function CatalogA4SummaryTable({
  currentPageItems,
  customOverrides,
  themeColor,
  priceDisplayMode,
  discountPercent,
  currency
}: CatalogA4SummaryTableProps) {
  return (
    <table className="w-full border-collapse border border-slate-300 text-left">
      <thead>
        <tr style={{ backgroundColor: themeColor }} className="text-white text-[10px] font-black uppercase">
          <th className="p-2">Réf / SKU</th>
          <th className="p-2">Désignation</th>
          <th className="p-2 text-center">Unité</th>
          {(priceDisplayMode === 'both' || priceDisplayMode === 'wholesale') && (
            <th className="p-2 text-right">Prix Gros</th>
          )}
          {priceDisplayMode !== 'wholesale' && priceDisplayMode !== 'none' && (
            <th className="p-2 text-right">Prix Public</th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 text-xs">
        {currentPageItems.map(p => {
          const ov = customOverrides[p.id] || {};
          const effPrice = ov.customPrice !== undefined ? ov.customPrice : Number(p.price || 0);
          const wholesale = Number((p as any).wholesalePrice || effPrice * 0.9);
          const oldPrice =
            ov.oldPrice !== undefined
              ? ov.oldPrice
              : priceDisplayMode === 'promo' && discountPercent > 0
                ? Math.round(effPrice / (1 - discountPercent / 100))
                : 0;
          const hasPromo = oldPrice > effPrice;
          return (
            <tr key={p.id}>
              <td className="p-2 font-mono text-[10px] text-slate-500">
                {p.sku || p.barcode || p.id.slice(0, 8)}
              </td>
              <td className="p-2 font-bold text-slate-900">
                {p.name}{' '}
                {ov.badge && (
                  <span
                    style={{ backgroundColor: themeColor }}
                    className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] text-white font-black uppercase"
                  >
                    {ov.badge}
                  </span>
                )}
              </td>
              <td className="p-2 text-center text-slate-500">{p.unit || 'Unité'}</td>
              {(priceDisplayMode === 'both' || priceDisplayMode === 'wholesale') && (
                <td className="p-2 text-right font-black text-emerald-600">
                  {wholesale.toFixed(2)} {currency}
                </td>
              )}
              {priceDisplayMode !== 'wholesale' && priceDisplayMode !== 'none' && (
                <td className="p-2 text-right font-black" style={{ color: hasPromo ? '#dc2626' : themeColor }}>
                  {hasPromo && (
                    <span className="text-[10px] text-slate-400 line-through mr-1.5">
                      {oldPrice.toFixed(0)}
                    </span>
                  )}
                  {effPrice.toFixed(2)} {currency}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
