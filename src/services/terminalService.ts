/**
 * Service de Gestion Multi-Postes (Terminal ID)
 * Permet d'isoler les sessions de caisse, les clôtures Z et les ventes par poste physique
 */

const TERMINAL_ID_STORAGE_KEY = 'nexus_terminal_id';
const TERMINAL_NAME_STORAGE_KEY = 'nexus_terminal_name';

export interface TerminalInfo {
  id: string;
  name: string;
}

export function getTerminalId(): string {
  if (typeof window === 'undefined') return 'POS-01';
  try {
    let id = localStorage.getItem(TERMINAL_ID_STORAGE_KEY);
    if (!id || id.trim() === '') {
      id = 'POS-01';
      localStorage.setItem(TERMINAL_ID_STORAGE_KEY, id);
    }
    return id.toUpperCase();
  } catch {
    return 'POS-01';
  }
}

export function getTerminalName(): string {
  if (typeof window === 'undefined') return 'Caisse Principale';
  try {
    let name = localStorage.getItem(TERMINAL_NAME_STORAGE_KEY);
    if (!name || name.trim() === '') {
      name = 'Caisse Principale';
      localStorage.setItem(TERMINAL_NAME_STORAGE_KEY, name);
    }
    return name;
  } catch {
    return 'Caisse Principale';
  }
}

export function getTerminalInfo(): TerminalInfo {
  return {
    id: getTerminalId(),
    name: getTerminalName()
  };
}

export function setTerminalInfo(id: string, name?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanId = (id || 'POS-01').trim().toUpperCase();
    localStorage.setItem(TERMINAL_ID_STORAGE_KEY, cleanId);
    if (name !== undefined) {
      localStorage.setItem(TERMINAL_NAME_STORAGE_KEY, name.trim() || `Caisse ${cleanId}`);
    }
    window.dispatchEvent(new CustomEvent('nexus-terminal-changed', {
      detail: { id: cleanId, name: name || `Caisse ${cleanId}` }
    }));
  } catch (e) {
    console.error('[TerminalService] Impossible d\'enregistrer le terminal:', e);
  }
}
