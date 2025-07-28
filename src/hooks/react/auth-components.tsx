/**
 * React Auth Components
 * Pre-built authentication components for common use cases
 */

import React, { useState, useCallback } from 'react';
import { useAuth, useLogin, useLogout, useRoles, useRequireRole } from './use-auth';
import type { LoginCredentials, UserRole, PermissionCheck } from '@/auth/types';

// Login Form Component
export interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  autoComplete?: boolean;
  showRememberMe?: boolean;
  allowRoleSelection?: boolean;
  availableRoles?: UserRole[];
}

export function LoginForm({
  onSuccess,
  onError,
  className = '',
  autoComplete = true,
  showRememberMe = false,
  allowRoleSelection = false,
  availableRoles = [],
}: LoginFormProps) {
  const { login, isLogging, loginError, clearLoginError } = useLogin();
  
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginError();

    try {
      await login({
        ...credentials,
        ...(rememberMe && { scope: 'remember_me' }),
      });
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      onError?.(errorMessage);
    }
  }, [credentials, rememberMe, login, onSuccess, onError, clearLoginError]);

  const handleInputChange = useCallback((field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (loginError) {
      clearLoginError();
    }
  }, [loginError, clearLoginError]);

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="auth-form-group">
        <label htmlFor="username">Email or Username</label>
        <input
          id="username"
          type="email"
          value={credentials.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          required
          autoComplete={autoComplete ? 'username' : 'off'}
          disabled={isLogging}
          placeholder="Enter your email"
        />
      </div>

      <div className="auth-form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={credentials.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          required
          autoComplete={autoComplete ? 'current-password' : 'off'}
          disabled={isLogging}
          placeholder="Enter your password"
        />
      </div>

      {allowRoleSelection && availableRoles.length > 0 && (
        <div className="auth-form-group">
          <label htmlFor="preferred-role">Preferred Role</label>
          <select
            id="preferred-role"
            value={credentials.preferred_role || ''}
            onChange={(e) => handleInputChange('preferred_role', e.target.value as UserRole)}
            disabled={isLogging}
          >
            <option value="">Auto-detect role</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role.replace('ROLE_', '').toLowerCase().replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {showRememberMe && (
        <div className="auth-form-group">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLogging}
            />
            Remember me
          </label>
        </div>
      )}

      {loginError && (
        <div className="auth-error" role="alert">
          {loginError.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isLogging || !credentials.username || !credentials.password}
        className="auth-submit-button"
      >
        {isLogging ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

// User Profile Component
export interface UserProfileProps {
  showRoles?: boolean;
  showSession?: boolean;
  showPermissions?: boolean;
  className?: string;
}

export function UserProfile({
  showRoles = true,
  showSession = true,
  showPermissions = false,
  className = '',
}: UserProfileProps) {
  const { user, isAuthenticated } = useAuth();
  const { logout, isLoggingOut } = useLogout();
  const { primaryRole, simpleRole, effectiveRoles } = useRoles();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className={`auth-user-profile ${className}`}>
      <div className="auth-user-info">
        <h3>{user.name || user.email}</h3>
        <p className="auth-user-email">{user.email}</p>
        {user.last_login && (
          <p className="auth-last-login">
            Last login: {user.last_login.toLocaleString()}
          </p>
        )}
      </div>

      {showRoles && (
        <div className="auth-user-roles">
          <h4>Current Role</h4>
          <p className="auth-primary-role">
            {primaryRole?.replace('ROLE_', '').toLowerCase().replace('_', ' ') || 'Unknown'}
            <span className="auth-simple-role">({simpleRole})</span>
          </p>
          
          {effectiveRoles.length > 1 && (
            <details>
              <summary>All Available Roles</summary>
              <ul>
                {effectiveRoles.map(role => (
                  <li key={role}>
                    {role.replace('ROLE_', '').toLowerCase().replace('_', ' ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {showSession && user.session_id && (
        <div className="auth-session-info">
          <h4>Session</h4>
          <p className="auth-session-id">ID: {user.session_id}</p>
        </div>
      )}

      {showPermissions && user.permissions.length > 0 && (
        <div className="auth-user-permissions">
          <h4>Permissions</h4>
          <ul>
            {user.permissions.map(permission => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="auth-user-actions">
        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="auth-logout-button"
        >
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

// Role Switcher Component
export interface RoleSwitcherProps {
  availableRoles?: UserRole[];
  onRoleSwitch?: (role: UserRole) => void;
  className?: string;
}

export function RoleSwitcher({
  availableRoles = [],
  onRoleSwitch,
  className = '',
}: RoleSwitcherProps) {
  const { switchRole, isSwitchingRole, primaryRole, effectiveRoles } = useRoles();

  const handleRoleSwitch = useCallback(async (targetRole: UserRole) => {
    try {
      const success = await switchRole(targetRole);
      if (success) {
        onRoleSwitch?.(targetRole);
      }
    } catch (error) {
      console.error('Role switch failed:', error);
    }
  }, [switchRole, onRoleSwitch]);

  const switchableRoles = availableRoles.length > 0 
    ? availableRoles.filter(role => effectiveRoles.includes(role))
    : effectiveRoles;

  if (switchableRoles.length <= 1) {
    return null;
  }

  return (
    <div className={`auth-role-switcher ${className}`}>
      <label htmlFor="role-select">Switch Role:</label>
      <select
        id="role-select"
        value={primaryRole || ''}
        onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
        disabled={isSwitchingRole}
      >
        {switchableRoles.map(role => (
          <option key={role} value={role}>
            {role.replace('ROLE_', '').toLowerCase().replace('_', ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}

// Auth Status Component
export interface AuthStatusProps {
  showLoginPrompt?: boolean;
  loginPromptText?: string;
  className?: string;
}

export function AuthStatus({
  showLoginPrompt = true,
  loginPromptText = 'Please sign in to continue',
  className = '',
}: AuthStatusProps) {
  const { isAuthenticated, isLoading, error, user } = useAuth();

  if (isLoading) {
    return (
      <div className={`auth-status auth-loading ${className}`}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`auth-status auth-error ${className}`}>
        <p>Authentication error: {error.message}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return showLoginPrompt ? (
      <div className={`auth-status auth-unauthenticated ${className}`}>
        <p>{loginPromptText}</p>
      </div>
    ) : null;
  }

  return (
    <div className={`auth-status auth-authenticated ${className}`}>
      <p>Signed in as {user?.name || user?.email}</p>
    </div>
  );
}

// Protected Route Component
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: React.ComponentType;
  redirectTo?: string;
  className?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback: FallbackComponent,
  redirectTo,
  className = '',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const roleResult = requiredRole ? useRequireRole(requiredRole, FallbackComponent) : null;

  if (isLoading) {
    return (
      <div className={`auth-protected-loading ${className}`}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null;
    }

    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <div className={`auth-protected-unauthorized ${className}`}>
        <p>Authentication required</p>
      </div>
    );
  }

  if (requiredRole && roleResult && !roleResult.canAccess) {
    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <div className={`auth-protected-forbidden ${className}`}>
        <p>Insufficient permissions</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Permission Gate Component
export interface PermissionGateProps {
  children: React.ReactNode;
  resource: string;
  action: string;
  context?: Record<string, unknown>;
  fallback?: React.ComponentType;
  showLoading?: boolean;
}

export function PermissionGate({
  children,
  resource,
  action,
  context,
  fallback: FallbackComponent,
  showLoading = true,
}: PermissionGateProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { checkPermission } = useAuth();

  React.useEffect(() => {
    const permissionCheck: PermissionCheck = {
      resource,
      action,
      ...(context && { context })
    };
    
    checkPermission(permissionCheck)
      .then(result => setHasPermission(result.granted))
      .catch(() => setHasPermission(false));
  }, [checkPermission, resource, action, context]);

  if (hasPermission === null) {
    return showLoading ? (
      <div className="auth-permission-loading">
        <p>Checking permissions...</p>
      </div>
    ) : null;
  }

  if (!hasPermission) {
    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <div className="auth-permission-denied">
        <p>Permission denied</p>
      </div>
    );
  }

  return <>{children}</>;
}