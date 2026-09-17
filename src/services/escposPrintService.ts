/**
 * 🖨️ NEXUS POS PRO - ESC/POS Raw Thermal Printer Driver
 * Direct binary driver for thermal printers (80mm & 58mm) via WebUSB, WebSerial & Network.
 * Supports instant ticket printing, cash drawer kick (RJ11), and auto-cut.
 */

import { Transaction, CompanySettings } from '../types';

export interface EscPosOptions {
  paperWidth?: '80mm' | '58mm';
  openDrawer?: boolean;
  cutPaper?: boolean;
  barcode?: boolean;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private lineWidth: number;

  constructor(paperWidth: '80mm' | '58mm' = '80mm') {
    this.lineWidth = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 0x01 : alignment === 'right' ? 0x02 : 0x00;
    this.buffer.push(0x1b, 0x61, val); // ESC a n
    return this;
  }

  bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  size(mode: 'normal' | 'double-height' | 'double-width' | 'quad'): this {
    let val = 0x00;
    if (mode === 'double-height') val = 0x01;
    if (mode === 'double-width') val = 0x10;
    if (mode === 'quad') val = 0x11;
    this.buffer.push(0x1d, 0x21, val); // GS ! n
    return this;
  }

  text(str: string): this {
    const sanitized = this.sanitizeText(str);
    for (let i = 0; i < sanitized.length; i++) {
      this.buffer.push(sanitized.charCodeAt(i) & 0xff);
    }
    return this;
  }

  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  separator(char: string = '-'): this {
    const sep = char.repeat(this.lineWidth);
    return this.line(sep);
  }

  twoColumnRow(left: string, right: string): this {
    const maxLeft = this.lineWidth - right.length - 1;
    const cleanLeft = left.length > maxLeft ? left.slice(0, maxLeft - 1) + '.' : left;
    const spaces = Math.max(1, this.lineWidth - cleanLeft.length - right.length);
    return this.line(cleanLeft + ' '.repeat(spaces) + right);
  }

  tableRow(qty: string, name: string, price: string, total: string): this {
    if (this.lineWidth === 32) {
      // 58mm layout
      const line1 = `${qty}x ${name}`;
      const line2Right = `${total}`;
      const line2Left = `   @ ${price}`;
      this.line(line1.slice(0, 32));
      return this.twoColumnRow(line2Left, line2Right);
    } else {
      // 80mm layout (48 cols)
      const qtyCol = (qty + 'x').padEnd(5);
      const priceCol = price.padStart(10);
      const totalCol = total.padStart(11);
      const nameWidth = this.lineWidth - (qtyCol.length + priceCol.length + totalCol.length);
      const nameCol = (name.length > nameWidth ? name.slice(0, nameWidth - 1) + '.' : name).padEnd(nameWidth);
      return this.line(qtyCol + nameCol + priceCol + totalCol);
    }
  }

  openDrawer(): this {
    // ESC p 0 25 250 (Send pulse to cash drawer kick pin)
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  cut(full: boolean = false): this {
    // Feed 3 lines then cut
    this.feed(3);
    this.buffer.push(0x1d, 0x56, full ? 0x00 : 0x01); // GS V n
    return this;
  }

  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  private sanitizeText(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Strip accents for standard ASCII thermal character sets
      .replace(/[^\x20-\x7E\n\r]/g, '?');
  }
}

/**
 * 🧾 Construit les octets ESC/POS d'un ticket de caisse
 */
export function buildReceiptEscPos(
  transaction: Transaction,
  settings: CompanySettings,
  options: EscPosOptions = {}
): Uint8Array {
  const paper = options.paperWidth || (settings.paperFormat === '60mm' ? '58mm' : '80mm');
  const builder = new EscPosBuilder(paper);
  const currency = settings.currency || 'DZD';

  // 1. En-tête de l'entreprise
  builder.align('center').bold(true).size('double-height');
  builder.line(settings.name || 'NEXUS POS PRO');
  builder.bold(false).size('normal');

  if (settings.address) builder.line(settings.address);
  if (settings.phone) builder.line(`Tel: ${settings.phone}`);
  if (settings.taxNumber) builder.line(`NIF/RC: ${settings.taxNumber}`);
  builder.separator('=');

  // 2. Métadonnées du ticket
  builder.align('left');
  builder.line(`Ticket #: ${transaction.id.slice(0, 12).toUpperCase()}`);
  builder.line(`Date: ${new Date(transaction.timestamp).toLocaleString()}`);
  if (transaction.employeeName || transaction.userId) {
    builder.line(`Caissier: ${transaction.employeeName || transaction.userId}`);
  }
  if (transaction.customerName) {
    builder.line(`Client: ${transaction.customerName}`);
  }
  builder.separator('-');

  // 3. Articles vendus
  const items = transaction.items || [];
  for (const item of items) {
    const qty = String(item.quantity || 1);
    const name = item.name || item.productName || 'Article';
    const price = (item.price || 0).toFixed(2);
    const total = ((item.price || 0) * (item.quantity || 1)).toFixed(2);
    builder.tableRow(qty, name, price, total);
  }
  builder.separator('-');

  // 4. Totaux & Règlements
  builder.align('right').bold(true);
  builder.twoColumnRow('TOTAL:', `${(transaction.total || 0).toFixed(2)} ${currency}`);
  builder.bold(false);

  if (transaction.discountAmount && transaction.discountAmount > 0) {
    builder.twoColumnRow('Remise:', `-${transaction.discountAmount.toFixed(2)} ${currency}`);
  }
  if (transaction.paymentMethod) {
    builder.twoColumnRow('Mode de paiement:', String(transaction.paymentMethod).toUpperCase());
  }

  builder.separator('=');

  // 5. Pied de page
  builder.align('center');
  if (settings.footerText) {
    builder.line(settings.footerText);
  } else {
    builder.line('Merci pour votre visite !');
    builder.line('A bientot.');
  }

  // 6. Tiroir-caisse & Découpe
  if (options.openDrawer !== false) {
    builder.openDrawer();
  }
  if (options.cutPaper !== false) {
    builder.cut();
  }

  return builder.getBytes();
}

/**
 * ⚡ Envoie directement les octets à une imprimante thermique via WebUSB / WebSerial
 */
export async function printDirectRawEscPos(bytes: Uint8Array): Promise<boolean> {
  // 1. Essai via WebUSB si disponible
  if (typeof navigator !== 'undefined' && 'usb' in navigator) {
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);
      await device.transferOut(1, bytes);
      await device.close();
      return true;
    } catch (_) {
      // Fallback
    }
  }

  // 2. Essai via WebSerial si disponible
  if (typeof navigator !== 'undefined' && 'serial' in navigator) {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      await port.close();
      return true;
    } catch (_) {
      // Fallback
    }
  }

  return false;
}
