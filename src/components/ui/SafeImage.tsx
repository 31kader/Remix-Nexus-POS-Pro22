import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLocalImage, cacheImage, evictObjectUrl, getCanonicalCacheUrl } from '../../services/imageCache';
import { getOptimizedImageUrl } from '../../lib/image-optimizer';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  containerClassName?: string;
  optimizeWidth?: number;
}

export const isBadUrl = (url: any): boolean => {
  if (typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return (
    u.includes('aistudio.google.com') ||
    u.includes('/aistudio/') ||
    (u.includes('/_/') && u.includes('/upload/') && u.includes('/file/')) ||
    u.includes('eb137f4a-fb23-4b8c-aec9-844aecbc242a')
  );
};

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  fallback,
  containerClassName,
  optimizeWidth = 300,
  ...props
}) => {
  const [error, setError] = useState(false);
  const isRemote =
    typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(isRemote ? undefined : src);

  useEffect(() => {
    let active = true;
    setError(false);

    if (src && !isBadUrl(src)) {
      if (!isRemote) {
        setDisplaySrc(src);
        return;
      }

      const canonicalSrc = getCanonicalCacheUrl(getOptimizedImageUrl(src, optimizeWidth));

      // 1. Vérifier d'abord le cache local IndexedDB / mémoire (0 octet d'Egress Supabase)
      getLocalImage(canonicalSrc)
        .then((cachedUrl) => {
          if (!active) return;
          if (cachedUrl) {
            setDisplaySrc(cachedUrl);
            return;
          }

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setError(true);
            return;
          }

          // 2. Si absent du cache local : télécharger UNE SEULE FOIS via cacheImage()
          // (mutualisé via inFlightRequests) et afficher le blob: local obtenu.
          // Ceci élimine le double téléchargement simultané (<img src> + fetch()).
          cacheImage(canonicalSrc)
            .then((blobUrl) => {
              if (!active) return;
              if (blobUrl) {
                setDisplaySrc(blobUrl);
              } else {
                // Repli uniquement si fetch CORS a échoué (ex: domaine externe tiers)
                setDisplaySrc(canonicalSrc);
              }
            })
            .catch(() => {
              if (active) setDisplaySrc(canonicalSrc);
            });
        })
        .catch(() => {
          if (active) setError(true);
        });
    } else {
      setDisplaySrc(src);
    }

    return () => {
      active = false;
    };
  }, [src, optimizeWidth, isRemote]);

  const handleImageError = () => {
    if (displaySrc && displaySrc.startsWith('blob:') && src) {
      const canonicalSrc = getCanonicalCacheUrl(getOptimizedImageUrl(src, optimizeWidth));
      evictObjectUrl(canonicalSrc);
      getLocalImage(canonicalSrc, true)
        .then((freshBlobUrl) => {
          if (freshBlobUrl) {
            setDisplaySrc(freshBlobUrl);
          } else if (typeof navigator === 'undefined' || navigator.onLine) {
            setDisplaySrc(canonicalSrc);
          } else {
            setError(true);
          }
        })
        .catch(() => setError(true));
      return;
    }

    setError(true);
  };

  if (!displaySrc || isBadUrl(displaySrc) || error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg',
          containerClassName || className
        )}
      >
        {fallback || <Package className="text-slate-400" size={24} />}
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={handleImageError}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};
