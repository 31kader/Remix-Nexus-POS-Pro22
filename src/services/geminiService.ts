
import { getApiUrl } from '../lib/api';

export const callGeminiAI = async (data: any, userPrompt: string, systemPromptOverride?: string) => {
  try {
    const response = await fetch(getApiUrl('/api/ai/complete'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, userPrompt, systemPromptOverride }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (e) {
      if (text.includes('<!doctype') || text.includes('<html')) {
        throw new Error("Le serveur local n'est pas joignable pour l'Assistant IA. Vérifiez que l'application est bien démarrée.");
      }
      throw new Error("Réponse serveur invalide : " + text.slice(0, 100));
    }

    if (!response.ok) {
      const errMsg = result.message || result.error || 'Failed to call AI API';
      if (response.status === 429 || errMsg.includes("Quota") || errMsg.includes("credits") || errMsg.includes("exhausted") || errMsg.includes("dépassé")) {
        throw new Error("Quota atteint : Vos crédits de prépaiement ou limites d'utilisation de Google AI Studio sont épuisés. Veuillez recharger vos crédits ou mode de facturation dans la console Google AI Studio pour rétablir les fonctionnalités automatiques.");
      }
      throw new Error(errMsg);
    }

    return result.response;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
};

export const scanInvoice = async (imageBase64: string, mimeType: string = 'image/jpeg') => {
  try {
    const response = await fetch(getApiUrl('/api/ai/scan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageBase64, mimeType }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (e) {
      if (text.includes('<!doctype') || text.includes('<html')) {
        throw new Error("Le serveur local n'a pas pu traiter l'analyse IA. Assurez-vous que l'application est bien démarrée.");
      }
      throw new Error("Réponse serveur inattendue : " + text.slice(0, 100));
    }

    if (!response.ok) {
      const errMsg = result.message || result.error || 'Failed to scan invoice';
      if (response.status === 429 || errMsg.includes("Quota") || errMsg.includes("credits") || errMsg.includes("exhausted") || errMsg.includes("dépassé")) {
        throw new Error("Impossible de scanner la facture : Vos crédits de prépaiement Google AI Studio sont épuisés. Veuillez approvisionner votre compte de facturation Google Cloud.");
      }
      throw new Error(errMsg);
    }

    return result;
  } catch (error) {
    console.error("Invoice Scan Error:", error);
    throw error;
  }
};

export const analyzeStoreData = async (data: {
  transactions: any[];
  products: any[];
  expenses: any[];
  settings: any;
  stockAdjustments?: any[];
}, userPrompt?: string) => {
  try {
    // Synthèse compacte et optimisée pour ne pas envoyer 11 000 produits bruts en réseau
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
    console.error("AI Analysis Error:", error);
    const msg = error.message || String(error);
    if (msg.includes("Quota") || msg.includes("crédits") || msg.includes("exhausted") || msg.includes("429") || msg.includes("dépassé")) {
      return `⚠️ **Quota d'utilisation atteint / Crédits épuisés**\n\nPour continuer à utiliser l'Assistant IA, veuillez **recharger vos crédits de prépaiement sur votre console de facturation Google AI Studio**.\n\nEn attendant, votre espace administrateur POS reste disponible et fonctionnel à 100% pour la gestion manuelle locale de votre inventaire, de vos factures et de votre point de vente !`;
    }
    return `Erreur: ${msg || "L'Assistant IA n'est pas disponible pour le moment."}`;
  }
};
