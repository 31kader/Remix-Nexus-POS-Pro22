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
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(src);

  useEffect(() => {
    let active = true;
    if (src && !isBadUrl(src)) {
      // Prioritize optimized URL for mobile/smaller thumbnails
      const finalSrc = getOptimizedImageUrl(src, optimizeWidth);

      getLocalImage(finalSrc).then(cachedUrl => {
        if (!active) return;
        if (cachedUrl) {
          setDisplaySrc(cachedUrl);
        } else {
          setDisplaySrc(finalSrc);
          cacheImage(finalSrc).then(cachedUrl => {
            if (active && cachedUrl) {
              setDisplaySrc(cachedUrl);
            }
          });
        }
      });
    } else {
      setDisplaySrc(src);
    }
    return () => {
      active = false;
    };
  }, [src, optimizeWidth]);

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
