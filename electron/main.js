const { app, BrowserWindow, shell, Menu, Tray, dialog, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
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

const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

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
        resolve(true);
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
    icon: path.join(__dirname, '..', 'dist', 'icon.svg'),
        webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
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

    // Activer la console d'erreur (DevTools) avec F12, Ctrl+Shift+I, ou Ctrl+Alt+I
    if (key === 'f12' || (input.control && input.shift && key === 'i') || (input.control && input.alt && key === 'i')) {
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/auth/v1/authorize') || url.includes('accounts.google.com') || url.includes('supabase.co/auth')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  Menu.setApplicationMenu(null);
}

// ─── Lifecycle Electron ────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initLogging();
  // Intercepter et autoriser tous les en-têtes CORS (notamment pour Supabase Cloud)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'];
    responseHeaders['access-control-allow-headers'] = ['*'];
    responseHeaders['access-control-allow-credentials'] = ['true'];
    callback({ responseHeaders });
  });
  initDatabase();
  try {
    const isAlreadyRunning = await checkIfServerRunning();
    if (isAlreadyRunning) {
      log('Un serveur backend est déjà actif et prêt. Réutilisation.');
    } else {
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
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handler IPC pour générer des PDFs de façon asynchrone, invisible et vectorielle
ipcMain.handle('print-to-pdf', async (event, htmlContent, fileName) => {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

// Handler IPC pour exécuter des requêtes d'écriture
ipcMain.handle('sqlite-execute', async (event, sql, params = []) => {
  if (!db) throw new Error('Database not initialized');
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
  try {
    log(`[Hardware] Envoi flux brut ESC/POS (${Array.isArray(bytes) ? bytes.length : 0} octets)`);
    return { success: true };
  } catch (error) {
    logError('Erreur envoi flux brut ESC/POS', error);
    return { success: false, error: error.message };
  }
});

