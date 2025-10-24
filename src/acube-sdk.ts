import { 
  SDKConfig, 
  ConfigManager, 
  AuthManager, 
  APIClient,
  loadPlatformAdapters,
  createACubeMTLSConfig,
  AuthCredentials,
  User,
  ACubeSDKError 
} from './core';
import { PlatformAdapters } from './adapters';
import { OfflineManager, QueueEvents } from './offline';
import { CertificateManager } from './core/certificates/certificate-manager';

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
  private certificateManager?: CertificateManager;
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
      // Load platform adapters if not provided with automatic mTLS configuration
      if (!this.adapters) {
        const mtlsConfig = createACubeMTLSConfig(
          this.config.getApiUrl(),
          this.config.getTimeout(),
          true // autoInitialize
        );

        this.adapters = loadPlatformAdapters({
          debugEnabled: this.config.isDebugEnabled(),
          mtlsConfig
        });
      }

      // Initialize a certificate manager with optional configuration
      const certificateConfig = this.config.getConfig().certificateConfig;
      this.certificateManager = new CertificateManager(
        this.adapters.secureStorage,
        {
          storageKey: certificateConfig?.storagePrefix || 'acube_certificate'
        },
        this.config.isDebugEnabled()
      );

      // Initialize auth manager first (needed for API client)
      this.authManager = new AuthManager(
        this.config,
        this.adapters.secureStorage,
        {
          onUserChanged: this.events.onUserChanged,
          onAuthError: this.events.onAuthError,
        }
      );

      // Initialize the API client with all adapters (mTLS is pre-configured)
      // Pass authManager as userProvider for role-based auth decisions
      this.api = new APIClient(
        this.config,
        this.certificateManager,
        this.adapters.cache,
        this.adapters.networkMonitor,
        this.adapters.mtls,
        this.authManager // AuthManager implements IUserProvider
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

      // Check if the user is already authenticated
      if (await this.authManager.isAuthenticated()) {
        const token = await this.authManager.getAccessToken();
        if (token) {
          this.api.setAuthorizationHeader(token);
        }
      }

      // Auto-configure certificate if it exists in storage
      // This ensures mTLS is ready immediately without needing retry logic
      if (this.adapters?.mtls && this.certificateManager) {
        try {
          const hasCert = await this.certificateManager.hasCertificate();

          if (hasCert) {
            const storedCert = await this.certificateManager.getCertificate();

            if (storedCert) {
              if (this.config.isDebugEnabled()) {
                console.log('[ACUBE-SDK] 🔄 Auto-configuring certificate during SDK initialization');
              }

              await this.adapters.mtls.configureCertificate({
                certificate: storedCert.certificate,
                privateKey: storedCert.privateKey,
                format: storedCert.format.toUpperCase() as 'PEM' | 'P12'
              });

              if (this.config.isDebugEnabled()) {
                console.log('[ACUBE-SDK] ✅ Certificate auto-configured successfully');
              }
            }
          }
        } catch (certConfigError) {
          // Don't fail SDK initialization if certificate configuration fails
          // The retry logic in getCertificatesInfo will handle it
          if (this.config.isDebugEnabled()) {
            console.warn('[ACUBE-SDK] ⚠️ Certificate auto-configuration failed (will retry on demand):', certConfigError);
          }
        }
      }

      this.isInitialized = true;
    } catch (error) {
      throw new ACubeSDKError(
        'SDK_INITIALIZATION_ERROR',
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
   * Store mTLS certificate (replaces any existing certificate)
   */
  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: {
      name?: string;
      format?: 'pem' | 'p12' | 'pkcs12';
      password?: string;
    } = {}
  ): Promise<void> {
    this.ensureInitialized();
    
    if (!this.api) {
      throw new ACubeSDKError(
        'API_CLIENT_NOT_INITIALIZED',
        'API client not initialized'
      );
    }

    const httpClient = this.api.getHttpClient();
    if (!httpClient) {
      throw new ACubeSDKError(
        'API_CLIENT_NOT_INITIALIZED',
        'HTTP client not available'
      );
    }

    // Use coordinated storage to ensure proper clearing of old certificates
    await httpClient.storeCertificate(
      certificate,
      privateKey,
      { format: options.format }
    );

    if (this.config.isDebugEnabled()) {
      console.log('[ACUBE-SDK] mTLS certificate stored successfully');
    }
  }

  /**
   * Get mTLS status and configuration info
   */
  async getMTLSStatus() {
    this.ensureInitialized();
    
    if (!this.api) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'API client not initialized'
      );
    }

    const httpClient = this.api.getHttpClient();
    return await httpClient.getMTLSStatus();
  }

  /**
   * Test mTLS connection
   */
  async testMTLSConnection(): Promise<boolean> {
    this.ensureInitialized();
    
    if (!this.api) {
      throw new ACubeSDKError(
        'UNKNOWN_ERROR',
        'API client not initialized'
      );
    }

    const httpClient = this.api.getHttpClient();
    return await httpClient.testMTLSConnection();
  }

  /**
   * Clear the stored certificate
   */
  async clearCertificate(): Promise<void> {
    this.ensureInitialized();
    
    if (!this.api) {
      throw new ACubeSDKError(
        'SDK_INITIALIZATION_ERROR',
        'API client not initialized'
      );
    }

    const httpClient = this.api.getHttpClient();
    if (!httpClient) {
      throw new ACubeSDKError(
        'API_CLIENT_NOT_INITIALIZED',
        'HTTP client not available'
      );
    }

    // Use coordinated clearing to ensure certificate is removed from both storages
    await httpClient.clearCertificate();

    if (this.config.isDebugEnabled()) {
      console.log('[ACUBE-SDK] mTLS certificate cleared');
    }
  }


  /**
   * Get certificate manager for advanced certificate operations
   */
  getCertificateManager() {
    this.ensureInitialized();
    return this.certificateManager;
  }

  /**
   * Get the stored certificate
   */
  async getCertificate() {
    this.ensureInitialized();
    
    if (!this.certificateManager) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate manager not initialized'
      );
    }

    return await this.certificateManager.getCertificate();
  }

  /**
   * Get certificate information (without private key)
   */
  async getCertificateInfo() {
    this.ensureInitialized();
    
    if (!this.certificateManager) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate manager not initialized'
      );
    }

    return await this.certificateManager.getCertificateInfo();
  }

  /**
   * Check if certificate is stored
   */
  async hasCertificate() {
    this.ensureInitialized();

    if (!this.certificateManager) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate manager not initialized'
      );
    }

    return await this.certificateManager.hasCertificate();
  }

  /**
   * Get detailed certificate information from stored certificates
   * This method retrieves certificate metadata including subject, issuer,
   * validity dates, fingerprints, key usage, and more from the mTLS adapter.
   *
   * Uses retry-on-failure pattern similar to executeRequestMTLS:
   * - First attempt: Try to get certificate info
   * - If null and certificate exists: Configure certificate and retry once
   * - Maximum 2 attempts to prevent infinite loops
   *
   * @param isRetryAttempt Internal flag to prevent infinite retry loops
   * @returns Promise with detailed certificate information or null if not available
   */
  async getCertificatesInfo(isRetryAttempt: boolean = false): Promise<any> {
    this.ensureInitialized();

    if (!this.adapters?.mtls) {
      throw new ACubeSDKError(
        'MTLS_ADAPTER_NOT_AVAILABLE',
        'mTLS adapter not available'
      );
    }

    try {
      // Check if certificate exists first
      const hasCert = await this.adapters.mtls.hasCertificate();
      if (!hasCert) {
        if (this.config.isDebugEnabled()) {
          console.log('[ACUBE-SDK] No certificate stored, cannot retrieve certificate info');
        }
        return null;
      }

      // Try to get certificate info
      const certInfo = await this.adapters.mtls.getCertificateInfo();

      // Success - certificate info retrieved
      if (certInfo) {
        if (this.config.isDebugEnabled()) {
          console.log('[ACUBE-SDK] ✅ Certificate info retrieved:', {
            subject: certInfo.subject,
            issuer: certInfo.issuer,
            validFrom: certInfo.validFrom,
            validTo: certInfo.validTo,
            serialNumber: certInfo.serialNumber,
            attempt: isRetryAttempt ? 'retry' : 'first'
          });
        }
        return certInfo;
      }

      // Certificate exists but getCertificateInfo returned null
      // This means certificate isn't configured in native module yet

      // If this is already a retry attempt, don't retry again to prevent infinite loops
      if (isRetryAttempt) {
        if (this.config.isDebugEnabled()) {
          console.log('[ACUBE-SDK] ❌ Retry attempt failed - certificate may be invalid or corrupted');
        }
        return null;
      }

      // First attempt failed - try to reconfigure certificate and retry
      if (this.config.isDebugEnabled()) {
        console.log('[ACUBE-SDK] 🔄 Certificate exists but not configured, configuring and retrying...');
      }

      // Get certificate from storage
      if (!this.certificateManager) {
        if (this.config.isDebugEnabled()) {
          console.log('[ACUBE-SDK] Certificate manager not available');
        }
        return null;
      }

      const storedCert = await this.certificateManager.getCertificate();
      if (!storedCert) {
        if (this.config.isDebugEnabled()) {
          console.log('[ACUBE-SDK] No certificate found in storage');
        }
        return null;
      }

      // Configure certificate in mTLS adapter
      await this.adapters.mtls.configureCertificate({
        certificate: storedCert.certificate,
        privateKey: storedCert.privateKey,
        format: storedCert.format.toUpperCase() as 'PEM' | 'P12'
      });

      if (this.config.isDebugEnabled()) {
        console.log('[ACUBE-SDK] ✅ Certificate configured, retrying getCertificatesInfo...');
      }

      // Retry once (with flag to prevent infinite recursion)
      return await this.getCertificatesInfo(true);

    } catch (error) {
      if (this.config.isDebugEnabled()) {
        console.error('[ACUBE-SDK] Failed to get certificates info:', error);
      }

      throw new ACubeSDKError(
        'CERTIFICATE_INFO_ERROR',
        `Failed to retrieve certificate information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
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
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
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