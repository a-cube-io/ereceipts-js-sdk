# SecureTokenStorage - Usage Examples

## Configuration

```typescript
import { SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

// Configure with custom settings
SecureTokenStorage.configure({
  encryptionKeyId: 'my-app-key-v1',
  storeNamespace: 'my-app-secure-store'
});

// Get current configuration
const config = SecureTokenStorage.getConfig();
console.log(config);
```

## Basic Token Management

```typescript
// Store a token
const authToken = {
  access_token: 'jwt-token-here',
  token_type: 'Bearer',
  expires_in: 3600
};

await SecureTokenStorage.storeToken(authToken);

// Check if token is valid
const isValid = await SecureTokenStorage.isTokenValid();
console.log('Token is valid:', isValid);

// Get token
const token = await SecureTokenStorage.getToken();
console.log('Stored token:', token);

// Store user info from JWT
await SecureTokenStorage.storeUserInfo(token);

// Get user details
const userEmail = await SecureTokenStorage.getUserEmail();
const userRole = await SecureTokenStorage.getUserRole();
```

## Advanced Features

```typescript
// Health check
const healthCheck = await SecureTokenStorage.checkStorageHealth();
console.log('Storage health:', healthCheck);
// Output: { isHealthy: true, platform: 'web', storageType: 'IndexedDB', issues: [] }

// Get detailed storage stats
const stats = await SecureTokenStorage.getStorageStats();
console.log('Storage stats:', stats);

// Get token expiry information
const expiryInfo = await SecureTokenStorage.getTokenExpiryInfo();
console.log('Token expires in:', expiryInfo.expiresInMs, 'ms');

// Export data (for debugging/migration)
const exportedData = await SecureTokenStorage.exportData();
console.log('All stored data:', exportedData);
```

## Platform-Specific Behavior

### Web
- **Primary**: IndexedDB with namespace support
- **Fallback**: localStorage with warning
- **Encryption**: Ready for future implementation

### React Native  
- **Primary**: react-native-keychain for secure items
- **Fallback**: AsyncStorage for non-secure items
- **Encryption**: Ready for future implementation

## Error Handling

The storage system includes comprehensive error handling and logging:

```typescript
// All methods handle errors gracefully
try {
  await SecureTokenStorage.storeToken(authToken);
} catch (error) {
  // Errors are logged automatically via apiLogger
  console.error('Failed to store token:', error);
}

// Check storage health periodically
const health = await SecureTokenStorage.checkStorageHealth();
if (!health.isHealthy) {
  console.warn('Storage issues detected:', health.issues);
}
```

## Migration from Old Version

If you're upgrading from a previous version:

```typescript
// Export existing data
const oldData = await SecureTokenStorage.exportData();

// Reconfigure with new settings
SecureTokenStorage.configure({
  encryptionKeyId: 'new-key-v2',
  storeNamespace: 'new-namespace'
});

// Data will be automatically migrated on next access
```