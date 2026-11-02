/**
 * Nexus POS Pro — Types de Synchronisation Réseau Local (LAN) Multi-Caisses
 * Gère le fonctionnement hybride simultané (Ethernet/Wi-Fi + Cloud Supabase)
 */

export type LanRole = 'STANDALONE' | 'MASTER' | 'SECONDARY';

export type LanSyncAction = 
  | 'STOCK_ADJUSTMENT'
  | 'TRANSACTION_NEW'
  | 'TRANSACTION_UPDATE'
  | 'CUSTOMER_BALANCE_UPDATE'
  | 'CATALOG_SYNC_REQUEST'
  | 'CATALOG_SYNC_RESPONSE'
  | 'HEARTBEAT';

export type HybridNetworkMode = 
  | 'LAN_AND_CLOUD'      // Câble LAN branché + Internet actif (Synchro locale ultra-rapide + Cloud backup)
  | 'LAN_ONLY'           // Câble LAN branché SANS Internet (Synchro directe entre caisses 100% opérationnelle)
  | 'CLOUD_ONLY'         // Câble débranché AVEC Internet (Synchro via Supabase Cloud)
  | 'OFFLINE_ISOLATED';  // Ni Câble ni Internet (Encaissement autonome local garanti)

export interface LanSyncMessage<T = any> {
  id: string;                      // Identifiant unique de message (anti-doublon)
  originTerminalId: string;        // ID de la caisse émettrice (ex: POS-01)
  originTerminalName: string;      // Nom convivial de la caisse
  action: LanSyncAction;           // Type d'opération
  timestamp: string;               // Horodatage ISO
  payload: T;                      // Données relatives à l'opération
  version?: string;                // Version logicielle
  lanToken?: string;               // Jeton d'authentification réseau local
}

export interface LanTerminalInfo {
  terminalId: string;
  terminalName: string;
  role: LanRole;
  ip?: string;
  connectedAt: string;
  lastSeen: string;
  isOnline: boolean;
  version?: string;
}

export interface LanStockAdjustmentPayload {
  productId: string;
  adjustment: number;
  delta?: number;
  mode?: 'delta' | 'set';
  adjustmentId?: string;
  reason?: string;
  userId?: string;
  userName?: string;
  newQuantity?: number;
  isLoss?: boolean;
  timestamp?: string;
}

export interface LanCustomerBalancePayload {
  customerId: string;
  deltaBalance: number;
  deltaSpent: number;
  deltaPoints: number;
  timestamp?: string;
}

export interface LanSyncState {
  role: LanRole;
  masterIp: string;
  masterPort: number;
  lanToken: string;
  isLanConnected: boolean;
  isInternetConnected: boolean;
  hybridMode: HybridNetworkMode;
  connectedPeers: LanTerminalInfo[];
  lastSyncTimestamp: string | null;
  pendingOutgoingCount: number;
  latencyMs: number | null;
}
