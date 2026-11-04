/**
 * ⚖️ Pilote Matériel pour Balances Électroniques de Comptoir (WebSerial & COM)
 * Permet l'acquisition continue du poids en direct et les commandes de tare/zéro.
 */

import { getScaleConfig, ScaleConfig } from './scaleConfigStorage';
import { parseScaleFrame, ParsedScaleWeight } from './scaleFrameParsers';

class ScaleDriverService {
  private activePort: any = null;
  private reader: any = null;
  private isReading = false;
  private lastWeight: ParsedScaleWeight = { weight: 0, unit: 'kg', isStable: false, isTare: false, raw: '' };
  private listeners: Set<(w: ParsedScaleWeight) => void> = new Set();

  public getCurrentWeight(): ParsedScaleWeight {
    return this.lastWeight;
  }

  public isConnected(): boolean {
    return this.activePort !== null && this.isReading;
  }

  public subscribe(cb: (w: ParsedScaleWeight) => void): () => void {
    this.listeners.add(cb);
    cb(this.lastWeight);
    return () => this.listeners.delete(cb);
  }

  private notify(w: ParsedScaleWeight) {
    this.lastWeight = w;
    this.listeners.forEach(cb => {
      try {
        cb(w);
      } catch (_) {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-scale-weight-update', { detail: w }));
    }
  }

  /**
   * Connecte la balance via l'API WebSerial du navigateur
   */
  public async connect(): Promise<{ success: boolean; message: string }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      return { success: false, message: 'Web Serial non supporté par ce navigateur (utilisez Chrome, Edge ou Electron)' };
    }

    const config = getScaleConfig();

    try {
      if (this.isConnected()) {
        await this.disconnect();
      }

      this.activePort = await (navigator as any).serial.requestPort();
      await this.activePort.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity
      });

      this.isReading = true;
      this.startReadingLoop(config);

      return { success: true, message: `Balance connectée avec succès (${config.baudRate} bauds)` };
    } catch (err: any) {
      this.activePort = null;
      this.isReading = false;
      return { success: false, message: `Échec de connexion à la balance : ${err?.message || 'Inconnue'}` };
    }
  }

  /**
   * Déconnexion sécurisée
   */
  public async disconnect(): Promise<void> {
    this.isReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.activePort) {
        await this.activePort.close();
        this.activePort = null;
      }
    } catch (e) {
      console.warn('[ScaleDriver] Erreur fermeture port:', e);
    }
  }

  /**
   * Envoi d'une commande à la balance (Tare / Zéro / Requête)
   */
  public async sendCommand(cmd: string = 'T\r\n'): Promise<boolean> {
    if (!this.activePort || !this.activePort.writable) return false;
    try {
      const writer = this.activePort.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(cmd));
      writer.releaseLock();
      return true;
    } catch {
      return false;
    }
  }

  public async tare(): Promise<boolean> {
    return this.sendCommand('T\r\n');
  }

  public async zero(): Promise<boolean> {
    return this.sendCommand('Z\r\n');
  }

  /**
   * Boucle continue de lecture des flux séries
   */
  private async startReadingLoop(config: ScaleConfig) {
    if (!this.activePort || !this.activePort.readable) return;

    const textDecoder = new TextDecoder();
    this.reader = this.activePort.readable.getReader();
    let lineBuffer = '';

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          const chunk = textDecoder.decode(value, { stream: true });
          lineBuffer += chunk;

          const lines = lineBuffer.split(/[\r\n]+/);
          lineBuffer = lines.pop() || ''; // Garde la ligne incomplète

          for (const line of lines) {
            const parsed = parseScaleFrame(line, config.protocol);
            if (parsed) {
              this.notify(parsed);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[ScaleDriver] Erreur flux de lecture balance:', err?.message);
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch (_) {}
        this.reader = null;
      }
    }
  }
}

export const scaleDriver = new ScaleDriverService();
