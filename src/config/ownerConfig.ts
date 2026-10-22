export const OWNER_EMAILS: string[] = [
  (import.meta.env.VITE_OWNER_EMAIL || '').toLowerCase().trim(),
  (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean);

export const OWNER_UIDS: string[] = [
  import.meta.env.VITE_OWNER_UID || '',
].filter(Boolean);

export const PRIMARY_OWNER_EMAIL = OWNER_EMAILS[0] || '';
export const PRIMARY_OWNER_UID = OWNER_UIDS[0] || '';

export function checkIsOwner(email?: string | null, uid?: string | null): boolean {
  if (!email && !uid) return false;
  const cleanEmail = (email || '').toLowerCase().trim();
  if (cleanEmail && OWNER_EMAILS.includes(cleanEmail)) return true;
  if (uid && OWNER_UIDS.includes(uid)) return true;
  return false;
}

