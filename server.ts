import express from "express";
import { createServer } from "http";
console.log("Starting server process...");
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import os from 'os';

// Load local .env from various possible locations (dev, packaged, or next to exe)
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  typeof (process as any).resourcesPath !== 'undefined' ? path.join((process as any).resourcesPath, '.env') : null,
  typeof process.execPath !== 'undefined' ? path.join(path.dirname(process.execPath), '.env') : null,
].filter(Boolean) as string[];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`[Dotenv] Loading environment variables from ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config(); // fallback to default dotenv lookup
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("[AI] GEMINI_API_KEY non définie. L'assistant IA sera désactivé.");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
let supabaseServer: any = null;
if (supabaseUrl && supabaseAnonKey && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn("[Supabase] Failed to initialize supabaseServer:", err);
    supabaseServer = null;
  }
}
if (!supabaseServer) {
  console.warn("[Supabase] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid. Server-side auth verification will be unavailable.");
}



// Robust path handling for both ESM and CJS
const getPaths = () => {
  if (typeof __dirname !== 'undefined') {
    return { 
      __filename: typeof __filename !== 'undefined' ? __filename : '', 
      __dirname: __dirname 
    };
  }
  try {
    // Defer evaluation of import.meta to avoid parse-time SyntaxError in CommonJS environments
    const getImportMetaUrl = new Function('return import.meta.url');
    const _filename = fileURLToPath(getImportMetaUrl());
    const _dirname = path.dirname(_filename);
    return { __filename: _filename, __dirname: _dirname };
  } catch (e) {
    return { 
      __filename: '', 
      __dirname: process.cwd() 
    };
  }
};

const { __filename: _filename, __dirname: _dirname } = getPaths();

// Helper function to evaluate production mode
export const computeIsProd = (env: NodeJS.ProcessEnv = process.env, dirname = _dirname, filename = _filename) => {
  return (
    env.NODE_ENV === "production" ||
    (typeof __dirname !== 'undefined' && __dirname.includes('dist')) ||
    (Boolean(dirname) && dirname.includes('dist')) ||
    (Boolean(filename) && (filename.includes('dist') || filename.includes('server.cjs')))
  );
};

// Production mode if explicitly set to 'production' or if running from packaged dist output
export const IS_PROD = computeIsProd();



// Security Constants for Auth Hardening verification
export const AUTH_MIN_PASSWORD_LENGTH = 4;
export const AUTH_WINDOW_MS = 60 * 1000; // 60 seconds lockout
export const AUTH_MAX_ATTEMPTS = 5;
export const invalidCredentialsError = "Identifiants incorrects";

export interface AuthRateState {
  count: number;
  lockUntil: number;
}

// In-memory store for API rate limiting
export const authRateState: Record<string, AuthRateState> = {};
export const loginAttempts = authRateState; // maintain compatibility with existing references if any

async function startServer() {
  try {
    const app = express();

    // 🛡️ Sécurité : Utiliser le parseur natif Node.js 'querystring' au lieu de la bibliothèque 'qs' (CWE-476, CWE-770)
    app.set('query parser', 'simple');

    // Restrict CORS to local development, local network IPs, production desktop electron and local mobile wrappers
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'capacitor://localhost',
      'http://localhost',
      'file://'
    ];

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin);
        if (isAllowed) {
          return callback(null, true);
        }
        // Allow private local network IPs (e.g. 192.168.x.x, 10.x.x.x, 172.16.x.x to 172.31.x.x)
        const localIpRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|127\.0\.0\.1)(:\d+)?$/;
        if (localIpRegex.test(origin)) {
          return callback(null, true);
        }
        // Reject without throwing a server-side 500 error
        callback(null, false);
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-gemini-key", "x-nexus-lan-token"]
    }));

    // Global body parser with 1mb limit (DoS protection) - /api/ai/scan a son propre parseur 50mb
    app.use((req, res, next) => {
      if (req.path === '/api/ai/scan') {
        return next();
      }
      express.json({ limit: '1mb' })(req, res, next);
    });
    // 🛡️ Sécurité : extended: false bascule vers le module natif 'querystring' de Node.js, neutralisant les CVEs de 'qs'
    app.use(express.urlencoded({ limit: '1mb', extended: false }));

    // Custom Hardened Security Headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com https://*.openfoodfacts.org; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://world.openfoodfacts.org https://*.openfoodfacts.org https://openfoodfacts.org https://generativelanguage.googleapis.com https://api.groq.com https://openrouter.ai https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io ws://localhost:* http://localhost:* http://127.0.0.1:* ws://127.0.0.1:*; media-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
      );
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      next();
    });
    
    // Debug logging for API requests
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.path}`);
      }
      next();
    });

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const isAllowed = allowedOrigins.includes(origin);
          if (isAllowed) {
            return callback(null, true);
          }
          const localIpRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|127\.0\.0\.1)(:\d+)?$/;
          if (localIpRegex.test(origin)) {
            return callback(null, true);
          }
          callback(null, false);
        },
        methods: ["GET", "POST"],
      },
    });

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    // --- Gestion État Afficheur Client Réseau Local ---
    let latestCustomerDisplayState: any = {
      items: [],
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      amountPaid: 0,
      changeDue: 0,
      customerName: '',
      isPaid: false,
      updatedAt: new Date().toISOString()
    };

    const sseClients = new Set<express.Response>();

    // API routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", version: "1.2.58", pid: process.pid });
    });

    app.get("/api/network-ip", (req, res) => {
      try {
        const interfaces = os.networkInterfaces();
        const candidateIps: Array<{ name: string; ip: string; priority: number }> = [];

        for (const [name, ifaceList] of Object.entries(interfaces)) {
          if (!ifaceList) continue;
          const lowerName = name.toLowerCase();

          // Ignorer les cartes virtuelles / conteneurs / bouclage
          const isVirtual = /vethernet|virtual|vmware|vbox|docker|wsl|hyper-v|pseudo|loopback/i.test(lowerName);

          for (const iface of ifaceList) {
            if (iface.family === 'IPv4' && !iface.internal) {
              const ip = iface.address;
              // Ignorer l'adresse APIPA non routée 169.254.x.x
              if (ip.startsWith('169.254.')) continue;

              let priority = 10;
              if (/wi-fi|wifi|wlan|wireless|sans fil/i.test(lowerName)) {
                priority = isVirtual ? 30 : 100; // Wi-Fi physique prioritaire absolue
              } else if (/ethernet|eth|lan|réseau/i.test(lowerName)) {
                priority = isVirtual ? 20 : 80;  // Câble Ethernet physique
              } else if (isVirtual) {
                priority = 5;
              }

              candidateIps.push({ name, ip, priority });
            }
          }
        }

        // Trier par priorité décroissante
        candidateIps.sort((a, b) => b.priority - a.priority);
        const bestIp = candidateIps.length > 0 ? candidateIps[0].ip : 'localhost';

        res.json({ 
          ip: bestIp, 
          port: PORT, 
          allIps: candidateIps.map(c => ({ name: c.name, ip: c.ip })) 
        });
      } catch (e) {
        res.json({ ip: 'localhost', port: PORT, allIps: [] });
      }
    });

    const EXPECTED_LAN_TOKEN = process.env.NEXUS_LAN_TOKEN || 'nexus-pos-lan-v1';

    const verifyPosLanRequest = async (req: express.Request): Promise<boolean> => {
      const ip = req.socket.remoteAddress || req.ip || '';
      const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.endsWith('127.0.0.1');
      const lanTokenHeader = req.headers['x-nexus-lan-token'];
      if (typeof lanTokenHeader === 'string' && lanTokenHeader.length > 5 && lanTokenHeader === EXPECTED_LAN_TOKEN) {
        return true;
      }
      if (req.body && typeof req.body === 'object' && req.body.lanToken && req.body.lanToken === EXPECTED_LAN_TOKEN) {
        return true;
      }
      const authHeader = req.headers['authorization'];
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token.length > 5 && token === EXPECTED_LAN_TOKEN) {
          return true;
        }
        // offline_token_ n'est autorisé que pour les connexions locales (loopback) du POS
        if (isLoopback && token.startsWith('offline_token_') && token.length > 14) {
          return true;
        }
        if (supabaseServer && token.length > 20) {
          try {
            const { data, error } = await supabaseServer.auth.getUser(token);
            if (!error && data?.user) return true;
          } catch (_) {}
        }
      }
      return false;
    };

    const requirePosLanAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Allow client-supplied Gemini API key on AI routes or verified POS/LAN token
      const hasClientGeminiKey = typeof req.headers['x-gemini-key'] === 'string' && req.headers['x-gemini-key'].trim().length > 10;
      if (hasClientGeminiKey || await verifyPosLanRequest(req)) {
        return next();
      }
      return res.status(401).json({ error: "Non autorisé : jeton de session POS ou LAN requis." });
    };

    // 🟢 Endpoints Afficheur Client Réseau Local (Wi-Fi / 2nd Écran)
    app.get("/api/customer-display", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.json(latestCustomerDisplayState);
    });

    app.post("/api/customer-display", requirePosLanAuth, (req, res) => {
      if (req.body) {
        const { lanToken, ...cleanBody } = req.body;
        latestCustomerDisplayState = {
          ...cleanBody,
          updatedAt: new Date().toISOString()
        };

        // 1. Diffusion immédiate Socket.IO
        io.emit('customer-display:update', latestCustomerDisplayState);

        // 2. Diffusion immédiate Server-Sent Events (SSE)
        const ssePayload = `data: ${JSON.stringify(latestCustomerDisplayState)}\n\n`;
        sseClients.forEach(client => {
          try {
            client.write(ssePayload);
          } catch (_) {
            sseClients.delete(client);
          }
        });
      }
      res.json({ success: true, count: sseClients.size });
    });

    // Flux Server-Sent Events (Zéro latence sur smartphone / tablette sans WebSocket)
    app.get("/api/customer-display/events", (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // Envoi immédiat du dernier état dès la connexion
      res.write(`data: ${JSON.stringify(latestCustomerDisplayState)}\n\n`);
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
    });

    // Relais code-barres depuis l'afficheur client vers la caisse (protégé par token LAN/POS)
    app.post("/api/customer-display/barcode", requirePosLanAuth, (req, res) => {
      const { barcode } = req.body || {};
      if (typeof barcode === 'string' && barcode.trim().length > 0 && barcode.trim().length <= 128) {
        io.emit('customer-display:barcode', { barcode: barcode.trim() });
      }
      res.json({ success: true });
    });

    // Custom Rate Limiter Middleware
    const loginRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const attempts = loginAttempts[ip];

      if (attempts && now < attempts.lockUntil) {
        const secondsLeft = Math.ceil((attempts.lockUntil - now) / 1000);
        return res.status(429).json({ 
          error: `Trop de tentatives de connexion. Veuillez réessayer dans ${secondsLeft} secondes.` 
        });
      }
      next();
    };

    // Custom Rate Limiter for AI endpoints (protect Gemini quotas & prevent abuse)
    const aiRateState: Record<string, { count: number; resetAt: number }> = {};
    const AI_RATE_LIMIT = 30; // Max 30 requêtes par minute par IP
    const AI_WINDOW_MS = 60 * 1000;

    const aiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const client = aiRateState[ip] || { count: 0, resetAt: now + AI_WINDOW_MS };

      if (now > client.resetAt) {
        client.count = 0;
        client.resetAt = now + AI_WINDOW_MS;
      }

      client.count += 1;
      aiRateState[ip] = client;

      if (client.count > AI_RATE_LIMIT) {
        const secondsLeft = Math.ceil((client.resetAt - now) / 1000);
        return res.status(429).json({ 
          error: "Trop de requêtes IA", 
          message: `Limite de requêtes IA atteinte. Veuillez patienter ${secondsLeft} secondes.` 
        });
      }
      next();
    };

    // 🛡️ SEC-03 : Cache local sécurisé pour vérification des mots de passe en mode déconnecté
    const authProfileCache = new Map<string, any>();

    // Secure server-side password verification route with rate limiter
    app.post("/api/auth/verify-password", loginRateLimiter, async (req, res) => {
      const { table, email, password } = req.body;

      if (!table || !email || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }

      if (String(password).length < AUTH_MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Le mot de passe ou PIN doit faire au moins ${AUTH_MIN_PASSWORD_LENGTH} caractères.` });
      }

      if (table !== 'users' && table !== 'employees' && table !== 'customers' && table !== 'suppliers') {
        return res.status(400).json({ error: "Invalid table" });
      }

      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      try {
        const cleanEmail = email.toLowerCase().trim();
        const mappedTable = table === 'users'
          ? 'users'
          : table === 'employees'
            ? 'employees'
            : table === 'customers'
              ? 'customers'
              : 'suppliers';

        const cacheKey = `${mappedTable}:${cleanEmail}`;

        // Fetch detailed profile fields along with password_hash and pin securely on server-side
        const selectColumns = mappedTable === 'users'
          ? 'id, uid, email, display_name, password_hash, pin, role, join_date'
          : mappedTable === 'employees'
            ? 'id, name, role, phone, email, hire_date, status, is_clocked_in, permissions, password_hash, pin'
            : mappedTable === 'customers'
              ? 'id, name, phone, email, loyalty_points, balance, loyalty_card_number, total_spent, last_visit, notes, is_app_user, password_hash, join_date, favorite_items, alerts, cashier_notes, updated_at'
              : 'id, name, contact_name, phone, email, address, categories, feed_url, feed_format, last_sync, sync_enabled, is_app_user, password_hash, balance, pre_sale_days, delivery_days, payment_days, planning_notes, updated_at';

        let record: any = null;

        // 🛡️ SEC-03 : Tentative Supabase Cloud en ligne avec repli sur cache local en cas de coupure Internet
        if (supabaseServer) {
          try {
            const { data, error } = await supabaseServer
              .from(mappedTable)
              .select(selectColumns)
              .eq('email', cleanEmail);

            if (!error && data && data.length > 0) {
              record = data[0];
              authProfileCache.set(cacheKey, record);
            } else if (error) {
              console.warn('[Auth API] Erreur Supabase, repli sur le cache local:', error.message);
              record = authProfileCache.get(cacheKey);
            }
          } catch (supaErr) {
            console.warn('[Auth API] Réseau Supabase indisponible, repli sur le cache local:', supaErr);
            record = authProfileCache.get(cacheKey);
          }
        } else {
          record = authProfileCache.get(cacheKey);
        }

        if (!record) {
          // Record failure on unknown emails to prevent username harvesting at speed
          const attempts = authRateState[ip] || { count: 0, lockUntil: 0 };
          attempts.count += 1;
          if (attempts.count >= AUTH_MAX_ATTEMPTS) {
            attempts.lockUntil = Date.now() + AUTH_WINDOW_MS;
            attempts.count = 0;
          }
          authRateState[ip] = attempts;
          return res.status(401).json({ error: invalidCredentialsError });
        }

        const candidateHashes = [record.password_hash, record.pin, record.password].filter(
          (h): h is string => typeof h === 'string' && h.length > 0
        );

        if (candidateHashes.length === 0) {
          return res.status(401).json({ error: "Aucun mot de passe configuré sur ce compte" });
        }

        let isMatch = false;
        for (const h of candidateHashes) {
          if (h.startsWith('$2a$') || h.startsWith('$2b$')) {
            if (await bcrypt.compare(String(password), h)) {
              isMatch = true;
              break;
            }
          }
        }
        if (!isMatch) {
          const attempts = authRateState[ip] || { count: 0, lockUntil: 0 };
          attempts.count += 1;
          if (attempts.count >= AUTH_MAX_ATTEMPTS) {
            attempts.lockUntil = Date.now() + AUTH_WINDOW_MS;
            attempts.count = 0;
          }
          authRateState[ip] = attempts;
          return res.status(401).json({ error: invalidCredentialsError });
        }

        // On successful match, clear the login failures for this IP address
        delete authRateState[ip];

        // Strip password hash details before returning to client browser
        const safeRecord = { ...(record as any) };
        delete safeRecord.password_hash;
        delete safeRecord.password;
        delete safeRecord.pin;
        safeRecord.isAppUser = safeRecord.is_app_user ?? safeRecord.isAppUser ?? true;
        return res.json({ valid: true, user: safeRecord, ...safeRecord });
      } catch (err: any) {
        console.error("[Auth API Error] Verification failed:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });


    // AI Analysis/Completion route with Rate Limiter & Auth
    app.post("/api/ai/complete", requirePosLanAuth, aiRateLimiter, async (req, res) => {
      const { data, userPrompt, systemPromptOverride } = req.body;
      const clientKey = req.headers['x-gemini-key'];
      const apiKey = (typeof clientKey === 'string' && clientKey) ? clientKey : (process.env.GEMINI_API_KEY || '');
      
      if (!apiKey) {
        return res.status(500).json({ error: "Configuration", message: "La clé API Gemini n'est pas configurée sur le serveur." });
      }

      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        
        const systemPrompt = systemPromptOverride || `Tu es un consultant expert en gestion de commerce de détail. 
          Analyse les données (ventes, dépenses, stocks, et surtout les ajustements de stock négatifs pour identifier les pertes) et réponds de manière concise en français.
          Réponds toujours au format Markdown.`;

        const dataContext = data ? `\n\nDonnées actuelles du magasin :\n${JSON.stringify(data, null, 2)}` : '';
        const fullPrompt = `${userPrompt || "Analyse mon commerce."}${dataContext}`;

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: systemPrompt }, { text: fullPrompt }] }]
        });
        res.json({ response: result.text });
      } catch (error: any) {
        console.error("Gemini Error:", error);
        
        // Handle model not found error by attempting a fallback
        if (error.message?.includes('not found') || error.status === 'NOT_FOUND') {
          try {
            const aiFallback = new (await import("@google/genai")).GoogleGenAI({ apiKey: apiKey! });
            const fallbackResult = await aiFallback.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ parts: [{ text: systemPromptOverride || "Analyse mon commerce." }, { text: userPrompt || "Analyse mon commerce." }] }]
            });
            return res.json({ response: fallbackResult.text });
          } catch (fallbackError) {
            console.error("Fallback error:", fallbackError);
          }
        }

        const errMsg = error.message || (typeof error === 'object' && error !== null ? error.toString() : String(error));
        const errorStr = (() => {
          try {
            return JSON.stringify(error);
          } catch (e) {
            return '';
          }
        })();
        
        const isQuotaError = 
          errMsg.toLowerCase().includes('429') || 
          errMsg.toLowerCase().includes('quota') || 
          errMsg.toLowerCase().includes('credit') || 
          errMsg.toLowerCase().includes('depleted') ||
          errMsg.toLowerCase().includes('exhausted') ||
          errorStr.toLowerCase().includes('resource_exhausted') ||
          errorStr.toLowerCase().includes('429') ||
          errorStr.toLowerCase().includes('depleted') ||
          errorStr.toLowerCase().includes('credits') ||
          (error && typeof error === 'object' && (error.status === 429 || error.status === 'RESOURCE_EXHAUSTED' || error.statusCode === 429 || error.code === 429));
        
        if (isQuotaError) {
          return res.status(429).json({ 
            error: "Quota atteint", 
            message: "La limite de l'IA (ou vos crédits AI Studio) est épuisée. Passage en mode manuel ou local si disponible." 
          });
        }

        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('invalid') || errMsg.includes('expired') || errorStr.includes('API_KEY_INVALID')) {
          return res.status(401).json({ 
            error: "Clé API Invalide", 
            message: "Votre clé API Gemini est invalide ou expirée. Veuillez la mettre à jour dans les paramètres (Settings) de l'application." 
          });
        }
        res.status(500).json({ error: "Erreur AI", message: errMsg });
      }
    });
    app.post("/api/ai/scan", requirePosLanAuth, aiRateLimiter, express.json({ limit: '50mb' }), async (req, res) => {
      const { image, mimeType } = req.body;
      const clientKey = req.headers['x-gemini-key'];
      const apiKey = (typeof clientKey === 'string' && clientKey) ? clientKey : (process.env.GEMINI_API_KEY || '');

      if (!apiKey) {
        return res.status(500).json({ error: "Configuration", message: "La clé API Gemini n'est pas configurée pour le scanner." });
      }

      if (!image) {
        return res.status(400).json({ error: "Données manquantes", message: "Aucune image n'a été reçue pour l'analyse." });
      }

      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const prompt = `Tu es un extracteur de factures et de bons de réception ultra-précis. Analyse l'image fournie.

RÈGLE ABSOLUE ZÉRO HALLUCINATION : Tu dois extraire UNIQUEMENT et STRICTEMENT les lignes de produits visibles physiquement dans le tableau de l'image. Si un produit n'est pas écrit noir sur blanc sur l'image, tu ne l'inventes pas. Ne te base pas sur tes connaissances passées, des exemples ou des produits similaires. Si l'image ne contient que 3 articles, ton tableau 'items' doit contenir EXACTEMENT et UNIQUEMENT ces 3 articles.

Retourne STRICTEMENT un JSON valide contenant :
1. 'supplierName' (string ou null : le nom du fournisseur extrait de l'image)
2. 'invoiceNumber' (string ou null : le numéro du bon ou de la facture)
3. 'date' (string ou null : la date au format YYYY-MM-DD)
4. 'previousBalance' (number ou null : l'ancien solde ou solde précédent s'il est mentionné)
5. 'total' (number ou null : le montant total général)
6. 'items' (un tableau d'objets contenant STRICTEMENT :
   - 'name': string (la désignation exacte du produit lue sur l'image)
   - 'barcode': string ou null (le code-barres ou code article numérique s'il est présent, ex: '6132520220164')
   - 'quantity': number (la quantité, un nombre décimal ou entier strictement positif)
   - 'price': number (le prix unitaire HT, un nombre strictement positif)
   - 'total': number (le montant total de la ligne = quantité * prix unitaire)
)

IMPORTANT POUR LES NOMBRES : Les champs 'quantity', 'price' et 'total' des articles doivent être de purs types numériques (float ou int, exemple : 13.0, 143.0, 1859.0). Ne combine pas les colonnes adjacentes (ne fusionne pas le prix avec un code-barres ou un montant pour donner des chiffres aberrants comme 1450004). Si tu lis '143,00 DA' pour le prix, convertis-le strictement en le nombre 143.`;

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } }
            ]
          }]
        });
        
        const text = result.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        
        try {
          const data = JSON.parse(jsonStr);
          res.json(data);
        } catch (parseError) {
          res.status(500).json({ error: "Format invalide", message: "L'IA a retourné un format illisible.", raw: text });
        }
      } catch (error: any) {
        console.error("Gemini Scan Error:", error);

        // Fallback for not found
        if (error.message?.includes('not found') || error.status === 'NOT_FOUND') {
          try {
            const aiFallback = new (await import("@google/genai")).GoogleGenAI({ apiKey: apiKey! });
            const promptFallback = `Analyse cette facture. Extrais uniquement les articles.
RÈGLE ABSOLUE ZÉRO HALLUCINATION : Extrais STRICTEMENT et UNIQUEMENT les lignes de produits visibles sur l'image. N'invente aucun produit.

Retourne un JSON valide avec : items (un tableau d'objets contenant :
- 'name': string
- 'quantity': number (la quantité, pur type numérique)
- 'price': number (le prix unitaire HT, pur type numérique)
- 'total': number (le total, pur type numérique)
).`;
            const resultFallback = await aiFallback.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{
                parts: [
                  { text: promptFallback },
                  { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } }
                ]
              }]
            });
            const textFallback = resultFallback.text || "";
            const jsonMatchFallback = textFallback.match(/\{[\s\S]*\}/);
            const jsonStrFallback = jsonMatchFallback ? jsonMatchFallback[0] : textFallback;
            return res.json(JSON.parse(jsonStrFallback));
          } catch (e) {
            console.error("Scan fallback failed:", e);
          }
        }

        const errMsg = error.message || (typeof error === 'object' && error !== null ? error.toString() : String(error));
        const errorStr = (() => {
          try {
            return JSON.stringify(error);
          } catch (e) {
            return '';
          }
        })();
        
        const isQuotaError = 
          errMsg.toLowerCase().includes('429') || 
          errMsg.toLowerCase().includes('quota') || 
          errMsg.toLowerCase().includes('credit') || 
          errMsg.toLowerCase().includes('depleted') ||
          errMsg.toLowerCase().includes('exhausted') ||
          errorStr.toLowerCase().includes('resource_exhausted') ||
          errorStr.toLowerCase().includes('429') ||
          errorStr.toLowerCase().includes('depleted') ||
          errorStr.toLowerCase().includes('credits') ||
          (error && typeof error === 'object' && (error.status === 429 || error.status === 'RESOURCE_EXHAUSTED' || error.statusCode === 429 || error.code === 429));
        
        if (isQuotaError) {
          return res.status(429).json({ 
            error: "Quota atteint", 
            message: "Impossible de scanner : vos crédits AI Studio sont épuisés ou la limite de quota a été atteinte." 
          });
        }

        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('invalid') || errMsg.includes('expired') || errorStr.includes('API_KEY_INVALID')) {
          return res.status(401).json({ 
            error: "Clé API Invalide", 
            message: "Votre clé API Gemini est expirée ou invalide. Veuillez la renouveler dans AI Studio." 
          });
        }
        res.status(500).json({ error: "Échec Scan", message: errMsg });
      }
    });

    // 🟢 Socket.io events (Diffusion temps réel local pour afficheur client & caisse)
    io.on("connection", (socket) => {
      const handshakeToken = socket.handshake.auth?.token || socket.handshake.headers['x-nexus-lan-token'];
      const isAuthorizedSocket = Boolean(
        handshakeToken === EXPECTED_LAN_TOKEN ||
        (typeof handshakeToken === 'string' && handshakeToken.startsWith('offline_token_') && handshakeToken.length > 14)
      );

      // Envoyer l'état actuel dès la connexion
      if (latestCustomerDisplayState) {
        socket.emit("customer-display:update", latestCustomerDisplayState);
      }

      // Demande explicite de l'état actuel par un afficheur client
      socket.on("customer-display:request", () => {
        socket.emit("customer-display:update", latestCustomerDisplayState);
      });

      // Réception d'une mise à jour depuis la caisse (authentifiée)
      socket.on("customer-display:send", (state) => {
        if (!isAuthorizedSocket && state?.lanToken !== EXPECTED_LAN_TOKEN) return;
        if (state && typeof state === 'object') {
          const { lanToken, ...cleanState } = state;
          latestCustomerDisplayState = {
            ...cleanState,
            updatedAt: new Date().toISOString()
          };
          // Diffuser à tous les autres clients connectés (écrans clients / tablettes)
          socket.broadcast.emit("customer-display:update", latestCustomerDisplayState);

          // Diffuser également aux clients connectés en Server-Sent Events (SSE)
          const ssePayload = `data: ${JSON.stringify(latestCustomerDisplayState)}\n\n`;
          sseClients.forEach(client => {
            try { client.write(ssePayload); } catch (_) { sseClients.delete(client); }
          });
        }
      });

      // Relais douchette code-barres depuis un écran client vers la caisse (authentifié)
      socket.on("customer-display:barcode", (data) => {
        if (!isAuthorizedSocket && data?.lanToken !== EXPECTED_LAN_TOKEN) return;
        const barcode = typeof data?.barcode === 'string' ? data.barcode.trim() : '';
        if (barcode.length > 0 && barcode.length <= 128) {
          socket.broadcast.emit("customer-display:barcode", { barcode });
        }
      });

      socket.on("disconnect", () => {
        // Déconnexion propre
      });
    });

    // 📱 Route d'information réseau local (IP Wi-Fi du PC) pour le QR Code d'installation iPhone & Android
    app.get('/api/network-info', (req, res) => {
      try {
        const nets = os.networkInterfaces();
        const ips: string[] = [];
        for (const name of Object.keys(nets)) {
          for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
              ips.push(net.address);
            }
          }
        }
        // Prioriser 192.168.x.x ou 10.x.x.x (Wi-Fi / Ethernet local)
        const preferredIp = ips.find(ip => ip.startsWith('192.168.')) || ips.find(ip => ip.startsWith('10.')) || ips[0] || '127.0.0.1';
        const lanUrl = `http://${preferredIp}:${PORT}`;
        const GITHUB_APK_FALLBACK = process.env.APK_DOWNLOAD_URL || process.env.VITE_APK_URL || 'https://github.com/31kader/Remix-Nexus-POS-Pro22/releases/latest';
        res.json({
          lanIp: preferredIp,
          allIps: ips,
          port: PORT,
          lanUrl,
          apkLanUrl: `${lanUrl}/download/apk`,
          githubApkUrl: GITHUB_APK_FALLBACK
        });
      } catch (e) {
        const GITHUB_APK_FALLBACK = process.env.APK_DOWNLOAD_URL || process.env.VITE_APK_URL || 'https://github.com/31kader/Remix-Nexus-POS-Pro22/releases/latest';
        res.json({
          lanIp: '127.0.0.1',
          allIps: [],
          port: PORT,
          lanUrl: `http://127.0.0.1:${PORT}`,
          apkLanUrl: `http://127.0.0.1:${PORT}/download/apk`,
          githubApkUrl: GITHUB_APK_FALLBACK
        });
      }
    });

    // 📦 Route de téléchargement direct du fichier APK Android depuis le PC en Wi-Fi ou redirection GitHub
    app.get('/download/apk', (req, res) => {
      const GITHUB_APK_FALLBACK = process.env.APK_DOWNLOAD_URL || process.env.VITE_APK_URL || 'https://unlwfvldqxfccgrrgbwf.supabase.co/storage/v1/object/public/KSSGOP/NexusPOSPro-1.2.58.apk';
      const releaseDirs = [
        path.join(process.cwd(), 'release'),
        path.join(_dirname, '..', 'release'),
        path.join(_dirname, 'release'),
        path.join('C:\\Users\\ks2\\antigravity\\Remix-Nexus-POS-Pro', 'release')
      ];
      const dynamicApks: string[] = [];
      for (const dir of releaseDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir)
              .filter(f => f.toLowerCase().endsWith('.apk'))
              .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
            for (const f of files) {
              dynamicApks.push(path.join(dir, f));
            }
          } catch (_) {
            // ignore read error
          }
        }
      }
      const candidatePaths = [
        path.join(process.cwd(), 'release', 'Nexus-POS-Pro-1.2.45.apk'),
        path.join(_dirname, '..', 'release', 'Nexus-POS-Pro-1.2.45.apk'),
        path.join(process.cwd(), 'release', 'NexusPOSPro-1.2.45.apk'),
        path.join(_dirname, '..', 'release', 'NexusPOSPro-1.2.45.apk'),
        ...dynamicApks,
        path.join(process.cwd(), 'release', 'NexusPOSPro-1.2.30.apk'),
        path.join(_dirname, '..', 'release', 'NexusPOSPro-1.2.30.apk'),
        path.join(process.cwd(), 'release', 'NexusPOSPro-1.2.29.apk'),
        path.join(_dirname, '..', 'release', 'NexusPOSPro-1.2.29.apk'),
        path.join(process.cwd(), 'release', 'NexusPOSPro-1.2.14.apk'),
        path.join(_dirname, '..', 'release', 'NexusPOSPro-1.2.14.apk'),
        path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          return res.download(p, path.basename(p));
        }
      }
      return res.redirect(GITHUB_APK_FALLBACK);
    });

    // 📦 Route de téléchargement direct de l'installeur Windows EXE depuis le réseau local
    app.get('/download/exe', (req, res) => {
      const releaseDirs = [
        path.join(process.cwd(), 'release'),
        path.join(_dirname, '..', 'release'),
        path.join(_dirname, 'release'),
        path.join('C:\\Users\\ks2\\antigravity\\Remix-Nexus-POS-Pro', 'release')
      ];
      for (const dir of releaseDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir)
              .filter(f => f.toLowerCase().endsWith('.exe') && !f.includes('uninstaller'))
              .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
            if (files.length > 0) {
              const exePath = path.join(dir, files[0]);
              return res.download(exePath, files[0]);
            }
          } catch (_) {}
        }
      }
      res.status(404).send("Fichier d'installation Windows non trouvé dans le dossier release.");
    });

    // Ensure we correctly detect development mode with Vite HMR in local environment
    if (!IS_PROD) {
      try {
        console.log("Starting Vite in dev mode with HMR...");
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            hmr: true,
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (viteError) {
        console.error("Failed to start Vite dev server:", viteError);
      }
    } else {
      // Logic for production files localization: Find the REAL dist folder
      // We look for a folder containing both index.html and the assets/ directory
      const rootDir = process.cwd();
      const possibleDistPaths = [
        path.join(rootDir, 'dist'),        // Standard build output
        _dirname,                          // If running directly from dist/
        path.join(_dirname, '..'),         // If running from dist/ but files moved
        path.join(_dirname, 'dist'),       // If server is in a subfolder
        rootDir                            // Current working directory
      ];

      let distPath = "";
      for (const p of possibleDistPaths) {
        const hasIndex = fs.existsSync(path.join(p, 'index.html'));
        const hasAssets = fs.existsSync(path.join(p, 'assets'));
        if (hasIndex && hasAssets) {
          distPath = p;
          break;
        }
      }
      
      // Fallback if no perfect dist folder found
      if (!distPath) {
        for (const p of possibleDistPaths) {
          if (fs.existsSync(path.join(p, 'index.html'))) {
            distPath = p;
            break;
          }
        }
      }

      if (distPath) {
        console.log(`[PROD] Serving application from: ${distPath}`);
        // Serve static assets but do not automatically serve index.html for root requests
        app.use(express.static(distPath, { index: false }));
        app.get('*', async (req, res) => {
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            try {
              // ⚡ En-têtes anti-cache stricts pour forcer le chargement immédiat des nouveaux bundles
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');

              // ✅ Utilisation de la lecture asynchrone non-bloquante
              let html = await fs.promises.readFile(indexPath, 'utf-8');
              
              // Read live, real-time environment variables at request time
              const envObj = {
                VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
                VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN || ''
              };

              // Safety swap in case the user pasted the URL into the anon_key and vice-versa
              if (envObj.VITE_SUPABASE_URL.startsWith('eyJ') && envObj.VITE_SUPABASE_ANON_KEY.startsWith('http')) {
                console.log("[ENV correction] Swapping misplaced Supabase URL and Anon Key variables from environment.");
                const temp = envObj.VITE_SUPABASE_URL;
                envObj.VITE_SUPABASE_URL = envObj.VITE_SUPABASE_ANON_KEY;
                envObj.VITE_SUPABASE_ANON_KEY = temp;
              }

              const injection = `<script id="runtime-env">
                window.__ENV__ = ${JSON.stringify(envObj)};
              </script>`;

              // Inject the variables block directly after the opening <head> tag
              html = html.replace('<head>', `<head>\n${injection}`);
              res.send(html);
            } catch (err) {
              console.error("Error doing dynamic index.html injection:", err);
              res.sendFile(indexPath); // Fail-safe fallback to standard file response
            }
          } else {
            res.status(404).send("index.html not found");
          }
        });
      } else {
        console.error("[PROD] Could not find application files (dist folder).");
        app.get('*', (req, res) => {
          res.status(404).send("Erreur: Les fichiers de l'application (dossier dist) sont introuvables. Veuillez lancer 'npm run build' avant de lancer le logiciel.");
        });
      }
    }

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Port ${PORT} is already in use. An existing instance is handling requests.`);
      } else {
        console.error("Critical error on server socket:", err);
      }
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
  } catch (err) {
    console.error("Critical error during server startup:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer();
}
