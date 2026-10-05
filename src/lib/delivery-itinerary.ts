import { OnlineOrder, Customer } from '../types';

/**
 * Utilitaires pour les itinéraires de livraison, navigation GPS et fiches de course
 */

/**
 * Extrait les coordonnées GPS d'un texte ou d'une URL Google Maps
 */
export function extractGpsFromText(text?: string | null): { latitude: number; longitude: number; mapsUrl: string; accuracy?: number } | null {
  if (!text) return null;
  const match = text.match(/maps\.google\.com\/\?q=([0-9.-]+),([0-9.-]+)/i);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const accMatch = text.match(/±([0-9]+)m/);
      const accuracy = accMatch ? parseInt(accMatch[1], 10) : undefined;
      return {
        latitude: lat,
        longitude: lng,
        mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
        accuracy
      };
    }
  }
  return null;
}

export function hasGpsCoordinates(order?: Partial<OnlineOrder> | null): boolean {
  if (!order) return false;
  const lat = Number(order.latitude);
  const lng = Number(order.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) return true;
  if (order.shippingAddress && extractGpsFromText(order.shippingAddress)) return true;
  return false;
}

/**
 * Obtient les coordonnées réelles d'une commande
 */
export function getOrderGpsCoordinates(order?: Partial<OnlineOrder> | null): { latitude: number; longitude: number; mapsUrl: string; accuracy?: number } | null {
  if (!order) return null;
  const lat = Number(order.latitude);
  const lng = Number(order.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    return {
      latitude: lat,
      longitude: lng,
      mapsUrl: order.mapsUrl || `https://maps.google.com/?q=${lat},${lng}`,
      accuracy: order.gpsAccuracy ? Number(order.gpsAccuracy) : undefined
    };
  }
  return extractGpsFromText(order.shippingAddress);
}

/**
 * Vérifie si un client possède des coordonnées GPS
 */
export function hasCustomerGps(customer?: Partial<Customer> | null): boolean {
  if (!customer) return false;
  const lat = Number(customer.latitude);
  const lng = Number(customer.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) return true;
  if (customer.address && extractGpsFromText(customer.address)) return true;
  if (customer.mapsUrl && extractGpsFromText(customer.mapsUrl)) return true;
  return false;
}

/**
 * Extrait les coordonnées GPS d'un client
 */
export function getCustomerGpsCoordinates(customer?: Partial<Customer> | null): { latitude: number; longitude: number; mapsUrl: string } | null {
  if (!customer) return null;
  const lat = Number(customer.latitude);
  const lng = Number(customer.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    return {
      latitude: lat,
      longitude: lng,
      mapsUrl: customer.mapsUrl || `https://maps.google.com/?q=${lat},${lng}`
    };
  }
  const fromAddr = extractGpsFromText(customer.address) || extractGpsFromText(customer.mapsUrl);
  if (fromAddr) {
    return {
      latitude: fromAddr.latitude,
      longitude: fromAddr.longitude,
      mapsUrl: fromAddr.mapsUrl
    };
  }
  return null;
}

/**
 * URL Google Maps direct pour le client
 */
export function getCustomerGoogleMapsUrl(customer?: Partial<Customer> | null): string {
  if (!customer) return 'https://www.google.com/maps';
  const gps = getCustomerGpsCoordinates(customer);
  if (gps) {
    return `https://www.google.com/maps/dir/?api=1&destination=${gps.latitude},${gps.longitude}&travelmode=driving`;
  }
  const addr = [customer.address, customer.city].filter(Boolean).join(', ').trim();
  if (addr) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
  }
  return 'https://www.google.com/maps';
}

/**
 * URL Waze direct pour le client
 */
