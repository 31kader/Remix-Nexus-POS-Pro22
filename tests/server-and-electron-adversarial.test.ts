import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';

describe('Adversarial & Empirical Tests: Server & Electron Configuration', () => {

  describe('1. Express Server Query & Body Parsing (CWE-476, CWE-770, Prototype Pollution)', () => {
    // Configuration identique à server.ts lignes 107 et 141
    const createTestApp = () => {
      const app = express();
      app.set('query parser', 'simple');
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ limit: '50mb', extended: false }));

      app.get('/api/test-query', (req, res) => {
        res.json({
          query: req.query,
          keys: Object.keys(req.query),
          isNested: typeof req.query.a === 'object' && req.query.a !== null
        });
      });

      app.post('/api/test-urlencoded', (req, res) => {
        res.json({
          body: req.body,
          keys: Object.keys(req.body),
          isNested: typeof req.body.a === 'object' && req.body.a !== null
        });
      });

      return app;
    };

    it('neutralise la création d’objets imbriqués lors de l’injection de paramètres d’URL complexes (a[b][c]=d)', async () => {
      const app = createTestApp();
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const response = await fetch(`http://localhost:${port}/api/test-query?a[b][c]=d&user[role]=admin&counter[val]=42`);
        const json = await response.json();

        // Vérification empirique : 'querystring' conserve la clé littérale brute
        expect(json.isNested).toBe(false);
        expect(json.query['a[b][c]']).toBe('d');
        expect(json.query['user[role]']).toBe('admin');
        expect(json.query['counter[val]']).toBe('42');
        // 'a' ne doit pas être un objet imbriqué
        expect(json.query.a).toBeUndefined();
        expect(json.query.user).toBeUndefined();
      } finally {
        server.close();
      }
    });

    it('résiste aux tentatives de Prototype Pollution via query string sans polluer Object.prototype', async () => {
      const app = createTestApp();
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const payload = '__proto__[polluted]=evil&constructor[prototype][hacked]=true&__proto__.admin=true';
        const response = await fetch(`http://localhost:${port}/api/test-query?${payload}`);
        const json = await response.json();

        // Vérifier l'absence de pollution de prototype
        expect((Object.prototype as any).polluted).toBeUndefined();
        expect((Object.prototype as any).hacked).toBeUndefined();
        expect((Object.prototype as any).admin).toBeUndefined();

        // Vérifier que les clés sont traitées comme de simples chaînes plates
        expect(json.query['__proto__[polluted]']).toBe('evil');
        expect(json.query['constructor[prototype][hacked]']).toBe('true');
      } finally {
        server.close();
      }
    });

    it('résiste aux injections d’index massifs (Array DoS) sans allouer de tableaux gigantesques', async () => {
      const app = createTestApp();
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        // Dans qs, un index de 100000 pouvait provoquer une allocation démesurée
        const response = await fetch(`http://localhost:${port}/api/test-query?arr[999999]=test`);
        const json = await response.json();

        expect(Array.isArray(json.query.arr)).toBe(false);
        expect(json.query['arr[999999]']).toBe('test');
      } finally {
        server.close();
      }
    });

    it('applique le parseur simple et extended: false sur le corps x-www-form-urlencoded', async () => {
      const app = createTestApp();
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const response = await fetch(`http://localhost:${port}/api/test-urlencoded`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'a[nested][field]=value&__proto__[polluted]=true&role[isAdmin]=true'
        });
        const json = await response.json();

        expect(json.isNested).toBe(false);
        expect(json.body['a[nested][field]']).toBe('value');
        expect(json.body.a).toBeUndefined();
        expect((Object.prototype as any).polluted).toBeUndefined();
      } finally {
        server.close();
      }
    });

    it('vérifie la présence explicite des directives dans le fichier server.ts source', () => {
      const serverCode = fs.readFileSync(path.resolve(__dirname, '../server.ts'), 'utf-8');
      
      // Doit contenir query parser simple
      expect(serverCode).toMatch(/app\.set\(\s*['"]query parser['"]\s*,\s*['"]simple['"]\s*\)/);
      // Doit contenir urlencoded avec extended: false
      expect(serverCode).toMatch(/express\.urlencoded\(\s*\{[^}]*extended:\s*false[^}]*\}\s*\)/);
    });
  });

  describe('2. Electron Navigation Security (will-navigate & URL filtering)', () => {
    // Fonction exacte de validation extraite de electron/main.js
    const simulateWillNavigate = (navigationUrl: string): { allowed: boolean; reason?: string } => {
      try {
        const target = new URL(navigationUrl);
        const allowedOrigins = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5173',
          'http://127.0.0.1:5173'
        ];
        if (!allowedOrigins.includes(target.origin)) {
          return { allowed: false, reason: 'Origin not in allowedOrigins' };
        }
        return { allowed: true };
      } catch (err) {
        return { allowed: false, reason: 'Invalid URL exception' };
      }
    };

    it('autorise les URL d’origine locale légitimes', () => {
      expect(simulateWillNavigate('http://localhost:3000/').allowed).toBe(true);
      expect(simulateWillNavigate('http://localhost:3000/pos/caisse').allowed).toBe(true);
      expect(simulateWillNavigate('http://127.0.0.1:3000/api/health').allowed).toBe(true);
      expect(simulateWillNavigate('http://localhost:5173/').allowed).toBe(true);
      expect(simulateWillNavigate('http://127.0.0.1:5173/admin').allowed).toBe(true);
    });

    it('bloque les tentatives d’usurpation de sous-domaine (subdomain bypass)', () => {
      expect(simulateWillNavigate('http://localhost:3000.evil.com/').allowed).toBe(false);
      expect(simulateWillNavigate('http://localhost.evil.com:3000/').allowed).toBe(false);
      expect(simulateWillNavigate('http://127.0.0.1.attacker.com:3000/').allowed).toBe(false);
    });

    it('bloque les tentatives de contournement via credentials (@)', () => {
      expect(simulateWillNavigate('http://localhost:3000@evil.com/').allowed).toBe(false);
      expect(simulateWillNavigate('http://user:password@evil.com/localhost:3000').allowed).toBe(false);
    });

    it('bloque les protocoles dangereux (javascript:, data:, file:, vbscript:)', () => {
      expect(simulateWillNavigate('javascript:alert(1)').allowed).toBe(false);
      expect(simulateWillNavigate('data:text/html,<script>evil()</script>').allowed).toBe(false);
      expect(simulateWillNavigate('file:///C:/Windows/System32/cmd.exe').allowed).toBe(false);
      expect(simulateWillNavigate('vbscript:msgbox(1)').allowed).toBe(false);
    });

    it('bloque les ports non autorisés sur localhost', () => {
      expect(simulateWillNavigate('http://localhost:8080/').allowed).toBe(false);
      expect(simulateWillNavigate('http://localhost:3001/').allowed).toBe(false);
      expect(simulateWillNavigate('http://localhost/').allowed).toBe(false); // Port 80 par défaut
      expect(simulateWillNavigate('https://localhost:3000/').allowed).toBe(false); // HTTPS non défini dans la liste
    });

    it('rejette les URL invalides ou malformées sans planter', () => {
      expect(simulateWillNavigate('not-a-valid-url').allowed).toBe(false);
      expect(simulateWillNavigate('http://').allowed).toBe(false);
      expect(simulateWillNavigate('://localhost:3000').allowed).toBe(false);
      expect(simulateWillNavigate('').allowed).toBe(false);
    });

    it('vérifie la présence du durcissement sandbox et webviewTag dans electron/main.js', () => {
      const electronMainCode = fs.readFileSync(path.resolve(__dirname, '../electron/main.js'), 'utf-8');

      // Vérifier sandbox: true
      expect(electronMainCode).toContain('sandbox: true');
      // Vérifier webviewTag: false
      expect(electronMainCode).toContain('webviewTag: false');
      // Vérifier nodeIntegration: false
      expect(electronMainCode).toContain('nodeIntegration: false');
      // Vérifier contextIsolation: true
      expect(electronMainCode).toContain('contextIsolation: true');
      // Vérifier will-navigate handler
      expect(electronMainCode).toContain('will-navigate');
    });
  });

  describe('3. Shell Open External & Protocols Validation (CWE-78)', () => {
    const simulateShellOpenHandler = (url: string): { action: 'allow' | 'deny'; openedExternally: boolean } => {
      if (url.includes('/auth/v1/authorize') || url.includes('accounts.google.com') || url.includes('supabase.co/auth')) {
        return { action: 'allow', openedExternally: false };
      }
      try {
        const parsed = new URL(url);
        if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
          return { action: 'deny', openedExternally: true };
        } else {
          return { action: 'deny', openedExternally: false };
        }
      } catch (_) {
        return { action: 'deny', openedExternally: false };
      }
    };

    it('autorise les URL d’authentification OAuth dans le popup dédié', () => {
      expect(simulateShellOpenHandler('https://unlwfvldqxfccgrrgbwf.supabase.co/auth/v1/authorize?provider=google').action).toBe('allow');
      expect(simulateShellOpenHandler('https://accounts.google.com/o/oauth2/v2/auth').action).toBe('allow');
    });

    it('n’ouvre dans le navigateur externe QUE les protocoles sûrs (http, https, mailto)', () => {
      expect(simulateShellOpenHandler('https://google.com').openedExternally).toBe(true);
      expect(simulateShellOpenHandler('http://external-partner.com').openedExternally).toBe(true);
      expect(simulateShellOpenHandler('mailto:contact@nexuspos.com').openedExternally).toBe(true);
    });

    it('bloque les protocoles système dangereux pour éviter toute injection de commande OS', () => {
      expect(simulateShellOpenHandler('cmd.exe /c calc').openedExternally).toBe(false);
      expect(simulateShellOpenHandler('powershell://run').openedExternally).toBe(false);
      expect(simulateShellOpenHandler('file:///C:/Windows/System32/calc.exe').openedExternally).toBe(false);
      expect(simulateShellOpenHandler('ms-msdt:/id PCWDiagnostic').openedExternally).toBe(false);
      expect(simulateShellOpenHandler('javascript:alert(1)').openedExternally).toBe(false);
    });
  });
});
