# Authentication API

## Overview
Authentication system supporting three user roles with JWT tokens and secure storage.

## Methods

### `loginProvider(email: string, password: string): Promise<AuthToken>`
Authenticate as a Provider (highest privilege level).

### `loginMerchant(email: string, password: string): Promise<AuthToken>`
Authenticate as a Merchant (business owner level).

### `loginCashier(email: string, password: string): Promise<AuthToken>`
Authenticate as a Cashier (operational level).

### `logout(): Promise<void>`
Logout current user and clear stored tokens.

### `isAuthenticated(): Promise<boolean>`
Check if user is currently authenticated.

### `getCurrentUser(): Promise<UserInfo | null>`
Get current user information from stored JWT.

## Types

```typescript
interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface UserInfo {
  email: string;
  role: 'provider' | 'merchant' | 'cashier';
  sub: string;
  exp: number;
  iat: number;
}
```

## Examples

See [USAGE_EXAMPLE.md](../../USAGE_EXAMPLE.md) for detailed examples.