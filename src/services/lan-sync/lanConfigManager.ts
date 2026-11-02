import { LanRole } from '../../types/lanSync';
import { DEFAULT_PORT, DEFAULT_LAN_TOKEN } from './lanSyncConstants';
import {
  loadStoredConfig,
  saveStoredRole,
  saveStoredMasterIp,
  saveStoredMasterPort,
  saveStoredLanToken
} from './lanSyncStorage';

export class LanConfigManager {
  public currentRole: LanRole = 'STANDALONE';
  public masterIp: string = '';
  public masterPort: number = DEFAULT_PORT;
  public lanToken: string = DEFAULT_LAN_TOKEN;

  constructor() {
    this.reload();
  }

  public reload(): void {
    const config = loadStoredConfig();
    this.currentRole = config.currentRole;
    this.masterIp = config.masterIp;
    this.masterPort = config.masterPort;
    this.lanToken = config.lanToken;
  }

  public setRole(role: LanRole): boolean {
    if (this.currentRole === role) return false;
    this.currentRole = role;
    saveStoredRole(role);
    return true;
  }

  public setMasterIp(ip: string): boolean {
    const cleanIp = ip.trim();
    if (this.masterIp === cleanIp) return false;
    this.masterIp = cleanIp;
    saveStoredMasterIp(cleanIp);
    return true;
  }

  public setMasterPort(port: number): boolean {
    if (this.masterPort === port) return false;
    this.masterPort = port;
    saveStoredMasterPort(port);
    return true;
  }

  public setLanToken(token: string): boolean {
    const cleanToken = (token || DEFAULT_LAN_TOKEN).trim();
    if (this.lanToken === cleanToken) return false;
    this.lanToken = cleanToken;
    saveStoredLanToken(cleanToken);
    return true;
  }
}
