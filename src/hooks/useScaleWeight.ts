import { useState, useEffect, useCallback } from 'react';
import { scaleDriver } from '../services/hardware/scaleDriverService';
import { ParsedScaleWeight } from '../services/hardware/scaleFrameParsers';
import { getScaleConfig } from '../services/hardware/scaleConfigStorage';

export function useScaleWeight() {
  const [scaleData, setScaleData] = useState<ParsedScaleWeight>(scaleDriver.getCurrentWeight());
  const [isConnected, setIsConnected] = useState<boolean>(scaleDriver.isConnected());
  const config = getScaleConfig();

  useEffect(() => {
    const unsubscribe = scaleDriver.subscribe((weight) => {
      setScaleData(weight);
      setIsConnected(scaleDriver.isConnected());
    });
    return () => unsubscribe();
  }, []);

  const connect = useCallback(async () => {
    const res = await scaleDriver.connect();
    setIsConnected(scaleDriver.isConnected());
    return res;
  }, []);

  const disconnect = useCallback(async () => {
    await scaleDriver.disconnect();
    setIsConnected(false);
  }, []);

  const tare = useCallback(async () => {
    return scaleDriver.tare();
  }, []);

  const zero = useCallback(async () => {
    return scaleDriver.zero();
  }, []);

  return {
    weight: scaleData.weight,
    unit: scaleData.unit,
    isStable: scaleData.isStable,
    isTare: scaleData.isTare,
    raw: scaleData.raw,
    isConnected,
    isConfigEnabled: config.enabled,
    autoInjectWeight: config.autoInjectWeight,
    connect,
    disconnect,
    tare,
    zero
  };
}
