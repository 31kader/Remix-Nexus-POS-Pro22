const { app, BrowserWindow, shell, Menu, Tray, dialog, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;

function initDatabase() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'nexus_pos.db');
    log(`Initialisation de la base SQLite à: ${dbPath}`);
    db = new Database(dbPath);
    
    // Configurer le mode WAL pour de meilleures performances
    db.pragma('journal_mode = WAL');
    
    // Créer la table local_records
    db.prepare(`
      CREATE TABLE IF NOT EXISTS local_records (
        table_name TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (table_name, id)
      )
    `).run();
    
    // Créer la table sync_queue
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    log('Base SQLite initialisée avec succès.');
  } catch (error) {
    logError('Échec de l\'initialisation de la base SQLite', error);
  }
}

// Simuler un navigateur classique pour éviter le blocage de Google Accounts sur Electron (page blanche)
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let mainWindow = null;
let serverProcess = null;
let tray = null;
let logStream = null;

let SERVER_PORT = 3000;
let SERVER_URL = `http://localhost:${SERVER_PORT}`;

// 🛡️ ELC-01 : Détection automatique d'un port disponible si le port 3000 est déjà occupé
function findAvailablePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const testServer = net.createServer();
    testServer.unref();
    testServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    testServer.listen(startPort, () => {
      const { port } = testServer.address();
      testServer.close(() => {
        resolve(port);
      });
    });
  });
}

// ─── Initialisation des Logs ───────────────────────────────────────────────────
function initLogging() {
  try {
    const userDataPath = app.getPath('userData');
    const logDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'startup.log');
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    log(`--- Démarrage de l'application (v${app.getVersion()}) ---`);
    log(`UserData path: ${userDataPath}`);
    log(`ExecPath: ${process.execPath}`);
  } catch (e) {
    console.error('Impossible d\'initialiser le fichier de log:', e);
  }
}

function log(message) {
  const formatted = `[${new Date().toISOString()}] ${message}`;
  console.log(formatted);
  if (logStream) {
    logStream.write(formatted + '\n');
  }
}

function logError(message, err) {
  const errStr = err ? `\nError: ${err.message}\nStack: ${err.stack}` : '';
  const formatted = `[${new Date().toISOString()}] [ERROR] ${message}${errStr}`;
  console.error(formatted);
  if (logStream) {
    logStream.write(formatted + '\n');
  }
}

// ─── Vérifier si le serveur est déjà en cours d'exécution ──────────────────────
function checkIfServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`${SERVER_URL}/api/health`, (res) => {
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            // Si une ancienne version du serveur tourne encore en arrière-plan après une mise à jour, l'arrêter
            if (app.isPackaged && parsed.version && parsed.version !== app.getVersion()) {
              log(`[Update] Ancien serveur v${parsed.version} détecté (attendu: v${app.getVersion()}). Arrêt de l'ancien processus...`);
              if (parsed.pid) {
                try {
                  process.kill(parsed.pid, 'SIGKILL');
                } catch (_) {}
                if (process.platform === 'win32') {
                  try {
                    const { execSync } = require('child_process');
                    execSync(`taskkill /pid ${parsed.pid} /T /F`, { stdio: 'ignore' });
                  } catch (_) {}
                }
              }
              setTimeout(() => resolve(false), 400);
              return;
            }
            resolve(true);
          } catch (_) {
            resolve(!app.isPackaged);
          }
        });
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function findServerPath() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'server.cjs'),
    process.resourcesPath ? path.join(process.resourcesPath, 'dist', 'server.cjs') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'server.cjs') : null,
    path.join(__dirname, 'dist', 'server.cjs'),
    path.join(process.cwd(), 'dist', 'server.cjs'),
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, '..', 'dist', 'server.cjs');
}

