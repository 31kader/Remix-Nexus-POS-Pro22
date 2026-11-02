import { DEFAULT_PORT } from './lanSyncConstants';

export function buildTargetUrl(ip: string, port?: number): string {
  let clean = (ip || '').trim();
  clean = clean.replace(/^https?:\/\//i, '');
  let resolvedPort = port || DEFAULT_PORT;
  if (clean.includes(':')) {
    const parts = clean.split(':');
    clean = parts[0];
    const parsedPort = parseInt(parts[1], 10);
    if (Number.isFinite(parsedPort) && parsedPort > 0) {
      resolvedPort = parsedPort;
    }
  }
  const host = clean || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  return `http://${host}:${resolvedPort}`;
}

export async function testLanConnection(
  targetHost: string,
  port: number,
  lanToken: string
): Promise<{ success: boolean; latencyMs?: number; message?: string; info?: any }> {
  const baseUrl = buildTargetUrl(targetHost, port);
  const url = `${baseUrl}/api/lan/status`;

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'x-nexus-lan-token': lanToken
      }
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        latencyMs: latency,
        message: `Connexion réussie au Hub Caisse Maître (${latency} ms)`,
        info: data
      };
    } else {
      return {
        success: false,
        latencyMs: latency,
        message: `Réponse HTTP ${res.status}: Caisse Maître détectée mais token invalide ou erreur serveur.`
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      message: isTimeout 
        ? `Délai dépassé (3.5s) : L'adresse ${targetHost}:${port} ne répond pas sur le réseau.`
        : `Impossible de joindre la Caisse Maître (${err?.message || 'Erreur réseau'}). Vérifiez le câble ou le Wi-Fi.`
    };
  }
}
