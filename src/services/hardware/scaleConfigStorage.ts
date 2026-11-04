/**
 * ⚖️ Stockage de la Configuration de la Balance de Caisse
 */

export type ScaleProtocol = 'toledo' | 'dibal' | 'cas' | 'nci' | 'custom';

export interface ScaleConfig {
  enabled: boolean;
  protocol: ScaleProtocol;
  baudRate: number; // 9600, 4800, 2400
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  autoInjectWeight: boolean; // Injection auto au scan d'un article au kg
}

const SCALE_CONFIG_STORAGE_KEY = 'nexus_scale_hardware_config';

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  enabled: false,
  protocol: 'toledo',
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  autoInjectWeight: true
};

export function getScaleConfig(): ScaleConfig {
  if (typeof window === 'undefined') return DEFAULT_SCALE_CONFIG;
  try {
    const raw = localStorage.getItem(SCALE_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_SCALE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      protocol: parsed.protocol || DEFAULT_SCALE_CONFIG.protocol,
      baudRate: Number(parsed.baudRate) || DEFAULT_SCALE_CONFIG.baudRate,
      dataBits: parsed.dataBits === 7 ? 7 : 8,
      stopBits: parsed.stopBits === 2 ? 2 : 1,
      parity: parsed.parity || DEFAULT_SCALE_CONFIG.parity,
      autoInjectWeight: parsed.autoInjectWeight !== false
    };
  } catch {
    return DEFAULT_SCALE_CONFIG;
  }
}

export function saveScaleConfig(updates: Partial<ScaleConfig>): ScaleConfig {
  const current = getScaleConfig();
  const next: ScaleConfig = { ...current, ...updates };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SCALE_CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[ScaleConfig] Erreur sauvegarde config balance:', err);
    }
  }
  return next;
}