export function getCustomerWazeUrl(customer?: Partial<Customer> | null): string {
  if (!customer) return 'https://waze.com';
  const gps = getCustomerGpsCoordinates(customer);
  if (gps) {
    return `https://waze.com/ul?ll=${gps.latitude},${gps.longitude}&navigate=yes`;
  }
  const addr = [customer.address, customer.city].filter(Boolean).join(', ').trim();
  if (addr) {
    return `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
  }
  return 'https://waze.com';
}

/**
 * Génère l'URL de navigation directe Google Maps (Mode Conduite / Guidage GPS)
 */
export function getGoogleMapsDirectionsUrl(order?: Partial<OnlineOrder> | null): string {
  if (!order) return 'https://www.google.com/maps';

  const gps = getOrderGpsCoordinates(order);
  if (gps) {
    return `https://www.google.com/maps/dir/?api=1&destination=${gps.latitude},${gps.longitude}&travelmode=driving`;
  }

  if (order.mapsUrl && (order.mapsUrl.startsWith('http://') || order.mapsUrl.startsWith('https://'))) {
    return order.mapsUrl;
  }

  const addr = (order.shippingAddress || '').trim();
  if (addr) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
  }

  return 'https://www.google.com/maps';
}

/**
 * Génère l'URL de navigation directe Waze (Navigation instantanée)
 */
export function getWazeDirectionsUrl(order?: Partial<OnlineOrder> | null): string {
  if (!order) return 'https://waze.com';

  const gps = getOrderGpsCoordinates(order);
  if (gps) {
    return `https://waze.com/ul?ll=${gps.latitude},${gps.longitude}&navigate=yes`;
  }

  const addr = (order.shippingAddress || '').trim();
  if (addr) {
    return `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
  }

  return 'https://waze.com';
}

/**
 * Génère le texte formaté d'une fiche de course à envoyer au livreur (via WhatsApp ou SMS)
 */
export function getDeliveryDispatchText(
  order: Partial<OnlineOrder>,
  currency: string = 'DA',
  storeName?: string
): string {
  const displayId = order.externalOrderId || String(order.id || '').slice(0, 8).toUpperCase();
  const customerName = order.customerName || 'Client';
  const customerPhone = order.customerPhone || 'N/A';
  const address = order.shippingAddress || 'Adresse non spécifiée';
  const total = Number(order.total || 0).toFixed(2);
  const paymentMethod = order.paymentMethod || 'cash';
  const paymentStatus = order.paymentStatus === 'paid' ? 'Déjà Payé en Ligne' : 'À Encaisser à la Livraison';

  const gmapsUrl = getGoogleMapsDirectionsUrl(order);
  const wazeUrl = getWazeDirectionsUrl(order);

  const lines: string[] = [
    `📦 *LIVRAISON ${storeName ? storeName.toUpperCase() : 'COMMANDE'}* — #${displayId}`,
    `👤 *Client :* ${customerName}`,
    `📞 *Téléphone :* ${customerPhone}`,
    `📍 *Adresse :* ${address}`
  ];

  if (hasGpsCoordinates(order)) {
    lines.push(`🎯 *Point GPS Précis :* ${order.latitude}, ${order.longitude}`);
    if (order.gpsAccuracy) {
      lines.push(`📏 *Précision :* ±${Math.round(order.gpsAccuracy)}m`);
    }
  }

  lines.push(`🧭 *Itinéraire Google Maps :* ${gmapsUrl}`);
  lines.push(`🚗 *Itinéraire Waze :* ${wazeUrl}`);
  lines.push(`💰 *Montant :* ${total} ${currency} (${paymentStatus} - ${paymentMethod})`);

  if (order.deliveryNotes) {
    lines.push(`📝 *Consignes :* ${order.deliveryNotes}`);
  }

  return lines.join('\n');
}

/**
 * Génère le lien direct WhatsApp pour partager la course
 */
export function getWhatsAppDispatchUrl(
  order: Partial<OnlineOrder>,
  courierPhone?: string,
  currency: string = 'DA',
  storeName?: string
): string {
  const message = getDeliveryDispatchText(order, currency, storeName);
  const encoded = encodeURIComponent(message);
  
  if (courierPhone) {
    const cleanPhone = courierPhone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
}
