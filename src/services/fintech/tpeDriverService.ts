import {
  TpeConcertationProtocol,
  TpeTransactionRequest,
  TpeTransactionResponse
} from './tpeConcertationProtocol';

export interface TpeConfig {
  mode: 'simulation' | 'serial' | 'tcp';
  serialBaudRate: number; // 9600 par défaut
  posId: string;
  tcpHost?: string;
  tcpPort?: number;
}

const TPE_CONFIG_KEY = 'nexus_pos_tpe_config';

const DEFAULT_TPE_CONFIG: TpeConfig = {
  mode: 'simulation',
  serialBaudRate: 9600,
  posId: '01'
};

export class TpeDriverService {
  private static port: any = null;

  static getConfig(): TpeConfig {
    try {
      const raw = localStorage.getItem(TPE_CONFIG_KEY);
      return raw ? { ...DEFAULT_TPE_CONFIG, ...JSON.parse(raw) } : DEFAULT_TPE_CONFIG;
    } catch {
      return DEFAULT_TPE_CONFIG;
    }
  }

  static saveConfig(cfg: Partial<TpeConfig>): void {
    const current = this.getConfig();
    localStorage.setItem(TPE_CONFIG_KEY, JSON.stringify({ ...current, ...cfg }));
  }

  /**
   * Effectue une demande de débit carte CIB / Dahabia
   */
  static async requestPayment(
    amountDzd: number,
    onStatusUpdate?: (status: string) => void
  ): Promise<TpeTransactionResponse> {
    const config = this.getConfig();
    const amountCentimes = Math.round(amountDzd * 100);

    const req: TpeTransactionRequest = {
      posId: config.posId,
      amountCentimes,
      currencyCode: '012'
    };

    onStatusUpdate?.('Connexion au terminal TPE bancaire...');

    if (config.mode === 'simulation') {
      return this.executeSimulatedTransaction(req, onStatusUpdate);
    }

    if (config.mode === 'serial') {
      return this.executeSerialTransaction(req, onStatusUpdate);
    }

    throw new Error(`Mode TPE non supporté: ${config.mode}`);
  }

  /**
   * Simulation réaliste du TPE bancaire CIB pour démo et tests sans TPE physique
   */
  private static async executeSimulatedTransaction(
    req: TpeTransactionRequest,
    onStatusUpdate?: (status: string) => void
  ): Promise<TpeTransactionResponse> {
    onStatusUpdate?.('Insérez ou approchez la carte CIB / Dahabia...');
    await new Promise((r) => setTimeout(r, 800));

    onStatusUpdate?.('Saisie du code confidentiel sur le terminal TPE...');
    await new Promise((r) => setTimeout(r, 900));

    onStatusUpdate?.('Appel centre SATIM / Autorisation en cours...');
    await new Promise((r) => setTimeout(r, 700));

    // Générer une trame de réponse Concertation valide
    const posId = req.posId || '01';
    const amountStr = req.amountCentimes.toString().padStart(8, '0');
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    const panEnd = Math.floor(1000 + Math.random() * 9000).toString();

    const payload = `${posId}00${amountStr}${authCode}${panEnd}`;
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload);

    const frame = new Uint8Array(1 + payloadBytes.length + 1 + 1);
    frame[0] = TpeConcertationProtocol.STX;
    frame.set(payloadBytes, 1);
    frame[1 + payloadBytes.length] = TpeConcertationProtocol.ETX;

    const forLrc = new Uint8Array(payloadBytes.length + 1);
    forLrc.set(payloadBytes, 0);
    forLrc[payloadBytes.length] = TpeConcertationProtocol.ETX;
    frame[frame.length - 1] = TpeConcertationProtocol.calculateLrc(forLrc);

    return TpeConcertationProtocol.parseResponseFrame(frame);
  }

  /**
   * Exécution réelle via WebSerial
   */
  private static async executeSerialTransaction(
    req: TpeTransactionRequest,
    onStatusUpdate?: (status: string) => void
  ): Promise<TpeTransactionResponse> {
    if (!('serial' in navigator)) {
      throw new Error('WebSerial non supporté sur ce navigateur.');
    }

    const nav = navigator as any;
    if (!this.port) {
      this.port = await nav.serial.requestPort();
    }

    const config = this.getConfig();
    if (!this.port.readable) {
      await this.port.open({ baudRate: config.serialBaudRate || 9600, dataBits: 8, stopBits: 1, parity: 'none' });
    }

    const frame = TpeConcertationProtocol.buildDebitFrame(req);
    const writer = this.port.writable.getWriter();
    await writer.write(frame);
    writer.releaseLock();

    onStatusUpdate?.('En attente de la réponse du TPE bancaire...');

    const reader = this.port.readable.getReader();
    const chunks: number[] = [];

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai d\'attente TPE dépassé')), 45000)
      );

      const readPromise = (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            for (let i = 0; i < value.length; i++) {
              chunks.push(value[i]);
              if (value[i] === TpeConcertationProtocol.ETX && chunks.length > 2) {
                // Attendre encore 1 octet pour le LRC
                const next = await reader.read();
                if (next.value && next.value.length > 0) chunks.push(next.value[0]);
                return new Uint8Array(chunks);
              }
            }
          }
        }
        return new Uint8Array(chunks);
      })();

      const responseBytes = await Promise.race([readPromise, timeoutPromise]);
      return TpeConcertationProtocol.parseResponseFrame(responseBytes);
    } finally {
      reader.releaseLock();
    }
  }
}
