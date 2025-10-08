/**
 * React Native mTLS Adapter Implementation
 * Uses @a-cube-io/expo-mutual-tls for production-ready mTLS authentication
 */

import {
  IMTLSAdapter,
  CertificateData,
  MTLSConnectionConfig,
  MTLSRequestConfig,
  MTLSResponse,
  CertificateInfo,
  MTLSError,
  MTLSErrorType,
  CertificateValidator
} from '../../adapters';

// Import actual types from expo-mutual-tls
interface ExpoMutualTLSClass {
  // Configuration methods (static)
  configurePEM(certService?: string, keyService?: string, enableLogging?: boolean): Promise<{
    success: boolean;
    state: string;
    hasCertificate: boolean;
  }>;
  configureP12(keychainService?: string, enableLogging?: boolean): Promise<{
    success: boolean;
    state: string;
    hasCertificate: boolean;
  }>;
  
  // Certificate storage methods (static)
  storePEM(certificate: string, privateKey: string, passphrase?: string): Promise<boolean>;
  storeP12(p12Base64: string, password: string): Promise<boolean>;
  
  // Certificate management (static)
  hasCertificate(): Promise<boolean>;
  removeCertificate(): Promise<void>;
  
  // Network operations (static)
  request(url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'json' | 'blob' | 'arraybuffer' | 'text';
  }): Promise<{
    success: boolean;
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string[]>;
    body: string;
    tlsVersion: string;
    cipherSuite: string;
  }>;
  
  testConnection(url: string): Promise<{
    success: boolean;
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string[]>;
    body: string;
    tlsVersion: string;
    cipherSuite: string;
  }>;
  
  // Properties (static getters)
  isConfigured: boolean;
  currentState: string;
  
  // Event handlers (static)
  onDebugLog(callback: (event: { type: string; message?: string; method?: string; url?: string; statusCode?: number; duration?: number; }) => void): any;
  onError(callback: (event: { message: string; code?: string; }) => void): any;
  onCertificateExpiry(callback: (event: { alias?: string; subject: string; expiry: number; warning?: boolean; }) => void): any;
}

/**
 * React Native mTLS Adapter using @a-cube-io/expo-mutual-tls
 */
export class ReactNativeMTLSAdapter implements IMTLSAdapter {
  private expoMTLS: ExpoMutualTLSClass | null = null;
  private config: MTLSConnectionConfig | null = null;
  private readonly debugEnabled: boolean;
  private isConfigured = false;
  private eventListeners: any[] = [];

  constructor(debugEnabled = false) {
    this.debugEnabled = debugEnabled;
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers for debugging and monitoring
   */
  private initializeEventHandlers(): void {
    try {
      // Import the default export from @a-cube-io/expo-mutual-tls
      const ExpoMutualTls = require('@a-cube-io/expo-mutual-tls').default || require('@a-cube-io/expo-mutual-tls');
      this.expoMTLS = ExpoMutualTls;

      if (this.debugEnabled) {
        // Set up debug logging with the correct event signature
        const debugListener = ExpoMutualTls.onDebugLog((event: any) => {
          console.log('[RN-MTLS-DEBUG]', `${event.type}: ${event.message}`, {
            method: event.method,
            url: event.url,
            statusCode: event.statusCode,
            duration: event.duration
          });
        });
        this.eventListeners.push(debugListener);

        // Set up error logging with the correct event signature
        const errorListener = ExpoMutualTls.onError((event: any) => {
          console.error('[RN-MTLS-ERROR]', `${event.message}`, {
            code: event.code
          });
        });
        this.eventListeners.push(errorListener);

        // Set up certificate expiry monitoring with the correct event signature
        const expiryListener = ExpoMutualTls.onCertificateExpiry((event: any) => {
          console.warn('[RN-MTLS-CERT-EXPIRY]', `Certificate ${event.subject} expires at ${new Date(event.expiry)}`, {
            alias: event.alias,
            warning: event.warning
          });
        });
        this.eventListeners.push(expiryListener);

        console.log('[RN-MTLS-ADAPTER] Expo mTLS module loaded successfully');
      }
    } catch (error) {
      if (this.debugEnabled) {
        console.warn('[RN-MTLS-ADAPTER] @a-cube-io/expo-mutual-tls not available:', error);
      }
    }
  }

  async isMTLSSupported(): Promise<boolean> {
    const supported = this.expoMTLS !== null;
    
    if (this.debugEnabled) {
      console.log('[RN-MTLS-ADAPTER] mTLS support check:', {
        supported,
        platform: this.getPlatformInfo().platform,
        moduleAvailable: !!this.expoMTLS
      });
    }
    
    return supported;
  }

  async initialize(config: MTLSConnectionConfig): Promise<void> {
    if (!this.expoMTLS) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'Expo mTLS module not available'
      );
    }

    this.config = config;

