/**
 * Cross-Platform React Auth Components
 * Pre-built authentication components that work seamlessly in React web and React Native
 *
 * @module auth-components-cross-platform
 * @description
 * This module provides cross-platform authentication components built on top of
 * the platform abstraction layer. All components automatically adapt their
 * rendering and behavior based on the runtime environment (web or React Native).
 *
 * Components included:
 * - LoginForm: Full-featured login form with role selection and remember me
 * - UserProfile: Display user information with logout functionality
 * - RoleSwitcher: Dynamic role switching interface
 * - AuthStatus: Authentication status indicator
 * - ProtectedRoute: Route protection with authentication checks
 * - PermissionGate: Permission-based component rendering
 *
 * @example
 * ```typescript
 * import { LoginForm, ProtectedRoute } from './auth-components';
 *
 * function App() {
 *   return (
 *     <ProtectedRoute requiredRole="ROLE_USER" redirectTo="/login">
 *       <Dashboard />
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 *
 * @see {@link file://./docs/CROSS_PLATFORM_GUIDE.md} for integration guide
 */

import type { UserRole, PermissionCheck, LoginCredentials } from '@/auth/types';

import React, { useState, useCallback } from 'react';

import { useAuth, useLogin, useRoles, useLogout, useRequireRole } from './use-auth';
import {
  isWeb,
  showAlert,
  navigateTo,
  PlatformText,
  PlatformView,
  createStyles,
  isReactNative,
  PlatformButton,
  PlatformPicker,
  PlatformTextInput,
  PlatformScrollView,
} from './platform-components';

