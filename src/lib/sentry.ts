/**
 * ==============================================================================
 * NEXUS POS PRO — MODULE D'INTÉGRATION SENTRY (v1.2.52)
 * Monitoring d'erreurs, télémétrie et résilience en environnement de caisse.
 * ==============================================================================
 */

import * as Sentry from '@sentry/react';
import { APP_CONFIG } from '../config/appConfig';

let isSentryInitialized = false;

/**
 * Initialise le SDK Sentry si la variable VITE_SENTRY_DSN est définie.
 * En l'absence de DSN ou en mode test, l'initialisation est ignorée sans impact.
 */
export function initSentry(): void {
  if (isSentryInitialized) return;
  if (typeof window === 'undefined') return;

  const dsn = (
    (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SENTRY_DSN) ||
    import.meta.env.VITE_SENTRY_DSN ||
    ''
  ).trim();

  // Mode no-op propre si aucun DSN n'est configuré
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] VITE_SENTRY_DSN non configuré. Le monitoring distant Sentry est désactivé.');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      release: `nexus-pos-pro@${APP_CONFIG.version || '1.2.52'}`,
      environment: import.meta.env.MODE || 'production',

      // Échantillonnage modéré des transactions pour respecter le quota gratuit (5k/mois)
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

      // Nettoyage et assainissement strict des données sensibles (RGPD & PCI-DSS)
      beforeSend(event) {
        // 1. Purge des en-têtes d'authentification
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['apikey'];
          delete event.request.headers['x-nexus-lan-token'];
        }

        // 2. Masquage des variables sensibles dans les URLs
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/([?&](?:pin|password|token|apikey|secret)=)[^&]+/gi, '$1[REDACTED]');
        }

        return event;
      },

      // Filtrer les erreurs bénignes typiques d'une caisse déconnectée (offline-first)
      ignoreErrors: [
        'Failed to fetch',
        'NetworkError',
        'Network request failed',
        'Load failed',
        'WebSocket is closed before the connection is established',
        'AbortError',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications'
      ],
    });

    isSentryInitialized = true;
    console.info('[Sentry] Monitoring Sentry initialisé avec succès (release: v' + (APP_CONFIG.version || '1.2.52') + ').');
  } catch (err) {
    console.warn('[Sentry] Erreur lors de l\'initialisation de Sentry:', err);
  }
}

/**
 * Capture manuellement une exception avec contexte additionnel assaini.
 */
export function captureSentryException(error: unknown, context?: Record<string, any>): void {
  if (!isSentryInitialized) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch (_) {}
}

/**
 * Définit ou réinitialise le profil de session utilisateur dans Sentry (sans mot de passe ni PIN).
 */
export function setSentryUser(user: { uid?: string; role?: string; email?: string } | null): void {
  if (!isSentryInitialized) return;
  try {
    if (!user) {
      Sentry.setUser(null);
    } else {
      Sentry.setUser({
        id: user.uid,
        role: user.role || 'cashier',
      });
    }
  } catch (_) {}
}

/**
 * Ajoute un fil d'ariane (breadcrumb) pour tracer le flux métier avant un bug.
 */
export function addSentryBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
  if (!isSentryInitialized) return;
  try {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info'
    });
  } catch (_) {}
}
