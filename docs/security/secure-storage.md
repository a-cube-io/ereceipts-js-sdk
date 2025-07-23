# Secure Token Storage

## Overview
Advanced cross-platform token storage system with automatic fallbacks and configurable encryption support.

## Configuration

### `SecureTokenStorage.configure(config: SecureStorageConfig)`
Configure global storage settings.

```typescript
interface SecureStorageConfig {
  encryptionKeyId?: string;    // Key identifier for future encryption
  storeNamespace?: string;     // Custom IndexedDB namespace
}
```

## Core Methods

### Token Management
- `storeToken(token: AuthToken): Promise<void>`
- `getToken(): Promise<string | null>`  
- `removeToken(): Promise<void>`
- `isTokenValid(): Promise<boolean>`

### User Information
- `storeUserInfo(token: string): Promise<void>`
- `getUserEmail(): Promise<string | null>`
- `getUserRole(): Promise<string | null>`

### Advanced Features
- `checkStorageHealth(): Promise<HealthInfo>`
- `getStorageStats(): Promise<StorageStats>`
- `getTokenExpiryInfo(): Promise<ExpiryInfo>`
- `exportData(): Promise<Record<string, string | null>>`

## Platform Support

| Platform | Primary Storage | Fallback | Features |
|----------|----------------|----------|----------|
| Web | IndexedDB | localStorage | Custom namespace, incognito support |
| React Native | Keychain | AsyncStorage | Biometric protection |
| PWA | IndexedDB | localStorage | Offline persistence |

## Security Features

- **Automatic Fallback**: Graceful degradation when secure storage fails
- **Health Monitoring**: Real-time storage status and issue detection  
- **Configurable Encryption**: Ready for encryption implementation
- **Cross-Platform**: Consistent API across all platforms

## Examples

See [USAGE_EXAMPLE.md](USAGE_EXAMPLE.md) for complete usage examples.