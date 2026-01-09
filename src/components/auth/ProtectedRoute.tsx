import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoadingState } from './AuthLoadingState';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Roles allowed to access this route.
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
   * Defaults to '/unauthorized' or '/' if that doesn't exist.
   */
  unauthorizedRedirect?: string;
  /**
   * Custom loading component to show while checking auth.
   * Defaults to AuthLoadingState.
   */
  loadingComponent?: React.ReactNode;
  /**
   * Custom unauthorized component to show instead of redirecting.
   */
  unauthorizedComponent?: React.ReactNode;
}

/**
 * ProtectedRoute component that guards routes based on authentication and authorization.
 * 
 * Usage:
 * ```tsx
 * // Basic authentication check
 * <ProtectedRoute>
 *   <MyPage />
 * </ProtectedRoute>
 * 
 * // Role-based access
 * <ProtectedRoute allowedRoles={['admin', 'editor']}>
 *   <AdminPage />
 * </ProtectedRoute>
 * 
 * // Admin only
 * <ProtectedRoute allowedRoles={['admin']}>
 *   <AdminOnlyPage />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/auth',
  unauthorizedRedirect = '/',
  loadingComponent,
  unauthorizedComponent,
}) => {
  const { user, userProfile, isLoading, error, role } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return <>{loadingComponent ?? <AuthLoadingState />}</>;
  }

  // Show error state if there's an authentication error
  if (error) {
    return <AuthLoadingState />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    // Save the attempted URL for redirecting after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role-based authorization if roles are specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = role || userProfile?.role;
    const isAuthorized = userRole && allowedRoles.includes(userRole);

    if (!isAuthorized) {
      // Show custom unauthorized component if provided
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }

      // Otherwise redirect to unauthorized page
      return (
        <Navigate 
          to={unauthorizedRedirect} 
          state={{ from: location.pathname, reason: 'unauthorized' }} 
          replace 
        />
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

/**
 * Higher-order component version of ProtectedRoute for class components
 * or when you need to wrap a component at the module level.
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  const WithProtectedRoute: React.FC<P> = (props) => (
    <ProtectedRoute {...options}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );

  WithProtectedRoute.displayName = `WithProtectedRoute(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithProtectedRoute;
}

export default ProtectedRoute;
