# A-Cube E-Receipt SDK - Authentication System Documentation

## Overview

The A-Cube E-Receipt SDK provides a comprehensive authentication system designed for Italian tax system compliance with enterprise-grade security features, role-based access control, and seamless React integration.

## Architecture

### Core Components

1. **AuthService** - Main authentication service handling OAuth2 flows
2. **TokenManager** - JWT token parsing, validation, and refresh
3. **AuthStorage** - Secure cross-platform storage with encryption
4. **AuthMiddleware** - HTTP request/response authentication middleware
5. **React Integration** - Complete hooks and components system

### Authentication Flow

```
User Login → OAuth2 Password Grant → JWT Token → Role Detection → Session Storage → Ready
```

## Getting Started

### Basic Setup

```typescript
import { ACubeSDK } from '@acube/ereceipt-sdk';

const sdk = new ACubeSDK({
  environment: 'sandbox', // or 'production'
  auth: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    baseUrl: 'https://api.acube.it',
    sessionTimeout: 3600000, // 1 hour
  }
});

// Login
const user = await sdk.login({
  username: 'user@example.com',
  password: 'password',
  preferred_role: 'merchant' // Optional
});

console.log('Logged in as:', user.name);
```

### React Integration

```tsx
import { AuthProvider, useAuth, LoginForm } from '@acube/ereceipt-sdk';

function App() {
  const sdk = new ACubeSDK({ environment: 'sandbox' });
  
  return (
    <AuthProvider sdk={sdk}>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <LoginForm 
        allowRoleSelection={true}
        availableRoles={['ROLE_MERCHANT', 'ROLE_CASHIER']}
        onSuccess={() => console.log('Login successful!')}
      />
    );
  }
  
  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Role: {user?.attributes?.simpleRole}</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

## Role System

### Available Roles

The SDK implements a hierarchical role system:

- **ROLE_SUPPLIER** (Provider level - highest privileges)
- **ROLE_MERCHANT** (includes ROLE_CASHIER permissions)  
- **ROLE_CASHIER** (basic operations)
- **ROLE_ADMIN** (includes ROLE_PREVIOUS_ADMIN)
- **ROLE_ACUBE_MF1** (includes ROLE_MF1)
- **ROLE_EXTERNAL_MF1** (includes ROLE_MF1)

### Role Auto-Detection

The system automatically detects the appropriate role based on:

1. **Preferred Role** - User's explicitly chosen role
2. **Context IDs** - merchant_id, cashier_id, point_of_sale_id from JWT
3. **Available Roles** - Roles granted to the user
4. **Fallback Logic** - Default to highest available role

```typescript
// Role detection context
const context = {
  merchantId: 'merchant_123',
  cashierId: 'cashier_456', 
  preferredRole: 'merchant',
  userRoles: ['ROLE_MERCHANT', 'ROLE_CASHIER']
};

const detectedRole = autoDetectRole(context);
// Result: ROLE_MERCHANT
```

### Role Switching

Users can switch roles during their session:

```typescript
// Using SDK directly
const success = await sdk.switchRole('ROLE_CASHIER', {
  merchant_id: 'merchant_123',
  cashier_id: 'cashier_456'
});

// Using React hook
const { switchRole } = useRoles();
await switchRole('ROLE_CASHIER');
```

## React Hooks Reference

### Core Authentication

#### `useAuth()`
Main authentication hook providing complete auth state and actions.

```typescript
const {
  user,              // Current user object
  isAuthenticated,   // Authentication status
  isLoading,         // Loading state
  error,             // Auth errors
  login,             // Login function
  logout,            // Logout function
  refreshSession,    // Manual refresh
  clearError,        // Clear error state
  hasRole,           // Check user role
  checkPermission,   // Check permissions
} = useAuth();
```

#### `useLogin()`
Specialized hook for login functionality with error handling.

```typescript
const {
  login,           // Login function
  isLogging,       // Login in progress
  loginError,      // Login-specific errors
  clearLoginError, // Clear login errors
} = useLogin();

// Usage
try {
  const user = await login({
    username: 'user@example.com',
    password: 'password',
    preferred_role: 'ROLE_MERCHANT'
  });
  console.log('Login successful:', user);
} catch (error) {
  console.error('Login failed:', error);
}
```

#### `useLogout()`
Logout functionality with cleanup options.

```typescript
const {
  logout,         // Logout function
  isLoggingOut,   // Logout in progress
} = useLogout();

// Usage
await logout({
  reason: 'user_initiated',
  message: 'User logged out manually',
  clearAllSessions: false
});
```

### Role Management

#### `useRoles()`
Complete role management with switching capabilities.

```typescript
const {
  currentRoles,     // User's assigned roles
  effectiveRoles,   // Roles including hierarchy
  primaryRole,      // Current active role
  simpleRole,       // Simple role name
  hasRole,          // Check specific role
  hasAnyRole,       // Check any of multiple roles
  switchRole,       // Switch to different role
  isSwitchingRole,  // Switch in progress
} = useRoles();