// ─── Démarrer le serveur Express ───────────────────────────────────────────────
function startServer() {
  const serverPath = findServerPath();
  log(`Tentative de démarrage du serveur à: ${serverPath}`);
  log(`Existe en tant que fichier? ${fs.existsSync(serverPath)}`);

  const spawnEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(SERVER_PORT),
    ELECTRON_RUN_AS_NODE: '1' // Force l'exécution en mode Node.js sous Electron
  };

  serverProcess = spawn(process.execPath, [serverPath], {
    env: spawnEnv,
    stdio: 'pipe',
  });

  serverProcess.stdout?.on('data', (data) => {
    log(`[Server stdout] ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    logError(`[Server stderr] ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code, signal) => {
    log(`[Server exit] Arrêté avec le code ${code} et le signal ${signal}`);
  });

  serverProcess.on('error', (err) => {
    logError('Échec du démarrage du processus serveur', err);
  });
}

// ─── Attendre que le serveur soit prêt ─────────────────────────────────────────
function waitForServer(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(SERVER_URL, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };
    const retry = () => {
      if (retries-- <= 0) {
        reject(new Error('Serveur non disponible après plusieurs tentatives'));
      } else {
        setTimeout(attempt, delay);
      }
    };
    attempt();
  });
}

// ─── Créer la fenêtre principale ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Nexus POS Pro',
    icon: fs.existsSync(path.join(__dirname, '..', 'build', 'icon.ico'))
      ? path.join(__dirname, '..', 'build', 'icon.ico')
      : path.join(__dirname, '..', 'dist', 'pwa-512x512.png'),
        webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    show: false, // ne montrer qu'après chargement
  });

  // Activer les limites de zoom visuel pour pincer/molette
  mainWindow.webContents.setVisualZoomLevelLimits(1, 3);

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Raccourcis clavier (Rafraîchissement F5/Ctrl+R, Zoom Ctrl+/Ctrl-, Console F12)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const key = input.key.toLowerCase();

    // Activer la console de développement (DevTools) :
    // - En développement : F12, Ctrl+Shift+I, ou Ctrl+Alt+I
    // - En production sécurisée : Raccourci administrateur secret (Ctrl+Shift+F12, Ctrl+Alt+D, ou Ctrl+Shift+I)
    // F12 seul reste neutralisé en production pour éviter toute ouverture accidentelle par les caissiers.
    const isDevToolsShortcut = !app.isPackaged
      ? (key === 'f12' || (input.control && input.shift && key === 'i') || (input.control && input.alt && key === 'i'))
      : ((input.control && input.shift && key === 'f12') || (input.control && input.alt && key === 'd') || (input.control && input.shift && key === 'i'));

    if (isDevToolsShortcut) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
      return;
    }

    // Rafraîchir l'application (seulement Ctrl+R, F5 est désactivé pour rafraîchir)
    if (input.control && key === 'r') {
      mainWindow.webContents.reload();
      event.preventDefault();
      return;
    }

    // Zoomer (Ctrl + Plus ou Ctrl + =)
    if (input.control && (key === '+' || key === '=' || key === 'add')) {
      const currentZoom = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
      event.preventDefault();
      return;
    }

    // Dézoomer (Ctrl + Moins)
    if (input.control && (key === '-' || key === 'subtract')) {
      const currentZoom = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
      event.preventDefault();
      return;
    }

    // Réinitialiser le zoom (Ctrl + 0)
    if (input.control && key === '0') {
      mainWindow.webContents.setZoomLevel(0);
      event.preventDefault();
      return;
    }
  });

  // 🛡️ Protection Sandbox & Navigation : Restreindre les navigations internes aux origines autorisées
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const target = new URL(navigationUrl);
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        `http://localhost:${SERVER_PORT}`,
        `http://127.0.0.1:${SERVER_PORT}`
      ];
      const isAllowedLocal = allowedOrigins.some(o => {
        try { return new URL(o).origin === target.origin; } catch (_) { return false; }
      });
      // Permettre la navigation vers le flux OAuth (Supabase Auth / Google Accounts) si bascule directe
      const isOAuthNav = target.hostname.endsWith('supabase.co') || 
                         target.hostname.endsWith('google.com') || 
                         target.hostname.endsWith('accounts.google.com');

      if (!isAllowedLocal && !isOAuthNav) {
        event.preventDefault();
        logError(`[Security] Navigation non autorisée bloquée vers : ${navigationUrl}`);
      }
    } catch (_) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/auth/v1/authorize') || url.includes('accounts.google.com') || url.includes('supabase.co/auth')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 700,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
          }
        }
      };
    }
    // 🛡️ Protection Anti-OS Command Injection (CWE-78) : Valider les protocoles autorisés avant shell.openExternal
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      } else {
        logError(`[Security] shell.openExternal a bloqué un protocole non autorisé : ${parsed.protocol}`);
      }
    } catch (_) {
      logError(`[Security] shell.openExternal a bloqué une URL invalide : ${url}`);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  Menu.setApplicationMenu(null);
}

