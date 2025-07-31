/**
 * A-Cube E-Receipts SDK - React Native Entry Point
 * Enterprise-grade TypeScript SDK for A-Cube e-receipt system integration
 * 
 * This entry point excludes Node.js specific modules for React Native compatibility
 */

// Core SDK
import { ACubeSDK, createACubeSDK, type ACubeSDKConfig } from './core/sdk';

// Types
export * from './types/branded';

export type * from './types/events';


export {
  PEMs,
  PEMsResource,
} from './resources/pems';

// OpenAPI Resources
export {
  Cashiers,
  CashiersResource,
} from './resources/cashiers';

export {
  Receipts,
  ReceiptsResource,
} from './resources/receipts';

export {
  Merchants,
  MerchantsResource,
} from './resources/merchants';

export {
  LocalStorageAdapter,
} from './storage/adapters/localstorage-adapter';

export {
  PointOfSales,
  PointOfSalesResource,
} from './resources/point-of-sales';

export {
  ReactNativeStorageAdapter,
} from './storage/adapters/react-native-storage';

export {
  CashRegisters,
  CashRegistersResource,
} from './resources/cash-registers';

export { ACubeSDK, createACubeSDK, DEFAULT_SDK_CONFIG, type ACubeSDKConfig } from './core/sdk';

export {
  // Storage Adapters
  IndexedDBAdapter,
} from './storage/adapters/indexeddb-adapter';

export {
  OptimizedReactNativeStorageAdapter,
} from './storage/adapters/optimized-react-native-storage';

// Note: QualityManager and DependencyManager are excluded as they depend on Node.js modules

export {
  // Sync System
  type SyncResult,
  type SyncOptions,
  type SyncConflict,
  type ConnectionInfo,
} from './sync/types';

export {
  type SignatureConfig,
  // Security Services
  type EncryptionConfig,
  type KeyRotationConfig,
} from './security/index';

export {
  type ValidationIssue,
  // Validation System
  type ValidationConfig,
  type ValidationResult,
} from './validation/index';

// Circuit Breaker
export {
  CircuitBreaker,
  type CircuitBreakerState,
  type CircuitBreakerConfig,
  type CircuitBreakerMetrics,
} from './http/circuit-breaker';

// HTTP Client and Configuration
export {
  HttpClient,
  AUTH_HTTP_CONFIG,
  type HttpResponse,
  type RequestOptions,
  DEFAULT_HTTP_CONFIG,
  type HttpClientConfig,
} from './http/client';

// Base OpenAPI Resource
export {
  BaseOpenAPIResource,
  type ValidationContext,
  type BaseResourceConfig,
  type RequestOptions as OpenAPIRequestOptions,
} from './resources/base-openapi';

export {
  useEnhancedACubeOffline,
  type EnhancedOfflineResult,
  // Enhanced Offline Hook
  type EnhancedOfflineOptions,
} from './storage/queue/enhanced-offline-hook';

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

// OpenAPI Endpoints
export {
  PEMEndpoints,
  CashierEndpoints,
  ReceiptEndpoints,
  MerchantEndpoints,
  CashRegisterEndpoints,
  PointOfSalesEndpoints,
  type EndpointDefinition,
} from './generated/endpoints';

export {
  AuditPlugin,
  CachePlugin,
  DebugPlugin,
  PluginManager,
  type BasePlugin,
  AnalyticsPlugin,
  // Plugin System
  type PluginConfig,
  PerformancePlugin,
  type PluginContext,
} from './plugins/index';

// Authentication Types
export type {
  AuthUser,
  UserRole,
  AuthState,
  AuthError,
  SessionInfo,
  LogoutOptions,
  SimpleUserRole,
  StoredAuthData,
  PermissionCheck,
  LoginCredentials,
  PermissionResult,
  OAuth2TokenResponse,
} from './auth/types';

export {
  type Role,
  type User,
  type Permission,
  type GDPRConfig,
  type FiscalConfig,
  FiscalAuditManager,
  AccessControlManager,
  GDPRComplianceManager,
  // Compliance and Security
  type AccessControlConfig,
} from './compliance/index';

export {
  createStorage,
  StorageFactory,
  storageFactory,
  UnifiedStorageImpl,
  createSecureStorage,
  // Storage Factory
  type StorageFactoryConfig,
  createCompatibilityStorage,
  createHighPerformanceStorage,
} from './storage/storage-factory';

export {
  getPlatform,
  hasCapability,
  platformDetector,
  // Platform Detection
  type PlatformType,
  getEnvironmentInfo,
  getPerformanceTier,
  type EnvironmentInfo,
  type PlatformCapabilities,
  getRecommendedStorageAdapter,
} from './storage/platform-detector';

