# Secure Storage Service Documentation

## Overview

The A-Cube E-Receipt SDK provides a comprehensive secure storage system that automatically encrypts sensitive data at rest. This service handles authentication tokens, certificates, private keys, and other sensitive information with enterprise-grade security.

## Features

- **🔐 Automatic Encryption**: Sensitive data is automatically encrypted using AES-GCM with PBKDF2 key derivation
- **🌍 Cross-Platform**: Works seamlessly on React (Web) and React Native platforms
- **📱 Platform-Specific Storage**: Uses IndexedDB/localStorage on web, Keychain on iOS, and Keystore on Android
- **🔄 Backward Compatibility**: Gracefully handles existing plain-text data during migration
- **⚡ Type-Safe**: Full TypeScript support with strict typing
- **🛡️ Secure by Default**: Critical keys are automatically identified and encrypted

## Architecture

### Storage Layers

```
┌─────────────────────────┐
│   Application Layer     │
├─────────────────────────┤
│  SecureTokenStorage     │  ← Main API
├─────────────────────────┤
│  Platform Storage       │  ← Web/React Native specific
│  - WebSecureStorage     │
│  - React Native         │
├─────────────────────────┤
│  Encryption Service     │  ← AES-GCM encryption
├─────────────────────────┤
│  Native Storage         │  ← IndexedDB/Keychain/Keystore
└─────────────────────────┘
```

### Encryption Flow

```
Plain Text → PBKDF2 Key Derivation → AES-GCM Encryption → Base64 Encoding → Storage
```

## Quick Start

### 1. Configuration (Required)

```typescript
import { SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

// Configure before any storage operations
SecureTokenStorage.configure({
  encryptionKeyId: 'your-app-encryption-key-v1',
  storeNamespace: 'your-app-secure-store'
});
```

### 2. Basic Usage

```typescript
// Store sensitive data (automatically encrypted)
await SecureTokenStorage.setItem('acube_access_token', 'your-jwt-token');

// Retrieve data (automatically decrypted)
const token = await SecureTokenStorage.getItem('acube_access_token');

// Remove data
await SecureTokenStorage.removeItem('acube_access_token');
```

### 3. Token Management

```typescript
// Store authentication token
await SecureTokenStorage.storeToken({
  access_token: 'jwt-token-here',
  token_type: 'Bearer',
  expires_in: 3600
});

// Check if token is valid
const isValid = await SecureTokenStorage.isTokenValid();

// Get user information from token
const userRole = await SecureTokenStorage.getUserRole();
const userEmail = await SecureTokenStorage.getUserEmail();
```

## Configuration

### SecureStorageConfig

```typescript
interface SecureStorageConfig {
  encryptionKeyId: string;    // Unique identifier for encryption context
  storeNamespace: string;     // Storage namespace to avoid conflicts
}
```

#### Parameters

- **encryptionKeyId**: A unique identifier for your encryption context. This should be version-controlled (e.g., `myapp-v1`, `myapp-v2`) to support key rotation.
- **storeNamespace**: A namespace for your storage to avoid conflicts with other applications.

### Best Practices for Configuration

```typescript
// ✅ Good: Versioned encryption key
SecureTokenStorage.configure({
  encryptionKeyId: 'myapp-encryption-v1',
  storeNamespace: 'myapp-secure-data'
});

// ❌ Bad: Generic or unversioned key
SecureTokenStorage.configure({
  encryptionKeyId: 'key',
  storeNamespace: 'data'
});
```

## API Reference

### Core Methods

#### `configure(config: SecureStorageConfig): void`

Initializes the secure storage system with encryption parameters.

```typescript
SecureTokenStorage.configure({
  encryptionKeyId: 'myapp-v1',
  storeNamespace: 'myapp-store'
});
```

#### `setItem(key: string, value: string): Promise<void>`

Stores a key-value pair. Automatically encrypts if the key is sensitive.

```typescript
await SecureTokenStorage.setItem('acube_access_token', token);
```

#### `getItem(key: string): Promise<string | null>`

Retrieves a value by key. Automatically decrypts if the key was stored encrypted.

```typescript
const token = await SecureTokenStorage.getItem('acube_access_token');
```

#### `removeItem(key: string): Promise<void>`

Removes a stored item.

```typescript
await SecureTokenStorage.removeItem('acube_access_token');
```

### Token Management

#### `storeToken(token: AuthToken): Promise<void>`

Stores an authentication token with automatic expiry handling.