// Cross-platform styles
const styles = createStyles({
  formContainer: {
    ...(isWeb && { maxWidth: 400 }),
    width: '100%',
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    ...(isWeb && {
      width: '100%',
      boxSizing: 'border-box',
    }),
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    ...(isWeb && {
      padding: 12,
      fontSize: 16,
      width: '100%',
    }),
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxInput: {
    marginRight: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(isWeb && {
      border: 'none',
      cursor: 'pointer',
    }),
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    ...(isWeb && {
      cursor: 'not-allowed',
    }),
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    borderColor: '#ff4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  profileContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

// Login Form Component
export interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  style?: any;
  autoComplete?: boolean;
  showRememberMe?: boolean;
  allowRoleSelection?: boolean;
  availableRoles?: UserRole[];
}

export function LoginForm({
  onSuccess,
  onError,
  style,
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

  const handleSubmit = useCallback(async () => {
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

  const isFormValid = credentials.username.length > 0 && credentials.password.length > 0;

  return (
    <PlatformView style={[styles.formContainer, style]}>
      <PlatformView style={styles.formGroup}>
        <PlatformText style={styles.label}>Email or Username</PlatformText>
        <PlatformTextInput
          value={credentials.username}
          onChangeText={(value) => handleInputChange('username', value)}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete={autoComplete ? 'username' : 'off'}
          editable={!isLogging}
          style={[styles.input, isLogging && styles.inputDisabled]}
        />
      </PlatformView>

      <PlatformView style={styles.formGroup}>
        <PlatformText style={styles.label}>Password</PlatformText>
        <PlatformTextInput
          value={credentials.password}
          onChangeText={(value) => handleInputChange('password', value)}
          placeholder="Enter your password"
          secureTextEntry
          autoComplete={autoComplete ? 'current-password' : 'off'}
          editable={!isLogging}
          style={[styles.input, isLogging && styles.inputDisabled]}
        />
      </PlatformView>

      {allowRoleSelection && availableRoles.length > 0 && (
        <PlatformView style={styles.formGroup}>
          <PlatformText style={styles.label}>Preferred Role</PlatformText>
          <PlatformPicker
            selectedValue={credentials.preferred_role || ''}
            onValueChange={(value) => handleInputChange('preferred_role', value as UserRole)}
            enabled={!isLogging}
            style={styles.picker}
          >
            <option value="">Auto-detect role</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role.replace('ROLE_', '').toLowerCase().replace('_', ' ')}
              </option>
            ))}
          </PlatformPicker>
        </PlatformView>
      )}

      {showRememberMe && (
        <PlatformView style={[styles.formGroup, styles.checkbox]}>
          <PlatformButton
            style={styles.checkboxInput}
            onPress={() => setRememberMe(!rememberMe)}
            disabled={isLogging}
          >
            <PlatformText>{rememberMe ? '☑️' : '☐'}</PlatformText>
          </PlatformButton>
          <PlatformText>Remember me</PlatformText>
        </PlatformView>
      )}

      {loginError && (
        <PlatformView style={styles.errorContainer}>
          <PlatformText style={styles.errorText}>
            {loginError.message}
          </PlatformText>
        </PlatformView>
      )}

      <PlatformButton
        onPress={handleSubmit}
        disabled={isLogging || !isFormValid}
        style={[styles.button, (isLogging || !isFormValid) && styles.buttonDisabled]}
      >
        <PlatformText style={[styles.buttonText, (isLogging || !isFormValid) && styles.buttonTextDisabled]}>
          {isLogging ? 'Signing in...' : 'Sign In'}
        </PlatformText>
      </PlatformButton>
    </PlatformView>
  );
}

// User Profile Component
export interface UserProfileProps {
  showRoles?: boolean;
  showSession?: boolean;
  showPermissions?: boolean;
  style?: any;
}

export function UserProfile({
  showRoles = true,
  showSession = true,
  showPermissions = false,
  style,
}: UserProfileProps) {
  const { user, isAuthenticated } = useAuth();
  const { logout, isLoggingOut } = useLogout();
  const { primaryRole, simpleRole, effectiveRoles } = useRoles();

  const handleLogout = useCallback(() => {
    if (isReactNative) {
      showAlert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: logout },
        ],
      );
    } else {
      logout();
    }
  }, [logout]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <PlatformScrollView style={[styles.profileContainer, style]}>
      <PlatformView>
        <PlatformText style={styles.profileName}>
          {user.name || user.email}
        </PlatformText>
        <PlatformText style={styles.profileEmail}>
          {user.email}
        </PlatformText>
        {user.last_login && (
          <PlatformText style={styles.profileEmail}>
            Last login: {user.last_login.toLocaleString()}
          </PlatformText>
        )}
      </PlatformView>

      {showRoles && (
        <PlatformView>
          <PlatformText style={styles.sectionTitle}>Current Role</PlatformText>
          <PlatformText style={styles.roleText}>
            {primaryRole?.replace('ROLE_', '').toLowerCase().replace('_', ' ') || 'Unknown'}
            {' '}({simpleRole})
          </PlatformText>

          {effectiveRoles.length > 1 && (
            <PlatformView style={{ marginTop: 8 }}>
              <PlatformText style={styles.label}>All Available Roles:</PlatformText>
              {effectiveRoles.map(role => (
                <PlatformText key={role} style={styles.roleText}>
                  • {role.replace('ROLE_', '').toLowerCase().replace('_', ' ')}
                </PlatformText>
              ))}
            </PlatformView>
          )}
        </PlatformView>
      )}

      {showSession && user.session_id && (
        <PlatformView>
          <PlatformText style={styles.sectionTitle}>Session</PlatformText>
          <PlatformText style={styles.profileEmail}>
            ID: {user.session_id}
          </PlatformText>
        </PlatformView>
      )}

      {showPermissions && user.permissions.length > 0 && (
        <PlatformView>
          <PlatformText style={styles.sectionTitle}>Permissions</PlatformText>
          {user.permissions.map(permission => (
            <PlatformText key={permission} style={styles.roleText}>
              • {permission}
            </PlatformText>
          ))}
        </PlatformView>
      )}

      <PlatformButton
        onPress={handleLogout}
        disabled={isLoggingOut}
        style={[styles.button, { marginTop: 20, backgroundColor: '#ff4444' }, isLoggingOut && styles.buttonDisabled]}
      >
        <PlatformText style={[styles.buttonText, isLoggingOut && styles.buttonTextDisabled]}>
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </PlatformText>
      </PlatformButton>
    </PlatformScrollView>
  );
}

// Role Switcher Component
export interface RoleSwitcherProps {
  availableRoles?: UserRole[];
  onRoleSwitch?: (role: UserRole) => void;
  style?: any;
}

