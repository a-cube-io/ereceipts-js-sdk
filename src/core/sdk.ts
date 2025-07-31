/**
 * Core ACube SDK - Stripe-style Resource-Based Architecture
 * Main entry point with lazy resource loading and configuration management
 */

import type { EventTypeMap } from '@/types/events';
import type { PEMsResource } from '@/resources/pems';
// Auth system imports (lazy loaded)
import type { AuthService } from '@/auth/auth-service';
import type { AuthStorage } from '@/auth/auth-storage';
import type { TokenManager } from '@/auth/token-manager';
// Resource imports (lazy loaded)
import type { CashiersResource } from '@/resources/cashiers';
import type { ReceiptsResource } from '@/resources/receipts';
import type { MerchantsResource } from '@/resources/merchants';
import type { UnifiedStorage } from '@/storage/unified-storage';
import type { EnhancedAuthMiddleware } from '@/auth/auth-middleware';
// PWA system imports (lazy loaded)
import type { PWAManager, PWAManagerConfig } from '@/pwa/pwa-manager';
import type { PointOfSalesResource } from '@/resources/point-of-sales';
import type { CashRegistersResource } from '@/resources/cash-registers';
import type { EnterpriseQueueManager } from '@/storage/queue/queue-manager';
import type { PerformanceMonitor } from '@/react-native/performance-monitor';
import type { ConnectivityManager } from '@/react-native/connectivity-manager';
import type { BackgroundProcessor } from '@/react-native/background-processor';
// Sync system imports (lazy loaded)
import type { SyncEngineConfig, ProgressiveSyncEngine } from '@/sync/sync-engine';
import type { ManifestGenerator, PWAManifestConfig } from '@/pwa/manifest-generator';
// React Native optimization imports (lazy loaded)
import type { OptimizedReactNativeStorageAdapter } from '@/storage/adapters/optimized-react-native-storage';
import type { AuthUser, UserRole, AuthState, AuthConfig, LogoutOptions, SimpleUserRole, LoginCredentials } from '@/auth/types';

import { EventEmitter } from 'eventemitter3';
import { HttpClient, AUTH_HTTP_CONFIG, DEFAULT_HTTP_CONFIG, type HttpClientConfig } from '@/http/client';

export interface ACubeSDKConfig {
  /**
   * API environment
   */
  environment: 'sandbox' | 'production' | 'development';

  /**
   * API key for authentication
   */
  apiKey?: string;

  /**
   * Custom base URLs for different environments
   */
  baseUrls?: {
    api?: string;
    auth?: string;
  };

  /**
   * HTTP client configuration
   */
  httpConfig?: Partial<HttpClientConfig>;

  /**
   * Authentication configuration
   */
  auth?: {
    // Legacy simple auth (deprecated)
    getToken?: () => Promise<string | null>;
    onTokenExpired?: () => Promise<void>;
    autoRefresh?: boolean;

    // Enhanced enterprise auth system
    enabled?: boolean;
    config?: Partial<AuthConfig>;
    credentials?: {
      username?: string;
      password?: string;
      autoLogin?: boolean;
    };
    storage?: {
      enableEncryption?: boolean;
      storageKey?: string;
      storageAdapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
    };
    middleware?: {
      enableRetry?: boolean;
      maxRetries?: number;
      includeRoleHeaders?: boolean;
      includePermissionHeaders?: boolean;
      includeRequestContext?: boolean;
    };
  };

  /**
   * Logging configuration
   */
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    sanitize: boolean;
  };

  /**
   * Feature flags
   */
  features?: {
    enableRetry?: boolean;
    enableCircuitBreaker?: boolean;
    enableMetrics?: boolean;
    enableOfflineQueue?: boolean;
    enableSync?: boolean;
    enableRealTimeSync?: boolean;
  };

  /**
   * Offline and sync configuration
   */
  offline?: {
    enabled?: boolean;
    storage?: {
      adapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory' | 'auto';
      encryptionKey?: string;
      maxSize?: number; // bytes
    };
    queue?: {
      maxItems?: number;
      maxRetries?: number;
      retryDelay?: number;
      batchSize?: number;
    };
    sync?: Partial<SyncEngineConfig>;
  };

  /**
   * Progressive Web App configuration
   */
  pwa?: {
    enabled?: boolean;
    manager?: Partial<PWAManagerConfig>;
    manifest?: Partial<PWAManifestConfig>;
    autoRegister?: boolean;
    enableInstallPrompts?: boolean;
    enablePushNotifications?: boolean;
    vapidPublicKey?: string;
    appInstaller?: {
      enabled?: boolean;
      autoShow?: boolean;
      criteria?: {
        minEngagementTime?: number;
        minPageViews?: number;
        minReceiptsCreated?: number;
        daysSinceFirstVisit?: number;
        requireReturnVisit?: boolean;
      };
    };
  };

  /**
   * React Native mobile optimizations
   */
  reactNative?: {
    enabled?: boolean;
    storage?: {
      enableOptimizedAdapter?: boolean;
      cacheSize?: number;
      enableCompression?: boolean;
      enableBatching?: boolean;
      batchDelay?: number;
    };
    connectivity?: {
      enableQualityMonitoring?: boolean;
      enableAdaptiveRetry?: boolean;
      enableDataOptimization?: boolean;
      healthCheckUrl?: string;
    };
    backgroundProcessor?: {
      enabled?: boolean;
      maxConcurrentTasks?: number;
      enableBatteryOptimization?: boolean;
      enableAppStateManagement?: boolean;
      enableTaskPersistence?: boolean;
    };
    performanceMonitor?: {
      enabled?: boolean;
      enableMemoryMonitoring?: boolean;
      enableFrameRateMonitoring?: boolean;
      enableBatteryMonitoring?: boolean;
      enableRemoteReporting?: boolean;
    };
  };

  /**
   * Development options
   */
  dev?: {
    enableMocking?: boolean;
    mockDelay?: number;
  };
}