export {
  type EncryptionMetadata,
  createEncryptionService,
  StorageEncryptionService,
  type EncryptionKeyManager,
  // Encryption Service
  type StorageEncryptionConfig,
  createSecureEncryptionService,
  createMinimalEncryptionService,
} from './storage/encryption-service';

// Middleware
export {
  MiddlewareStack,
  type Middleware,
  LoggingMiddleware,
  type RequestContext,
  RequestIdMiddleware,
  UserAgentMiddleware,
  type ResponseContext,
  ContentTypeMiddleware,
  PerformanceMiddleware,
  RateLimitingMiddleware,
  AuthenticationMiddleware,
} from './http/middleware';

// Error Handling
export {
  FiscalError,
  NetworkError,
  ACubeSDKError,
  NotFoundError,
  RateLimitError,
  type AuditInfo,
  ValidationError,
  AuthorizationError,
  ConfigurationError,
  AuthenticationError,
  CircuitBreakerError,
  createErrorFromResponse,
  type ValidationViolation,
} from './errors/index';

export {
  PWAUtils,
  // PWA (Progressive Web App) System
  PWAManager,
  PWA_CONSTANTS,
  type PWAEvents,
  type CacheInfo,
  ManifestGenerator,
  type WebAppManifest,
  type PWAManagerConfig,
  type CacheUpdateEvent,
  type PWAManifestConfig,
  type OfflineQueueEvent,
  type ServiceWorkerMessage,
} from './pwa/index';

// Offline System Components
export {
  RetryManager,
  PriorityQueue,
  // Queue Management
  type QueueItem,
  BatchProcessor,
  QueueAnalytics,
  type QueueStats,
  type QueueConfig,
  type QueuePriority,
  type BatchOperation,
  EnterpriseQueueManager,
  type QueueOperationType,
  ConflictResolverManager,
  type ConflictResolutionStrategy,
} from './storage/queue/index';

// Storage Layer
export {
  // Storage Errors
  StorageError,
  type StorageKey,
  createStorageKey,
  type StorageValue,
  type StorageEntry,
  type QueryOptions,
  type StorageStats,
  STORAGE_NAMESPACES,
  // Unified Storage Interface
  type UnifiedStorage,
  type StorageAdapter,
  type StorageOptions,

  StorageCapacityError,
  StorageConnectionError,
  StorageEncryptionError,
  type StorageTransaction,
  StorageTransactionError,
} from './storage/unified-storage';

export {
  // Core React Hooks
  useAuth,
  useUser,
  useACube,
  useLogin,
  useRoles,
  useLogout,
  useSession,
  useACubeSDK,

  // UI-free Authentication Hooks
  useAuthForm,
  useIsOnline,
  // Authentication System (UI-free)
  AuthProvider,
  // React Provider System
  ACubeProvider,
  // Data Management Hooks
  useACubeQuery,
  useACubeCache,

  useAuthStatus,
  useRoleSwitch,
  useAuthContext,
  usePermissions,
  useRequireAuth,
  useRequireRole,

  useUserProfile,
  readinessUtils,
  useACubeStorage,
  useACubeOffline,
  useAuthAvailable,

  useACubeMutation,
  diagnosticsUtils,
  // Network Hooks
  useNetworkStatus,
  useProtectedRoute,
  usePermissionGate,
  platformReadiness,

  type PlatformInfo,
  useACubeSyncEngine,
  type NetworkStatus,
  platformDiagnostics,
  useACubeQueueManager,

  useACubeSubscription,
  useACubeNetworkStatus,
  // Types for React Integration
  type AuthContextValue,

  useACubeNetworkManager,
  type AuthProviderProps,
  type ACubeContextValue,
  type ACubeProviderProps,
  useIsExpensiveConnection,
  type PlatformReadinessInfo,
  type UseNetworkStatusOptions,
  type PlatformDiagnosticsData,
  // Platform Services (Framework-agnostic)
  type DetailedPlatformDetection,
} from './hooks/react/index';

/*
 * UI COMPONENTS REMOVED - NOW UI-FREE ARCHITECTURE
 * 
 * All platform UI components have been removed and replaced with framework-agnostic services:
 * - PlatformView, PlatformText → Use platform detection services with your own React Native components
 * - Platform component logic → Use platformUtils for platform-specific behavior
 * - UI rendering logic → Create your own React Native components using provided services
 * 
 * For React Native specific implementation:
 * 1. Use your own React Native component libraries (NativeBase, React Native Elements, etc.)
 * 2. Use platformReadiness and platformDiagnostics services for platform detection
 * 3. Create custom React Native UI components using the provided hooks and services
 * 
 * Benefits for React Native:
 * - Works with any React Native UI library (NativeBase, React Native Elements, etc.)
 * - Smaller bundle size
 * - Better performance
 * - More customizable styling
 */

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