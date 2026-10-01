import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Jalon M3 — Durcissement des En-têtes HTTP de Sécurité & CSP', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. vercel.json configure des en-têtes de sécurité stricts pour /(.*)', () => {
    const vercelPath = path.join(rootDir, 'vercel.json');
    expect(fs.existsSync(vercelPath)).toBe(true);

    const content = fs.readFileSync(vercelPath, 'utf-8');
    const json = JSON.parse(content);
    expect(json).toBeTypeOf('object');
    expect(Array.isArray(json.headers)).toBe(true);

    const rootHeadersConfig = json.headers.find((h: any) => h.source === '/(.*)');
    expect(rootHeadersConfig).toBeDefined();

    const headersMap = new Map<string, string>();
    rootHeadersConfig.headers.forEach((item: { key: string; value: string }) => {
      headersMap.set(item.key.toLowerCase(), item.value);
    });

    // Anti-clickjacking
    expect(headersMap.get('x-frame-options')).toBe('DENY');

    // Anti MIME-sniffing
    expect(headersMap.get('x-content-type-options')).toBe('nosniff');

    // HSTS
    expect(headersMap.get('strict-transport-security')).toContain('max-age=31536000');
    expect(headersMap.get('strict-transport-security')).toContain('includeSubDomains');
    expect(headersMap.get('strict-transport-security')).toContain('preload');

    // Referrer
    expect(headersMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

    // Permissions-Policy (caméra autorisée pour scanner POS, autres restreints)
    const permissionsPolicy = headersMap.get('permissions-policy');
    expect(permissionsPolicy).toContain('camera=(self)');
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('geolocation=()');
    expect(permissionsPolicy).toContain('payment=()');
    expect(permissionsPolicy).toContain('usb=()');

    // CSP
    const csp = headersMap.get('content-security-policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com data:");
    expect(csp).toContain("img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co https://world.openfoodfacts.org https://generativelanguage.googleapis.com https://api.groq.com https://openrouter.ai ws://localhost:* http://localhost:* http://127.0.0.1:* ws://127.0.0.1:*");
    expect(csp).toContain("media-src 'self' blob: data:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('2. netlify.toml configure la section [[headers]] pour /*', () => {
    const netlifyPath = path.join(rootDir, 'netlify.toml');
    expect(fs.existsSync(netlifyPath)).toBe(true);

    const content = fs.readFileSync(netlifyPath, 'utf-8');
    expect(content).toContain('[[headers]]');
    expect(content).toContain('for = "/*"');
    expect(content).toContain('X-Frame-Options = "DENY"');
    expect(content).toContain('X-Content-Type-Options = "nosniff"');
    expect(content).toContain('Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"');
    expect(content).toContain('Referrer-Policy = "strict-origin-when-cross-origin"');
    expect(content).toContain('Permissions-Policy = "camera=(self), microphone=(), geolocation=(), payment=(), usb=()"');
    expect(content).toContain('Content-Security-Policy = "');
    expect(content).toContain("default-src 'self'");
    expect(content).toContain("https://*.supabase.co");
    expect(content).toContain("camera=(self)");
  });

  it('3. server.ts applique les en-têtes durcis via son middleware de sécurité', () => {
    const serverPath = path.join(rootDir, 'server.ts');
    expect(fs.existsSync(serverPath)).toBe(true);

    const content = fs.readFileSync(serverPath, 'utf-8');
    expect(content).toContain("res.setHeader('X-Frame-Options', 'DENY')");
    expect(content).toContain("res.setHeader('X-Content-Type-Options', 'nosniff')");
    expect(content).toContain("res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')");
    expect(content).toContain("res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()')");
    expect(content).toContain("res.setHeader(\n        'Content-Security-Policy'");
    expect(content).toContain("default-src 'self'");
    expect(content).toContain("if (req.secure || req.headers['x-forwarded-proto'] === 'https')");
    expect(content).toContain("res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')");
  });

  it('4. index.html intègre la balise meta Content-Security-Policy en défense en profondeur', () => {
    const indexPath = path.join(rootDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(content).toContain("default-src 'self'");
    expect(content).toContain("https://*.supabase.co");
    expect(content).toContain("https://world.openfoodfacts.org");
    expect(content).toContain("https://generativelanguage.googleapis.com");
    // Doit impérativement omettre frame-ancestors dans la balise meta (non supporté par spec W3C)
    const metaMatch = content.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
    expect(metaMatch).not.toBeNull();
    const metaCsp = metaMatch![1];
    expect(metaCsp).not.toContain('frame-ancestors');
  });
});
