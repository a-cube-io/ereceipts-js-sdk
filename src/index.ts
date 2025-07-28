/**
 * A-Cube E-Receipts SDK - Main Entry Point
 * Enterprise-grade TypeScript SDK for A-Cube e-receipt system integration
 */

// Core SDK
export { ACubeSDK, createACubeSDK, type ACubeSDKConfig, DEFAULT_SDK_CONFIG } from './core/sdk';
import { ACubeSDK, createACubeSDK, type ACubeSDKConfig } from './core/sdk';

// HTTP Client and Configuration
export { 
  HttpClient, 
  type HttpClientConfig, 
  type RequestOptions, 
  type HttpResponse,
  DEFAULT_HTTP_CONFIG,
  AUTH_HTTP_CONFIG 
} from './http/client';


// OpenAPI Endpoints
export { 
  CashierEndpoints,
  ReceiptEndpoints,
  CashRegisterEndpoints,
  MerchantEndpoints,
  PEMEndpoints,
  PointOfSalesEndpoints,
  type EndpointDefinition,
} from './generated/endpoints';

// OpenAPI Resources
export {
  CashiersResource,
  Cashiers,
} from './resources/cashiers';

export {
  ReceiptsResource,
  Receipts,
} from './resources/receipts';

export {
  CashRegistersResource,
  CashRegisters,
} from './resources/cash-registers';

export {
  MerchantsResource,
  Merchants,
} from './resources/merchants';

export {
  PEMsResource,
  PEMs,
} from './resources/pems';

export {
  PointOfSalesResource,
  PointOfSales,
} from './resources/point-of-sales';

// Base OpenAPI Resource
export {
  BaseOpenAPIResource,
  type BaseResourceConfig,
  type RequestOptions as OpenAPIRequestOptions,
  type ValidationContext,
} from './resources/base-openapi';

// Types
export * from './types/branded';
export * from './types/events';

// Authentication Types
export type {
  AuthState,
  AuthUser,
  LoginCredentials,
  LogoutOptions,
  UserRole,
  SimpleUserRole,
  AuthError,
  PermissionCheck,
  PermissionResult,
  SessionInfo,
  OAuth2TokenResponse,
  StoredAuthData,
} from './auth/types';

// Storage Layer
export {
  // Unified Storage Interface
  type UnifiedStorage,
  type StorageAdapter,
  type StorageKey,
  type StorageValue,
  type StorageEntry,
  type StorageOptions,
  type QueryOptions,
  type StorageTransaction,
  type StorageStats,
  createStorageKey,
  STORAGE_NAMESPACES,
  
  // Storage Errors
  StorageError,
  StorageConnectionError,
  StorageCapacityError,
  StorageEncryptionError,
  StorageTransactionError,
} from './storage/unified-storage';

export {
  // Platform Detection
  type PlatformType,
  type PlatformCapabilities,
  type EnvironmentInfo,
  platformDetector,
  getPlatform,
  getEnvironmentInfo,
  hasCapability,
  getRecommendedStorageAdapter,
  getPerformanceTier,
} from './storage/platform-detector';

export {
  // Storage Adapters
  IndexedDBAdapter,
} from './storage/adapters/indexeddb-adapter';

export {
  LocalStorageAdapter,
} from './storage/adapters/localstorage-adapter';

export {
  // Encryption Service
  type StorageEncryptionConfig,
  type EncryptionMetadata,
  type EncryptionKeyManager,
  StorageEncryptionService,
  createEncryptionService,
  createSecureEncryptionService,
  createMinimalEncryptionService,
} from './storage/encryption-service';

export {
  // Storage Factory
  type StorageFactoryConfig,
  StorageFactory,
  storageFactory,
  createStorage,
  createSecureStorage,
  createHighPerformanceStorage,
  createCompatibilityStorage,
} from './storage/storage-factory';

// Offline System Components
export {
  // Queue Management
  type QueueItem,
  type QueueOperationType,
  type QueuePriority,
  type QueueStats,
  type ConflictResolutionStrategy,
  type QueueConfig,
  type BatchOperation,
  EnterpriseQueueManager,
  RetryManager,
  ConflictResolverManager,
  BatchProcessor,
  PriorityQueue,
  QueueAnalytics,
} from './storage/queue/index';

export {
  // Enhanced Offline Hook
  type EnhancedOfflineOptions,
  type EnhancedOfflineResult,
  useEnhancedACubeOffline,
} from './storage/queue/enhanced-offline-hook';

