import { useEffect, useRef, useCallback } from 'react';

interface UseTabVisibilityOptions {
  /**
   * Callback to execute when tab becomes visible
   */
  onVisible?: () => void;
  /**
   * Callback to execute when tab becomes hidden
   */
  onHidden?: () => void;
  /**
   * Whether to enable the visibility change handler
   */
  enabled?: boolean;
}

/**
 * Hook to handle browser tab visibility changes
 * Useful for recovering from stuck loading states when tabs are refocused
 */
export function useTabVisibility(options: UseTabVisibilityOptions = {}) {
  const { onVisible, onHidden, enabled = true } = options;
  const onVisibleRef = useRef(onVisible);
  const onHiddenRef = useRef(onHidden);
  const isVisibleRef = useRef(!document.hidden);

  // Update refs when callbacks change
  useEffect(() => {
    onVisibleRef.current = onVisible;
    onHiddenRef.current = onHidden;
  }, [onVisible, onHidden]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = isVisible;

      if (isVisible && !wasVisible) {
        // Tab became visible
        onVisibleRef.current?.();
      } else if (!isVisible && wasVisible) {
        // Tab became hidden
        onHiddenRef.current?.();
      }
    };

    // Also handle window focus as a fallback
    const handleFocus = () => {
      if (!document.hidden && !isVisibleRef.current) {
        isVisibleRef.current = true;
        onVisibleRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled]);

  return {
    isVisible: isVisibleRef.current,
  };
}

/**
 * Hook to recover from stuck loading states
 * Automatically resets loading state if it's been stuck for too long
 */
export function useLoadingRecovery(
  isLoading: boolean,
  setIsLoading: (loading: boolean) => void,
  options: {
    timeout?: number; // Timeout in milliseconds (default: 30 seconds)
    onTimeout?: () => void; // Callback when timeout occurs
  } = {}
) {
  const { timeout = 30000, onTimeout } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start tracking when loading begins
      startTimeRef.current = Date.now();

      // Set timeout to recover from stuck loading
      timeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Loading timeout - resetting loading state');
        setIsLoading(false);
        onTimeout?.();
      }, timeout);
    } else {
      // Clear timeout when loading completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, setIsLoading, timeout, onTimeout]);

  // Reset loading when tab becomes visible if it's been stuck
  useTabVisibility({
    onVisible: () => {
      if (isLoading && startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        // If loading for more than 5 seconds, reset it
        if (elapsed > 5000) {
          console.log('🔄 Tab refocused - resetting stuck loading state');
          setIsLoading(false);
        }
      }
    },
  });
}

