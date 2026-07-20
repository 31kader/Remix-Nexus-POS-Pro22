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
  console.warn("[AI] Warning: GEMINI_API_KEY is not defined in environment variables. AI features will require configuration.");
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



async function startServer() {
  try {
    const app = express();
    app.use(express.json({ limit: '50mb' })); // Increased limit for image scans
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    
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
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const AUTH_MIN_PASSWORD_LENGTH = 4;
    const AUTH_WINDOW_MS = 60 * 1000;
    const AUTH_MAX_ATTEMPTS = 8;
    const authRateState = new Map<string, { attempts: number; firstSeenAt: number }>();

    const pruneAuthRateState = (now: number) => {
      for (const [key, value] of authRateState.entries()) {
        if (now - value.firstSeenAt > AUTH_WINDOW_MS) {
          authRateState.delete(key);
        }
      }
    };

    const getAuthRateKey = (req: any, table: string, email: string) => {
      const ip = String(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      return `${ip}|${table}|${email}`;
    };

    // API routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Secure server-side password verification route
    app.post("/api/auth/verify-password", async (req, res) => {
      const { table, email, password } = req.body;

      if (!table || !email || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }

      if (table !== 'users' && table !== 'customers' && table !== 'suppliers') {
        return res.status(400).json({ error: "Invalid table" });
      }

      if (!supabaseServer) {
        return res.status(503).json({ error: "Supabase client not configured on server" });
      }

      try {
        const cleanEmail = String(email).toLowerCase().trim();
        const cleanPassword = String(password);
        const invalidCredentialsError = { error: "Identifiants incorrects" };

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        if (cleanPassword.length < AUTH_MIN_PASSWORD_LENGTH || cleanPassword.length > 128) {
          return res.status(401).json(invalidCredentialsError);
        }

        const now = Date.now();
        pruneAuthRateState(now);
        const rateKey = getAuthRateKey(req, table, cleanEmail);
        const currentRate = authRateState.get(rateKey);

        if (currentRate && now - currentRate.firstSeenAt <= AUTH_WINDOW_MS && currentRate.attempts >= AUTH_MAX_ATTEMPTS) {
          return res.status(429).json({ error: "Trop de tentatives. Réessayez plus tard." });
        }

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
          authRateState.set(rateKey, {
            attempts: (currentRate?.attempts || 0) + 1,
            firstSeenAt: currentRate?.firstSeenAt || now
          });
          return res.status(401).json(invalidCredentialsError);
        }

        const record = data[0] as any;
        const hash = record.password_hash;

        if (!hash) {
          authRateState.set(rateKey, {
            attempts: (currentRate?.attempts || 0) + 1,
            firstSeenAt: currentRate?.firstSeenAt || now
          });
          return res.status(401).json(invalidCredentialsError);
        }

        const isMatch = bcrypt.compareSync(cleanPassword, hash);
        if (!isMatch) {
          authRateState.set(rateKey, {
            attempts: (currentRate?.attempts || 0) + 1,
            firstSeenAt: currentRate?.firstSeenAt || now
          });
          return res.status(401).json(invalidCredentialsError);
        }

        if ((mappedTable === 'customers' || mappedTable === 'suppliers') && !record.is_app_user) {
          return res.status(401).json(invalidCredentialsError);
        }

        authRateState.delete(rateKey);

        // Strip password hash details before returning to client browser
        const safeRecord = { ...(record as any) };
        delete safeRecord.password_hash;

        return res.json(safeRecord);
      } catch (err: any) {
        console.error("[Auth API Error] Verification failed:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });


    // AI Analysis/Completion route
    app.post("/api/ai/complete", async (req, res) => {
      const { data, userPrompt, systemPromptOverride } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
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

        const result = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt || "Analyse mon commerce." }] }]
        });
        res.json({ response: result.text });
      } catch (error: any) {
        console.error("Gemini Error:", error);
        
        // Handle model not found error by attempting a fallback
        if (error.message?.includes('not found') || error.status === 'NOT_FOUND') {
          try {
            const aiFallback = new (await import("@google/genai")).GoogleGenAI({ apiKey: apiKey! });
            const fallbackResult = await aiFallback.models.generateContent({
              model: "gemini-3.5-flash",
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
      const apiKey = process.env.GEMINI_API_KEY;

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

        const prompt = "Analyse cette facture/bon d'achat. Extrais les informations et retourne un JSON valide avec : \n1. 'supplierName' (le nom du fournisseur)\n2. 'invoiceNumber' (le numéro du bon ou de la facture)\n3. 'date' (la date au format YYYY-MM-DD)\n4. 'previousBalance' (l'ancien solde ou solde précédent s'il est mentionné, un nombre, sinon null)\n5. 'total' (le nouveau solde ou total à payer, un nombre)\n6. 'items' (un tableau d'objets contenant { name: string, quantity: number, price: number, total: number }).\nNote TRÈS IMPORTANTE : le champ 'price' doit être le prix d'achat UNITAIRE du produit, et le champ 'total' du produit doit être le montant total HT de cette de ligne (quantité * prix unitaire). S'il y a des colonnes de quantité répétées, utilise la quantité brute correcte sans les additionner.";

        const result = await ai.models.generateContent({
          model: "gemini-3.5-flash",
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
            const resultFallback = await aiFallback.models.generateContent({
              model: "gemini-3.5-flash",
              contents: [{
                parts: [
                  { text: "Analyse cette facture. Extrais uniquement les articles et retourne un JSON valide avec : items (un tableau d'objets contenant { name: string, quantity: number, price: number, total: number }). Note TRÈS IMPORTANTE : le champ 'price' doit être le prix d'achat UNITAIRE du produit, et le champ 'total' doit être le montant total HT de cette de ligne (quantité * prix unitaire). S'il y a des colonnes de quantité répétées (ex: 'Nbr. Carton' et 'Quantité'), utilise la quantité brute correcte (ex: 6 ou 12) et ne les additionne ni ne les concatène pas. Ignore complètement le fournisseur, les numéros de facture et la date." },
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





    // Socket.io events
    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
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
        app.get('*', (req, res) => {
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            try {
              let html = fs.readFileSync(indexPath, 'utf-8');
              
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

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
  } catch (err) {
    console.error("Critical error during server startup:", err);
    process.exit(1);
  }
}

startServer();

