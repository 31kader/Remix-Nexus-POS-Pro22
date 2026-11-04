import { Transaction, CartItem } from '../../types';

export class WhatsappTicketService {
  /**
   * Nettoie et formate un numéro algérien en standard international E.164 (+213)
   * Supporte : 05xx, 06xx, 07xx, 2135xx, +2136xx, etc.
   */
  static formatAlgerianPhone(rawPhone: string): string {
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '213' + cleaned.substring(1);
    } else if (cleaned.startsWith('213')) {
      // Déjà préfixé
    } else if (cleaned.length === 9) {
      cleaned = '213' + cleaned;
    }
    return cleaned;
  }

  /**
   * Formate le message texte de reçu de caisse prêt pour WhatsApp
   */
  static formatTicketMessage(params: {
    transactionId: string;
    storeName?: string;
    storePhone?: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalAmount: number;
    paymentMethod: string;
    date?: Date;
    receiptOnlineUrl?: string;
  }): string {
    const store = params.storeName || 'NEXUS POS';
    const dateStr = (params.date || new Date()).toLocaleString('fr-DZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const paymentLabel =
      params.paymentMethod === 'card'
        ? 'Carte CIB / Dahabia'
        : params.paymentMethod === 'transfer'
        ? 'BaridiMob'
        : params.paymentMethod === 'balance'
        ? 'Compte Client'
        : 'Espèces';

    const itemsText = params.items
      .map((it) => `• ${it.quantity}x ${it.name} - ${(it.quantity * it.price).toFixed(2)} DA`)
      .join('\n');

    let msg = `🧾 *TICKET DE CAISSE - ${store}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📅 *Date :* ${dateStr}\n`;
    msg += `🆔 *N° Ticket :* #${params.transactionId.slice(-8).toUpperCase()}\n`;
    msg += `💳 *Paiement :* ${paymentLabel}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*ARTICLES :*\n`;
    msg += `${itemsText}\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *TOTAL À PAYER :* *${params.totalAmount.toFixed(2)} DA*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (params.receiptOnlineUrl) {
      msg += `\n🔗 *Voir le ticket officiel en ligne :*\n${params.receiptOnlineUrl}\n`;
    }

    if (params.storePhone) {
      msg += `\n📞 Service client : ${params.storePhone}\n`;
    }

    msg += `\n_Merci de votre confiance et à bientôt !_ ✨`;

    return msg;
  }

  /**
   * Construit l'URL wa.me pour ouverture directe de WhatsApp
   */
  static buildWhatsAppUrl(phone: string, message: string): string {
    const formattedPhone = this.formatAlgerianPhone(phone);
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encoded}`;
  }

  /**
   * Ouvre directement WhatsApp dans un nouvel onglet ou l'app mobile
   */
  static sendTicketViaWhatsApp(phone: string, message: string): void {
    const url = this.buildWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  }
}
