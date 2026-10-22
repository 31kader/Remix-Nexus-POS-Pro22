/**
 * Helper to get the correct API URL.
 * When running in Capacitor (Android/iOS), we use the production URL.
 * When running in Electron via file://, we target localhost:3000.
 * In standard web / dev proxy, relative paths work directly.
 */
export const getApiUrl = (path: string) => {
  const isCapacitorNative = typeof window !== 'undefined' && 
    (window as any).Capacitor?.isNativePlatform?.() === true;
  
  if (isCapacitorNative) {
    const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${cleanBase}/${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:') {
      const cleanPath = path.replace(/^\//, '');
      return `http://localhost:3000/${cleanPath}`;
    }
  }
  
  return path;
};
