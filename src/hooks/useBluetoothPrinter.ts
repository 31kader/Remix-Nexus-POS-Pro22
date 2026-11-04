import { useState, useEffect, useCallback } from 'react';
import { BluetoothPrintService } from '../services/hardware/bluetoothPrintService';

export function useBluetoothPrinter() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(() => {
    const connected = BluetoothPrintService.isConnected();
    setIsConnected(connected);
    setDeviceName(BluetoothPrintService.getConnectedDeviceName());
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const dev = await BluetoothPrintService.scanAndConnect();
      setIsConnected(true);
      setDeviceName(dev.name);
    } catch (e: any) {
      setError(e.message || 'Impossible de se connecter à l\'imprimante Bluetooth');
      setIsConnected(false);
      setDeviceName(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await BluetoothPrintService.disconnect();
    setIsConnected(false);
    setDeviceName(null);
  };

  const printTest = async (storeName?: string) => {
    setError(null);
    try {
      await BluetoothPrintService.printTestReceipt(storeName);
      return true;
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'impression du ticket test');
      return false;
    }
  };

  return {
    isSupported: BluetoothPrintService.isSupported(),
    isConnected,
    deviceName,
    isConnecting,
    error,
    connect,
    disconnect,
    printTest,
    checkStatus
  };
}
