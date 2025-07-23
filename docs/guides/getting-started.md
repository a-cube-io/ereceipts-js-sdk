# Getting Started Guide

## Installation

```bash
npm install @a-cube-io/ereceipts-js-sdk
```

### Platform Dependencies

**React Native:**
```bash
npm install @react-native-async-storage/async-storage react-native-keychain @react-native-community/netinfo
```

**Web/PWA:**
No additional dependencies required.

## Basic Setup

### 1. Choose Your Integration Method

#### Option A: React Provider (Recommended for React Apps)

```tsx
import React from 'react';
import { EReceiptsProvider, useEReceipts } from '@a-cube-io/ereceipts-js-sdk';

function App() {
  return (
    <EReceiptsProvider
      config={{
        environment: 'sandbox', // 'sandbox' | 'production' | 'development'
        enableLogging: true,
        enableOfflineQueue: true,
        onInitialized: () => console.log('✅ SDK Ready!'),
        onAuthChange: (isAuth) => console.log('🔐 Auth:', isAuth)
      }}
    >
      <YourAppContent />
    </EReceiptsProvider>
  );
}

function YourAppContent() {
  const { isInitialized, isLoading, error } = useEReceipts();
  
  if (isLoading) return <div>🔄 Loading SDK...</div>;
  if (error) return <div>❌ Error: {error.message}</div>;
  if (!isInitialized) return <div>⏳ SDK not ready...</div>;
  
  return <div>🚀 SDK is ready to use!</div>;
}
```

#### Option B: Manual Initialization

```typescript
import { initializeEReceipts, SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

// Configure secure storage (optional)
SecureTokenStorage.configure({
  encryptionKeyId: 'your-app-key',
  storeNamespace: 'your-app-store'
});

// Initialize SDK
await initializeEReceipts({
  environment: 'sandbox', // 'sandbox' | 'production' | 'development'
  enableLogging: true,
  enableOfflineQueue: true
});

// Check if SDK is ready
const isReady = await checkSDKStatus();
console.log('SDK Ready:', isReady);
```

### Environment Guide

| Environment | When to Use | API Base | Auth Base |
|-------------|-------------|----------|-----------|
| `sandbox` (default) | Development & testing | `ereceipts-it-sandbox.acubeapi.com` | `common-sandbox.api.acubeapi.com` |
| `production` | Live deployment | `ereceipts-it.acubeapi.com` | `common.api.acubeapi.com` |
| `development` | Local development | `ereceipts-it.dev.acubeapi.com` | `common-sandbox.api.acubeapi.com` |

### 2. Authentication (User-Friendly)

```typescript
import { loginAsMerchant, loginAsProvider, loginAsCashier } from '@a-cube-io/ereceipts-js-sdk';

// Login with automatic error handling
const result = await loginAsMerchant('merchant@example.com', 'password');

if (result.success) {
  console.log('✅ Login successful!');
  console.log('Token:', result.token.access_token);
} else {
  console.error('❌ Login failed:', result.error?.message);
}

// Other login methods
const providerResult = await loginAsProvider('provider@company.com', 'password');
const cashierResult = await loginAsCashier('cashier@store.com', 'password');
```

#### With React Provider

```tsx
import { useEReceipts, loginAsMerchant } from '@a-cube-io/ereceipts-js-sdk';

function LoginComponent() {
  const { isAuthenticated, currentUser, refreshAuthStatus } = useEReceipts();

  const handleLogin = async () => {
    const result = await loginAsMerchant('merchant@example.com', 'password');
    if (result.success) {
      // Provider automatically detects auth change
      await refreshAuthStatus(); // Optional: force immediate refresh
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {currentUser?.email}!</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 3. Create Receipt

```typescript
import { createReceipt } from '@a-cube-io/ereceipts-js-sdk';

const receipt = await createReceipt({
  items: [{
    description: 'Coffee',
    quantity: '1.00',
    unit_price: '2.50',
    good_or_service: 'B',
    vat_rate_code: '22'
  }],
  cash_payment_amount: '2.50'
});
```

## Next Steps

- [Authentication Flow](auth-flow.md)
- [Receipt Management](receipt-management.md)
- [Advanced Configuration](../api/configuration.md)