```typescript
await SecureTokenStorage.storeToken({
  access_token: 'jwt-token',
  token_type: 'Bearer',
  expires_in: 3600
});
```

#### `getToken(): Promise<string | null>`

Retrieves the stored access token.

```typescript
const token = await SecureTokenStorage.getToken();
```

#### `isTokenValid(): Promise<boolean>`

Checks if the stored token exists and hasn't expired.

```typescript
const isValid = await SecureTokenStorage.isTokenValid();
```

#### `removeToken(): Promise<void>`

Removes all token-related data.

```typescript
await SecureTokenStorage.removeToken();
```

### User Information

#### `storeUserInfo(token: string): Promise<void>`

Extracts and stores user information from a JWT token.

```typescript
await SecureTokenStorage.storeUserInfo(jwtToken);
```

#### `getUserRole(): Promise<string | null>`

Gets the user's role from stored information.

```typescript
const role = await SecureTokenStorage.getUserRole(); // 'provider' | 'merchant'
```

#### `getUserEmail(): Promise<string | null>`

Gets the user's email from stored information.

```typescript
const email = await SecureTokenStorage.getUserEmail();
```

### Utility Methods

#### `clearAll(): Promise<void>`

Clears all stored data (use with caution).

```typescript
await SecureTokenStorage.clearAll();
```

#### `getStorageStats(): Promise<StorageStats>`

Gets statistics about stored data.

```typescript
const stats = await SecureTokenStorage.getStorageStats();
console.log(stats);
// {
//   hasToken: true,
//   hasUserInfo: true,
//   tokenExpiryInfo: { isExpired: false, expiresAt: '2024-...' },
//   configuredNamespace: 'myapp-store',
//   encryptionKeyId: 'myapp-v1'
// }
```

## Security Features

### Automatic Encryption

The following keys are automatically encrypted:

- `acube_access_token` - Authentication tokens
- `acube_refresh_token` - Refresh tokens  
- `acube_mtls_cert_*` - mTLS certificates
- `acube_mtls_key_*` - mTLS private keys

### Encryption Specifications

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with SHA-256
- **Iterations**: 100,000 (OWASP recommended)
- **IV**: 96-bit random per encryption
- **Salt**: 256-bit random per installation

### Platform Security

#### Web Platform

- **Primary**: IndexedDB with encryption
- **Fallback**: localStorage with encryption
- **Context**: Isolated by origin policy

#### React Native Platform

- **iOS**: Keychain Services with hardware encryption
- **Android**: Android Keystore with hardware encryption
- **Fallback**: AsyncStorage with software encryption

## Error Handling

### Common Errors

#### Configuration Not Initialized

```typescript
// Error: SecureTokenStorage must be configured before use
// Solution: Call configure() first
SecureTokenStorage.configure({
  encryptionKeyId: 'myapp-v1',
  storeNamespace: 'myapp-store'
});
```

#### Encryption Failures

```typescript
try {
  await SecureTokenStorage.setItem('key', 'value');
} catch (error) {
  if (error.message.includes('Encryption failed')) {
    // Handle encryption error - possibly unsupported platform
    console.error('Encryption not supported on this platform');
  }
}
```

#### Storage Quota Exceeded

```typescript
try {
  await SecureTokenStorage.setItem('large-key', largeData);
} catch (error) {
  if (error.message.includes('QuotaExceededError')) {
    // Handle storage quota - clear old data or reduce payload
    await SecureTokenStorage.clearAll();
  }
}
```

## Platform Considerations

### Web Platform

#### Browser Compatibility

- **Required**: Web Crypto API support
- **Supported**: Chrome 37+, Firefox 34+, Safari 7+, Edge 12+
- **Fallback**: Graceful degradation to unencrypted storage with warnings

#### Storage Limits

- **IndexedDB**: ~50% of available disk space
- **localStorage**: ~5-10MB (varies by browser)

### React Native Platform

#### iOS Requirements

- **iOS 9.0+**: Required for Keychain access
- **Hardware Encryption**: Automatic on devices with Secure Enclave

#### Android Requirements

- **API Level 18+**: Required for Android Keystore
- **Hardware Encryption**: Automatic on devices with hardware security module

## Migration Guide

### Upgrading from Plain Text

The service automatically handles migration from plain text storage:

```typescript
// Existing plain text data is transparently handled
const existingData = await SecureTokenStorage.getItem('some-key');
// Data is returned as-is if it was stored as plain text

// New data is automatically encrypted
await SecureTokenStorage.setItem('some-key', 'new-encrypted-value');
```

