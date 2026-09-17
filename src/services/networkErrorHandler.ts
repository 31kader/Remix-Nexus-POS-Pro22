import { toast } from 'sonner';

let lastNetworkToastTime = 0;
const NETWORK_TOAST_DEBOUNCE_MS = 12000; // 12 secondes de cooldown pour éviter le spam de toasts
const NETWORK_TOAST_ID = 'nexus-network-status';

/**
 * Détecte si une erreur est due au réseau, à un timeout ou à un mode hors-ligne
 */
export function isNetworkOrTimeoutError(err: unknown): boolean {
  if (!err) return false;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  const msg = (
    typeof err === 'string' 
      ? err 
      : err instanceof Error 
        ? `${err.name} ${err.message}` 
        : typeof err === 'object' && 'message' in (err as any)
          ? String((err as any).message)
          : JSON.stringify(err)
  ).toLowerCase();

  const networkKeywords = [
    'err_timed_out',
    'timed out',
    'timeout',
    'failed to fetch',
    'network error',
    'networkerror',
    'etimedout',
    'aborterror',
    'the user aborted a request',
    'abort',
    'offline',
    'econnrefused',
    'enetunreach',
    'fetch failed',
    'network request failed',
    'load failed',
    'connection refused'
  ];

  if (networkKeywords.some(keyword => msg.includes(keyword))) {
    return true;
  }

  // Vérification des codes d'état HTTP typiques des problèmes de passerelle ou réseau
  if (typeof err === 'object' && err !== null) {
    const status = (err as any).status || (err as any).statusCode;
    if (status === 0 || status === 408 || status === 502 || status === 503 || status === 504) {
      return true;
    }
  }

  return false;
}

/**
 * Notifie l'utilisateur d'un ralentissement ou d'une coupure réseau avec un message rassurant.
 * Ne bloque JAMAIS l'interface et applique un anti-spam automatique.
 */
export function notifyNetworkIssue(err?: unknown, context?: string): void {
  const now = Date.now();
  if (now - lastNetworkToastTime < NETWORK_TOAST_DEBOUNCE_MS) {
    return; // Évite de saturer l'écran si 20 requêtes échouent en même temps
  }
  lastNetworkToastTime = now;

  const contextLabel = context ? ` (${context})` : '';

  toast.warning(`Mode Hors-Ligne actif${contextLabel}`, {
    id: NETWORK_TOAST_ID,
    duration: 6000,
    description: 'Connexion réseau instable ou suspendue. Vos encaissements et ventes restent 100% fonctionnels en local. Synchronisation automatique au retour du réseau.',
  });
}

/**
 * Notifie l'utilisateur que le réseau est rétabli et que la synchronisation reprend.
 */
export function notifyNetworkRestored(pendingCount?: number): void {
  // Réinitialiser le timestamp pour que le prochain toast réseau s'affiche directement si besoin
  lastNetworkToastTime = 0;

  const desc = pendingCount && pendingCount > 0
    ? `Synchronisation automatique de ${pendingCount} opération(s) en attente...`
    : 'Connexion au serveur Supabase rétablie avec succès.';

  toast.success('Connexion rétablie 🟢', {
    id: NETWORK_TOAST_ID,
    duration: 4000,
    description: desc,
  });
}

/**
 * Enveloppe une promesse avec un timeout strict pour éviter qu'une requête réseau
 * ne gèle l'application ou ne reste suspendue indéfiniment.
 */
export async function withNetworkTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 8000,
  fallbackValue: T | null = null,
  context = 'Requête réseau'
): Promise<T | null> {
  let timer: any = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`ERR_TIMED_OUT: Délai d'attente dépassé (${timeoutMs}ms) pour ${context}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error: any) {
    clearTimeout(timer);

    if (isNetworkOrTimeoutError(error)) {
      console.warn(`[Network Resilience] ${context} interrompu par timeout/réseau:`, error.message || error);
      notifyNetworkIssue(error, context);
      return fallbackValue;
    }

    // Si ce n'est pas une erreur réseau, on la propage pour ne pas masquer de bugs logiques
    throw error;
  }
}
