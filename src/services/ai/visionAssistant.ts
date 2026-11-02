import { getApiUrl } from '../../lib/api';
import {
  getStoredAiVisionKey,
  extractJsonObject,
  convertImageUrlToBase64
} from './aiConfig';

/**
 * Envoie une photo directement à Gemini AI Vision avec un prompt personnalisé
 */
export async function askGeminiVisionWithPhoto(
  imageUrl: string,
  userPrompt: string,
  customApiKey?: string
): Promise<{ text: string; structuredProduct?: any }> {
  const apiKey = (customApiKey || getStoredAiVisionKey()).trim();
  const { base64, mimeType } = await convertImageUrlToBase64(imageUrl);

  const fullPrompt = `${userPrompt}

RÈGLE : Réponds toujours en français de manière claire, concise et professionnelle pour un commerce en Algérie (Devise : DA / DZD).
Si tu arrives à identifier le nom, la marque, la catégorie, le code-barres ou le prix conseillé de cet article, termine impérativement ta réponse par un bloc JSON strict au format :
\`\`\`json
{
  "name": "Désignation exacte du produit",
  "brand": "Marque",
  "category": "Catégorie",
  "barcode": "Code-barres si visible ou null",
  "description": "Courte description commerciale vendeuse",
  "estimatedPriceDzd": 0
}
\`\`\``;

  // 1. Clé Google Gemini directe (AIza...)
  if (apiKey.startsWith('AIza') || (!apiKey.startsWith('gsk_') && !apiKey.startsWith('sk-or-') && apiKey.length > 25)) {
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
                    { text: fullPrompt },
                    { inline_data: { mime_type: mimeType, data: base64 } }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.3
              }
            })
          }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
        }

        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let structured: any = null;
        try {
          structured = extractJsonObject(replyText);
        } catch {}

        return { text: replyText, structuredProduct: structured };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("Erreur de communication avec l'API Gemini Vision.");
  }

  // 2. Clé OpenRouter (sk-or-...)
  if (apiKey.startsWith('sk-or-')) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: fullPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` }
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

    const replyText = data?.choices?.[0]?.message?.content || '';
    let structured: any = null;
    try {
      structured = extractJsonObject(replyText);
    } catch {}

    return { text: replyText, structuredProduct: structured };
  }

  // 3. Clé Groq (gsk_...) -> OCR + IA
  if (apiKey.startsWith('gsk_')) {
    const Tesseract = await import('tesseract.js');
    const ocrResult = await Tesseract.recognize(`data:${mimeType};base64,${base64}`, 'fra+eng');
    const textFound = (ocrResult?.data?.text || '').trim();

    const groqPrompt = `${fullPrompt}\n\n[Texte détecté par OCR sur la photo : ${textFound}]`;
    const groqReply = await callGeminiAI(null, groqPrompt);
    let structured: any = null;
    try {
      structured = extractJsonObject(groqReply);
    } catch {}

    return { text: groqReply, structuredProduct: structured };
  }

  throw new Error("Veuillez renseigner votre clé API Google Gemini (AIza...) dans les paramètres IA pour utiliser Gemini Vision.");
}

/**
 * Appel Assistant IA : utilise Groq en priorité si clé gsk_ disponible
 */
export const callGeminiAI = async (data: any, userPrompt: string, systemPromptOverride?: string) => {
  try {
    const apiKey = getStoredAiVisionKey();

    // 1. Appel direct Groq Cloud si clé gsk_ présente
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
