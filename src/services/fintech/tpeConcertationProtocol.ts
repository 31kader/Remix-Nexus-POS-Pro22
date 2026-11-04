/**
 * 💳 Protocole Concertation / CB2A
 * Standard de liaison caisse <-> TPE Bancaire (CIB / Dahabia / SATIM)
 * Utilisé par les TPE Ingenico, PAX et Verifone des banques algériennes (BNA, BEA, CPA, BDL, Al Baraka).
 */

export interface TpeTransactionRequest {
  posId?: string;
  amountCentimes: number; // Montant en centimes DZD (ex: 2500.50 DA = 250050)
  currencyCode?: string; // "012" pour DZD
  privateData?: string;
}

export interface TpeTransactionResponse {
  isApproved: boolean;
  responseCode: string; // "00" = Accord, "05" = Refus, "ND" = Non distribué/Annulé
  responseLabel: string;
  amountCentimes: number;
  authorizationNumber?: string;
  cardPanMasked?: string;
  terminalId?: string;
  rawResponse?: string;
}

export class TpeConcertationProtocol {
  static readonly STX = 0x02;
  static readonly ETX = 0x03;
  static readonly ACK = 0x06;
  static readonly NAK = 0x15;

  /**
   * Calcule le Checksum LRC (Longitudinal Redundancy Check)
   * XOR de tous les octets depuis le premier octet après STX jusqu'à ETX inclus.
   */
  static calculateLrc(dataBytes: Uint8Array): number {
    let lrc = 0;
    for (let i = 0; i < dataBytes.length; i++) {
      lrc ^= dataBytes[i];
    }
    return lrc;
  }

  /**
   * Construit une trame de demande de débit (Débit standard '0')
   */
  static buildDebitFrame(req: TpeTransactionRequest): Uint8Array {
    const posId = (req.posId || '01').padStart(2, '0').slice(-2);
    const amountStr = Math.round(req.amountCentimes).toString().padStart(8, '0').slice(-8);
    const currency = (req.currencyCode || '012').padStart(3, '0').slice(-3); // DZD
    const transactionType = '0'; // '0' = Débit standard

    // Corps de la trame : POS_ID (2) + TYPE (1) + MONTANT (8) + DEVISE (3)
    const payloadStr = `${posId}${transactionType}${amountStr}${currency}`;
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadStr);

    // Trame finale: [STX] + payloadBytes + [ETX] + [LRC]
    const frameLength = 1 + payloadBytes.length + 1 + 1;
    const frame = new Uint8Array(frameLength);

    frame[0] = this.STX;
    frame.set(payloadBytes, 1);
    frame[1 + payloadBytes.length] = this.ETX;

    // Calcul du LRC sur (payloadBytes + ETX)
    const bytesForLrc = new Uint8Array(payloadBytes.length + 1);
    bytesForLrc.set(payloadBytes, 0);
    bytesForLrc[payloadBytes.length] = this.ETX;
    frame[frameLength - 1] = this.calculateLrc(bytesForLrc);

    return frame;
  }

  /**
   * Analyse la trame de réponse renvoyée par le TPE
   */
  static parseResponseFrame(rawBytes: Uint8Array): TpeTransactionResponse {
    if (rawBytes.length < 5) {
      return {
        isApproved: false,
        responseCode: 'ERR_SHORT',
        responseLabel: 'Trame TPE trop courte ou incomplète',
        amountCentimes: 0
      };
    }

    if (rawBytes[0] !== this.STX) {
      return {
        isApproved: false,
        responseCode: 'ERR_STX',
        responseLabel: 'STX manquant dans la réponse TPE',
        amountCentimes: 0
      };
    }

    // Recherche de l'ETX
    let etxIndex = -1;
    for (let i = 1; i < rawBytes.length; i++) {
      if (rawBytes[i] === this.ETX) {
        etxIndex = i;
        break;
      }
    }

    if (etxIndex === -1) {
      return {
        isApproved: false,
        responseCode: 'ERR_ETX',
        responseLabel: 'ETX manquant dans la réponse TPE',
        amountCentimes: 0
      };
    }

    // Vérification du LRC
    const actualLrc = rawBytes[etxIndex + 1];
    const bytesForLrc = rawBytes.slice(1, etxIndex + 1);
    const expectedLrc = this.calculateLrc(bytesForLrc);

    if (actualLrc !== undefined && actualLrc !== expectedLrc) {
      return {
        isApproved: false,
        responseCode: 'ERR_LRC',
        responseLabel: 'Erreur de checksum LRC sur réponse TPE',
        amountCentimes: 0
      };
    }

    const payloadText = new TextDecoder('ascii').decode(rawBytes.slice(1, etxIndex));
    // Structure de réponse habituelle : POS_ID(2) + STATUS(2) + MONTANT(8) + AUTH_NUM(6) + PAN(4)
    const responseCode = payloadText.substring(2, 4);
    const amountStr = payloadText.substring(4, 12);
    const authNum = payloadText.substring(12, 18).trim();
    const panEnd = payloadText.substring(18, 22).trim();

    const isApproved = responseCode === '00';
    let responseLabel = 'Paiement Inconnu';
    if (responseCode === '00') responseLabel = 'Transaction Approuvée (Accord CIB/SATIM)';
    else if (responseCode === '05') responseLabel = 'Paiement Refusé par le centre bancaire';
    else if (responseCode === 'ND' || responseCode === 'CA') responseLabel = 'Transaction Annulée par le client ou le commerçant';
    else if (responseCode === 'TO') responseLabel = 'Délai d\'attente TPE dépassé';

    return {
      isApproved,
      responseCode,
      responseLabel,
      amountCentimes: parseInt(amountStr, 10) || 0,
      authorizationNumber: authNum || undefined,
      cardPanMasked: panEnd ? `**** **** **** ${panEnd}` : undefined,
      rawResponse: payloadText
    };
  }
}
