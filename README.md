# A-Cube SDK

> **Professional TypeScript SDK for A-Cube e-receipt system integration**

[![npm version](https://badge.fury.io/js/primeng.svg)](https://badge.fury.io/js/primeng)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Ready-green.svg)](https://reactnative.dev/)
[![Tree Shakeable](https://img.shields.io/badge/Tree%20Shakeable-✅-brightgreen.svg)](https://webpack.js.org/guides/tree-shaking/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive, cross-platform SDK for integrating the Italian A-Cube e-receipt system into React, React Native, and PWA applications. Built with TypeScript for type safety and modern development practices.

## ✨ Features

- 🚀 **Cross-Platform**: Works seamlessly on React, React Native, and PWA
- 📱 **No Expo Required**: Pure React Native compatibility
- 🔒 **Secure Authentication**: JWT tokens with secure storage (Keychain/localStorage)
- 📄 **Complete E-Receipt Management**: Create, void, return receipts
- 🏪 **Multi-Role Support**: Provider, Merchant, and Cashier roles
- 🌐 **Offline Support**: Request queuing with automatic retry
- 🎯 **Tree Shakeable**: Import only what you need
- 📚 **Full TypeScript**: Complete type definitions and IntelliSense
- 🔧 **Modern Build**: ESM/CJS dual package with tsup
- ⚡ **Performance Optimized**: Minimal bundle size impact


## 📖 Documentation

### 📂 Navigation

| Section | Description | Links |
|---------|-------------|-------|
| **🔧 API Reference** | Core SDK functionality | [Authentication](docs/api/auth.md) • [Receipts](docs/api/receipts.md) • [Merchants](docs/api/merchants.md) |
| **📚 Guides** | Step-by-step tutorials | [Getting Started](docs/guides/getting-started.md) • [Authentication Flow](docs/guides/auth-flow.md) • [Receipt Management](docs/guides/receipt-management.md) |
| **💡 Examples** | Code samples | [React Examples](examples/react/) • [React Native Examples](examples/react-native/) • [Advanced Usage](USAGE_EXAMPLE.md) |
| **🔒 Security** | Token & certificate management | [Secure Storage](#-secure-token-storage) • [mTLS Certificates](docs/security/mtls.md) |
| **🛠️ Development** | SDK development & contribution | [Building](docs/development/building.md) • [Testing](docs/development/testing.md) • [Contributing](CONTRIBUTING.md) |

- [📋 Full API Documentation](docs/README.md)
- [🚀 Quick Start Examples](USAGE_EXAMPLE.md)

## 📦 Installation

```bash
npm install a-cube-io/ereceipts-js-sdk
# or
yarn add a-cube-io/ereceipts-js-sdk
# or
pnpm add a-cube-io/ereceipts-js-sdk
```

### Peer Dependencies

For **React Native** projects:
```bash
npm install @react-native-async-storage/async-storage react-native-keychain @react-native-community/netinfo
```

For **React Web** projects:
```bash
# No additional dependencies required
```

## 🚀 Quick Start

### 1. Initialize the SDK

```typescript
import { initSDK } from 'a-cube-io/ereceipts-js-sdk';

// Initialize SDK (call once at app startup)
await initSDK({
  environment: 'sandbox', // or 'production'
  enableLogging: true,
  enableRetry: true,
  enableOfflineQueue: true
});
```

### 2. Authentication

```typescript
import { loginProvider, loginMerchant, loginCashier } from 'a-cube-io/ereceipts-js-sdk';

// Login as Provider (highest privileges)
const providerToken = await loginProvider('provider@company.com', 'password123');

// Login as Merchant (business owner)
const merchantToken = await loginMerchant('merchant@restaurant.com', 'password123');

// Login as Cashier (operational level)
const cashierToken = await loginCashier('cashier@store.com', 'password123');
```

### 3. Create Your First Receipt

```typescript
import { createReceipt } from 'a-cube-io/ereceipts-js-sdk';

const receipt = await createReceipt({
  items: [
    {
      description: 'Caffè Espresso',
      quantity: '2.00',
      unit_price: '1.50',
      good_or_service: 'B', // 'B' for goods, 'S' for services
      vat_rate_code: '22'
    }
  ],
  cash_payment_amount: '3.00',
  electronic_payment_amount: '0.00'
});

console.log('Receipt created:', receipt.uuid);
```

### 4. Using React Components

```typescript
import React from 'react';
import { Button, FormInput, useAuth } from 'a-cube-io/ereceipts-js-sdk';

function LoginScreen() {
  const { loginAsMerchant, isLoading, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = async () => {
    await loginAsMerchant(email, password);
  };

  return (
    <div>
      <FormInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        required
      />
      
      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        showPasswordToggle
        required
      />
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <Button
        title="Login"
        onPress={handleLogin}
        loading={isLoading}
        disabled={!email || !password}
      />
    </div>
  );
}
```

## 📚 API Reference

### Authentication
- `initSDK(config)` - Initialize the SDK
- `loginProvider(email, password)` - Provider authentication
- `loginMerchant(email, password)` - Merchant authentication  
- `loginCashier(email, password)` - Cashier authentication
- `logout()` - Logout current user
- `isAuthenticated()` - Check authentication status
- `getCurrentUser()` - Get current user info

### Receipt Management
- `createReceipt(data)` - Create new receipt
- `getReceipts(page?, size?)` - List receipts
- `getReceiptById(uuid)` - Get specific receipt
- `voidReceipt(data)` - Void/cancel receipt
- `returnReceiptItems(data)` - Process returns/refunds

### Merchant Management
- `createMerchant(data)` - Create merchant (Provider only)
- `getMerchants(page?)` - List merchants
- `updateMerchant(uuid, data)` - Update merchant info

### React Hooks
- `useAuth()` - Authentication state and actions
- `useRetryQueue()` - Offline queue management
- `useProviderFlow()` - Provider-specific operations

### UI Components
- `<Button />` - Cross-platform button component
- `<FormInput />` - Cross-platform input component

## 🛠️ Configuration

### Environment Setup

```typescript
import { initSDK } from 'a-cube-io/ereceipts-js-sdk';

await initSDK({
  environment: 'sandbox', // 'sandbox' | 'production'
  enableLogging: true,    // Enable debug logging
  enableRetry: true,      // Enable automatic retries
  maxRetries: 3,          // Maximum retry attempts
  retryDelay: 1000,       // Base retry delay (ms)
  enableOfflineQueue: true, // Enable offline request queuing
  timeout: 30000          // Request timeout (ms)
});
```

### Platform-Specific Configuration

#### React Native
```typescript
// No additional configuration needed
// The SDK automatically detects React Native environment
```

#### React Web
```typescript
// Works out of the box with Create React App, Vite, Next.js, etc.
```

## 🔧 Advanced Usage

### 🔒 Secure Token Storage

The SDK includes an advanced cross-platform token storage system with automatic fallbacks and configurable encryption:

```typescript
import { SecureTokenStorage } from 'a-cube-io/ereceipts-js-sdk';

// Configure secure storage (call once at app startup)
SecureTokenStorage.configure({
  encryptionKeyId: 'my-app-key-v1',    // For future encryption
  storeNamespace: 'my-app-secure-store' // Custom IndexedDB namespace
});

// Basic token management
await SecureTokenStorage.storeToken(authToken);
const token = await SecureTokenStorage.getToken();
const isValid = await SecureTokenStorage.isTokenValid();

// Advanced features
const health = await SecureTokenStorage.checkStorageHealth();
const stats = await SecureTokenStorage.getStorageStats();
const expiryInfo = await SecureTokenStorage.getTokenExpiryInfo();

// User info management
await SecureTokenStorage.storeUserInfo(jwtToken);
const userEmail = await SecureTokenStorage.getUserEmail();
const userRole = await SecureTokenStorage.getUserRole();
```

#### Platform-Specific Storage:

| Platform | Primary Storage | Fallback | Features |
|----------|----------------|----------|----------|
| **Web** | IndexedDB | localStorage | Custom namespace, Safari incognito support |
| **React Native** | Keychain | AsyncStorage | Biometric protection, encrypted storage |
| **PWA** | IndexedDB | localStorage | Offline persistence, sync capabilities |

#### Storage Health Monitoring:

```typescript
// Monitor storage health in production
const healthCheck = await SecureTokenStorage.checkStorageHealth();
if (!healthCheck.isHealthy) {
  console.warn('Storage issues:', healthCheck.issues);
  // Handle fallback scenarios
}

// Get detailed statistics
const stats = await SecureTokenStorage.getStorageStats();
console.log(`Token expires in: ${stats.tokenExpiryInfo.expiresInMs}ms`);
```

### Certificate Management

```typescript
import { CertificateStorage } from 'a-cube-io/ereceipts-js-sdk';

// mTLS certificate management for cash registers
await CertificateStorage.storeMTLSCertificate(uuid, certificate);
const cert = await CertificateStorage.getMTLSCertificate(uuid);
```

### Offline Support

```typescript
import { useRetryQueue } from 'a-cube-io/ereceipts-js-sdk';

function OfflineIndicator() {
  const { stats, isConnected, processQueue } = useRetryQueue();
  
  return (
    <div>
      <p>Status: {isConnected ? 'Online' : 'Offline'}</p>
      <p>Queued requests: {stats.total}</p>
      {stats.total > 0 && (
        <button onClick={processQueue}>Retry Queued Requests</button>
      )}
    </div>
  );
}
```

### Validation Utilities

```typescript
import { 
  validateEmail, 
  validatePassword, 
  validateFiscalId,
  validateReceiptItem 
} from 'a-cube-io/ereceipts-js-sdk';

// Validate user input
const emailValidation = validateEmail('user@example.com');
if (!emailValidation.isValid) {
  console.error(emailValidation.errors);
}

// Validate Italian fiscal ID
const fiscalValidation = validateFiscalId('12345678901');

// Validate receipt items
const itemValidation = validateReceiptItem({
  description: 'Product',
  quantity: '1.00',
  unit_price: '10.00'
});
```

## 🏗️ Project Structure

When using the SDK in your project:

```
your-app/
├── src/
│   ├── services/
│   │   └── acube.ts          # SDK initialization
│   ├── components/
│   │   ├── LoginScreen.tsx   # Authentication
│   │   └── ReceiptCreator.tsx # Receipt management
│   └── App.tsx               # Main app
└── package.json
```

## 🤝 TypeScript Support

The SDK is built with TypeScript and provides complete type definitions:

```typescript
import type { 
  ReceiptInput, 
  ReceiptOutput, 
  MerchantCreateInput,
  AuthToken,
  ValidationResult 
} from 'a-cube-io/ereceipts-js-sdk';

// Full IntelliSense and type checking
const receiptData: ReceiptInput = {
  items: [/* typed items */],
  cash_payment_amount: '10.00'
};
```

## 📱 Platform Compatibility

| Feature | React Web | React Native | PWA |
|---------|-----------|--------------|-----|
| Authentication | ✅ | ✅ | ✅ |
| Receipt Management | ✅ | ✅ | ✅ |
| Offline Support | ✅ | ✅ | ✅ |
| Secure Storage | IndexedDB + localStorage | Keychain + AsyncStorage | IndexedDB + localStorage |
| Push Notifications | ❌ | ✅ | ✅ |
| File System Access | ❌ | ✅ | Limited |

## 🔐 Security

- **🔒 Advanced Token Storage**: 
  - **Web**: IndexedDB with custom namespace + localStorage fallback
  - **React Native**: Keychain (biometric) + AsyncStorage fallback
  - **Configurable**: Custom encryption keys and namespaces
  - **Monitoring**: Health checks and automatic fallback detection

- **🔄 Automatic Token Management**: 
  - Token expiry detection and refresh
  - JWT payload parsing and validation
  - User info extraction and secure storage

- **🔐 mTLS Support**: End-to-end encryption for cash register communication
- **✅ Input Validation**: Client-side validation for all inputs
- **🌐 HTTPS Only**: All API communication over HTTPS
- **🛡️ Fallback Strategies**: Graceful degradation when secure storage fails

## 🐛 Troubleshooting

### React Native Issues

1. **Keychain errors on iOS**:
   ```bash
   cd ios && pod install
   ```

2. **AsyncStorage warnings**:
   ```bash
   npm install @react-native-async-storage/async-storage
   ```

3. **Network detection issues**:
   ```bash
   npm install @react-native-community/netinfo
   ```

### Web Issues

1. **Module resolution errors**: Ensure your bundler supports ESM/CJS dual packages
2. **TypeScript errors**: Update to TypeScript 4.0+

## 📄 License

MIT © A-Cube Team

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📞 Support

- 📧 Email: support@acube.it
- 📖 Documentation: [Full API Documentation](https://docs.acube.it)
- 🐛 Issues: [GitHub Issues](https://github.com/acube/a-cube-io/ereceipts-js-sdk/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/acube/a-cube-io/ereceipts-js-sdk/discussions)

---

**Made with ❤️ by the A-Cube Team**