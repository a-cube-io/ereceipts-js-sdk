import { 
  SDKConfig, 
  ConfigManager, 
  AuthManager, 
  APIClient,
  loadPlatformAdapters,
  AuthCredentials,
  User,
  ACubeSDKError 
} from './core';
import { PlatformAdapters } from './adapters';
import { OfflineManager, QueueEvents } from './offline';

/**
 * SDK Events interface
 */
export interface SDKEvents {
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
  onOfflineOperationAdded?: (operationId: string) => void;
  onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
}

/**
 * Main ACube SDK class
 */
export class ACubeSDK {
  private config: ConfigManager;
  private adapters?: PlatformAdapters;
  private authManager?: AuthManager;
  private offlineManager?: OfflineManager;
  private isInitialized = false;

  // Public API clients
  public api?: APIClient;

  constructor(
    config: SDKConfig,
    customAdapters?: PlatformAdapters,
    private events: SDKEvents = {}
  ) {
    this.config = new ConfigManager(config);
    
    if (customAdapters) {
      this.adapters = customAdapters;
    }
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load platform adapters if not provided
      if (!this.adapters) {
        this.adapters = loadPlatformAdapters();
      }

      // Initialize API client with cache support and network monitoring
      this.api = new APIClient(this.config, this.adapters.cache, this.adapters.networkMonitor);

      // Initialize auth manager
      this.authManager = new AuthManager(
        this.config,
        this.adapters.secureStorage,
        {
          onUserChanged: this.events.onUserChanged,
          onAuthError: this.events.onAuthError,
        }
      );

      // Initialize offline manager
      const queueEvents: QueueEvents = {
        onOperationAdded: (operation) => {
          this.events.onOfflineOperationAdded?.(operation.id);
        },
        onOperationCompleted: (result) => {
          this.events.onOfflineOperationCompleted?.(result.operation.id, result.success);
        },
        onOperationFailed: (result) => {
          this.events.onOfflineOperationCompleted?.(result.operation.id, false);
        },
      };

      this.offlineManager = new OfflineManager(
        this.adapters.storage,
        this.api.getHttpClient(),
        this.adapters.networkMonitor,
        {
          syncInterval: 30000, // 30 seconds
        },
        queueEvents
      );

      // Set up network monitoring
      this.adapters.networkMonitor.onStatusChange((online) => {
        this.events.onNetworkStatusChanged?.(online);
        
        if (online && this.offlineManager) {
          // Auto-sync when back online
          this.offlineManager.sync().catch(console.error);
        }
      });

      // Check if user is already authenticated
      if (await this.authManager.isAuthenticated()) {
        const token = await this.authManager.getAccessToken();
        if (token) {
          this.api.setAuthorizationHeader(token);
        }
      }

      this.isInitialized = true;
    } catch (error) {
      throw new ACubeSDKError(
        'UNKNOWN_ERROR',
        `Failed to initialize SDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: AuthCredentials): Promise<User> {
    this.ensureInitialized();
    
    const user = await this.authManager!.login(credentials);
    
    // Set auth header for API calls
    const token = await this.authManager!.getAccessToken();
    if (token) {
      this.api!.setAuthorizationHeader(token);
    }

    return user;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    this.ensureInitialized();
    
    await this.authManager!.logout();
    this.api!.removeAuthorizationHeader();
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    this.ensureInitialized();
    
    try {
      return await this.authManager!.getCurrentUser();
    } catch {
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    this.ensureInitialized();
    return await this.authManager!.isAuthenticated();
  }

  /**
   * Get offline manager for manual queue operations
   */
  getOfflineManager(): OfflineManager {
    this.ensureInitialized();
    return this.offlineManager!;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    this.ensureInitialized();
    return this.adapters!.networkMonitor.isOnline();
  }

  /**
   * Get SDK configuration
   */
  getConfig(): SDKConfig {
    return this.config.getConfig();
  }

  /**
   * Update SDK configuration
   */
  updateConfig(updates: Partial<SDKConfig>): void {
    this.config.updateConfig(updates);
  }

  /**
   * Get platform adapters (for advanced use cases)
   */
  getAdapters(): PlatformAdapters | undefined {
    return this.adapters;
  }

  /**
   * Destroy SDK and cleanup resources
   */
  destroy(): void {
    this.offlineManager?.destroy();
    this.isInitialized = false;
  }

  /**
   * Ensure SDK is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ACubeSDKError(
        'UNKNOWN_ERROR',
        'SDK not initialized. Call initialize() first.'
      );
    }
  }
}

/**
 * Create and initialize ACube SDK
 */
export async function createACubeSDK(
  config: SDKConfig,
  customAdapters?: PlatformAdapters,
  events?: SDKEvents
): Promise<ACubeSDK> {
  const sdk = new ACubeSDK(config, customAdapters, events);
  await sdk.initialize();
  return sdk;
}