export function RoleSwitcher({
  availableRoles = [],
  onRoleSwitch,
  style,
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
      showAlert('Error', 'Failed to switch role. Please try again.');
    }
  }, [switchRole, onRoleSwitch]);

  const switchableRoles = availableRoles.length > 0
    ? availableRoles.filter(role => effectiveRoles.includes(role))
    : effectiveRoles;

  if (switchableRoles.length <= 1) {
    return null;
  }

  return (
    <PlatformView style={[styles.formGroup, style]}>
      <PlatformText style={styles.label}>Switch Role:</PlatformText>
      <PlatformPicker
        selectedValue={primaryRole || ''}
        onValueChange={(value) => handleRoleSwitch(value as UserRole)}
        enabled={!isSwitchingRole}
        style={styles.picker}
      >
        {switchableRoles.map(role => (
          <option key={role} value={role}>
            {role.replace('ROLE_', '').toLowerCase().replace('_', ' ')}
          </option>
        ))}
      </PlatformPicker>
    </PlatformView>
  );
}

// Auth Status Component
export interface AuthStatusProps {
  showLoginPrompt?: boolean;
  loginPromptText?: string;
  style?: any;
}

export function AuthStatus({
  showLoginPrompt = true,
  loginPromptText = 'Please sign in to continue',
  style,
}: AuthStatusProps) {
  const { isAuthenticated, isLoading, error, user } = useAuth();

  if (isLoading) {
    return (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>Loading...</PlatformText>
      </PlatformView>
    );
  }

  if (error) {
    return (
      <PlatformView style={[styles.errorContainer, style]}>
        <PlatformText style={styles.errorText}>
          Authentication error: {error.message}
        </PlatformText>
      </PlatformView>
    );
  }

  if (!isAuthenticated) {
    return showLoginPrompt ? (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>{loginPromptText}</PlatformText>
      </PlatformView>
    ) : null;
  }

  return (
    <PlatformView style={[styles.loadingContainer, style]}>
      <PlatformText style={styles.loadingText}>
        Signed in as {user?.name || user?.email}
      </PlatformText>
    </PlatformView>
  );
}

// Protected Route Component
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: React.ComponentType;
  redirectTo?: string;
  style?: any;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback: FallbackComponent,
  redirectTo,
  style,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const roleResult = requiredRole ? useRequireRole(requiredRole, FallbackComponent) : null;

  const handleRedirect = useCallback(() => {
    if (redirectTo) {
      if (isReactNative) {
        // In React Native, show an alert instead of redirecting
        showAlert(
          'Authentication Required',
          'Please sign in to continue',
          [{ text: 'OK' }],
        );
      } else {
        navigateTo(redirectTo);
      }
    }
  }, [redirectTo]);

  if (isLoading) {
    return (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>Loading...</PlatformText>
      </PlatformView>
    );
  }

  if (!isAuthenticated) {
    if (redirectTo) {
      handleRedirect();
      return null;
    }

    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>
          Authentication required
        </PlatformText>
      </PlatformView>
    );
  }

  if (requiredRole && roleResult && !roleResult.canAccess) {
    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>
          Insufficient permissions
        </PlatformText>
      </PlatformView>
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
  style?: any;
}

export function PermissionGate({
  children,
  resource,
  action,
  context,
  fallback: FallbackComponent,
  showLoading = true,
  style,
}: PermissionGateProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { checkPermission } = useAuth();

  React.useEffect(() => {
    const permissionCheck: PermissionCheck = {
      resource,
      action,
      ...(context && { context }),
    };

    checkPermission(permissionCheck)
      .then(result => setHasPermission(result.granted))
      .catch(() => setHasPermission(false));
  }, [checkPermission, resource, action, context]);

  if (hasPermission === null) {
    return showLoading ? (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>
          Checking permissions...
        </PlatformText>
      </PlatformView>
    ) : null;
  }

  if (!hasPermission) {
    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <PlatformView style={[styles.loadingContainer, style]}>
        <PlatformText style={styles.loadingText}>
          Permission denied
        </PlatformText>
      </PlatformView>
    );
  }

  return <>{children}</>;
}
