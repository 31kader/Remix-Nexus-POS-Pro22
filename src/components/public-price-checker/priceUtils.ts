import { Product, Promotion, CompanySettings } from '../../types';
import { formatPrice } from '../../lib/utils';

export interface ProductPriceDetails {
  product: Product;
  originalPrice: number;
  finalPrice: number;
  hasDiscount: boolean;
  discountLabel: string | null;
  savedAmount: number;
  isAvailable: boolean;
}

/**
 * Calcule de manière sécurisée le prix public pour le client
 * (Aucune marge, aucun prix d'achat, aucune quantité de stock exacte révélée)
 */
export function getProductPriceDetails(
  product: Product,
  promotions: Promotion[] = []
): ProductPriceDetails {
  const originalPrice = Number(product.price) || 0;
  let finalPrice = originalPrice;
  let discountLabel: string | null = null;

  const now = new Date();
  const safePromos = Array.isArray(promotions) ? promotions.filter(Boolean) : [];

  // Chercher une promotion automatique active applicable au produit ou sa catégorie
  const applicablePromo = safePromos.find((p) => {
    if (!p.isActive) return false;
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;

    // Si la promo est liée à un code promo manuel, on ne l'applique pas automatiquement
    if (p.code && p.code.trim().length > 0) return false;

    if (p.applicableProducts && p.applicableProducts.length > 0) {
      return p.applicableProducts.includes(product.id);
    }

    if (p.applicableCategories && p.applicableCategories.length > 0) {
      return p.applicableCategories.includes(product.categoryId);
    }

    return false;
  });

  if (applicablePromo) {
    if (applicablePromo.type === 'percentage') {
      const discount = (originalPrice * applicablePromo.value) / 100;
      finalPrice = Math.max(0, originalPrice - discount);
      discountLabel = `-${applicablePromo.value}%`;
    } else if (applicablePromo.type === 'fixed') {
      finalPrice = Math.max(0, originalPrice - applicablePromo.value);
      discountLabel = `-${applicablePromo.value} DA`;
    }
  }

  const hasDiscount = finalPrice < originalPrice;
  const savedAmount = hasDiscount ? originalPrice - finalPrice : 0;
  const isAvailable = (Number(product.stock) || 0) > 0 && product.status !== 'inactive' && product.status !== 'discontinued';

  return {
    product,
    originalPrice,
    finalPrice,
    hasDiscount,
    discountLabel,
    savedAmount,
    isAvailable,
  };
}

/**
 * Bip sonore doux via Web Audio API (zéro dépendance de fichier mp3 externe)
 */
export function playScanBeep(isSuccess: boolean = true) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isSuccess) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Note La (A5)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // Note Mi (E6)
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (_) {
    // Ignorer si bloqué par l'autoplay navigateur
  }
}

/**
 * Formate le prix avec devise DA
 */
export function formatCurrencyDA(amount: number): string {
  return `${formatPrice(amount, 2)} DA`;
}
