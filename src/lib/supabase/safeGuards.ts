type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

const IGNORABLE_CODES = new Set([
  'PGRST204', // Column not found / schema cache mismatch
  'PGRST205', // Table/resource not found
]);

export type SupabaseErrorClassification = 'MISSING_TABLE_OR_VIEW' | 'SCHEMA_MISMATCH' | 'NETWORK_ERROR' | 'PERMISSION_DENIED' | 'OTHER';

export function classifySupabaseError(error: unknown): SupabaseErrorClassification {
  if (!error || typeof error !== 'object') return 'OTHER';
  const e = error as SupabaseLikeError;
  const msg = (e.message || '').toLowerCase();
  
  if (e.code === 'PGRST205' || e.status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('does not exist') || e.code === '42P01') {
    return 'MISSING_TABLE_OR_VIEW';
  }
  if (e.code === 'PGRST204') {
    return 'SCHEMA_MISMATCH';
  }
  if (msg.includes('jwt') || msg.includes('permission denied') || e.code === '42501') {
    return 'PERMISSION_DENIED';
  }
  if (e.code === 'OFFLINE_ERR' || msg.includes('offline') || msg.includes('failed to fetch') || msg.includes('network')) {
    return 'NETWORK_ERROR';
  }
  return 'OTHER';
}

export function isIgnorableSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const e = error as SupabaseLikeError;
  const msg = (e.message || '').toLowerCase();
  
  // PostgREST error codes
  if (e.code && IGNORABLE_CODES.has(e.code)) return true;
  
  // HTTP status 404 (Not Found)
  if (e.status === 404) return true;
  if (msg.includes('404')) return true;
  if (msg.includes('not found')) return true;
  
  // Optional auth-related bypasses for non-critical features e.g. Row Level Security issues
  if (msg.includes('jwt') || msg.includes('permission denied')) {
    return true;
  }
  
  return false;
}
