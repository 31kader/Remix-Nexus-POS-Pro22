const AI_VISION_KEY_STORAGE = 'nexus_ai_vision_key';

export const getStoredAiVisionKey = (): string => {
  try {
    return (
      localStorage.getItem(AI_VISION_KEY_STORAGE) ||
      import.meta.env?.VITE_GROQ_API_KEY ||
      localStorage.getItem('gemini_api_key') ||
      import.meta.env?.VITE_GEMINI_API_KEY ||
      ''
    ).trim();
  } catch {
    return '';
  }
};

export const setStoredAiVisionKey = (key: string): void => {
  try {
    if (!key.trim()) {
      localStorage.removeItem(AI_VISION_KEY_STORAGE);
    } else {
      localStorage.setItem(AI_VISION_KEY_STORAGE, key.trim());
    }
  } catch {
    // ignore storage errors
  }
};

export const INVOICE_EXTRACTION_PROMPT = `Tu es un extracteur de factures et de bons de réception ultra-précis pour une caisse enregistreuse en Algérie (Devise: DA). Analyse le contenu fourni.

RÈGLE ABSOLUE ZÉRO HALLUCINATION :
Extrais UNIQUEMENT et STRICTEMENT les lignes de produits présentes dans la facture. N'invente aucun produit. Corriges les petites fautes d'OCR évidentes dans les nombres (ex: 'O' -> '0', ',' -> '.') et sépare proprement la désignation, la quantité et le prix unitaire.

Retourne STRICTEMENT un objet JSON valide (sans texte autour) contenant :
{
  "supplierName": "nom du fournisseur ou null",
  "invoiceNumber": "numéro du bon/facture ou null",
  "date": "YYYY-MM-DD ou null",
  "previousBalance": nombre ou null,
  "total": montant total général (nombre) ou null,
  "items": [
    {
      "name": "désignation exacte lue sur la facture",
      "barcode": "code-barres numérique 8-14 chiffres si présent ou null",
      "quantity": nombre (quantité achetée strictement positive),
      "price": nombre (prix unitaire HT/TTC en DA),
      "total": nombre (quantité * prix unitaire)
    }
  ]
}`;

export function extractJsonObject(rawText: string): any {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
  return JSON.parse(jsonStr);
}

/**
 * Convertit n'importe quelle URL d'image (Blob URL, HTTP, ou Data URL) en base64 pur et mimeType
 */
export async function convertImageUrlToBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  if (imageUrl.startsWith('data:image/')) {
    const parts = imageUrl.split(',');
    const mime = parts[0].split(';')[0].replace('data:', '');
    return { base64: parts[1], mimeType: mime };
  }

  const res = await fetch(imageUrl);
  const blob = await res.blob();
  const mimeType = blob.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image"));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.split(',')[1] || '';
      resolve({ base64, mimeType });
    };
    reader.readAsDataURL(blob);
  });
}
