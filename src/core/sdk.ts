/**
 * Core ACube SDK - Stripe-style Resource-Based Architecture
 * Main entry point with lazy resource loading and configuration management
 */

import { EventEmitter } from 'eventemitter3';
import { HttpClient, type HttpClientConfig, DEFAULT_HTTP_CONFIG, AUTH_HTTP_CONFIG } from '@/http/client';
import type { EventTypeMap } from '@/types/events';

// Resource imports (lazy loaded)
import type { CashiersResource } from '@/resources/cashiers';
import type { ReceiptsResource } from '@/resources/receipts';
import type { PointOfSalesResource } from '@/resources/point-of-sales';
import type { CashRegistersResource } from '@/resources/cash-registers';
import type { MerchantsResource } from '@/resources/merchants';
import type { PEMsResource } from '@/resources/pems';

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
    getToken?: () => Promise<string | null>;
    onTokenExpired?: () => Promise<void>;
    autoRefresh?: boolean;
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
    enableOfflineQueue: false,
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

  // Lazy-loaded resource getters (Stripe-style)
  
  /**
   * Cashiers resource - user management
   */
  get cashiers(): CashiersResource {
    if (!this._cashiers) {
      const { CashiersResource } = require('@/resources/cashiers');
      this._cashiers = new CashiersResource(this.apiClient);
    }
    return this._cashiers!;
  }

  /**
   * Receipts resource - e-receipt management
   */
  get receipts(): ReceiptsResource {
    if (!this._receipts) {
      const { ReceiptsResource } = require('@/resources/receipts');
      this._receipts = new ReceiptsResource(this.apiClient);
    }
    return this._receipts!;
  }

  /**
   * Point of Sales resource - POS device management
   */
  get pointOfSales(): PointOfSalesResource {
    if (!this._pointOfSales) {
      const { PointOfSalesResource } = require('@/resources/point-of-sales');
      this._pointOfSales = new PointOfSalesResource(this.apiClient);
    }
    return this._pointOfSales!;
  }

  /**
   * Cash Registers resource - device registration
   */
  get cashRegisters(): CashRegistersResource {
    if (!this._cashRegisters) {
      const { CashRegistersResource } = require('@/resources/cash-registers');
      this._cashRegisters = new CashRegistersResource(this.apiClient);
    }
    return this._cashRegisters!;
  }

  /**
   * Merchants resource - business entity management
   */
  get merchants(): MerchantsResource {
    if (!this._merchants) {
      const { MerchantsResource } = require('@/resources/merchants');
      this._merchants = new MerchantsResource(this.apiClient);
    }
    return this._merchants!;
  }

  /**
   * PEMs resource - electronic memorization device management
   */
  get pems(): PEMsResource {
    if (!this._pems) {
      const { PEMsResource } = require('@/resources/pems');
      this._pems = new PEMsResource(this.apiClient);
    }
    return this._pems!;
  }

  // Configuration and management methods

  /**
   * Update SDK configuration
   */
  updateConfig(updates: Partial<ACubeSDKConfig>): void {
    const newConfig = this.mergeConfig({ ...this.config, ...updates });
    
    // Update HTTP clients if necessary
    if (updates.httpConfig || updates.baseUrls || updates.environment) {
      this.apiClient.updateConfig(this.createHttpClient('api')['config']);
      this.authClient.updateConfig(this.createHttpClient('auth')['config']);
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

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.apiClient.destroy();
    this.authClient.destroy();
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
  return new ACubeSDK(config);
}

// Export default configuration
export { DEFAULT_SDK_CONFIG };