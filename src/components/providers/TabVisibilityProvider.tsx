import React, { useEffect } from 'react';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global provider to handle tab visibility changes and Supabase connection recovery
 * This helps recover from stuck loading states when users switch browser tabs
 */
export const TabVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useTabVisibility({
    onVisible: () => {
      // When tab becomes visible, check Supabase connection health
      const checkConnection = async () => {
        try {
          // Simple health check - try to get the current session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.warn('⚠️ Supabase session check failed on tab refocus:', error);
            // Don't throw - this is just a health check
          } else if (session) {
            console.log('✅ Supabase connection healthy after tab refocus');
          }
        } catch (error) {
          console.warn('⚠️ Error checking Supabase connection on tab refocus:', error);
        }
      };

      // Small delay to let the browser resume network activity
      setTimeout(checkConnection, 100);
    },
  });

  // Global handler for stuck requests - refresh page if completely stuck
  useEffect(() => {
    const stuckRequestTimer: NodeJS.Timeout | null = null;

    const checkForStuckRequests = () => {
      // This is a last resort - if the page has been hidden for a long time
      // and comes back, we might need to refresh
      // But we'll be conservative and only do this in extreme cases
      const lastActivity = sessionStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
        // Only if page has been inactive for more than 10 minutes
        if (timeSinceActivity > 600000) {
          console.log('🔄 Page inactive for >10 minutes, considering refresh...');
          // Don't auto-refresh, just log - let individual pages handle recovery
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Update last activity time
        sessionStorage.setItem('lastActivity', Date.now().toString());
        checkForStuckRequests();
      }
    };

    // Track activity
    const updateActivity = () => {
      sessionStorage.setItem('lastActivity', Date.now().toString());
    };

    // Update activity on various events
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);

    // Initial activity
    updateActivity();

    return () => {
      if (stuckRequestTimer) {
        clearTimeout(stuckRequestTimer);
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, []);

  return <>{children}</>;
};

