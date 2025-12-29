import { useState, useEffect } from 'react';
import { getAccessibleStorageUrl } from '@/utils/storageUrl';

/**
 * Hook to get an accessible storage URL (signed URL for local dev, public URL for production)
 * This handles the conversion automatically
 */
export const useStorageUrl = (url: string | null | undefined): string | null => {
  const [accessibleUrl, setAccessibleUrl] = useState<string | null>(url || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setAccessibleUrl(null);
      return;
    }

    // Check if URL is already accessible (signed URL with token)
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('token')) {
        // Already a signed URL, use it directly
        setAccessibleUrl(url);
        return;
      }
    } catch {
      // Invalid URL, will try to convert
    }

    // Convert to signed URL if needed
    setIsLoading(true);
    getAccessibleStorageUrl(url)
      .then(convertedUrl => {
        setAccessibleUrl(convertedUrl);
      })
      .catch(error => {
        console.error('Error converting storage URL:', error);
        setAccessibleUrl(url); // Fallback to original
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [url]);

  return accessibleUrl;
};