### Key Rotation

To rotate encryption keys:

1. **Update Configuration**:

```typescript
SecureTokenStorage.configure({
  encryptionKeyId: 'myapp-v2', // New version
  storeNamespace: 'myapp-store'
});
```

2. **Migrate Data** (if needed):

```typescript
// Export data with old key
const oldData = await SecureTokenStorage.exportData();

// Reconfigure with new key
SecureTokenStorage.configure({
  encryptionKeyId: 'myapp-v2',
  storeNamespace: 'myapp-store'
});

// Import data (will be encrypted with new key)
await SecureTokenStorage.importData(oldData);
```

## Performance Considerations

### Encryption Overhead

- **Encryption**: ~1-5ms per operation
- **Key Derivation**: ~10-50ms (cached after first use)
- **Storage**: Similar to native platform performance

### Optimization Tips

1. **Batch Operations**: Group multiple storage operations
2. **Lazy Loading**: Only decrypt data when needed
3. **Caching**: Cache frequently accessed data in memory

## Testing

### Unit Testing

```typescript
import { SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

describe('SecureTokenStorage', () => {
  beforeEach(() => {
    SecureTokenStorage.configure({
      encryptionKeyId: 'test-key-v1',
      storeNamespace: 'test-store'
    });
  });

  it('should store and retrieve encrypted data', async () => {
    await SecureTokenStorage.setItem('acube_access_token', 'test-token');
    const retrieved = await SecureTokenStorage.getItem('acube_access_token');
    expect(retrieved).toBe('test-token');
  });
});
```

### Integration Testing

```typescript
// Test cross-platform compatibility
describe('Cross-Platform Storage', () => {
  it('should work on web platform', async () => {
    // Mock web environment
    Object.defineProperty(window, 'crypto', {
      value: { subtle: mockWebCrypto }
    });
    
    // Test operations
    await SecureTokenStorage.setItem('test-key', 'test-value');
    expect(await SecureTokenStorage.getItem('test-key')).toBe('test-value');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Web Crypto API not available"

**Cause**: Running on unsupported platform or HTTP (not HTTPS)  
**Solution**: Use HTTPS in production, provide fallback for development

#### 2. "Storage quota exceeded"

**Cause**: Too much data stored  
**Solution**: Implement data cleanup strategy

#### 3. "Configuration not initialized"

**Cause**: Using storage before calling `configure()`  
**Solution**: Call `configure()` during app initialization

#### 4. "Decryption failed"

**Cause**: Data corruption or key mismatch  
**Solution**: Clear storage and re-authenticate user

### Debug Mode

Enable detailed logging:

```typescript
// Enable debug logging
localStorage.setItem('DEBUG', 'acube:storage:*');

// Or programmatically
import { apiLogger } from '@a-cube-io/ereceipts-js-sdk';
apiLogger.setLevel('debug');
```

## Best Practices

### Security Best Practices

1. **Always Configure First**: Never use storage without proper configuration
2. **Use Versioned Keys**: Version your encryption keys for rotation support
3. **Validate Input**: Sanitize data before storage
4. **Handle Errors**: Implement proper error handling for all storage operations
5. **Clear Sensitive Data**: Remove sensitive data when no longer needed

### Performance Best Practices

1. **Minimize Encryption Operations**: Cache decrypted data when appropriate
2. **Batch Operations**: Group multiple storage operations together
3. **Use Appropriate Storage**: Only encrypt truly sensitive data
4. **Monitor Storage Usage**: Implement storage quota monitoring

### Development Best Practices

1. **Environment-Specific Config**: Use different configs for dev/staging/prod
2. **Test Cross-Platform**: Test on both web and mobile platforms
3. **Handle Offline**: Implement offline-first storage patterns
4. **Version Migration**: Plan for data migration between app versions

## Support

### Reporting Issues

For issues related to secure storage:

1. **Check Prerequisites**: Ensure proper configuration and platform support
2. **Enable Debug Logging**: Capture detailed logs
3. **Provide Context**: Include platform, browser/RN version, and error details
4. **Security Issues**: Report security vulnerabilities privately

### Community

- **Documentation**: [API Reference](./api-reference.md)
- **Examples**: [GitHub Examples](./examples/)
- **Issues**: [GitHub Issues](https://github.com/a-cube-io/ereceipts-js-sdk/issues)

---

*Last updated: 2025-01-25*  
*Version: 1.0.8*  
*License: MIT*