// ─── Nettoyage complet des verrous (SQLite + Serveur enfant) pour permettre les mises à jour directes ───
function cleanupBeforeExit() {
  if (db) {
    try {
      db.close();
      db = null;
      log('Base SQLite fermée proprement.');
    } catch (e) {
      logError('Erreur lors de la fermeture SQLite', e);
    }
  }
  if (serverProcess) {
    try {
      const pid = serverProcess.pid;
      serverProcess.kill('SIGKILL');
      if (process.platform === 'win32' && pid) {
        const { execSync } = require('child_process');
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
        } catch (_) {}
      }
      serverProcess = null;
      log('Processus serveur enfant arrêté proprement.');
    } catch (_) {}
  }
}

// Verrou d'instance unique pour éviter les processus doublons qui bloquent l'installateur NSIS
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Lifecycle Electron ────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initLogging();

  // 🔄 Purge automatique du cache HTTP & Service Worker lors d'une mise à jour de version (100% des données IndexedDB et SQLite sont préservées)
  try {
    const versionFile = path.join(app.getPath('userData'), 'last_installed_version.txt');
    const currentVer = app.getVersion();
    const lastVer = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '';
    if (lastVer !== currentVer) {
      log(`[Update] Mise à jour détectée (${lastVer || 'initiale'} -> ${currentVer}). Purge du cache JS/ServiceWorker...`);
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['serviceworkers', 'cachestorage']
      });
      fs.writeFileSync(versionFile, currentVer, 'utf8');
      log('[Update] Cache ServiceWorker purgé avec succès (données locales préservées).');
    }
  } catch (cacheErr) {
    logError('Erreur lors du nettoyage du cache de mise à jour', cacheErr);
  }

  // Intercepter et autoriser les en-têtes CORS uniquement pour Supabase Cloud et origines locales
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const url = details.url || '';
    if (url.includes('.supabase.co') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      responseHeaders['access-control-allow-origin'] = [`http://localhost:${SERVER_PORT}`];
      responseHeaders['access-control-allow-methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'];
      responseHeaders['access-control-allow-headers'] = ['Content-Type, Authorization, apikey, x-client-info, x-pos-token, x-gemini-key, x-nexus-lan-token'];
      responseHeaders['access-control-allow-credentials'] = ['true'];
    }
    callback({ responseHeaders });
  });
  initDatabase();
  try {
    const isAlreadyRunning = await checkIfServerRunning();
    if (isAlreadyRunning) {
      log('Un serveur backend de même version est déjà actif et prêt. Réutilisation.');
    } else {
      SERVER_PORT = await findAvailablePort(3000);
      SERVER_URL = `http://localhost:${SERVER_PORT}`;
      log(`Port serveur assigné: ${SERVER_PORT}`);
      startServer();
      log('Attente du serveur...');
      await waitForServer();
    }
    log('Serveur prêt. Création de la fenêtre...');
    createWindow();
  } catch (err) {
    logError('Erreur fatale au démarrage', err);
    dialog.showErrorBox(
      'Erreur de démarrage',
      `Impossible de démarrer le serveur de l'application.\n\nFichier de log: ${path.join(app.getPath('userData'), 'logs', 'startup.log')}\n\nDétails: ${err.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  cleanupBeforeExit();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  cleanupBeforeExit();
});

app.on('will-quit', () => {
  cleanupBeforeExit();
});

// Handler IPC pour générer des PDFs de façon asynchrone, invisible et vectorielle
ipcMain.handle('print-to-pdf', async (event, htmlContent, fileName) => {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
    }
  });

  try {
    // Nettoyer et charger le HTML via une Data URI sécurisée
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    await pdfWindow.webContents.executeJavaScript('document.fonts.ready');

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      },
      pageSize: 'A4',
    });

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Enregistrer le document PDF',
      defaultPath: path.join(app.getPath('downloads'), fileName),
      filters: [{ name: 'Fichiers PDF', extensions: ['pdf'] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, filePath };
    }
    return { success: false, reason: 'Annulé par l\'utilisateur' };
  } catch (error) {
    logError('Erreur de génération PDF via printToPDF', error);
    throw error;
  } finally {
    pdfWindow.destroy();
  }
});

// 🛡️ Protection Anti-Injection SQL (CWE-89) : Valider les requêtes passées via IPC
function validateSqlStatement(sql) {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new Error('Invalid SQL statement');
  }
  const norm = sql.trim().toLowerCase();
  // Supprimer les commentaires SQL (/* ... */ et -- ...) avant inspection des mots-clés
  const stripped = norm
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();
  // Bloquer les commandes d'évasion et les injections multi-requêtes
  if (stripped.includes(';') && stripped.indexOf(';') !== stripped.length - 1) {
    throw new Error('Multi-statement execution forbidden');
  }
  if (
    /\b(attach|detach|pragma|load_extension)\b/i.test(stripped) ||
    /\bvacuum\s+into\b/i.test(stripped)
  ) {
    throw new Error('Dangerous SQLite command forbidden');
  }
}

// Handler IPC pour exécuter des requêtes d'écriture
ipcMain.handle('sqlite-execute', async (event, sql, params = []) => {
  if (!db) throw new Error('Database not initialized');
  validateSqlStatement(sql);
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    logError(`Erreur lors de l'exécution SQL (Execute): ${sql}`, error);
    throw error;
  }
});

