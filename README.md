# A-Cube E-Receipt SDK

> **Enterprise-grade TypeScript SDK for Italian e-receipt system with complete offline-first architecture, real-time sync, and performance optimization.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**A-Cube E-Receipt SDK** provides a complete solution for Italian e-receipt management with enterprise-grade offline capabilities, real-time synchronization, and seamless React integration. Built for POS systems, retail applications, and enterprise solutions requiring tax compliance and high performance.

## ✨ Key Features

### 🚀 **Offline-First Architecture**
- **Progressive Sync Engine** - Intelligent synchronization with conflict resolution
- **Enterprise Storage** - Cross-platform with encryption and compression
- **Queue Management** - Automatic retry, dependency resolution, and batch processing
- **Real-time Collaboration** - Multi-client sync with operational transforms

### ⚡ **Performance Optimization**
- **Large Dataset Handling** - Virtualization and intelligent chunking for 100K+ records
- **Memory Management** - Adaptive caching with LRU/LFU eviction policies
- **Network Optimization** - Compression, request coalescing, and smart prefetching
- **Analytics & Monitoring** - Comprehensive performance metrics and auto-optimization

### 🔗 **React Integration**
- **ACubeProvider** - React Context with complete state management
- **React Hooks** - `useACubeQuery`, `useACubeMutation`, `useACubeCache`, and more
- **Offline Components** - Automatic offline/online state handling
- **Real-time Updates** - WebSocket integration with React Suspense support

### 🛡️ **Enterprise Security & Compliance**
- **Italian Tax Compliance** - Complete fiscal management and audit trails
- **GDPR Compliance** - Data protection and privacy management
- **Access Control** - Role-based permissions and user management
- **Encryption** - AES-256 encryption for sensitive data storage

### 🌐 **Cross-Platform Support**
- **Web** - Modern browsers with IndexedDB storage
- **React Native** - Native iOS/Android with AsyncStorage
- **PWA** - Progressive web apps with Service Worker integration
- **Node.js** - Server-side applications and CLI tools

## 🚀 Quick Start

### Installation

```bash
npm install @a-cube-io/cli
# or
yarn add @a-cube-io/cli
```

### Basic Setup

```typescript
import { ACubeSDK } from '@a-cube-io/cli';

// Initialize the SDK
const sdk = new ACubeSDK({
  environment: 'sandbox', // 'sandbox' | 'production'
  apiKey: 'your-api-key',
  // Offline capabilities enabled by default
  offline: {
    enabled: true,
    storage: 'auto', // auto-detects best storage for platform
    sync: {
      strategy: 'progressive',
      batchSize: 100,
    }
  }
});

// Access resources with full offline support
const receipts = await sdk.receipts.list();
const cashier = await sdk.cashiers.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'cashier'
});
```

### React Integration

```tsx
import { ACubeProvider, useACubeQuery, useACubeMutation } from '@a-cube-io/cli/react';

// 1. Wrap your app with ACubeProvider
function App() {
  return (
    <ACubeProvider 
      config={{
        environment: 'sandbox',
        apiKey: 'your-api-key',
      }}
    >
      <ReceiptsComponent />
    </ACubeProvider>
  );
}

// 2. Use hooks for data fetching with offline support
function ReceiptsComponent() {
  const { data: receipts, isLoading, error } = useACubeQuery({
    queryKey: ['receipts'],
    queryFn: (sdk) => sdk.receipts.list(),
    // Automatic offline/online synchronization
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createReceipt = useACubeMutation({
    mutationFn: (sdk, receiptData) => sdk.receipts.create(receiptData),
    // Optimistic updates with offline queue
    onSuccess: () => {
      // Automatically syncs when online
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Receipts ({receipts?.length})</h1>
      {receipts?.map(receipt => (
        <div key={receipt.id}>{receipt.number}</div>
      ))}
      
      <button onClick={() => createReceipt.mutate({
        number: 'RCP-001',
        amount: 29.99,
        items: [{ name: 'Coffee', price: 2.50, quantity: 2 }]
      })}>
        Create Receipt
      </button>
    </div>
  );
}
```

