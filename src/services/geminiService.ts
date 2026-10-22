import { getApiUrl } from '../lib/api';

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

const INVOICE_EXTRACTION_PROMPT = `Tu es un extracteur de factures et de bons de réception ultra-précis pour une caisse enregistreuse en Algérie (Devise: DA). Analyse le contenu fourni.

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

function extractJsonObject(rawText: string): any {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
  return JSON.parse(jsonStr);
}

/**
 * Structuration intelligente d'un texte OCR de facture via Groq Cloud
 * Modèles actifs 2026 : openai/gpt-oss-120b, qwen/qwen3.8-27b, openai/gpt-oss-20b
 */
export async function structureOcrTextWithGroq(rawOcrText: string, apiKey?: string): Promise<any> {
  const key = (apiKey || getStoredAiVisionKey()).trim();
  if (!key.startsWith('gsk_')) {
    throw new Error('Clé Groq (gsk_...) requise pour la structuration IA.');
  }

  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: INVOICE_EXTRACTION_PROMPT
            },
            {
              role: 'user',
              content: `Voici le texte extrait par OCR d'une photo de facture / bon de livraison fournisseur :\n\n${rawOcrText}\n\nExtrais toutes les lignes d'articles et retourne uniquement le JSON demandé.`
            }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
      }
      const content = data?.choices?.[0]?.message?.content || '';
      return extractJsonObject(content);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Échec de structuration Groq IA');
}

/**
 * Pipeline Hybride Groq : OCR Image (Tesseract.js) + Structuration JSON Groq (openai/gpt-oss-120b / qwen3.8-27b)
 */
async function scanInvoiceWithGroq(imageBase64: string, mimeType: string, apiKey: string) {
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
  const Tesseract = await import('tesseract.js');
  const ocrResult = await Tesseract.recognize(dataUrl, 'fra+eng');
  const extractedText = (ocrResult?.data?.text || '').trim();

  if (!extractedText) {
    throw new Error("Aucun texte lisible n'a été détecté sur la photo.");
  }

  return await structureOcrTextWithGroq(extractedText, apiKey);
}

/**
 * Appel direct OpenRouter Vision (clé sk-or-...)
 */
async function scanInvoiceWithOpenRouter(imageBase64: string, mimeType: string, apiKey: string) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout:free',
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: INVOICE_EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` }
            }
          ]
        }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter HTTP ${res.status}`);
  }
  const content = data?.choices?.[0]?.message?.content || '';
  return extractJsonObject(content);
}

/**
 * Appel direct Google Gemini API REST (clé AIza...) sans dépendre du serveur Express local
 */
async function scanInvoiceWithDirectGemini(imageBase64: string, mimeType: string, apiKey: string) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: INVOICE_EXTRACTION_PROMPT },
                  { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return extractJsonObject(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Échec de lecture Gemini Vision');
}

/**
 * Appel Assistant IA : utilise Groq (openai/gpt-oss-120b / qwen3.8-27b) en priorité si clé gsk_ disponible
 */
export const callGeminiAI = async (data: any, userPrompt: string, systemPromptOverride?: string) => {
  try {
    const apiKey = getStoredAiVisionKey();

    // 1. Appel direct Groq Cloud si clé gsk_ présente (dans .env ou localStorage)
    if (apiKey.startsWith('gsk_')) {
      const systemContent =
        systemPromptOverride ||
        "Tu es l'Assistant IA expert de Nexus POS Pro en Algérie (Devise: DA / DZD, TVA: 19%). Réponds toujours en français de manière claire, structurée et orientée action pour le gérant du magasin.";
      const userContent = data
        ? `Données du magasin :\n${JSON.stringify(data)}\n\nQuestion / Demande :\n${userPrompt}`
        : userPrompt;

      const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
      for (const model of models) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              temperature: 0.3,
              messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: userContent }
              ]
            })
          });
          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const reply = groqData?.choices?.[0]?.message?.content;
            if (reply) return reply;
          }
        } catch {
          // try next Groq model
        }
      }
    }

    // 2. Fallback vers le serveur local /api/ai/complete
    const lanToken = (() => {
      try { return localStorage.getItem('nexus_lan_token') || 'nexus-pos-lan-v1'; } catch { return 'nexus-pos-lan-v1'; }
    })();
    const response = await fetch(getApiUrl('/api/ai/complete'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nexus-lan-token': lanToken,
        ...(apiKey ? { 'x-gemini-key': apiKey } : {})
      },
      body: JSON.stringify({ data, userPrompt, systemPromptOverride })
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      if (text.includes('<!doctype') || text.includes('<html')) {
        throw new Error("Le serveur local n'est pas joignable pour l'Assistant IA. Vérifiez votre clé Groq (gsk_...) ou démarrez le serveur.");
      }
      throw new Error('Réponse serveur invalide : ' + text.slice(0, 100));
    }

    if (!response.ok) {
      const errMsg = result.message || result.error || 'Failed to call AI API';
      throw new Error(errMsg);
    }

    return result.response;
  } catch (error) {
    console.error('AI Assistant Error:', error);
    throw error;
  }
};

export const scanInvoice = async (imageBase64: string, mimeType: string = 'image/jpeg', customKey?: string) => {
  const activeKey = (customKey || getStoredAiVisionKey()).trim();

  // 1. Si une clé Groq (gsk_...) est fournie -> OCR + Structuration IA Groq (openai/gpt-oss-120b)
  if (activeKey.startsWith('gsk_')) {
    return await scanInvoiceWithGroq(imageBase64, mimeType, activeKey);
  }

  // 2. Si une clé OpenRouter (sk-or-...) est fournie -> Appel direct OpenRouter Vision
  if (activeKey.startsWith('sk-or-')) {
    return await scanInvoiceWithOpenRouter(imageBase64, mimeType, activeKey);
  }

  // 3. Si une clé Google Gemini (AIza...) est fournie -> Appel direct Gemini REST API
  if (activeKey.startsWith('AIza')) {
    try {
      return await scanInvoiceWithDirectGemini(imageBase64, mimeType, activeKey);
    } catch (directErr) {
      console.warn('Direct Gemini failed, trying local server fallback:', directErr);
    }
  }

  // 4. Fallback vers le serveur Express local (/api/ai/scan) avec transmission de x-gemini-key
  const lanToken = (() => {
    try { return localStorage.getItem('nexus_lan_token') || 'nexus-pos-lan-v1'; } catch { return 'nexus-pos-lan-v1'; }
  })();
  const response = await fetch(getApiUrl('/api/ai/scan'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nexus-lan-token': lanToken,
      ...(activeKey ? { 'x-gemini-key': activeKey } : {})
    },
    body: JSON.stringify({ image: imageBase64, mimeType })
  });

  const text = await response.text();
  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Aucune clé IA active ou serveur local non joignable.");
  }

  if (!response.ok) {
    const errMsg = result.message || result.error || 'Failed to scan invoice';
    throw new Error(errMsg);
  }

  return result;
};

export const analyzeStoreData = async (
  data: {
    transactions: any[];
    products: any[];
    expenses: any[];
    settings: any;
    stockAdjustments?: any[];
  },
  userPrompt?: string
) => {
  try {
    const totalProducts = Array.isArray(data.products) ? data.products.length : 0;
    const criticalProducts = (Array.isArray(data.products) ? data.products : [])
      .filter((p: any) => Number(p?.stock || 0) <= Number(p?.minStock || 5))
      .slice(0, 25)
      .map((p: any) => ({ name: p.name, stock: p.stock, minStock: p.minStock, price: p.price }));

    const recentSales = (Array.isArray(data.transactions) ? data.transactions : [])
      .slice(0, 15)
      .map((t: any) => ({ id: t.id, total: t.total, paymentMethod: t.paymentMethod, status: t.status, date: t.date || t.timestamp }));

    const recentExpenses = (Array.isArray(data.expenses) ? data.expenses : [])
      .slice(0, 10)
      .map((e: any) => ({ description: e.description, amount: e.amount, category: e.category }));

    const compactData = {
      kpis: {
        totalCatalogCount: totalProducts,
        criticalStockCount: criticalProducts.length,
        totalSalesCount: Array.isArray(data.transactions) ? data.transactions.length : 0,
        currency: data.settings?.currency || 'DA'
      },
      criticalProducts,
      recentSales,
      recentExpenses
    };

    return await callGeminiAI(compactData, userPrompt || "Donne-moi un résumé de la santé de mon commerce aujourd'hui et 3 conseils actionnables.");
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    const msg = error.message || String(error);
    return `Erreur: ${msg || "L'Assistant IA n'est pas disponible pour le moment."}`;
  }
};
