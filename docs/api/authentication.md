# Authentication API Reference

The A-Cube SDK provides comprehensive authentication functionality supporting three user roles: Provider, Merchant, and Cashier.

## Overview

The authentication system uses JWT tokens and follows OAuth2 password flow. All authentication data is stored securely using platform-appropriate storage mechanisms.

## User Roles

### Provider
- **Highest privilege level**
- Can create and manage merchants
- Access to all system functionality
- Typical use: System administrators, integrators

### Merchant
- **Business owner level**
- Can manage their own business data
- Create cashiers and cash registers
- Access to business analytics
- Typical use: Business owners, managers

### Cashier
- **Operational level**
- Can create and manage receipts
- Limited to assigned point-of-sale operations
- Typical use: Store employees, cashiers

## Authentication Functions

### `loginProvider(email: string, password: string): Promise<AuthToken>`

Authenticates a user with Provider privileges.

**Parameters:**
- `email` (string): Must be a valid email format
- `password` (string): Must meet security requirements:
  - 8-40 characters length
  - At least one uppercase letter
  - At least one lowercase letter  
  - At least one digit
  - At least one special character (!@#$%^&*)

**Returns:**
```typescript
interface AuthToken {
  access_token: string;    // JWT token
  token_type: string;      // Usually "Bearer"
  expires_in?: number;     // Token lifetime in seconds
}
```

**Throws:**
- `AuthenticationError` with code `'INVALID_CREDENTIALS_FORMAT'` if validation fails
- `AuthenticationError` with code `'LOGIN_FAILED'` if authentication fails

**Example:**
```typescript
import { loginProvider, AuthenticationError } from '@a-cube-io/ereceipts-js-sdk';

try {
  const token = await loginProvider('admin@company.com', 'SecurePass123!');
  console.log('Provider authenticated:', token.access_token);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    console.error('Error code:', error.code);
  }
}
```

### `loginMerchant(email: string, password: string): Promise<AuthToken>`

Authenticates a user with Merchant privileges.

**Parameters:** Same as `loginProvider`
**Returns:** Same as `loginProvider`
**Throws:** Same as `loginProvider`

**Example:**
```typescript
const token = await loginMerchant('owner@restaurant.com', 'MyPassword1!');
```

### `loginCashier(email: string, password: string): Promise<AuthToken>`

Authenticates a user with Cashier privileges.

**Parameters:** Same as `loginProvider`
**Returns:** Same as `loginProvider`
**Throws:** Same as `loginProvider`

**Example:**
```typescript
const token = await loginCashier('cashier@store.com', 'CashierPass2@');
```

### `logout(): Promise<void>`

Logs out the current user and performs cleanup.

**Behavior:**
1. Removes authentication token from secure storage
2. Clears user information
3. Processes any pending offline requests
4. Clears temporary data

**Example:**
```typescript
await logout();
console.log('User logged out successfully');
```

### `isAuthenticated(): Promise<boolean>`

Checks if a user is currently authenticated with a valid token.

**Returns:** 
- `true` if user has valid, non-expired token
- `false` if no token or token is expired

**Side Effects:**
- Automatically removes expired tokens from storage

**Example:**
```typescript
const authenticated = await isAuthenticated();
if (!authenticated) {
  // Redirect to login screen
  redirectToLogin();
}
```

### `getCurrentUser(): Promise<{email: string, role: string} | null>`

Retrieves information about the currently authenticated user.

**Returns:**
```typescript
{
  email: string;    // User's email address
  role: string;     // 'provider', 'merchant', or 'cashier'
} | null            // null if not authenticated
```

**Example:**
```typescript
const user = await getCurrentUser();
if (user) {
  console.log(`Logged in as ${user.email} (${user.role})`);
  
  // Role-based UI rendering
  if (user.role === 'provider') {
    showProviderDashboard();
  } else if (user.role === 'merchant') {
    showMerchantDashboard();
  } else {
    showCashierInterface();
  }
}
```

### `refreshToken(): Promise<AuthToken | null>`

Attempts to refresh the current authentication token.

**Returns:**
- `AuthToken` if refresh successful or current token still valid
- `null` if refresh not available or failed

**Note:** Current API doesn't support refresh tokens, so this checks token validity.

**Example:**
```typescript
const refreshedToken = await refreshToken();
if (!refreshedToken) {
  // Token expired and can't be refreshed
  await logout();
  redirectToLogin();
}
```

### `hasRole(role: string): Promise<boolean>`

Checks if the current user has a specific role.

**Parameters:**
- `role` (string): Role to check ('provider', 'merchant', 'cashier')

**Returns:** `true` if user has the specified role

**Example:**
```typescript
const isProvider = await hasRole('provider');
if (isProvider) {
  // Show provider-only features
  showMerchantManagement();
}

const canCreateReceipts = await hasRole('cashier') || await hasRole('merchant');
if (canCreateReceipts) {
  showReceiptCreation();
}
```

## Security Features

### Secure Storage
- **React Native**: Uses `react-native-keychain` for secure token storage
- **Web**: Uses localStorage with secure prefixes (production should use IndexedDB with encryption)
- **Cross-platform**: Automatic platform detection and appropriate storage selection

### Token Management
- **Automatic Expiry**: Tokens are checked for expiry before use
- **Secure Transmission**: All authentication requests use HTTPS
- **JWT Parsing**: Safe JWT token parsing with error handling
- **Role Extraction**: User role automatically extracted and stored from JWT payload

### Password Requirements
The SDK enforces strong password requirements:
```typescript
// Password validation rules
const passwordRules = {
  minLength: 8,
  maxLength: 40,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,  // !@#$%^&*
};
```

## Error Handling

### AuthenticationError Class
```typescript
class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  );
}
```

### Common Error Codes
- `'INVALID_CREDENTIALS_FORMAT'`: Email or password format invalid
- `'LOGIN_FAILED'`: Authentication failed on server
- `'TOKEN_EXPIRED'`: Current token has expired
- `'NETWORK_ERROR'`: Network connectivity issues

### Error Handling Pattern
```typescript
import { loginProvider, AuthenticationError } from '@a-cube-io/ereceipts-js-sdk';

try {
  await loginProvider(email, password);
} catch (error) {
  if (error instanceof AuthenticationError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS_FORMAT':
        showFormValidationErrors();
        break;
      case 'LOGIN_FAILED':
        showInvalidCredentialsMessage();
        break;
      default:
        showGenericErrorMessage(error.message);
    }
  } else {
    // Network or other system error
    console.error('System error:', error);
  }
}
```

## Best Practices

### 1. Token Lifecycle Management
```typescript
// Check authentication status on app startup
const initializeAuth = async () => {
  const authenticated = await isAuthenticated();
  if (authenticated) {
    const user = await getCurrentUser();
    initializeUserSession(user);
  } else {
    showLoginScreen();
  }
};
```

### 2. Role-Based Access Control
```typescript
const checkPermissions = async (requiredRole: string) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const roleHierarchy = {
    'provider': 3,
    'merchant': 2,
    'cashier': 1
  };
  
  const userLevel = roleHierarchy[user.role];
  const requiredLevel = roleHierarchy[requiredRole];
  
  return userLevel >= requiredLevel;
};
```

### 3. Automatic Token Refresh
```typescript
// Set up periodic token validation
const setupTokenValidation = () => {
  setInterval(async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      // Token expired, logout user
      await logout();
      redirectToLogin();
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};
```

### 4. Secure Logout
```typescript
const secureLogout = async () => {
  try {
    // Process any pending operations first
    await processOfflineQueue();
    
    // Clear authentication
    await logout();
    
    // Clear application state
    clearUserData();
    clearCache();
    
    // Redirect to login
    redirectToLogin();
  } catch (error) {
    console.error('Logout error:', error);
    // Force clear even if errors occur
    await logout();
    redirectToLogin();
  }
};
```

## Integration Examples

### React Hook Usage
```typescript
import { useAuth } from '@a-cube-io/ereceipts-js-sdk';

function AuthGuard({ children, requiredRole = 'cashier' }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  const roleHierarchy = { provider: 3, merchant: 2, cashier: 1 };
  const hasPermission = roleHierarchy[user?.role] >= roleHierarchy[requiredRole];
  
  if (!hasPermission) {
    return <AccessDeniedScreen />;
  }
  
  return children;
}
```

### Form Validation
```typescript
import { validateEmail, validatePassword } from '@a-cube-io/ereceipts-js-sdk';

const validateLoginForm = (email: string, password: string) => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  
  const errors = {};
  
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors[0].message;
  }
  
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors[0].message;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

This comprehensive authentication documentation covers all authentication-related functions, their usage, security considerations, and best practices for integration.