const DEFAULT_SDK_CONFIG: Required<ACubeSDKConfig> = {
  environment: 'sandbox',
  apiKey: '',
  baseUrls: {},
  httpConfig: {},
  auth: {
    autoRefresh: true,
    enabled: true,
    config: {
      loginUrl: '/login',
      refreshUrl: '/token/refresh',
      tokenRefreshBuffer: 5,
      maxRefreshAttempts: 3,
      refreshRetryDelay: 1000,
      storageKey: 'acube_auth',
      storageEncryption: true,
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      enableDeviceBinding: true,
      enableSessionValidation: true,
      enableTokenRotation: true,
    },
    storage: {
      enableEncryption: true,
      storageKey: 'acube_auth',
    },
    middleware: {
      enableRetry: true,
      maxRetries: 2,
      includeRoleHeaders: true,
      includePermissionHeaders: true,
      includeRequestContext: true,
    },
  },
  logging: {
    enabled: true,
    level: 'warn',
    sanitize: true,
  },
  features: {
    enableRetry: true,
    enableCircuitBreaker: true,
    enableMetrics: true,
    enableOfflineQueue: true,
    enableSync: true,
    enableRealTimeSync: true,
  },
  offline: {
    enabled: true,
    storage: {
      adapter: 'auto',
      maxSize: 100 * 1024 * 1024, // 100MB
    },
    queue: {
      maxItems: 1000,
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 50,
    },
    sync: {
      maxConcurrentSyncs: 3,
      defaultTimeout: 30000,
      defaultRetries: 3,
      batchSize: 100,
      enableRollback: true,
      enableDeltaSync: true,
      enableCompression: true,
      checkpointInterval: 5000,
    },
  },
  pwa: {
    enabled: true,
    manager: {
      autoRegister: true,
      enableInstallPrompts: true,
      serviceWorkerPath: '/sw.js',
      appInstaller: {
        enabled: true,
        autoShow: true,
        criteria: {
          minEngagementTime: 2 * 60 * 1000, // 2 minutes
          minPageViews: 3,
          minReceiptsCreated: 1,
          daysSinceFirstVisit: 0,
          requireReturnVisit: false,
        },
      },
    },
    manifest: {
      name: 'A-Cube E-Receipt',
      shortName: 'A-Cube',
      themeColor: '#1976d2',
      backgroundColor: '#ffffff',
      lang: 'it',
    },
    autoRegister: true,
    enableInstallPrompts: true,
    enablePushNotifications: false,
    vapidPublicKey: '',
    appInstaller: {
      enabled: true,
      autoShow: true,
      criteria: {
        minEngagementTime: 2 * 60 * 1000, // 2 minutes
        minPageViews: 3,
        minReceiptsCreated: 1,
        daysSinceFirstVisit: 0,
        requireReturnVisit: false,
      },
    },
  },
  reactNative: {
    enabled: false,
    storage: {
      enableOptimizedAdapter: true,
      cacheSize: 1000,
      enableCompression: true,
      enableBatching: true,
      batchDelay: 50,
    },
    connectivity: {
      enableQualityMonitoring: true,
      enableAdaptiveRetry: true,
      enableDataOptimization: true,
      healthCheckUrl: 'https://ereceipts-it.acubeapi.com/health',
    },
    backgroundProcessor: {
      enabled: true,
      maxConcurrentTasks: 3,
      enableBatteryOptimization: true,
      enableAppStateManagement: true,
      enableTaskPersistence: true,
    },
    performanceMonitor: {
      enabled: true,
      enableMemoryMonitoring: true,
      enableFrameRateMonitoring: true,
      enableBatteryMonitoring: true,
      enableRemoteReporting: false,
    },
  },
  dev: {
    enableMocking: false,
    mockDelay: 0,
  },
};

export class ACubeSDK extends EventEmitter<EventTypeMap> {
  private config: Required<ACubeSDKConfig>;

  private apiClient: HttpClient;

  private authClient: HttpClient;

  private isInitialized = false;

  // Lazy-loaded resources
  private _cashiers?: CashiersResource;

  private _receipts?: ReceiptsResource;

  private _pointOfSales?: PointOfSalesResource;

  private _cashRegisters?: CashRegistersResource;

  private _merchants?: MerchantsResource;

  private _pems?: PEMsResource;

  // Lazy-loaded offline systems
  private _syncManager?: ProgressiveSyncEngine;

  private _storage?: UnifiedStorage;

  private _queueManager?: EnterpriseQueueManager;

  // Lazy-loaded auth systems
  private _authService?: AuthService;

  private _tokenManager?: TokenManager;

  private _authStorage?: AuthStorage;

  private _authMiddleware?: EnhancedAuthMiddleware;

  // Lazy-loaded PWA systems
  private _pwaManager?: PWAManager;

  private _manifestGenerator?: ManifestGenerator;

  // Lazy-loaded React Native optimization systems
  private _optimizedStorage?: OptimizedReactNativeStorageAdapter;

  private _connectivityManager?: ConnectivityManager;

  private _backgroundProcessor?: BackgroundProcessor;

  private _performanceMonitor?: PerformanceMonitor;

  constructor(config: ACubeSDKConfig) {
    super();

    this.config = this.mergeConfig(config);

    // Initialize HTTP clients
    this.apiClient = this.createHttpClient('api');
    this.authClient = this.createHttpClient('auth');

    this.setupEventHandlers();
  }

