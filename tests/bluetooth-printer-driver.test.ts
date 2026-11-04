import { describe, it, expect, beforeEach } from 'vitest';
import { BluetoothPrintService } from '../src/services/hardware/bluetoothPrintService';

describe('Vague 4 : Mobilité mPOS & Pilote d\'Impression Bluetooth BLE', () => {
  beforeEach(async () => {
    await BluetoothPrintService.disconnect();
    BluetoothPrintService.setSimulationMode(true);
  });

  it('détecte le support Bluetooth ou fournit un mode simulation fluide', () => {
    const supported = BluetoothPrintService.isSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('se connecte avec succès en mode simulation et mémorise le nom du périphérique', async () => {
    expect(BluetoothPrintService.isConnected()).toBe(false);

    const dev = await BluetoothPrintService.scanAndConnect();
    expect(dev.connected).toBe(true);
    expect(dev.name).toContain('BLE');
    expect(BluetoothPrintService.isConnected()).toBe(true);
    expect(BluetoothPrintService.getConnectedDeviceName()).toBe(dev.name);
  });

  it('génère et imprime un ticket test binaire ESC/POS via Bluetooth', async () => {
    await BluetoothPrintService.scanAndConnect();

    const success = await BluetoothPrintService.printTestReceipt('SUPERETTE BAB EZZOUAR');
    expect(success).toBe(true);
  });

  it('échoue proprement à l\'impression si aucune imprimante n\'est connectée', async () => {
    await BluetoothPrintService.disconnect();
    expect(BluetoothPrintService.isConnected()).toBe(false);

    await expect(BluetoothPrintService.printRawBytes(new Uint8Array([0x1b, 0x40]))).rejects.toThrow(
      'Aucune imprimante Bluetooth connectée'
    );
  });

  it('déconnecte proprement le périphérique et réinitialise l\'état', async () => {
    await BluetoothPrintService.scanAndConnect();
    expect(BluetoothPrintService.isConnected()).toBe(true);

    await BluetoothPrintService.disconnect();
    expect(BluetoothPrintService.isConnected()).toBe(false);
    expect(BluetoothPrintService.getConnectedDeviceName()).toBeNull();
  });
});