// Role checking
if (hasRole('ROLE_MERCHANT')) {
  // User has merchant role
}

// Role switching
await switchRole('ROLE_CASHIER');
```

### Permission System

#### `usePermissions()`
Permission checking with intelligent caching.

```typescript
const {
  checkPermission,        // Check permission function
  clearPermissionCache,   // Clear cached permissions
  isCheckingPermission,   // Check if permission query in progress
} = usePermissions();

// Usage
const result = await checkPermission({
  resource: 'receipts',
  action: 'create',
  context: { merchant_id: 'merchant_123' }
});

if (result.granted) {
  // Permission granted
}
```

### Session Management

#### `useSession()`
Session information and management with auto-refresh.

```typescript
const {
  sessionInfo,        // Current session data
  isRefreshing,       // Refresh in progress
  sessionError,       // Session errors
  refreshSession,     // Manual refresh
  reloadSessionInfo,  // Reload session data
  isSessionExpired,   // Check if expired
  timeUntilExpiry,    // Time until expiration
} = useSession();

// Auto-refresh is handled automatically
// Manual refresh when needed
if (isSessionExpired) {
  await refreshSession();
}
```

### Protection Hooks

#### `useRequireAuth()`
Ensure user is authenticated, redirect if not.

```typescript
// Redirect to login if not authenticated
useRequireAuth('/login');

// Or throw error
useRequireAuth(); // Throws if not authenticated
```

#### `useRequireRole()`
Ensure user has required role.

```typescript
const { hasRequiredRole, canAccess } = useRequireRole('ROLE_MERCHANT');

// Or require any of multiple roles
const result = useRequireRole(['ROLE_MERCHANT', 'ROLE_CASHIER']);
```

## React Components

### LoginForm

Complete login form with role selection and validation.

```tsx
<LoginForm
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => showToast(error)}
  allowRoleSelection={true}
  availableRoles={['ROLE_MERCHANT', 'ROLE_CASHIER']}
  showRememberMe={true}
  autoComplete={true}
  className="custom-login-form"
/>
```

**Props:**
- `onSuccess?: () => void` - Success callback
- `onError?: (error: string) => void` - Error callback
- `allowRoleSelection?: boolean` - Show role selector
- `availableRoles?: UserRole[]` - Available roles for selection
- `showRememberMe?: boolean` - Show remember me checkbox
- `autoComplete?: boolean` - Enable browser autocomplete
- `className?: string` - Custom CSS class

### UserProfile

Display user information with role management.

```tsx
<UserProfile
  showRoles={true}
  showSession={true}
  showPermissions={false}
  className="user-profile"
/>
```

**Props:**
- `showRoles?: boolean` - Display user roles
- `showSession?: boolean` - Show session information
- `showPermissions?: boolean` - List user permissions
- `className?: string` - Custom CSS class

### RoleSwitcher

Allow users to switch between available roles.

```tsx
<RoleSwitcher
  availableRoles={['ROLE_MERCHANT', 'ROLE_CASHIER']}
  onRoleSwitch={(role) => console.log('Switched to:', role)}
  className="role-switcher"
/>
```

### ProtectedRoute

Route-level protection with role requirements.

```tsx
<ProtectedRoute
  requiredRole="ROLE_MERCHANT"
  fallback={AccessDeniedPage}
  redirectTo="/login"
>
  <MerchantDashboard />
</ProtectedRoute>

// Multiple roles
<ProtectedRoute requiredRole={['ROLE_MERCHANT', 'ROLE_CASHIER']}>
  <SharedComponent />
</ProtectedRoute>
```

### PermissionGate

Component-level access control.

```tsx
<PermissionGate
  resource="receipts"
  action="create"
  context={{ merchant_id: user.merchant_id }}
  fallback={AccessDeniedComponent}
>
  <CreateReceiptButton />
</PermissionGate>
```

### AuthStatus

Display authentication status with customizable messages.

```tsx
<AuthStatus
  showLoginPrompt={true}
  loginPromptText="Please sign in to continue"
  className="auth-status"
