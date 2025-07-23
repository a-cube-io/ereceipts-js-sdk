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

### 1. Initialize SDK

```typescript
import { initSDK, SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

// Configure secure storage (optional)
SecureTokenStorage.configure({
  encryptionKeyId: 'your-app-key',
  storeNamespace: 'your-app-store'
});

// Initialize SDK
await initSDK({
  environment: 'sandbox',
  enableLogging: true,
  enableOfflineQueue: true
});
```

### 2. Authentication

```typescript
import { loginMerchant } from '@a-cube-io/ereceipts-js-sdk';

const token = await loginMerchant('user@example.com', 'password');
console.log('Authenticated:', token.access_token);
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