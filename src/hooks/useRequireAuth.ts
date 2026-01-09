import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface UseRequireAuthOptions {
  /**
   * Roles allowed to access this page.
   * If not provided, any authenticated user can access.
   */
  allowedRoles?: UserRole[];
  /**
   * Path to redirect to if user is not authenticated.
   * Defaults to '/auth'.
   */
  redirectTo?: string;
  /**
   * Path to redirect to if user is authenticated but not authorized.
   * Defaults to '/'.
   */
  unauthorizedRedirect?: string;
  /**
   * Whether to skip the redirect and just return auth state.
   * Useful for conditional rendering instead of redirecting.
   */
  skipRedirect?: boolean;
}

interface UseRequireAuthResult {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether the user is authorized based on the allowedRoles */
  isAuthorized: boolean;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** The current user's role */
  role: UserRole | null;
  /** Whether to show loading state (auth loading or profile not yet loaded) */
  showLoading: boolean;
  /** Whether to show unauthorized state */
  showUnauthorized: boolean;
}

/**
 * Hook for requiring authentication and authorization in pages/components.
 * 
 * This hook handles redirects automatically unless skipRedirect is true.
 * 
 * Usage:
 * ```tsx
 * const MyPage = () => {
 *   const { showLoading, showUnauthorized } = useRequireAuth({
 *     allowedRoles: ['admin', 'editor']
 *   });
 * 
 *   if (showLoading) return <LoadingSpinner />;
 *   if (showUnauthorized) return <UnauthorizedMessage />;
 * 
 *   return <PageContent />;
 * };
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}): UseRequireAuthResult {
  const {
    allowedRoles,
    redirectTo = '/auth',
    unauthorizedRedirect = '/',
    skipRedirect = false,
  } = options;

  const { user, userProfile, isLoading, role: authRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = authRole || userProfile?.role || null;
  const isAuthenticated = !!user;
  
  // Check authorization if roles are specified
  const isAuthorized = !allowedRoles || allowedRoles.length === 0 
    ? isAuthenticated 
    : isAuthenticated && role !== null && allowedRoles.includes(role);

  // Handle redirects
  useEffect(() => {
    if (skipRedirect || isLoading) return;

    if (!isAuthenticated) {
      navigate(redirectTo, { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !isAuthorized) {
      navigate(unauthorizedRedirect, { 
        state: { from: location.pathname, reason: 'unauthorized' },
        replace: true 
      });
    }
  }, [
    isAuthenticated, 
    isAuthorized, 
    isLoading, 
    skipRedirect, 
    navigate, 
    redirectTo, 
    unauthorizedRedirect, 
    location.pathname,
    allowedRoles
  ]);

  const showLoading = isLoading || (isAuthenticated && !userProfile);
  const showUnauthorized = !isLoading && isAuthenticated && !isAuthorized;

  return {
    isAuthenticated,
    isAuthorized,
    isLoading,
    role,
    showLoading,
    showUnauthorized,
  };
}

/**
 * Simple hook that just checks if user is authenticated.
 * Use this when you don't need role-based access control.
 */
export function useIsAuthenticated(): boolean {
  const { user, isLoading } = useAuth();
  return !isLoading && !!user;
}

/**
 * Hook that returns true if the current user has one of the specified roles.
 */
export function useHasRole(roles: UserRole[]): boolean {
  const { role, isLoading, user } = useAuth();
  if (isLoading || !user || !role) return false;
  return roles.includes(role);
}
