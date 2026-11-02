import { UserProfile } from '../../../types';
import { localDb } from '../../../services/LocalDatabase';

interface UsePeopleDataFetcherParams {
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}

export function usePeopleDataFetcher({ setUsers }: UsePeopleDataFetcherParams) {
  const loadLocalUsersFallback = async () => {
    try {
      const snap = await localDb.get('users');
      if (snap?.exists() && snap.val()) {
        const vals = Object.values(snap.val()).map((u: any) => {
          if (!u || typeof u !== 'object') return u;
          const { password, passwordHash, password_hash, pin, ...rest } = u;
          return rest;
        });
        if (vals.length > 0) setUsers(vals as any);
      }
    } catch (_) {}
  };

  return { loadLocalUsersFallback };
}