  private mergeConfig(userConfig: ACubeSDKConfig): Required<ACubeSDKConfig> {
    return {
      ...DEFAULT_SDK_CONFIG,
      ...userConfig,
      baseUrls: {
        ...DEFAULT_SDK_CONFIG.baseUrls,
        ...userConfig.baseUrls,
      },
      httpConfig: {
        ...DEFAULT_SDK_CONFIG.httpConfig,
        ...userConfig.httpConfig,
      },
      auth: {
        ...DEFAULT_SDK_CONFIG.auth,
        ...userConfig.auth,
      },
      logging: {
        ...DEFAULT_SDK_CONFIG.logging,
        ...userConfig.logging,
      },
      features: {
        ...DEFAULT_SDK_CONFIG.features,
        ...userConfig.features,
      },
      offline: {
        ...DEFAULT_SDK_CONFIG.offline,
        ...userConfig.offline,
        storage: {
          ...DEFAULT_SDK_CONFIG.offline.storage,
          ...userConfig.offline?.storage,
        },
        queue: {
          ...DEFAULT_SDK_CONFIG.offline.queue,
          ...userConfig.offline?.queue,
        },
        sync: {
          ...DEFAULT_SDK_CONFIG.offline.sync,
          ...userConfig.offline?.sync,
        },
      },
      reactNative: {
        ...DEFAULT_SDK_CONFIG.reactNative,
        ...userConfig.reactNative,
        storage: {
          ...DEFAULT_SDK_CONFIG.reactNative.storage,
          ...userConfig.reactNative?.storage,
        },
        connectivity: {
          ...DEFAULT_SDK_CONFIG.reactNative.connectivity,
          ...userConfig.reactNative?.connectivity,
        },
        backgroundProcessor: {
          ...DEFAULT_SDK_CONFIG.reactNative.backgroundProcessor,
          ...userConfig.reactNative?.backgroundProcessor,
        },
        performanceMonitor: {
          ...DEFAULT_SDK_CONFIG.reactNative.performanceMonitor,
          ...userConfig.reactNative?.performanceMonitor,
        },
      },
      dev: {
        ...DEFAULT_SDK_CONFIG.dev,
        ...userConfig.dev,
      },
    };
  }

  private createHttpClient(type: 'api' | 'auth'): HttpClient {
    const baseConfig = type === 'api' ? DEFAULT_HTTP_CONFIG : AUTH_HTTP_CONFIG;

    // Determine base URL
    let baseUrl: string;
    if (type === 'api') {
      baseUrl = this.config.baseUrls.api || this.getDefaultApiUrl();
    } else {
      baseUrl = this.config.baseUrls.auth || this.getDefaultAuthUrl();
    }

    const config: HttpClientConfig = {
      ...baseConfig,
      ...this.config.httpConfig,
      baseUrl,
      enableRetry: this.config.features.enableRetry ?? true,
      enableCircuitBreaker: this.config.features.enableCircuitBreaker ?? true,
      enableLogging: this.config.logging.enabled,
      ...(this.config.auth.getToken && { getAuthToken: this.config.auth.getToken }),
      userAgent: `ACube-SDK/2.0.0 (${this.config.environment})`,
    };

    return new HttpClient(config);
  }

  private getDefaultApiUrl(): string {
    switch (this.config.environment) {
      case 'production':
        return 'https://ereceipts-it.acubeapi.com';
      case 'development':
        return 'https://ereceipts-it.dev.acubeapi.com';
      case 'sandbox':
      default:
        return 'https://ereceipts-it-sandbox.acubeapi.com';
    }
  }

  private getDefaultAuthUrl(): string {
    switch (this.config.environment) {
      case 'production':
        return 'https://common.api.acubeapi.com';
      case 'development':
      case 'sandbox':
      default:
        return 'https://common-sandbox.api.acubeapi.com';
    }
  }

