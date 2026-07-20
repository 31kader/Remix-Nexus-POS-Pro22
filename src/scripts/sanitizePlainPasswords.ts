import bcrypt from 'bcryptjs';
import { localDb } from '../services/LocalDatabase';

type TableName = 'users' | 'customers' | 'suppliers';

interface SanitizeStats {
  table: TableName;
  scanned: number;
  updated: number;
}

const TABLES: TableName[] = ['users', 'customers', 'suppliers'];

function isBcryptHash(value: unknown): value is string {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value);
}

export async function sanitizePlainPasswords(): Promise<SanitizeStats[]> {
  const results: SanitizeStats[] = [];

  for (const table of TABLES) {
    const snap = await localDb.get(table);
    const records = (snap.val() || {}) as Record<string, any>;

    let updated = 0;
    const entries = Object.entries(records);

    for (const [key, record] of entries) {
      const plain = typeof record?.password === 'string' ? record.password.trim() : '';
      const existingHash = record?.passwordHash || record?.password_hash || '';

      let nextHash = existingHash;
      if (plain) {
        if (!isBcryptHash(existingHash)) {
          nextHash = bcrypt.hashSync(plain, 10);
        }
      }

      const needsClearPlain = record?.password !== null && record?.password !== undefined && record?.password !== '';
      const needsHashWrite = nextHash && nextHash !== existingHash;

      if (needsClearPlain || needsHashWrite) {
        await localDb.update(`${table}/${key}`, {
          password: null,
          passwordHash: nextHash || existingHash || ''
        });
        updated += 1;
      }
    }

    results.push({ table, scanned: entries.length, updated });
  }

  return results;
}

// Console helper for manual execution from dev tools when needed.
if (typeof window !== 'undefined') {
  (window as any).sanitizePlainPasswords = sanitizePlainPasswords;
}
