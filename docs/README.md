# ACube E-Receipt SDK

A TypeScript SDK for ACube E-Receipt API with multi-platform support (React, React Native, Expo, browser/PWA, Node.js) and offline-first functionality.

## Features

- 🚀 **Multi-platform support**: Works on React, React Native, Expo, browser/PWA, and Node.js
- 🔐 **OAuth2 authentication** with automatic token refresh
- 📱 **Offline-first** with operation queueing and automatic sync
- ⚡ **TypeScript-first** with full type safety
- 🎯 **Simple API** with minimal configuration
- 🔄 **React hooks** for seamless integration
- 🔒 **Secure storage** using platform-specific secure storage mechanisms

## Installation

```bash
npm install @acube/ereceipts-sdk
```

### Platform-specific dependencies

For React Native:
```bash
npm install @react-native-async-storage/async-storage @react-native-community/netinfo
# For secure storage (choose one):
npm install expo-secure-store  # For Expo
npm install react-native-keychain  # For bare React Native
```

For Expo:
```bash
expo install expo-secure-store @react-native-async-storage/async-storage @react-native-community/netinfo
```

## Quick Start

### Basic Usage (Node.js/Browser)

```typescript
import { createACubeSDK } from '@acube/ereceipts-sdk';

// Initialize SDK
const sdk = await createACubeSDK({
  environment: 'sandbox', // 'production' | 'development' | 'sandbox'
});

// Login
const user = await sdk.login({
  email: 'cashier@example.com',
  password: 'password123'
});

// Create a receipt
const receipt = await sdk.api.receipts.create({
  items: [
    {
      description: 'Coffee',
      quantity: '1.00',
      unit_price: '2.50',
      vat_rate_code: '22'
    }
  ],
  cash_payment_amount: '2.50'
});

console.log('Receipt created:', receipt);
```

### React Integration

```typescript
import React from 'react';
import { ACubeProvider, useAuth, useReceipts } from '@acube/ereceipts-sdk/react';

// Root component
function App() {
  return (
    <ACubeProvider 
      config={{ environment: 'sandbox' }}
      onUserChanged={(user) => console.log('User changed:', user)}
    >
      <ReceiptApp />
    </ACubeProvider>
  );
}

// Component using SDK
function ReceiptApp() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { receipts, createReceipt, isLoading } = useReceipts();

  const handleLogin = async () => {
    await login({
      email: 'cashier@example.com',
      password: 'password123'
    });
  };

  const handleCreateReceipt = async () => {
    await createReceipt({
      items: [
        {
          description: 'Coffee',
          quantity: '1.00',
          unit_price: '2.50',
          vat_rate_code: '22'
        }
      ],
      cash_payment_amount: '2.50'
    });
  };

  if (!isAuthenticated) {
    return <button onClick={handleLogin}>Login</button>;
  }

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <button onClick={handleCreateReceipt} disabled={isLoading}>
        Create Receipt
      </button>
      <ul>
        {receipts.map(receipt => (
          <li key={receipt.uuid}>
            {receipt.total_amount} EUR - {receipt.created_at}
          </li>
        ))}
      </ul>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Environment URLs

The SDK automatically selects the correct API URLs based on the environment:

| Environment | API URL | Auth URL |
|-------------|---------|----------|
| production | https://ereceipts-it.acubeapi.com | https://common.api.acubeapi.com |
| development | https://ereceipts-it.dev.acubeapi.com | https://common-sandbox.api.acubeapi.com |
| sandbox | https://ereceipts-it-sandbox.acubeapi.com | https://common-sandbox.api.acubeapi.com |

## MVP Implementation

This SDK implements core functionality including:

✅ **Authentication System**
- OAuth2 password flow with JWT tokens
- Automatic token refresh with Axios interceptors
- Secure token storage across platforms

✅ **API Client**
- Complete TypeScript API client generated from OpenAPI spec
- Type-safe methods for all endpoints (receipts, cashiers, point-of-sales, etc.)
- Error handling and transformation

✅ **Offline Support**
- Operation queueing when offline
- Automatic sync when connection returns
- Exponential backoff retry strategy

✅ **Multi-Platform Architecture**
- Platform detection and adapter injection
- Conditional exports for different environments
- React/React Native/Expo/Browser/Node.js support

✅ **React Integration**
- Provider pattern with context
- Hooks for authentication, receipts, and offline operations
- Optimistic UI updates

## Basic Example Usage

```typescript
// Works offline automatically!
const receipt = await sdk.api.receipts.create({
  items: [
    {
      description: 'Espresso',
      quantity: '1.00',
      unit_price: '1.50',
      vat_rate_code: '22'
    },
    {
      description: 'Cornetto',
      quantity: '1.00', 
      unit_price: '1.20',
      vat_rate_code: '10'
    }
  ],
  cash_payment_amount: '2.70'
});

// If offline, operation is queued and will sync when online
```

## Architecture

The SDK follows a clean architecture with:

- **Core**: Business logic and configuration
- **Adapters**: Platform-specific implementations
- **API**: Type-safe HTTP client
- **Offline**: Queue and sync management
- **React**: Hooks and provider integration

All built with simplicity and efficiency in mind - **no duplicate logic, minimal dependencies, maximum compatibility**.

## License

MIT