### CLI Usage

```bash
# Interactive development setup
npx acube init

# Generate types from OpenAPI spec
npx acube generate types

# Development server with webhook testing
npx acube dev --webhooks

# Test e-receipt workflow
npx acube test receipt-flow

# Sync offline data
npx acube sync --force
```

## 📖 Documentation

### 📚 **Getting Started**
- [Installation & Setup](./docs/guides/getting-started.md)
- [React Integration Guide](./docs/guides/react-integration.md)
- [React Native Setup](./docs/guides/react-native-setup.md)
- [PWA Integration](./docs/guides/pwa-integration.md)

### 📋 **API Reference**
- [Core SDK Reference](./docs/api/core-sdk.md)
- [Resources API](./docs/api/resources.md)
- [React Hooks](./docs/api/react-hooks.md)
- [Offline System](./docs/api/offline-system.md)

### 🔄 **Offline & Sync**
- [Offline Capabilities](./docs/guides/offline-capabilities.md)
- [Sync System Deep Dive](./docs/guides/sync-system.md)
- [Conflict Resolution](./docs/guides/conflict-resolution.md)
- [Performance Optimization](./docs/guides/performance.md)

### 🛡️ **Security & Compliance**
- [Italian Tax Compliance](./docs/guides/tax-compliance.md)
- [Security Best Practices](./docs/guides/security.md)
- [GDPR Compliance](./docs/guides/gdpr-compliance.md)

### 💼 **Enterprise Features**
- [Large Dataset Handling](./docs/guides/large-datasets.md)
- [Real-time Collaboration](./docs/guides/real-time.md)
- [Analytics & Monitoring](./docs/guides/analytics.md)
- [Multi-tenant Setup](./docs/guides/multi-tenant.md)

## 🏗️ Architecture Overview

The A-Cube SDK is built with a **modern, enterprise-grade architecture** designed for scalability, reliability, and developer experience:

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Developer API     │    │    React Hooks      │    │   CLI & Tools       │
│ ─────────────────── │    │ ──────────────────── │    │ ─────────────────── │
│ • SDK Resources     │    │ • useACubeQuery      │    │ • acube init        │
│ • Type-safe APIs    │    │ • useACubeMutation   │    │ • acube generate    │
│ • OpenAPI Generated │    │ • useACubeCache      │    │ • acube dev         │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
            │                           │                           │
            └───────────────┬───────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Core SDK (ACubeSDK)                               │
│ ─────────────────────────────────────────────────────────────────────────── │
│ • Lazy-loaded Resources  • Configuration Management  • Plugin Architecture  │
└─────────────────────────────────────────────────────────────────────────────┘
            │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Offline-First System                                │
│ ─────────────────────────────────────────────────────────────────────────── │
│ • Progressive Sync Engine    • Enhanced Sync Manager  • Analytics Monitor  │
│ • Conflict Resolution        • Dependency Manager     • Performance Optimizer│
│ • Real-time Coordinator      • Webhook Manager       • Background Sync     │
└─────────────────────────────────────────────────────────────────────────────┘
            │
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Storage & Infrastructure                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│ • Unified Storage (IndexedDB/AsyncStorage)  • Enterprise Queue Management  │
│ • Encryption Service (AES-256)              • Cross-platform Adapters      │
│ • Network Layer (HTTP/WebSocket)            • Security & Compliance        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Offline-First**: Every operation works offline and syncs when connection is available
2. **Type Safety**: Complete TypeScript support with OpenAPI-generated types
3. **Performance**: Optimized for large datasets with virtualization and caching
4. **Cross-Platform**: Single codebase for Web, React Native, and Node.js
5. **Enterprise-Ready**: Security, compliance, monitoring, and scalability built-in

