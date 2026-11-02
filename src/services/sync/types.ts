export type SyncAction = 'UPSERT' | 'DELETE' | 'insert' | 'update' | 'delete' | 'upsert';

export interface SyncPayload {
  table: string;
  recordId: string;
  action: SyncAction;
  payload: any;
  retryCount?: number;
  opId?: string;
}

export type SyncStatusCallback = (status: {
  isSyncing: boolean;
  pendingCount: number;
  progress?: number;
  currentTable?: string;
}) => void;
