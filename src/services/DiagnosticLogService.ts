/**
 * DiagnosticLogService.ts
 * 
 * Capture, analyse et traduit les erreurs/avertissements de la console F12 et du réseau
 * en diagnostics compréhensibles pour l'administrateur dans le Studio de Synchronisation.
 */

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  timeFormatted: string;
  level: 'error' | 'warn' | 'info';
  source: 'network' | 'sync' | 'console' | 'database';
  rawMessage: string;
  title: string;
  significance: string;
  actionTaken: string;
  code?: string | number;
  details?: string;
  url?: string;
}

const STORAGE_KEY = 'nexus_diagnostic_logs';
const MAX_LOGS = 60;

class DiagnosticLogService {
  private logs: DiagnosticEntry[] = [];
  private listeners: Set<(logs: DiagnosticEntry[]) => void> = new Set();
  private isInitialized = false;
  private originalConsoleError: typeof console.error | null = null;
  private originalConsoleWarn: typeof console.warn | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (_) {
      this.logs = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_LOGS)));
    } catch (_) {}
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Sauvegarder les consoles d'origine
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);

    // 2. Intercepter console.error
    console.error = (...args: any[]) => {
      try {
        const rawMessage = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        this.captureLog('error', 'console', rawMessage, args);
      } catch (_) {}
      if (this.originalConsoleError) {
        this.originalConsoleError(...args);
      }
    };

    // 3. Intercepter console.warn
    console.warn = (...args: any[]) => {
      try {
        const rawMessage = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        // Filtrer les avertissements bénins (React DevTools, HMR, format d'input date Chromium)
        const isBenign = 
          rawMessage.includes('[HMR]') || 
          rawMessage.includes('Download the React DevTools') ||
          rawMessage.includes('does not conform to the required format') ||
          rawMessage.includes('The specified value');

        if (!isBenign) {
          this.captureLog('warn', 'console', rawMessage, args);
        }
      } catch (_) {}
      if (this.originalConsoleWarn) {
        this.originalConsoleWarn(...args);
      }
    };

    // 4. Capturer les erreurs globales non interceptées
    window.addEventListener('error', (event: ErrorEvent) => {
      try {
        const msg = event.message || 'Erreur JavaScript inattendue';
        this.captureLog('error', 'console', msg, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack || event.error
        });
      } catch (_) {}
    });

    // 5. Capturer les promesses rejetées
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason;
        const msg = typeof reason === 'object' ? (reason?.message || JSON.stringify(reason)) : String(reason);
        this.captureLog('error', 'sync', `Promesse rejetée : ${msg}`, reason);
      } catch (_) {}
    });
  }

  /**
   * Analyse sémantique d'une erreur pour produire un diagnostic clair en français
   */
  private analyze(level: 'error' | 'warn' | 'info', source: DiagnosticEntry['source'], raw: string, extra?: any): {
    title: string;
    significance: string;
    actionTaken: string;
    code?: string | number;
    url?: string;
  } {
    const text = raw.toLowerCase();

    // 1. Conflit PostgREST réel (409 Conflict)
    if ((text.includes('409') && (text.includes('conflict') || text.includes('rest/v1'))) || text.includes('duplicate key') || text.includes('violates unique constraint')) {
      const matchTable = raw.match(/rest\/v1\/([a-z0-9_]+)/i);
      const tableName = matchTable ? matchTable[1] : 'enregistrements';
      return {
        title: `Conflit de données (${tableName})`,
        code: 409,
        significance: `Un enregistrement avec cet identifiant ou ce nom existe déjà sur le serveur Supabase.`,
        actionTaken: `L'application a détecté le doublon et bascule automatiquement en mise à jour (UPDATE) pour préserver vos données sans écrasement.`
      };
    }

    // 2. Erreur d'authentification ou jeton expiré (401 / JWT Expired / PGRST301)
    if (text.includes('401') || text.includes('pgrst301') || text.includes('jwt') || text.includes('unauthorized') || text.includes('token expired')) {
      return {
        title: `Session expirée ou non autorisée`,
        code: 401,
        significance: `Le jeton de sécurité Supabase a expiré ou la session active a changé de droits.`,
        actionTaken: `L'application tente de rafraîchir le jeton en arrière-plan. Si le message persiste, reconnectez-vous.`
      };
    }

    // 3. Page Vercel / Déploiement non trouvé (404 / DEPLOYMENT_NOT_FOUND)
    if (text.includes('404') || text.includes('deployment_not_found') || text.includes('not found')) {
      return {
        title: `Lien cloud introuvable (404)`,
        code: 404,
        significance: `Une URL ou un service distant appelé (ex: ancien lien Vercel) n'existe plus ou a été déplacé.`,
        actionTaken: `Sur l'application de bureau (.exe), la redirection locale a été activée pour contourner l'adresse inexistante.`
      };
    }

    // 4. Coupure réseau / Offline / Failed to fetch
    if (text.includes('failed to fetch') || text.includes('network error') || text.includes('net::err_') || text.includes('connection refused') || text.includes('offline')) {
      return {
        title: `Réseau indisponible (Mode Hors-Ligne)`,
        code: 'OFFLINE',
        significance: `Le serveur distant est momentanément injoignable ou la connexion Internet de la caisse a été coupée.`,
        actionTaken: `L'architecture Offline-First prend le relais : toutes les opérations sont enregistrées dans la base locale et partiront dès le retour du réseau.`
      };
    }

    // 5. Avertissement format de date (datetime-local)
    if (text.includes('does not conform to the required format') || text.includes('the specified value')) {
      return {
        title: `Avertissement format date/heure`,
        code: 'DATE_FMT',
        significance: `Un champ de saisie calendrier a reçu une date simple au lieu d'une heure complète (ISO).`,
        actionTaken: `L'application a normalisé automatiquement la valeur sans perturber la saisie.`
      };
    }

    // 6. Colonne ou table manquante (42P01 / 42703)
    if (text.includes('42p01') || text.includes('42703') || text.includes('relation') && text.includes('does not exist')) {
      return {
        title: `Incompatibilité de schéma de table`,
        code: 'SCHEMA',
        significance: `Une colonne ou table demandée n'existe pas dans le schéma distant de Supabase.`,
        actionTaken: `Les données envoyées sont filtrées via preparePayload() pour écarter les champs inconnus.`
      };
    }

    // 7. Client display / Port local 3000
    if (text.includes('customer-display') || text.includes('localhost:3000')) {
      return {
        title: `Afficheur Client / Écran secondaire`,
        code: 'DISP',
        significance: `Communication avec l'écran client ou le serveur d'affichage local.`,
        actionTaken: `Transmission du panier en temps réel à l'afficheur secondaire.`
      };
    }

    // Par défaut
    return {
      title: level === 'error' ? 'Anomalie d\'exécution' : 'Avertissement système',
      significance: raw.length > 180 ? raw.slice(0, 180) + '...' : raw,
      actionTaken: `Journalisé pour le diagnostic. L'application continue de fonctionner.`
    };
  }

  /**
   * Enregistrer une entrée de diagnostic
   */
  public captureLog(
    level: 'error' | 'warn' | 'info',
    source: DiagnosticEntry['source'],
    rawMessage: string,
    extra?: any
  ) {
    if (!rawMessage || typeof rawMessage !== 'string') return;

    // Déduplication immédiate (si même message dans les 3 dernières secondes)
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('fr-FR');
    const existing = this.logs[0];
    if (existing && existing.rawMessage === rawMessage && (now.getTime() - new Date(existing.timestamp).getTime()) < 3000) {
      return;
    }

    // Extraire l'URL si présente
    const urlMatch = rawMessage.match(/https?:\/\/[^\s"'<>]+/);
    const url = urlMatch ? urlMatch[0] : undefined;

    const analysis = this.analyze(level, source, rawMessage, extra);

    const entry: DiagnosticEntry = {
      id: `diag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now.toISOString(),
      timeFormatted,
      level,
      source,
      rawMessage,
      title: analysis.title,
      significance: analysis.significance,
      actionTaken: analysis.actionTaken,
      code: analysis.code,
      url,
      details: extra ? (typeof extra === 'object' ? JSON.stringify(extra, null, 2) : String(extra)) : undefined
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.length = MAX_LOGS;
    }

    this.saveToStorage();
    this.notify();
  }

  public getLogs(): DiagnosticEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.notify();
  }

  public subscribe(callback: (logs: DiagnosticEntry[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getLogs());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const current = this.getLogs();
    this.listeners.forEach(cb => {
      try { cb(current); } catch (_) {}
    });
  }

  public exportAsText(): string {
    if (this.logs.length === 0) {
      return "--- Aucun incident enregistré dans le journal de diagnostic ---";
    }

    let report = `=== RAPPORT DE DIAGNOSTIC NEXUS POS PRO ===\n`;
    report += `Date d'exportation : ${new Date().toLocaleString('fr-FR')}\n`;
    report += `Nombre d'incidents : ${this.logs.length}\n`;
    report += `===========================================\n\n`;

    this.logs.forEach((log, index) => {
      report += `[#${index + 1}] [${log.timeFormatted}] [${log.level.toUpperCase()}] ${log.title}\n`;
      report += `• Ce que c'est  : ${log.significance}\n`;
      report += `• Action Nexus : ${log.actionTaken}\n`;
      if (log.url) report += `• URL           : ${log.url}\n`;
      report += `• Message Brut  : ${log.rawMessage.slice(0, 300)}\n`;
      report += `-------------------------------------------\n`;
    });

    return report;
  }
}

export const diagnosticService = new DiagnosticLogService();