export {
  // Sync System
  type SyncResult,
  type SyncOptions,
  type SyncConflict,
  type ConnectionInfo,
} from './sync/types';

export {
  // React Provider System
  ACubeProvider,
  useACube,
  useACubeSDK,
  useACubeStorage,
  useACubeQueueManager,
  useACubeSyncEngine,
  useACubeNetworkManager,
  useACubeNetworkStatus,
  type ACubeContextValue,
  type ACubeProviderProps,
  
  // React Hooks for Data Management
  useACubeOffline,
  useACubeQuery,
  useACubeMutation,
  useACubeCache,
  useACubeSubscription,
  
  // Authentication System
  AuthProvider,
  useAuthContext,
  useAuthAvailable,
  useAuth,
  useLogin,
  useLogout,
  useUser,
  useRoles,
  usePermissions,
  useSession,
  useRequireAuth,
  useRequireRole,
  LoginForm,
  UserProfile,
  RoleSwitcher,
  AuthStatus,
  ProtectedRoute,
  PermissionGate,
  type AuthProviderProps,
  type AuthContextValue,
  type LoginFormProps,
  type UserProfileProps,
  type RoleSwitcherProps,
  type AuthStatusProps,
  type ProtectedRouteProps,
  type PermissionGateProps,
} from './hooks/react/index';

export {
  // Compliance and Security
  type AccessControlConfig,
  type Role,
  type Permission,
  type User,
  type GDPRConfig,
  type FiscalConfig,
  AccessControlManager,
  GDPRComplianceManager,
  FiscalAuditManager,
} from './compliance/index';

export {
  // Security Services
  type EncryptionConfig,
  type KeyRotationConfig,
  type SignatureConfig,
} from './security/index';

export {
  // Plugin System
  type PluginConfig,
  type PluginContext,
  type BasePlugin,
  PluginManager,
  AnalyticsPlugin,
  AuditPlugin,
  CachePlugin,
  DebugPlugin,
  PerformancePlugin,
} from './plugins/index';

export {
  // Quality Gates
  type DependencyConfig,
  QualityManager,
  DependencyManager,
} from './quality/index';

export {
  // Validation System
  type ValidationConfig,
  type ValidationResult,
  type ValidationIssue,
} from './validation/index';

export {
  // PWA (Progressive Web App) System
  PWAManager,
  ManifestGenerator,
  PWAUtils,
  PWA_CONSTANTS,
  type PWAManagerConfig,
  type PWAEvents,
  type CacheInfo,
  type PWAManifestConfig,
  type WebAppManifest,
  type ServiceWorkerMessage,
  type CacheUpdateEvent,
  type OfflineQueueEvent,
} from './pwa/index';

// Error Handling
export {
  ACubeSDKError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  FiscalError,
  RateLimitError,
  ConfigurationError,
  NotFoundError,
  CircuitBreakerError,
  createErrorFromResponse,
  type AuditInfo,
  type ValidationViolation,
} from './errors/index';

// Circuit Breaker
export {
  CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitBreakerState,
  type CircuitBreakerMetrics,
} from './http/circuit-breaker';

// Retry Handler
export {
  RetryHandler,
  type RetryConfig,
  type RetryAttempt,
  type RetryMetrics,
  DEFAULT_RETRY_CONFIG,
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
} from './http/retry';

// Middleware
export {
  MiddlewareStack,
  type Middleware,
  type RequestContext,
  type ResponseContext,
  AuthenticationMiddleware,
  RequestIdMiddleware,
  UserAgentMiddleware,
  ContentTypeMiddleware,
  LoggingMiddleware,
  RateLimitingMiddleware,
  PerformanceMiddleware,
} from './http/middleware';

// Convenience functions for quick setup

/**
 * Initialize SDK with sandbox configuration
 */
export function initializeSandboxSDK(config: Partial<ACubeSDKConfig> = {}): ACubeSDK {
  return createACubeSDK({
    environment: 'sandbox',
    ...config,
  });
}

/**
 * Initialize SDK with production configuration
 */
export function initializeProductionSDK(config: Partial<ACubeSDKConfig> = {}): ACubeSDK {
  return createACubeSDK({
    environment: 'production',
    ...config,
  });
}

/**
 * Initialize SDK with development configuration
 */
export function initializeDevelopmentSDK(config: Partial<ACubeSDKConfig> = {}): ACubeSDK {
  return createACubeSDK({
    environment: 'development',
    ...config,
  });
}

// Version information
export const SDK_VERSION = '2.0.0';
export const API_VERSION = '1.0.0';

// Default export
export default ACubeSDK;