  private setupEventHandlers(): void {
    // Forward HTTP client events
    this.apiClient.on('requestError', (event) => {
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: event.requestId,
        data: {
          errorCode: 'HTTP_REQUEST_FAILED',
          errorMessage: event.error,
          operation: `${event.method} ${event.url}`,
          retry: false,
          context: { client: 'api', ...event },
        },
      });
    });

    this.authClient.on('requestError', (event) => {
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: event.requestId,
        data: {
          errorCode: 'AUTH_REQUEST_FAILED',
          errorMessage: event.error,
          operation: `${event.method} ${event.url}`,
          retry: false,
          context: { client: 'auth', ...event },
        },
      });
    });

    // Handle authentication events
    if (this.config.auth.onTokenExpired) {
      this.on('auth.expired', this.config.auth.onTokenExpired);
    }
  }

  /**
   * Initialize the SDK (optional - resources are lazy loaded)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate configuration
      this.validateConfig();

      // Initialize auth system if enabled
      if (this.config.auth.enabled) {
        await this.initializeAuthSystem();
      }

      // Initialize React Native optimizations if enabled
      console.log('[ACube SDK] React Native optimizations enabled:', this.config.reactNative.enabled);
      if (this.config.reactNative.enabled) {
        console.log('[ACube SDK] Initializing React Native optimizations...');
        await this.initializeReactNativeOptimizations();
      }

      // Test connectivity (optional health check)
      if (this.config.features.enableMetrics) {
        await this.performHealthCheck();
      }

      this.isInitialized = true;

      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `init_success_${Date.now()}`,
        data: {
          errorCode: 'SDK_INITIALIZED',
          errorMessage: 'SDK initialized successfully',
          operation: 'initialize',
          retry: false,
          context: {
            environment: this.config.environment,
            features: this.config.features,
          },
        },
      });

    } catch (error) {
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `init_${Date.now()}`,
        data: {
          errorCode: 'SDK_INITIALIZATION_FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          operation: 'initialize',
          retry: false,
        },
      });
      throw error;
    }
  }

  private validateConfig(): void {
    // Validate environment
    if (!['sandbox', 'production', 'development'].includes(this.config.environment)) {
      throw new Error(`Invalid environment: ${this.config.environment}`);
    }

    // Validate auth configuration if provided
    if (this.config.auth.getToken && typeof this.config.auth.getToken !== 'function') {
      throw new Error('auth.getToken must be a function');
    }
  }

  private async performHealthCheck(): Promise<void> {
    // Simple health check - can be expanded
    try {
      const healthStatus = this.apiClient.getHealthStatus();
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `health_${Date.now()}`,
        data: {
          errorCode: 'HEALTH_CHECK_COMPLETED',
          errorMessage: 'Health check completed',
          operation: 'health-check',
          retry: false,
          context: { healthStatus },
        },
      });
    } catch (error) {
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `health_failed_${Date.now()}`,
        data: {
          errorCode: 'HEALTH_CHECK_FAILED',
          errorMessage: 'Health check failed',
          operation: 'health-check',
          retry: false,
          context: { error },
        },
      });
      // Don't throw - health check failure shouldn't prevent initialization
    }
  }

  /**
   * Initialize the enterprise authentication system
   */
  private async initializeAuthSystem(): Promise<void> {
    try {
      // Initialize auth storage
      this._authStorage = this.authStorage;
      await this._authStorage.initialize();

      // Initialize token manager
      this._tokenManager = this.tokenManager;

      // Initialize auth service
      this._authService = this.authService;
      await this._authService.initialize();

      // Initialize and add auth middleware to HTTP clients
      this._authMiddleware = this.authMiddleware;
      this.apiClient.addMiddleware(this._authMiddleware);
      this.authClient.addMiddleware(this._authMiddleware);

      // Set up auth event forwarding
      this.setupAuthEventForwarding();

      // Auto-login if credentials provided
      if (this.config.auth.credentials?.autoLogin &&
          this.config.auth.credentials.username &&
          this.config.auth.credentials.password) {
        try {
          await this._authService.login({
            username: this.config.auth.credentials.username,
            password: this.config.auth.credentials.password,
          });
        } catch (loginError) {
          // Don't fail initialization if auto-login fails
          console.warn('Auto-login failed during initialization:', loginError);
        }
      }

      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `auth_init_${Date.now()}`,
        data: {
          errorCode: 'AUTH_SYSTEM_INITIALIZED',
          errorMessage: 'Authentication system initialized',
          operation: 'auth-init',
          retry: false,
        },
      });
    } catch (error) {
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `auth_init_failed_${Date.now()}`,
        data: {
          errorCode: 'AUTH_INITIALIZATION_FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown auth error',
          operation: 'auth-init',
          retry: false,
          context: { error },
        },
      });
      throw error;
    }
  }

  /**
   * Initialize React Native optimization systems
   */
  private async initializeReactNativeOptimizations(): Promise<void> {
    const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

    if (!isReactNative) {
      console.warn('React Native optimizations requested but not in React Native environment');
      return;
    }

    try {
      // Initialize optimized storage adapter if enabled
      if (this.config.reactNative?.storage?.enableOptimizedAdapter) {
        const { OptimizedReactNativeStorageAdapter } = await import('@/storage/adapters/optimized-react-native-storage');
        this._optimizedStorage = new OptimizedReactNativeStorageAdapter({
          cacheSize: this.config.reactNative?.storage?.cacheSize ?? 1000,
          enableCompression: this.config.reactNative?.storage?.enableCompression ?? true,
          enableBatching: this.config.reactNative?.storage?.enableBatching ?? true,
          batchDelay: this.config.reactNative?.storage?.batchDelay ?? 50,
        });
      }

      // Initialize connectivity manager
      const { ConnectivityManager } = await import('@/react-native/connectivity-manager');
      this._connectivityManager = new ConnectivityManager({
        enableQualityMonitoring: this.config.reactNative?.connectivity?.enableQualityMonitoring ?? true,
        enableAdaptiveRetry: this.config.reactNative?.connectivity?.enableAdaptiveRetry ?? true,
        enableDataOptimization: this.config.reactNative?.connectivity?.enableDataOptimization ?? true,
        healthCheckUrl: this.config.reactNative?.connectivity?.healthCheckUrl ?? 'https://ereceipts-it.acubeapi.com/health',
      });

      // Initialize background processor if enabled
      if (this.config.reactNative?.backgroundProcessor?.enabled) {
        const { BackgroundProcessor } = await import('@/react-native/background-processor');
        this._backgroundProcessor = new BackgroundProcessor({
          maxConcurrentTasks: this.config.reactNative?.backgroundProcessor?.maxConcurrentTasks ?? 3,
          enableBatteryOptimization: this.config.reactNative?.backgroundProcessor?.enableBatteryOptimization ?? true,
          enableAppStateManagement: this.config.reactNative?.backgroundProcessor?.enableAppStateManagement ?? true,
          enableTaskPersistence: this.config.reactNative?.backgroundProcessor?.enableTaskPersistence ?? true,
        });
      }

      // Initialize performance monitor if enabled
      if (this.config.reactNative?.performanceMonitor?.enabled) {
        const { PerformanceMonitor } = await import('@/react-native/performance-monitor');
        this._performanceMonitor = new PerformanceMonitor({
          enableMemoryMonitoring: this.config.reactNative?.performanceMonitor?.enableMemoryMonitoring ?? true,
          enableFrameRateMonitoring: this.config.reactNative?.performanceMonitor?.enableFrameRateMonitoring ?? true,
          enableBatteryMonitoring: this.config.reactNative?.performanceMonitor?.enableBatteryMonitoring ?? true,
          enableRemoteReporting: this.config.reactNative?.performanceMonitor?.enableRemoteReporting ?? false,
        });
      }

      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `rn_init_${Date.now()}`,
        data: {
          errorCode: 'REACT_NATIVE_OPTIMIZATIONS_INITIALIZED',
          errorMessage: 'React Native optimizations initialized',
          operation: 'rn-init',
          retry: false,
        },
      });
    } catch (error) {
      this.emit('error', {
        type: 'error',
        timestamp: new Date(),
        requestId: `rn_init_failed_${Date.now()}`,
        data: {
          errorCode: 'REACT_NATIVE_INITIALIZATION_FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown React Native error',
          operation: 'rn-init',
          retry: false,
          context: { error },
        },
      });
      throw error;
    }
  }

  /**
   * Set up auth event forwarding to SDK events
   */
  private setupAuthEventForwarding(): void {
    if (!this._authService) {return;}

    // Forward auth events to SDK events
    this._authService.on('auth:login:success', (event) => {
      (this as any).emit('auth.success', {
        userId: event.data.user.id,
        role: event.data.user.attributes?.simpleRole || 'cashier',
        user: event.data.user,
        expiresAt: event.data.user.last_login ? new Date(Date.now() + (this.config.auth?.config?.sessionTimeout || 3600000)) : undefined,
      });
    });

    this._authService.on('auth:login:failure', (event) => {
      (this as any).emit('auth.error', {
        error: event.data.error.message,
        errorCode: event.data.error.type,
        errorMessage: event.data.error.message,
        retry: event.data.error.recoverable || false,
        operation: 'login',
      });
    });

    this._authService.on('auth:logout', (event) => {
      (this as any).emit('auth.logout', {
        userId: event.data.userId,
        reason: event.data.reason,
        operation: 'logout',
      });
    });

    this._authService.on('auth:session:expired', (event) => {
      (this as any).emit('auth.expired', {
        userId: event.data.userId,
        sessionId: event.data.sessionId,
        operation: 'session_expired',
      });

      // Call legacy callback if provided
      if (this.config.auth?.onTokenExpired) {
        this.config.auth.onTokenExpired().catch(error => {
          console.error('Legacy onTokenExpired callback failed:', error);
        });
      }
    });
  }

  // Lazy-loaded resource getters (Stripe-style)

  /**
   * Cashiers resource - user management
   * Enhanced with offline capabilities when enabled
   */
  get cashiers(): CashiersResource {
    if (!this._cashiers) {
      const { CashiersResource } = require('@/resources/cashiers');
      this._cashiers = new CashiersResource(
        this.apiClient,
        this.config.offline?.enabled ? this.storage : undefined,
        this.config.features?.enableOfflineQueue ? this.queue : undefined,
      );
    }
    return this._cashiers!;
  }

  /**
   * Receipts resource - e-receipt management
   * Enhanced with offline capabilities when enabled
   */
  get receipts(): ReceiptsResource {
    if (!this._receipts) {
      const { ReceiptsResource } = require('@/resources/receipts');
      this._receipts = new ReceiptsResource(
        this.apiClient,
        this.config.offline?.enabled ? this.storage : undefined,
        this.config.features?.enableOfflineQueue ? this.queue : undefined,
      );
    }
    return this._receipts!;
  }

  /**
   * Point of Sales resource - POS device management
   * Enhanced with offline capabilities when enabled
   */
  get pointOfSales(): PointOfSalesResource {
    if (!this._pointOfSales) {
      const { PointOfSalesResource } = require('@/resources/point-of-sales');
      this._pointOfSales = new PointOfSalesResource(
        this.apiClient,
        this.config.offline?.enabled ? this.storage : undefined,
        this.config.features?.enableOfflineQueue ? this.queue : undefined,
      );
    }
    return this._pointOfSales!;
  }

  /**
   * Cash Registers resource - device registration
   * Enhanced with offline capabilities when enabled
   */
  get cashRegisters(): CashRegistersResource {
    if (!this._cashRegisters) {
      const { CashRegistersResource } = require('@/resources/cash-registers');
      this._cashRegisters = new CashRegistersResource(
        this.apiClient,
        this.config.offline?.enabled ? this.storage : undefined,
        this.config.features?.enableOfflineQueue ? this.queue : undefined,
      );
    }
    return this._cashRegisters!;
  }

  /**
   * Merchants resource - business entity management
   * Enhanced with offline capabilities when enabled
   */
  get merchants(): MerchantsResource {
    if (!this._merchants) {
      const { MerchantsResource } = require('@/resources/merchants');
      this._merchants = new MerchantsResource(
        this.apiClient,
        this.config.offline?.enabled ? this.storage : undefined,
        this.config.features?.enableOfflineQueue ? this.queue : undefined,
      );
    }
    return this._merchants!;
  }

  /**
   * PEMs resource - electronic memorization device management
   * Enhanced with offline capabilities when enabled
   */
  get pems(): PEMsResource {
    if (!this._pems) {
      const { PEMsResource } = require('@/resources/pems');
      this._pems = new PEMsResource(
        this.apiClient,
        this.config.offline?.enabled ? this.storage : undefined,
        this.config.features?.enableOfflineQueue ? this.queue : undefined,
      );
    }
    return this._pems!;
  }

  // PWA System getters

  /**
   * PWA Manager - Progressive Web App functionality
   * Handles service worker registration, caching, and offline capabilities
   */
  get pwa(): PWAManager {
    if (!this._pwaManager) {
      const { PWAManager } = require('@/pwa/pwa-manager');
      const pwaConfig: PWAManagerConfig = {
        ...this.config.pwa.manager,
        serviceWorkerPath: this.config.pwa.manager?.serviceWorkerPath || '/sw.js',
        autoRegister: this.config.pwa.autoRegister ?? true,
        enableInstallPrompts: this.config.pwa.enableInstallPrompts ?? true,
        pushNotifications: {
          enabled: this.config.pwa.enablePushNotifications ?? false,
          vapidPublicKey: this.config.pwa.vapidPublicKey ?? '',
        },
      };

      this._pwaManager = new PWAManager(pwaConfig);
    }
    return this._pwaManager!;
  }

  /**
   * Manifest Generator - PWA manifest creation and management
   * Creates web app manifests with Italian e-receipt specific configuration
   */
  get manifest(): ManifestGenerator {
    if (!this._manifestGenerator) {
      const { ManifestGenerator } = require('@/pwa/manifest-generator');
      this._manifestGenerator = new ManifestGenerator(this.config.pwa.manifest);
    }
    return this._manifestGenerator!;
  }

  // Offline system getters (only available when offline features are enabled)

  /**
   * Progressive sync manager - smart synchronization with partial failure recovery
   * Only available when features.enableSync is true
   */
  get sync(): ProgressiveSyncEngine {
    if (!this.config.features.enableSync) {
      throw new Error('Sync is not enabled. Set features.enableSync to true in configuration.');
    }

    if (!this._syncManager) {
      const { ProgressiveSyncEngine } = require('@/sync/sync-engine');
      this._syncManager = new ProgressiveSyncEngine(this.config.offline?.sync || {});
    }
    return this._syncManager!;
  }

  /**
   * Unified storage system - cross-platform storage with encryption
   * Only available when offline.enabled is true
   */
  get storage(): UnifiedStorage {
    if (!this.config.offline?.enabled) {
      throw new Error('Offline storage is not enabled. Set offline.enabled to true in configuration.');
    }

    if (!this._storage) {
      const { UnifiedStorageImpl } = require('@/storage/storage-factory');
      const { createEncryptionService } = require('@/storage/encryption-service');
      
      // Platform-specific adapter selection
      let adapter;
      const adapterType = this.config.offline.storage?.adapter || 'auto';
      const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
      
      if (adapterType === 'auto' && isReactNative) {
        // React Native environment
        try {
          const { OptimizedReactNativeStorageAdapter } = require('@/storage/adapters/optimized-react-native-storage');
          adapter = new OptimizedReactNativeStorageAdapter();
        } catch (error) {
          // Fallback to basic React Native adapter
          const { ReactNativeStorageAdapter } = require('@/storage/adapters/react-native-storage');
          adapter = new ReactNativeStorageAdapter();
        }
      } else if (adapterType === 'auto') {
        // Web environment (auto detection)
        try {
          // Try IndexedDB first (preferred for web)
          const { IndexedDBAdapter } = require('@/storage/adapters/indexeddb-adapter');
          adapter = new IndexedDBAdapter();
        } catch (error) {
          // Fallback to LocalStorage
          const { LocalStorageAdapter } = require('@/storage/adapters/localstorage-adapter');
          adapter = new LocalStorageAdapter();
        }
      } else {
        // Specific adapter requested
        switch (adapterType) {
          case 'indexeddb':
            const { IndexedDBAdapter } = require('@/storage/adapters/indexeddb-adapter');
            adapter = new IndexedDBAdapter();
            break;
          case 'localstorage':
            const { LocalStorageAdapter } = require('@/storage/adapters/localstorage-adapter');
            adapter = new LocalStorageAdapter();
            break;
          case 'asyncstorage':
            if (isReactNative) {
              const { ReactNativeStorageAdapter } = require('@/storage/adapters/react-native-storage');
              adapter = new ReactNativeStorageAdapter();
            } else {
              throw new Error('AsyncStorage adapter is only available in React Native environment');
            }
            break;
          case 'memory':
            // Memory adapter would need to be implemented in storage factory
            throw new Error('Memory adapter not yet implemented');
          case 'filesystem':
            // Filesystem adapter would need to be implemented
            throw new Error('Filesystem adapter not yet implemented');
          default:
            throw new Error(`Unknown storage adapter: ${adapterType}`);
        }
      }
      
      // Create encryption service
      const encryptionService = createEncryptionService({
        enabled: !!this.config.offline.storage?.encryptionKey,
        key: this.config.offline.storage?.encryptionKey,
      });
      
      this._storage = new UnifiedStorageImpl(adapter, encryptionService, {
        maxSize: this.config.offline.storage?.maxSize || 100 * 1024 * 1024,
      });
    }
    return this._storage!;
  }

  /**
   * Enterprise queue manager - advanced operation queuing with retry logic
   * Only available when features.enableOfflineQueue is true
   */
  get queue(): EnterpriseQueueManager {
    if (!this.config.features.enableOfflineQueue) {
      throw new Error('Offline queue is not enabled. Set features.enableOfflineQueue to true in configuration.');
    }

    if (!this._queueManager) {
      const { EnterpriseQueueManager } = require('@/storage/queue/queue-manager');
      this._queueManager = new EnterpriseQueueManager({
        storage: this.storage, // Use unified storage
        maxItems: this.config.offline?.queue?.maxItems || 1000,
        maxRetries: this.config.offline?.queue?.maxRetries || 3,
        retryDelay: this.config.offline?.queue?.retryDelay || 5000,
        batchSize: this.config.offline?.queue?.batchSize || 50,
      });
    }
    return this._queueManager!;
  }

  // Authentication system getters (only available when auth.enabled is true)

  /**
   * JWT token manager - automatic refresh, validation, parsing
   * Only available when auth.enabled is true
   */
  get tokenManager(): TokenManager {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    if (!this._tokenManager) {
      const { TokenManager } = require('@/auth/token-manager');
      this._tokenManager = new TokenManager(
        this.authClient,
        {
          refreshUrl: this.config.auth.config?.refreshUrl || '/mf1/token/refresh',
          tokenRefreshBuffer: this.config.auth.config?.tokenRefreshBuffer || 5,
          maxRefreshAttempts: this.config.auth.config?.maxRefreshAttempts || 3,
          refreshRetryDelay: this.config.auth.config?.refreshRetryDelay || 1000,
          enableTokenRotation: this.config.auth.config?.enableTokenRotation ?? true,
          onTokenRefresh: this.config.auth.config?.onTokenRefresh,
          onTokenExpired: this.config.auth.config?.onTokenExpired,
        },
      );
    }
    return this._tokenManager!;
  }

  /**
   * Enterprise authentication service - OAuth2, role-based access, session management
   * Only available when auth.enabled is true
   */
  get authService(): AuthService {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    if (!this._authService) {
      const { AuthService } = require('@/auth/auth-service');
      // Pass the shared tokenManager instance to AuthService
      this._authService = new AuthService(
        this.authClient,
        this.config.auth.config || {},
        undefined, // AccessControlManager - could be injected
        this._authStorage,
        this.tokenManager, // Pass the shared token manager
      );
    }
    return this._authService!;
  }

  /**
   * Secure cross-platform auth storage - encrypted token storage
   * Only available when auth.enabled is true
   */
  get authStorage(): AuthStorage {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    if (!this._authStorage) {
      const { AuthStorage } = require('@/auth/auth-storage');
      this._authStorage = new AuthStorage({
        storageKey: this.config.auth.storage?.storageKey || 'acube_auth',
        enableEncryption: this.config.auth.storage?.enableEncryption ?? true,
        storageAdapter: this.config.auth.storage?.storageAdapter,
        autoMigrate: true,
      });
    }
    return this._authStorage!;
  }

  /**
   * Enhanced authentication middleware - automatic token refresh, role headers
   * Only available when auth.enabled is true
   */
  get authMiddleware(): EnhancedAuthMiddleware {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    if (!this._authMiddleware) {
      const { EnhancedAuthMiddleware } = require('@/auth/auth-middleware');
      this._authMiddleware = new EnhancedAuthMiddleware(
        this.authService,
        this.tokenManager,
        {
          enableRetry: this.config.auth.middleware?.enableRetry ?? true,
          maxRetries: this.config.auth.middleware?.maxRetries || 2,
          authHeaderName: 'Authorization',
          authScheme: 'Bearer',
          includeRoleHeaders: this.config.auth.middleware?.includeRoleHeaders ?? true,
          roleHeaderName: 'X-User-Role',
          includePermissionHeaders: this.config.auth.middleware?.includePermissionHeaders ?? true,
          permissionHeaderName: 'X-User-Permissions',
          includeRequestContext: this.config.auth.middleware?.includeRequestContext ?? true,
          contextHeaders: {
            'X-Device-ID': 'deviceId',
            'X-Session-ID': 'sessionId',
            'X-Request-Context': 'requestContext',
          },
        },
      );
    }
    return this._authMiddleware!;
  }

  // Authentication methods

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    return this.authService.login(credentials);
  }

  /**
   * Logout current user
   */
  async logout(options?: LogoutOptions): Promise<void> {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    return this.authService.logout(options);
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState | null {
    if (!this.config.auth.enabled || !this._authService) {
      return null;
    }

    return this.authService.getState();
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    if (!this.config.auth.enabled || !this._authService) {
      return null;
    }

    return this.authService.getCurrentUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const authState = this.getAuthState();
    return authState?.isAuthenticated ?? false;
  }

  /**
   * Check if user has specific role (including inherited roles from hierarchy)
   */
  hasRole(role: UserRole): boolean {
    if (!this.config.auth.enabled || !this._authService) {
      return false;
    }

    return this.authService.hasRole(role);
  }

  /**
   * Check if user has any of the specified roles (including inherited roles)
   */
  hasAnyRole(roles: UserRole[]): boolean {
    if (!this.config.auth.enabled || !this._authService) {
      return false;
    }

    return this.authService.hasAnyRole(roles);
  }

  /**
   * Get user's effective roles (including inherited roles from hierarchy)
   */
  getEffectiveRoles(): UserRole[] {
    if (!this.config.auth.enabled || !this._authService) {
      return [];
    }

    return this.authService.getEffectiveRoles();
  }

  /**
   * Get user's primary role for display purposes
   */
  getPrimaryRole(): UserRole | null {
    if (!this.config.auth.enabled || !this._authService) {
      return null;
    }

    return this.authService.getPrimaryRole();
  }

  /**
   * Get user's simple role for external APIs
   */
  getSimpleRole(): SimpleUserRole {
    if (!this.config.auth.enabled || !this._authService) {
      return 'cashier';
    }

    return this.authService.getSimpleRole();
  }

  /**
   * Switch to a different role context during session
   */
  async switchRole(
    targetRole: UserRole,
    context?: {
      merchant_id?: import('@/types/branded').MerchantId;
      cashier_id?: import('@/types/branded').CashierId;
      point_of_sale_id?: import('@/types/branded').PointOfSaleId;
    },
  ): Promise<boolean> {
    if (!this.config.auth.enabled) {
      throw new Error('Enterprise auth is not enabled. Set auth.enabled to true in configuration.');
    }

    return this.authService.switchRole(targetRole, context);
  }

  // Configuration and management methods

  /**
   * Update SDK configuration
   */
  updateConfig(updates: Partial<ACubeSDKConfig>): void {
    const newConfig = this.mergeConfig({ ...this.config, ...updates });

    // Update HTTP clients if necessary
    if (updates.httpConfig || updates.baseUrls || updates.environment) {
      // TODO: Update HTTP client configurations when updateConfig is available
      // this.apiClient.updateConfig(this.createHttpClient('api').config);
      // this.authClient.updateConfig(this.createHttpClient('auth').config);
    }

    this.config = newConfig;

    this.emit('error', {
      type: 'error',
      timestamp: new Date(),
      requestId: `config_${Date.now()}`,
      data: {
        errorCode: 'CONFIG_UPDATED',
        errorMessage: 'Configuration updated',
        operation: 'update-config',
        retry: false,
        context: { updates },
      },
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ACubeSDKConfig>> {
    return { ...this.config };
  }

  /**
   * Get SDK metrics and health status
   */
  getMetrics() {
    return {
      api: this.apiClient.getHealthStatus(),
      auth: this.authClient.getHealthStatus(),
      isInitialized: this.isInitialized,
      environment: this.config.environment,
    };
  }

  /**
   * Get HTTP clients (for advanced usage)
   */
  getClients() {
    return {
      api: this.apiClient,
      auth: this.authClient,
    };
  }

  // React Native Optimization getters (only available when reactNative.enabled is true)

  /**
   * Optimized React Native Storage Adapter - High-performance AsyncStorage with caching
   * Only available when reactNative.enabled is true and enableOptimizedAdapter is true
   */
  get optimizedStorage(): OptimizedReactNativeStorageAdapter {
    if (!this.config.reactNative.enabled) {
      throw new Error('React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.');
    }

    if (!this.config.reactNative?.storage?.enableOptimizedAdapter) {
      throw new Error('Optimized storage adapter is not enabled. Set reactNative.storage.enableOptimizedAdapter to true.');
    }

    if (!this._optimizedStorage) {
      throw new Error('Optimized storage not initialized. Make sure SDK is initialized first.');
    }

    return this._optimizedStorage;
  }

  /**
   * Connectivity Manager - Intelligent network handling and retry strategies
   * Only available when reactNative.enabled is true
   */
  get connectivity(): ConnectivityManager {
    if (!this.config.reactNative.enabled) {
      throw new Error('React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.');
    }

    if (!this._connectivityManager) {
      throw new Error('Connectivity manager not initialized. Make sure SDK is initialized first.');
    }

    return this._connectivityManager;
  }

  /**
   * Background Processor - Task scheduling and app lifecycle management
   * Only available when reactNative.enabled is true and backgroundProcessor.enabled is true
   */
  get backgroundProcessor(): BackgroundProcessor {
    if (!this.config.reactNative.enabled) {
      throw new Error('React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.');
    }

    if (!this.config.reactNative?.backgroundProcessor?.enabled) {
      throw new Error('Background processor is not enabled. Set reactNative.backgroundProcessor.enabled to true.');
    }

    if (!this._backgroundProcessor) {
      throw new Error('Background processor not initialized. Make sure SDK is initialized first.');
    }

    return this._backgroundProcessor;
  }

  /**
   * Performance Monitor - Mobile performance metrics and optimization
   * Only available when reactNative.enabled is true and performanceMonitor.enabled is true
   */
  get performanceMonitor(): PerformanceMonitor {
    if (!this.config.reactNative.enabled) {
      throw new Error('React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.');
    }

    if (!this.config.reactNative?.performanceMonitor?.enabled) {
      throw new Error('Performance monitor is not enabled. Set reactNative.performanceMonitor.enabled to true.');
    }

    if (!this._performanceMonitor) {
      throw new Error('Performance monitor not initialized. Make sure SDK is initialized first.');
    }

    return this._performanceMonitor;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Cleanup HTTP clients
    this.apiClient.destroy();
    this.authClient.destroy();

    // Cleanup auth systems if they were initialized
    if (this._authService) {
      await this._authService.destroy();
    }

    if (this._tokenManager) {
      this._tokenManager.destroy();
    }

    if (this._authStorage) {
      await this._authStorage.destroy();
    }

    if (this._authMiddleware) {
      this._authMiddleware.destroy();
    }

    // Cleanup offline systems if they were initialized
    if (this._syncManager) {
      await this._syncManager.cancelAllSyncs();
    }

    if (this._queueManager) {
      await this._queueManager.destroy();
    }

    if (this._storage) {
      await this._storage.destroy();
    }

    // Cleanup React Native optimizations if they were initialized
    if (this._optimizedStorage) {
      await this._optimizedStorage.destroy();
    }

    if (this._connectivityManager) {
      this._connectivityManager.destroy();
    }

    if (this._backgroundProcessor) {
      this._backgroundProcessor.destroy();
    }

    if (this._performanceMonitor) {
      this._performanceMonitor.destroy();
    }

    this.removeAllListeners();
    this.isInitialized = false;

    this.emit('error', {
      type: 'error',
      timestamp: new Date(),
      requestId: `destroy_${Date.now()}`,
      data: {
        errorCode: 'SDK_DESTROYED',
        errorMessage: 'SDK destroyed',
        operation: 'destroy',
        retry: false,
      },
    });
  }

}

// Export convenience function for creating SDK instances
export function createACubeSDK(config: ACubeSDKConfig): ACubeSDK {
  console.log('Creating ACube SDK instance...');
  return new ACubeSDK(config);
}

// Export default configuration
export { DEFAULT_SDK_CONFIG };
