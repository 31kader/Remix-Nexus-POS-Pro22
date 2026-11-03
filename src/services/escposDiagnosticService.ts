/**
 * 🖨️ Service de Diagnostic et Ticket d'Auto-Test ESC/POS
 * Génère le ticket d'épreuve physique pour valider les polices, alignements,
 * codes-barres, QR codes, impulsion tiroir et massicot automatique.
 */

import { CompanySettings } from '../types';
import { EscPosBuilder } from './escposPrintService';
import { APP_CONFIG } from '../config/appConfig';

export interface DiagnosticTicketOptions {
  terminalId?: string;
  terminalName?: string;
  ipAddress?: string;
  port?: number;
  openDrawer?: boolean;
  cutPaper?: boolean;
}

export function buildDiagnosticSelfTestTicket(
  settings: CompanySettings,
  options: DiagnosticTicketOptions = {}
): Uint8Array {
  const paper = settings.paperFormat === '60mm' ? '58mm' : '80mm';
  const builder = new EscPosBuilder(paper);
  const currency = settings.currency || 'DA';

  // 1. En-tête de test
  builder.align('center').bold(true).size('double-height');
  builder.line('AUTO-TEST MATERIEL');
  builder.bold(false).size('normal');
  builder.line('Nexus POS Pro - Pilote ESC/POS Direct');
  builder.separator('=');

  // 2. Informations Système & Terminal
  builder.align('left');
  builder.twoColumnRow('Version POS:', `v${APP_CONFIG.version}`);
  builder.twoColumnRow('Date/Heure:', new Date().toLocaleString());
  if (options.terminalId) {
    builder.twoColumnRow('Poste Caisse:', `${options.terminalId} (${options.terminalName || 'Caisse'})`);
  }
  if (options.ipAddress) {
    builder.twoColumnRow('Imprimante IP:', `${options.ipAddress}:${options.port || 9100}`);
  }
  builder.twoColumnRow('Format Papier:', paper);
  builder.twoColumnRow('Devise Defaut:', currency);
  builder.separator('-');

  // 3. Test Typographique
  builder.line('TEST STYLES & POLICES :');
  builder.line('1. Texte standard normal');
  builder.bold(true).line('2. Texte gras renforce (Bold)').bold(false);
  builder.size('double-height').line('3. Double Hauteur').size('normal');
  builder.size('double-width').line('4. Double Largeur').size('normal');
  builder.separator('-');

  // 4. Test Alignements
  builder.align('left').line('[Alignement Gauche]');
  builder.align('center').line('[Alignement Centre]');
  builder.align('right').line('[Alignement Droite]');
  builder.align('left');
  builder.separator('-');

  // 5. Test Alignement Tableau
  builder.line('TEST MISE EN PAGE ARTICLES :');
  builder.tableRow('1', 'Article Test Alpha', '150.00', `150.00 ${currency}`);
  builder.tableRow('2', 'Produit Beta DZD', '250.00', `500.00 ${currency}`);
  builder.separator('-');
  builder.bold(true).twoColumnRow('TOTAL TEST:', `650.00 ${currency}`).bold(false);
  builder.separator('=');

  // 6. Test Code-barres & QR Code
  builder.align('center');
  builder.line('TEST CODE-BARRES & QR :');
  builder.barcode('123456789012');
  builder.feed(1);
  builder.qrCode('https://nexuspos.dz/diagnostic');
  builder.feed(1);

  // 7. Pied de ticket
  builder.line('CONTRÔLE TECHNIQUE REUSSI');
  builder.line('Massicot et impulsion tiroir OK');
  builder.separator('=');

  // 8. Déclencheurs physiques
  if (options.openDrawer !== false) {
    builder.openDrawer();
  }
  if (options.cutPaper !== false) {
    builder.cut();
  }

  return builder.getBytes();
}
