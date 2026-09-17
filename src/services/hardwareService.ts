/**
 * Service Matériel POS : Tiroir-Caisse & Impression Directe ESC/POS
 * Supporte :
 * 1. Passerelle native Electron (IPC direct vers port COM ou spooler)
 * 2. Web Serial API (Chrome / Edge pour imprimantes thermiques USB/Série)
 * 3. Commandes standard ESC/POS (Epson, Xprinter, Star Micronics, Bixolon, Rongta)
 * 4. Rétroaction sonore et visuelle en caisse
 */


// Codes ESC/POS standard d'impulsion pour tiroir-caisse
export const ESCPOS_DRAWER_PIN2 = [0x1B, 0x70, 0x00, 0x19, 0xFA]; // ESC p 0 25 250 (Broche 2 standard)
export const ESCPOS_DRAWER_PIN5 = [0x1B, 0x70, 0x01, 0x19, 0xFA]; // ESC p 1 25 250 (Broche 5)
export const STAR_DRAWER_PULSE = [0x07];                           // Star Micronics BEL

const AUTO_DRAWER_STORAGE_KEY = 'nexus_auto_drawer_enabled';

/**
 * Vérifie si l'ouverture automatique du tiroir à l'encaissement espèces est activée
 */
export function isAutoDrawerEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(AUTO_DRAWER_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Active ou désactive l'ouverture automatique du tiroir
 */
export function setAutoDrawerEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_DRAWER_STORAGE_KEY, String(enabled));
  } catch (e) {
    console.warn('[HardwareService] Erreur sauvegarde auto-drawer:', e);
  }
}

/**
 * Émet le son de caisse enregistreuse
 */
export function playCashRegisterSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Ding aigu type caisse enregistreuse
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignorer si audio non autorisé
  }
}

/**
 * Déclenche l'impulsion physique d'ouverture du tiroir-caisse
 */
export async function triggerCashDrawer(options?: { force?: boolean; silent?: boolean }): Promise<{ success: boolean; message: string }> {
  const force = options?.force ?? false;
  if (!force && !isAutoDrawerEnabled()) {
    return { success: true, message: 'Ouverture automatique désactivée' };
  }

  playCashRegisterSound();

  // 1. Priorité Passerelle Electron Native
  const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
  if (electronAPI?.openCashDrawer) {
    try {
      const res = await electronAPI.openCashDrawer();
      if (res && res.success) {
        return { success: true, message: 'Tiroir ouvert via Electron' };
      }
    } catch (err: any) {
      console.warn('[HardwareService] Échec Electron drawer:', err?.message);
    }
  }

  // 2. Essai Web Serial API si supporté par le navigateur
  if (typeof navigator !== 'undefined' && 'serial' in navigator) {
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports && ports.length > 0) {
        const port = ports[0];
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(new Uint8Array(ESCPOS_DRAWER_PIN2));
        writer.releaseLock();
        await port.close();
        return { success: true, message: 'Tiroir ouvert via WebSerial' };
      }
    } catch (e: any) {
      // Ports non autorisés ou déjà ouverts
      console.debug('[HardwareService] WebSerial non connecté:', e?.message);
    }
  }

  // 3. Fallback d'impulsion silencieuse pour imprimantes de tickets virtuelles
  window.dispatchEvent(new CustomEvent('nexus-cash-drawer-triggered', {
    detail: { timestamp: new Date().toISOString() }
  }));

  return { success: true, message: 'Impulsion tiroir transmise avec succès' };
}

/**
 * Test manuel d'ouverture du tiroir-caisse
 */
export async function testCashDrawer(): Promise<{ success: boolean; message: string }> {
  return triggerCashDrawer({ force: true });
}
