# Tipi TypeScript

Riferimento completo dei tipi TypeScript dell'SDK.

## Configurazione

### Environment

```typescript
type Environment = 'production' | 'development' | 'sandbox';
```

### SDKConfig

```typescript
interface SDKConfig {
  environment: Environment;
  debug?: boolean;
}
```

## Autenticazione

### AuthCredentials

```typescript
interface AuthCredentials {
  email: string;
  password: string;
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;
  fid: string;
  pid: string | null;
  expiresAt: number;
}
```

### TokenResponse

```typescript
interface TokenResponse {
  token: string;
}
```

### JWTPayload

```typescript
interface JWTPayload {
  iat: number;
  exp: number;
  roles: Record<string, string[]>;
  username: string;
  uid: number;
  fid: string;
  pid: string | null;
}
```

## Paginazione

### Page<T>

```typescript
interface Page<T> {
  members: T[];
  total?: number;
  page?: number;
  size?: number;
  pages?: number;
}
```

## Value Objects

### Address

```typescript
interface Address {
  streetAddress: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  province: string;
}
```

### VatRateCode

```typescript
type VatRateCode =
  | '22'
  | '10'
  | '5'
  | '4'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'N5'
  | 'N6'
  | 'VI'
  | 'VF';
```

## Errori

### SDKError

```typescript
type SDKError =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'UNKNOWN_ERROR'
  | 'STORAGE_CERTIFICATE_ERROR'
  | 'CERTIFICATE_MANAGER_NOT_INITIALIZED'
  | 'SDK_INITIALIZATION_ERROR'
  | 'SDK_NOT_INITIALIZED'
  | 'API_CLIENT_NOT_INITIALIZED'
  | 'MTLS_ADAPTER_NOT_AVAILABLE'
  | 'CERTIFICATE_INFO_ERROR';
```

### ACubeSDKError

```typescript
class ACubeSDKError extends Error {
  type: SDKError;
  message: string;
  originalError?: unknown;
  statusCode?: number;
  violations?: APIViolation[];

  constructor(
    type: SDKError,
    message: string,
    originalError?: unknown,
    statusCode?: number,
    violations?: APIViolation[]
  );
}
```

### APIViolation

```typescript
interface APIViolation {
  propertyPath: string;
  message: string;
}
```

### APIError

```typescript
interface APIError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  violations?: APIViolation[];
}
```

## Eventi

### SDKEvents

```typescript
interface SDKEvents {
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
  onOfflineOperationAdded?: (operationId: string) => void;
  onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
}
```

## Offline

### OperationType

```typescript
type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
```

### ResourceType

```typescript
type ResourceType =
  | 'receipt'
  | 'cashier'
  | 'point-of-sale'
  | 'cash-register'
  | 'merchant'
  | 'pem';
```

### OperationStatus

```typescript
type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

### QueuedOperation

```typescript
interface QueuedOperation {
  id: string;
  type: OperationType;
  resource: ResourceType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  headers?: Record<string, string>;
  status: OperationStatus;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  priority: number;
}
```

### SyncResult

```typescript
interface SyncResult {
  operation: QueuedOperation;
  success: boolean;
  error?: string;
  response?: unknown;
}
```

### BatchSyncResult

```typescript
interface BatchSyncResult {
  totalOperations: number;
  successCount: number;
  failureCount: number;
  results: SyncResult[];
}
```

### QueueStats

```typescript
interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
```

### SyncStatus

```typescript
interface SyncStatus {
  isOnline: boolean;
  isProcessing: boolean;
  queueStats: QueueStats;
}
```

### QueueConfig

```typescript
interface QueueConfig {
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  maxQueueSize: number;
  batchSize: number;
  syncInterval: number;
}
```

## PEM e POS

### PEMStatus

```typescript
type PEMStatus =
  | 'NEW'
  | 'REGISTERED'
  | 'ACTIVATED'
  | 'ONLINE'
  | 'OFFLINE'
  | 'DISCARDED';
```

### PointOfSaleType

```typescript
type PointOfSaleType = 'AP' | 'SP' | 'TM' | 'PV';
```

## Report e Journal

### DailyReportStatus

```typescript
type DailyReportStatus = 'pending' | 'sent' | 'error';
```

### JournalStatus

```typescript
type JournalStatus = 'open' | 'closed';
```

## Import

```typescript
import {
  // Config
  Environment,
  SDKConfig,

  // Auth
  AuthCredentials,
  User,

  // Errors
  ACubeSDKError,
  SDKError,
  APIViolation,

  // Events
  SDKEvents,

  // Pagination
  Page,

  // Value Objects
  Address,
  VatRateCode,

  // Offline
  QueuedOperation,
  SyncResult,
  BatchSyncResult,
  QueueStats,
} from '@acube/ereceipt-sdk';
```

## Prossimi Passi

- [Gestione Errori](./error-handling.md)
- [Offline Mode](./offline-mode.md)