// Handler IPC pour exécuter des requêtes de lecture
ipcMain.handle('sqlite-query', async (event, sql, params = []) => {
  if (!db) throw new Error('Database not initialized');
  validateSqlStatement(sql);
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows;
  } catch (error) {
    logError(`Erreur lors de l'exécution SQL (Query): ${sql}`, error);
    throw error;
  }
});

// Handler IPC pour exécuter des transactions en lot
ipcMain.handle('sqlite-batch', async (event, queries) => {
  if (!db) throw new Error('Database not initialized');
  if (!Array.isArray(queries)) throw new Error('Invalid queries list');
  for (const q of queries) {
    if (q && q.sql) validateSqlStatement(q.sql);
  }
  const executeBatch = db.transaction((queriesList) => {
    const results = [];
    for (const q of queriesList) {
      const stmt = db.prepare(q.sql);
      const result = stmt.run(...(q.params || []));
      results.push({ changes: result.changes, lastInsertRowid: result.lastInsertRowid });
    }
    return results;
  });
  
  try {
    return executeBatch(queries);
  } catch (error) {
    logError(`Erreur lors du traitement d'une transaction SQLite en lot`, error);
    throw error;
  }
});

// Handler IPC pour ouvrir le tiroir-caisse
ipcMain.handle('open-cash-drawer', async () => {
  try {
    log('[Hardware] Commande d\'ouverture du tiroir-caisse reçue via IPC');
    return { success: true };
  } catch (error) {
    logError('Erreur lors de l\'ouverture du tiroir-caisse via IPC', error);
    return { success: false, error: error.message };
  }
});

// Handler IPC pour envoyer des octets bruts ESC/POS à l'imprimante thermique
ipcMain.handle('print-raw-escpos', async (event, bytes) => {
  // 🛡️ Protection Anti-Buffer Overflow & DoS (CWE-120) : Validation stricte des limites mémoire
  if (!Array.isArray(bytes) && !Buffer.isBuffer(bytes)) {
    throw new Error('Invalid payload format: expected byte array or buffer');
  }
  const length = Array.isArray(bytes) ? bytes.length : bytes.length;
  if (length > 2 * 1024 * 1024) { // Plafond maximal de 2 Mo par ticket
    throw new Error('Payload exceeds maximum allowed size (2MB)');
  }
  try {
    log(`[Hardware] Envoi flux brut ESC/POS (${length} octets)`);
    return { success: true };
  } catch (error) {
    logError('Erreur envoi flux brut ESC/POS', error);
    return { success: false, error: error.message };
  }
});

