/**
 * 📱 Pilote d'Impression Thermique Bluetooth BLE (Web Bluetooth API)
 * Pour imprimantes mobiles 58mm / 80mm (Goojprt, Xprinter, MPT-II, Zjiang, etc.)
 * Utilisé en encaissement mobile, livraison (Van Sale) et commerces ambulants.
 */

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
}

const BT_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Imprimantes thermiques chinoises courantes
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Microchip / ISSC BLE Serial
];

const BT_WRITE_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3'
];

export class BluetoothPrintService {
  private static device: any = null;
  private static server: any = null;
  private static writeCharacteristic: any = null;
  private static isSimulated: boolean = false;

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  static setSimulationMode(enabled: boolean): void {
    this.isSimulated = enabled;
  }

  static async scanAndConnect(): Promise<BluetoothDeviceInfo> {
    if (this.isSimulated || !this.isSupported()) {
      // Mode simulation ou fallback pour environnement sans BLE
      this.device = { id: 'ble-simulated-01', name: 'Imprimante Mobile BLE 58mm (Simulation)' };
      return { id: this.device.id, name: this.device.name, connected: true };
    }

    try {
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BT_PRINTER_SERVICE_UUIDS
      });

      this.device = device;
      const server = await device.gatt.connect();
      this.server = server;

      // Recherche du service et de la caractéristique d'écriture
      for (const serviceUuid of BT_PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          for (const charUuid of BT_WRITE_CHAR_UUIDS) {
            try {
              const char = await service.getCharacteristic(charUuid);
              if (char) {
                this.writeCharacteristic = char;
                break;
              }
            } catch (_) {}
          }
          if (this.writeCharacteristic) break;
        } catch (_) {}
      }

      return {
        id: device.id,
        name: device.name || 'Imprimante Bluetooth',
        connected: true
      };
    } catch (e: any) {
      throw new Error(`Échec de connexion Bluetooth: ${e.message || 'Périphérique non sélectionné'}`);
    }
  }

  static async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
  }

  static isConnected(): boolean {
    if (this.isSimulated) return this.device !== null;
    return !!(this.device && this.server && this.server.connected);
  }

  static getConnectedDeviceName(): string | null {
    return this.device?.name || null;
  }

  /**
   * Envoi du flux d'octets ESC/POS découpé en paquets MTU (chunks de 100 octets)
   * avec micro-délai pour éviter les saturations de buffer sur mini-imprimantes
   */
  static async printRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Aucune imprimante Bluetooth connectée.');
    }

    if (this.isSimulated) {
      console.log(`[BluetoothPrintService] (Simulation) Impression de ${bytes.length} octets.`);
      return true;
    }

    if (!this.writeCharacteristic) {
      throw new Error('Caractéristique d\'écriture Bluetooth introuvable.');
    }

    const CHUNK_SIZE = 100;
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
      if (this.writeCharacteristic.writeValueWithoutResponse) {
        await this.writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.writeCharacteristic.writeValue(chunk);
      }
      // Pause de 20ms entre paquets
      await new Promise((r) => setTimeout(r, 20));
    }

    return true;
  }

  /**
   * Impression d'un ticket test d'alignement et de diagnostic Bluetooth
   */
  static async printTestReceipt(storeName: string = 'NEXUS POS PRO'): Promise<boolean> {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    // Reset imprimante + alignement centre
    chunks.push(new Uint8Array([0x1b, 0x40])); // ESC @
    chunks.push(new Uint8Array([0x1b, 0x61, 0x01])); // ESC a 1 (centre)

    chunks.push(encoder.encode(`\n================================\n`));
    chunks.push(encoder.encode(`${storeName}\n`));
    chunks.push(encoder.encode(`TEST IMPRESSION BLUETOOTH\n`));
    chunks.push(encoder.encode(`================================\n\n`));

    // Alignement gauche
    chunks.push(new Uint8Array([0x1b, 0x61, 0x00])); // ESC a 0
    chunks.push(encoder.encode(`Date : ${new Date().toLocaleString('fr-DZ')}\n`));
    chunks.push(encoder.encode(`Liaison : Sans-Fil Bluetooth BLE\n`));
    chunks.push(encoder.encode(`Statut : CONNECTE ET OPERATIONNEL\n`));
    chunks.push(encoder.encode(`Portabilite : Vente Ambulante OK\n\n`));

    // Centre pour signature
    chunks.push(new Uint8Array([0x1b, 0x61, 0x01]));
    chunks.push(encoder.encode(`*** NEXUS MOBILE mPOS ***\n\n\n\n`));

    // Coupe papier (si supportée)
    chunks.push(new Uint8Array([0x1d, 0x56, 0x42, 0x00])); // GS V 66 0

    // Concaténer tous les fragments
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let currentOffset = 0;
    for (const c of chunks) {
      combined.set(c, currentOffset);
      currentOffset += c.length;
    }

    return this.printRawBytes(combined);
  }
}
