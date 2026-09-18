import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLocalImage, cacheImage } from '../../services/imageCache';
import { getOptimizedImageUrl } from '../../lib/image-optimizer';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  containerClassName?: string;
  optimizeWidth?: number;
}

export const isBadUrl = (url: any): boolean => {
  if (typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return u.includes('aistudio.google.com') ||
         u.includes('/aistudio/') ||
         (u.includes('/_/') && u.includes('/upload/') && u.includes('/file/')) ||
         u.includes('eb137f4a-fb23-4b8c-aec9-844aecbc242a');
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
  const isRemote = typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(isRemote ? undefined : src);

  useEffect(() => {
    let active = true;
    setError(false);

    if (src && !isBadUrl(src)) {
      if (!isRemote) {
        setDisplaySrc(src);
        return;
      }

      // Prioritize optimized URL for mobile/smaller thumbnails
      const finalSrc = getOptimizedImageUrl(src, optimizeWidth);

      getLocalImage(finalSrc).then(cachedUrl => {
        if (!active) return;
        if (cachedUrl) {
          setDisplaySrc(cachedUrl);
        } else {
          // Si hors-ligne et pas en cache local, afficher directement le fallback sans polluer la console réseau
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setError(true);
            return;
          }

          setDisplaySrc(finalSrc);
          cacheImage(finalSrc).then(cachedBlobUrl => {
            if (active && cachedBlobUrl) {
              setDisplaySrc(cachedBlobUrl);
            }
          }).catch(() => {});
        }
      }).catch(() => {
        if (active) setError(true);
      });
    } else {
      setDisplaySrc(src);
    }

    return () => {
      active = false;
    };
  }, [src, optimizeWidth, isRemote]);

  if (!displaySrc || isBadUrl(displaySrc) || error) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg", containerClassName || className)}>
        {fallback || <Package className="text-slate-400" size={24} />}
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};
