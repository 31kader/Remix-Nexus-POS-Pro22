import { isIgnorableSupabaseError } from './safeGuards';

type LoggerMeta = Record<string, unknown>;

function logOptionalWarning(scope: string, error: unknown, meta?: LoggerMeta) {
  console.warn(`[optional:${scope}] ignored`, {
    error,
    ...meta,
  });
}

export async function safeOptionalQuery<T>(
  scope: string,
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  fallback: T | null = null,
  meta?: LoggerMeta
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      if (isIgnorableSupabaseError(error)) {
        logOptionalWarning(scope, error, meta);
        return fallback;
      }
      throw error;
    }
    return data ?? fallback;
  } catch (error) {
    if (isIgnorableSupabaseError(error)) {
      logOptionalWarning(scope, error, meta);
      return fallback;
    }
    throw error;
  }
}

export async function safeOptionalMutation(
  scope: string,
  mutationFn: () => Promise<{ error: unknown }>,
  meta?: LoggerMeta
): Promise<boolean> {
  try {
    const { error } = await mutationFn();
    if (error) {
      if (isIgnorableSupabaseError(error)) {
        logOptionalWarning(scope, error, meta);
        return false;
      }
      throw error;
    }
    return true;
  } catch (error) {
    if (isIgnorableSupabaseError(error)) {
      logOptionalWarning(scope, error, meta);
      return false;
    }
    throw error;
  }
}