    if (this.debugEnabled) {
      console.log('[RN-MTLS-ADAPTER] Initialized with config:', {
        baseUrl: config.baseUrl,
        port: config.port,
        timeout: config.timeout,
        validateCertificate: config.validateCertificate
      });
    }
  }

  async configureCertificate(certificateData: CertificateData): Promise<void> {
    if (!this.expoMTLS) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'Expo mTLS module not available'
      );
    }

    if (!this.config) {
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Adapter not initialized. Call initialize() first.'
      );
    }

    if (this.debugEnabled) {
      console.log('[RN-MTLS-ADAPTER] Configuring certificate:', {
        format: certificateData.format,
        hasPassword: !!certificateData.password,
        certificateLength: certificateData.certificate.length,
        privateKeyLength: certificateData.privateKey.length
      });
    }

    try {
      if (certificateData.format === 'PEM') {
        // Validate PEM format
        if (!CertificateValidator.validatePEMFormat(
          certificateData.certificate, 
          certificateData.privateKey
        )) {
          throw new MTLSError(
            MTLSErrorType.CERTIFICATE_INVALID,
            'Invalid PEM certificate format'
          );
        }

        // Step 1: Configure PEM services (optional parameters for keychain services)
        const configResult = await this.expoMTLS.configurePEM(
          'client-cert-service', // certService
          'client-key-service',  // keyService
          this.debugEnabled      // enableLogging
        );

        if (this.debugEnabled) {
          console.log('[RN-MTLS-ADAPTER] PEM services configured:', configResult);
        }

        if (!configResult.success) {
          throw new MTLSError(
            MTLSErrorType.CONFIGURATION_ERROR,
            `PEM configuration failed: ${configResult.state}`
          );
        }

        // Step 2: Store the actual PEM certificate and private key
        const storeResult = await this.expoMTLS.storePEM(
          certificateData.certificate,
          certificateData.privateKey,
          certificateData.password // passphrase (optional)
        );

        if (this.debugEnabled) {
          console.log('[RN-MTLS-ADAPTER] PEM certificate store result:', storeResult);
        }

        if (!storeResult) {
          throw new MTLSError(
            MTLSErrorType.CERTIFICATE_INVALID,
            'Failed to store PEM certificate'
          );
        }
      } else if (certificateData.format === 'P12') {
        if (!certificateData.password) {
          throw new MTLSError(
            MTLSErrorType.CONFIGURATION_ERROR,
            'P12 certificate requires password'
          );
        }

        // Step 1: Configure P12 keychain service
        const configResult = await this.expoMTLS.configureP12(
          'client-p12-service', // keychainService
          this.debugEnabled     // enableLogging
        );

        if (this.debugEnabled) {
          console.log('[RN-MTLS-ADAPTER] P12 service configured:', configResult);
        }

        if (!configResult.success) {
          throw new MTLSError(
            MTLSErrorType.CONFIGURATION_ERROR,
            `P12 configuration failed: ${configResult.state}`
          );
        }

        // Step 2: Store the P12 certificate data
        const storeResult = await this.expoMTLS.storeP12(
          certificateData.certificate, // P12 data in certificate field
          certificateData.password
        );

        if (this.debugEnabled) {
          console.log('[RN-MTLS-ADAPTER] P12 certificate store result:', storeResult);
        }

        if (!storeResult) {
          throw new MTLSError(
            MTLSErrorType.CERTIFICATE_INVALID,
            'Failed to store P12 certificate'
          );
        }
      } else {
        throw new MTLSError(
          MTLSErrorType.CERTIFICATE_INVALID,
          `Unsupported certificate format: ${certificateData.format}`
        );
      }

      this.isConfigured = true;
    } catch (error) {
      if (error instanceof MTLSError) {
        throw error;
      }
      
      if (this.debugEnabled) {
        console.error('[RN-MTLS-ADAPTER] Certificate configuration failed:', error);
      }
      
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Failed to configure certificate',
        error as Error
      );
    }
  }

  async hasCertificate(): Promise<boolean> {
    if (!this.expoMTLS) {
      return false;
    }

    try {
      // Use static method call
      const hasCert = await this.expoMTLS.hasCertificate();
      
      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] Certificate availability check:', hasCert);
      }
      
      return hasCert;
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[RN-MTLS-ADAPTER] Certificate check failed:', error);
      }
      return false;
    }
  }

  async getCertificateInfo(): Promise<CertificateInfo | null> {
    // Note: @a-cube-io/expo-mutual-tls might not expose certificate info directly
    // This is a placeholder implementation
    if (this.debugEnabled) {
      console.log('[RN-MTLS-ADAPTER] Certificate info requested (not implemented in module)');
    }
    
    return null; // Would need to be implemented in the native module
  }

  async request<T>(requestConfig: MTLSRequestConfig): Promise<MTLSResponse<T>> {
    if (!this.expoMTLS) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'Expo mTLS module not available'
      );
    }

    const hasCert = await this.hasCertificate();
    if (!hasCert) {
      throw new MTLSError(
        MTLSErrorType.CERTIFICATE_NOT_FOUND,
        'No certificate configured'
      );
    }

    if (this.debugEnabled) {
      console.log('[RN-MTLS-ADAPTER] Making mTLS request:', requestConfig);
    }

    try {
      // ✅ FIXED: expo-mutual-tls v1.0.3+ supports binary responses
      // Binary data is returned as base64-encoded string when responseType is 'blob' or 'arraybuffer'
      const response = await this.expoMTLS.request(requestConfig.url, {
        method: requestConfig.method || 'GET',
        headers: requestConfig.headers,
        body: requestConfig.data ? JSON.stringify(requestConfig.data) : undefined,
        responseType: requestConfig.responseType
      });

      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] mTLS request successful:', response);
      }

      if (!response.success) {
        throw new MTLSError(
          MTLSErrorType.CONNECTION_FAILED,
          `mTLS request failed: ${response.statusMessage} (${response.statusCode})`
        );
      }

      // Parse response body if JSON
      let data: any = response.body;
      // only parse if responseType is 'json' or if Content-Type header indicates JSON
      const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
      if (requestConfig.responseType === 'json' || contentType.includes('application/json')) {
        try {
          data = JSON.parse(response.body);
        } catch (parseError) {
          if (this.debugEnabled) {
            console.warn('[RN-MTLS-ADAPTER] Failed to parse JSON response:', parseError);
          }
          // If parsing fails, keep raw body
        }
      }

      // Convert headers from string[] to string format
      const normalizedHeaders: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        normalizedHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
      });

      return {
        data,
        status: response.statusCode,
        statusText: response.statusMessage,
        headers: normalizedHeaders
      };
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[RN-MTLS-ADAPTER] mTLS request failed:', error);
      }

      throw new MTLSError(
        MTLSErrorType.CONNECTION_FAILED,
        'mTLS request failed',
        error as Error
      );
    }
  }

  /**
   * Test mTLS connection (DIAGNOSTIC ONLY - not used for validation)
   *
   * WARNING: This method calls a test endpoint that may return 500 errors
   * even when actual mTLS requests work perfectly. It should only be used
   * for diagnostic purposes, not for determining if mTLS is ready.
   */
  async testConnection(): Promise<boolean> {
    if (!this.expoMTLS || !this.config) {
      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] 🔍 Diagnostic test: No mTLS module or config available');
      }
      return false;
    }

    try {
      const hasCert = await this.hasCertificate();
      if (!hasCert) {
        if (this.debugEnabled) {
          console.log('[RN-MTLS-ADAPTER] 🔍 Diagnostic test: No certificate configured');
        }
        return false;
      }

      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] 🔍 Running diagnostic test (may fail even if mTLS works):', this.config.baseUrl);
      }

      const result = await this.expoMTLS.testConnection(this.config.baseUrl);

      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] 🔍 Diagnostic test result (NOT validation):', {
          success: result.success,
          statusCode: result.statusCode,
          statusMessage: result.statusMessage,
          tlsVersion: result.tlsVersion,
          cipherSuite: result.cipherSuite,
          note: 'Test endpoint may return 500 while actual requests work'
        });
      }

      return result.success;
    } catch (error) {
      if (this.debugEnabled) {
        console.warn('[RN-MTLS-ADAPTER] 🔍 Diagnostic test failed (this is expected):', error);
      }
      return false;
    }
  }

  async removeCertificate(): Promise<void> {
    if (!this.expoMTLS) {
      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] Remove certificate: Module not available');
      }
      return;
    }

    try {
      // Use static method call
      await this.expoMTLS.removeCertificate();
      this.isConfigured = false;
      
      // Cleanup event listeners
      this.cleanupEventListeners();
      
      if (this.debugEnabled) {
        console.log('[RN-MTLS-ADAPTER] Certificate removed successfully');
      }
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[RN-MTLS-ADAPTER] Failed to remove certificate:', error);
      }
      
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Failed to remove certificate',
        error as Error
      );
    }
  }

  /**
   * Cleanup event listeners
   */
  private cleanupEventListeners(): void {
    if (this.eventListeners.length > 0 && this.debugEnabled) {
      console.log(`[RN-MTLS-ADAPTER] Cleaning up ${this.eventListeners.length} event listeners`);
    }
    
    // Note: The actual cleanup would depend on the return type of onDebugLog/onError/onCertificateExpiry
    // which might provide unsubscribe functions. For now, we clear the array.
    this.eventListeners.length = 0;
  }

  /**
   * Get the configured mTLS base URL
   */
  getBaseUrl(): string | null {
    return this.config?.baseUrl || null;
  }

  getPlatformInfo() {
    return {
      platform: 'react-native' as const,
      mtlsSupported: this.expoMTLS !== null,
      certificateStorage: 'keychain' as const,
      fallbackToJWT: true,
      configured: this.isConfigured
    };
  }
}