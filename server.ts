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
const supabaseServer = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
if (!supabaseServer) {
  console.warn("[Supabase] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Server-side auth verification will be unavailable.");
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

// Determine if we are in the AI Studio editor environment (Dev)
const IS_EDITOR = !!(process.env.K_SERVICE && process.env.K_SERVICE.includes('-dev-'));

// Production mode if explicitly set, or if we're not in the editor, or if running from dist
const IS_PROD = 
  process.env.NODE_ENV === "production" || 
  !IS_EDITOR ||
  (typeof __dirname !== 'undefined' && __dirname.includes('dist')) ||
  (_dirname && _dirname.includes('dist')) ||
  (_filename && (_filename.includes('dist') || _filename.includes('server.cjs')));



// Security Constants for Auth Hardening verification
export const AUTH_MIN_PASSWORD_LENGTH = 8;
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
      allowedHeaders: ["Content-Type", "Authorization", "x-gemini-key"]
    }));

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Custom Security Headers (equivalent to basic Helmet setup)
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
      res.json({ status: "ok" });
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

    // 🟢 Endpoints Afficheur Client Réseau Local (Wi-Fi / 2nd Écran)
    app.get("/api/customer-display", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.json(latestCustomerDisplayState);
    });

    app.post("/api/customer-display", (req, res) => {
      if (req.body) {
        latestCustomerDisplayState = {
          ...req.body,
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

    // Relais code-barres depuis l'afficheur client vers la caisse
    app.post("/api/customer-display/barcode", (req, res) => {
      const { barcode } = req.body || {};
      if (barcode) {
        io.emit('customer-display:barcode', { barcode });
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

    // Secure server-side password verification route with rate limiter
    app.post("/api/auth/verify-password", loginRateLimiter, async (req, res) => {
      const { table, email, password } = req.body;

      if (!table || !email || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }

      if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Le mot de passe doit faire au moins ${AUTH_MIN_PASSWORD_LENGTH} caractères.` });
      }

      if (table !== 'users' && table !== 'customers' && table !== 'suppliers') {
        return res.status(400).json({ error: "Invalid table" });
      }

      if (!supabaseServer) {
        return res.status(503).json({ error: "Supabase client not configured on server" });
      }

      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      try {
        const cleanEmail = email.toLowerCase().trim();
        const mappedTable = table === 'users' ? 'users' : table === 'customers' ? 'customers' : 'suppliers';

        // Fetch detailed profile fields along with password/password_hash securely on server-side
        const selectColumns = mappedTable === 'users'
          ? 'id, uid, email, display_name, password_hash, role, join_date'
          : mappedTable === 'customers'
            ? 'id, name, phone, email, loyalty_points, balance, loyalty_card_number, total_spent, last_visit, notes, is_app_user, password_hash, join_date, favorite_items, alerts, cashier_notes, updated_at'
            : 'id, name, contact_name, phone, email, address, categories, feed_url, feed_format, last_sync, sync_enabled, is_app_user, password_hash, balance, pre_sale_days, delivery_days, payment_days, planning_notes, updated_at';

        const { data, error } = await supabaseServer
          .from(mappedTable)
          .select(selectColumns)
          .eq('email', cleanEmail);

        if (error || !data || data.length === 0) {
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

        const record = data[0] as any;
        const hash = record.password_hash || record.password;

        if (!hash) {
          return res.status(401).json({ error: "Aucun mot de passe configuré sur ce compte" });
        }

        const isMatch = await bcrypt.compare(password, hash);
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

        return res.json(safeRecord);
      } catch (err: any) {
        console.error("[Auth API Error] Verification failed:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });


    // AI Analysis/Completion route
    app.post("/api/ai/complete", async (req, res) => {
      const { data, userPrompt, systemPromptOverride } = req.body;
      const clientKey = req.headers['x-gemini-key'];
      const apiKey = (typeof clientKey === 'string' && clientKey) ? clientKey : (process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY);
      
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
          model: "gemini-3.6-flash",
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
              model: "gemini-3.6-flash",
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
    app.post("/api/ai/scan", async (req, res) => {
      const { image, mimeType } = req.body;
      const clientKey = req.headers['x-gemini-key'];
      const apiKey = (typeof clientKey === 'string' && clientKey) ? clientKey : (process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY);

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
          model: "gemini-3.6-flash",
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
              model: "gemini-3.6-flash",
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
      // Envoyer l'état actuel dès la connexion
      if (latestCustomerDisplayState) {
        socket.emit("customer-display:update", latestCustomerDisplayState);
      }

      // Demande explicite de l'état actuel par un afficheur client
      socket.on("customer-display:request", () => {
        socket.emit("customer-display:update", latestCustomerDisplayState);
      });

      // Réception d'une mise à jour depuis la caisse
      socket.on("customer-display:send", (state) => {
        if (state) {
          latestCustomerDisplayState = {
            ...state,
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

      // Relais douchette code-barres depuis un écran client vers la caisse
      socket.on("customer-display:barcode", (data) => {
        socket.broadcast.emit("customer-display:barcode", data);
      });

      socket.on("disconnect", () => {
        // Déconnexion propre
      });
    });

    // Ensure we correctly detect production mode in Cloud Run
    if (!IS_PROD) {
      try {
        console.log("Starting Vite in dev mode...");
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            hmr: false,
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
                VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
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

startServer();
