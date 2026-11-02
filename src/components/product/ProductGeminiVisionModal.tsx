import React from 'react';

/**
 * Analyse et extrait les données produit depuis une réponse IA textuelle ou JSON
 */
export function parseAnyAiResponseToProduct(raw: string): {
  name?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  price?: number;
  description?: string;
} {
  if (!raw) return {};

  // 1. Tente d'extraire et de parser un bloc JSON
  try {
    const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      if (typeof obj === 'object' && obj !== null) {
        return {
          name: obj.name || undefined,
          brand: obj.brand || undefined,
          category: obj.category || undefined,
          barcode: obj.barcode || undefined,
          price: obj.price !== undefined ? Number(obj.price) : undefined,
          description: obj.description || undefined
        };
      }
    }
  } catch (_) {}

  // 2. Fallback par expressions régulières sur format clé-valeur textuel
  const getField = (patterns: RegExp[]): string | undefined => {
    for (const pat of patterns) {
      const m = raw.match(pat);
      if (m && m[1]) return m[1].trim();
    }
    return undefined;
  };

  const name = getField([
    /-\s*Nom\s*[:=]\s*(.+)/i,
    /(?:nom|désignation|designation|article|produit)\s*[:=]\s*(.+)/i
  ]);

  const brand = getField([
    /-\s*Marque\s*[:=]\s*(.+)/i,
    /(?:marque|brand)\s*[:=]\s*(.+)/i
  ]);

  const category = getField([
    /-\s*Catégorie\s*[:=]\s*(.+)/i,
    /(?:catégorie|categorie|category)\s*[:=]\s*(.+)/i
  ]);

  const barcode = getField([
    /-\s*Code-barres\s*[:=]\s*([0-9A-Za-z]+)/i,
    /(?:code-?barres?|barcode|ean)\s*[:=]\s*([0-9A-Za-z]+)/i
  ]);

  const priceStr = getField([
    /-\s*Prix\s*(?:estimé)?\s*[:=]\s*([0-9.,]+)/i,
    /(?:prix\s*(?:estimé)?|price)\s*[:=]\s*([0-9.,]+)/i
  ]);
  const price = priceStr ? parseFloat(priceStr.replace(',', '.')) : undefined;

  const description = getField([
    /-\s*Description\s*[:=]\s*(.+)/i,
    /(?:description|détails?|details?)\s*[:=]\s*(.+)/i
  ]);

  return {
    name,
    brand,
    category,
    barcode,
    price,
    description
  };
}

export const ProductGeminiVisionModal: React.FC<any> = () => null;
