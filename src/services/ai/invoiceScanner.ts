import { getApiUrl } from '../../lib/api';
import {
  getStoredAiVisionKey,
  INVOICE_EXTRACTION_PROMPT,
  extractJsonObject
} from './aiConfig';

/**
 * Structuration intelligente d'un texte OCR de facture via Groq Cloud
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
 * Pipeline Hybride Groq : OCR Image (Tesseract.js) + Structuration JSON Groq
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