## 🎯 Use Cases

### 📱 **Point of Sale (POS) Systems**
```typescript
// Complete POS workflow with offline support
const pos = sdk.pointOfSales.current();
const receipt = await sdk.receipts.create({
  cashierId: currentCashier.id,
  pointOfSaleId: pos.id,
  items: cartItems,
  // Works offline, syncs automatically
});

// Print receipt and update inventory
await pos.printReceipt(receipt);
await sdk.inventory.updateFromReceipt(receipt);
```

### 🏢 **Enterprise Retail Chains**
```typescript
// Multi-store management with real-time sync
const stores = await sdk.pointOfSales.list();
const dailyReports = await Promise.all(
  stores.map(store => 
    sdk.analytics.getDailySales(store.id, new Date())
  )
);

// Real-time dashboard updates
sdk.subscribeToUpdates('receipts', (receipt) => {
  updateDashboard(receipt);
});
```

### 🧾 **E-Receipt Mobile Apps**
```tsx
function ReceiptApp() {
  const { user } = useAuth();
  const { data: receipts } = useACubeQuery({
    queryKey: ['user-receipts', user.id],
    queryFn: (sdk) => sdk.receipts.listForUser(user.id),
    // Automatic offline caching
  });

  return (
    <ReceiptList 
      receipts={receipts} 
      onShare={(receipt) => share(receipt.pdf)}
    />
  );
}
```

## 🔧 Configuration

### Basic Configuration

```typescript
const sdk = new ACubeSDK({
  environment: 'sandbox',
  apiKey: process.env.ACUBE_API_KEY,
  
  // HTTP Configuration
  timeout: 30000,
  retries: 3,
  
  // Offline Configuration
  offline: {
    enabled: true,
    storage: 'indexeddb', // 'indexeddb' | 'asyncstorage' | 'memory'
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM'
    },
    sync: {
      strategy: 'progressive', // 'immediate' | 'batched' | 'progressive'
      interval: 30000, // 30 seconds
      batchSize: 100,
      retryAttempts: 5
    }
  },
  
  // Performance Configuration
  performance: {
    enableVirtualization: true,
    maxMemoryUsage: 512, // MB
    cacheSize: 1000,
    compressionEnabled: true
  }
});
```

### Environment Variables

```bash
# API Configuration
ACUBE_API_KEY=your-api-key
ACUBE_ENVIRONMENT=sandbox
ACUBE_BASE_URL=https://ereceipts-it.acubeapi.com

# Security
ACUBE_ENCRYPTION_KEY=your-encryption-key
ACUBE_WEBHOOK_SECRET=your-webhook-secret

# Performance
ACUBE_CACHE_SIZE=1000
ACUBE_BATCH_SIZE=100
ACUBE_TIMEOUT=30000
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/a-cube-io/acube-ereceipt-sdk.git
cd acube-ereceipt-sdk

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build the project
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- receipts.test.ts

# Generate coverage report
npm run test:coverage
```

## 📞 Support & Community

- **📚 Documentation**: [docs.acube.io](https://docs.acube.io)
- **💬 Discord**: [Join our community](https://discord.gg/acube)
- **📧 Email**: [support@acube.io](mailto:support@acube.io)
- **🐛 Issues**: [GitHub Issues](https://github.com/a-cube-io/acube-ereceipt-sdk/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/a-cube-io/acube-ereceipt-sdk/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Italian Agency of Revenue** for e-receipt specifications
- **React Team** for the excellent developer experience
- **TypeScript Team** for type safety and developer productivity
- **Open Source Community** for the tools and libraries that make this possible

---

<div align="center">
  <strong>Built with ❤️ for the Italian e-receipt ecosystem</strong>
  <br />
  <sub>Made by <a href="https://acube.io">A-Cube</a> with enterprise developers in mind</sub>
</div>