/>
```

## Security Features

### Token Management

- **JWT Parsing** - Secure JWT token parsing and validation
- **Automatic Refresh** - Tokens refresh automatically before expiration
- **Token Rotation** - Support for token rotation security patterns
- **Expiration Handling** - Graceful handling of expired tokens

### Storage Security

- **Cross-Platform** - Works on Web, React Native, and Node.js
- **Encryption** - AES-256-GCM encryption for sensitive data
- **Device Binding** - Optional device-specific token binding
- **Secure Deletion** - Secure cleanup of stored credentials

### Network Security

- **HTTPS Enforcement** - All API calls use HTTPS
- **Request Signing** - Optional request signing for enhanced security
- **Rate Limiting** - Built-in rate limiting protection
- **CSRF Protection** - Cross-site request forgery protection

## Error Handling

### Error Types

The system provides specific error types for different scenarios:

```typescript
// Login errors
catch (error) {
  if (error.type === 'INVALID_CREDENTIALS') {
    // Handle invalid login
  } else if (error.type === 'ACCOUNT_LOCKED') {
    // Handle locked account
  } else if (error.type === 'SESSION_EXPIRED') {
    // Handle expired session
  }
}
```

### Error Recovery

```typescript
// Automatic retry on network errors
const { login } = useLogin();

try {
  await login(credentials);
} catch (error) {
  if (error.recoverable) {
    // Error can be retried
    setTimeout(() => login(credentials), 5000);
  }
}
```

## Advanced Configuration

### Custom Storage

```typescript
const sdk = new ACubeSDK({
  auth: {
    storage: {
      storageKey: 'custom_auth_key',
      enableEncryption: true,
      encryptionKey: 'your-encryption-key',
      storageAdapter: 'indexeddb' // or 'localstorage', 'memory'
    }
  }
});
```

### Custom Token Refresh

```typescript
const sdk = new ACubeSDK({
  auth: {
    tokenRefreshBuffer: 300000, // 5 minutes before expiry
    maxRefreshAttempts: 3,
    refreshRetryDelay: 2000,
    onTokenRefresh: (tokens) => {
      console.log('Tokens refreshed:', tokens);
    }
  }
});
```

### Event Handling

```typescript
// Listen to auth events
sdk.on('auth.success', (event) => {
  console.log('User logged in:', event.data.user);
});

sdk.on('auth.error', (event) => {
  console.error('Auth error:', event.data.error);
});

sdk.on('auth.logout', (event) => {
  console.log('User logged out:', event.data.reason);
});
```

## Best Practices

### 1. Role-Based Access Control

```typescript
// Check roles before sensitive operations
const { hasRole } = useRoles();

if (hasRole('ROLE_MERCHANT')) {
  // Merchant-specific functionality
  await createReceipt(receiptData);
}
```

### 2. Permission Checking

```typescript
// Always check permissions for resource access
const { checkPermission } = usePermissions();

const canCreateReceipt = await checkPermission({
  resource: 'receipts',
  action: 'create',
  context: { merchant_id: user.merchant_id }
});

if (canCreateReceipt.granted) {
  // Proceed with creation
}
```

### 3. Error Handling

```typescript
// Implement comprehensive error handling
const { login, loginError, clearLoginError } = useLogin();

useEffect(() => {
  if (loginError) {
    // Show user-friendly error messages
    switch (loginError.type) {
      case 'INVALID_CREDENTIALS':
        showToast('Invalid email or password');
        break;
      case 'ACCOUNT_LOCKED':
        showToast('Account temporarily locked');
        break;
      default:
        showToast('Login failed. Please try again.');
    }
  }
}, [loginError]);
```

### 4. Session Management

```typescript
// Handle session expiration gracefully
const { isSessionExpired, refreshSession } = useSession();

useEffect(() => {
  if (isSessionExpired) {
    // Attempt automatic refresh
    refreshSession().catch(() => {
      // Redirect to login if refresh fails
      navigate('/login');
    });
  }
}, [isSessionExpired]);
```

### 5. Secure Storage

```typescript
// Configure secure storage for production
const sdk = new ACubeSDK({
  environment: 'production',
  auth: {
    storage: {
      enableEncryption: true,
      storageAdapter: 'indexeddb', // Most secure for web
      autoMigrate: true
    }
  }
});
```

## Troubleshooting

### Common Issues

#### 1. Login Fails Silently
- Check network connectivity
- Verify API endpoints are accessible
- Ensure client credentials are correct
- Check browser console for detailed errors

#### 2. Roles Not Detected
- Verify JWT token contains role information
- Check role hierarchy configuration
- Ensure context IDs are properly set
- Validate role detection logic

#### 3. Storage Issues
- Clear browser storage and retry
- Check storage adapter compatibility
- Verify encryption key consistency
- Test with different storage adapters

#### 4. Session Expires Quickly
- Check server-side session configuration
- Verify token refresh settings
- Ensure system clocks are synchronized
- Review session timeout values

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const sdk = new ACubeSDK({
  debug: true,
  auth: {
    enableDebugLogs: true
  }
});
```

This comprehensive documentation covers all aspects of the A-Cube E-Receipt SDK authentication system, from basic setup to advanced configurations and troubleshooting.