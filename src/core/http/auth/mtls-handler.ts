import {
  IMTLSAdapter,
  CertificateData,
  MTLSError,
  MTLSErrorType,
  MTLSRequestConfig
} from '../../../adapters';
import { CertificateManager, StoredCertificate } from '../../certificates';
import { IUserProvider } from '../../types';
import { hasRole } from '../../roles';

/**
 * Simplified authentication modes
 */
export type AuthMode = 'jwt' | 'mtls' | 'auto';

/**
 * Authentication configuration with port 444 support for browser certificates
 */
export interface AuthConfig {
  mode: AuthMode;
  usePort444: boolean; // For web platform browser certificate usage
}

/**
 * mTLS Handler for certificate selection and mTLS requests
 */
export class MTLSHandler {
  private isDebugEnabled: boolean = false;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(
    private mtlsAdapter: IMTLSAdapter | null,
    private certificateManager: CertificateManager | null,
    debugEnabled: boolean = false,
    private userProvider?: IUserProvider
  ) {
    this.isDebugEnabled = debugEnabled;
  }

  /**
   * Get the single certificate for mTLS requests
   */
  async getCertificate(): Promise<StoredCertificate | null> {
    if (!this.certificateManager) return null;

    try {
      const cert = await this.certificateManager.getCertificate();
      
      if (cert) {
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] Certificate found:', {
            format: cert.format
          });
        }
        return cert;
      }

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] No certificate available for mTLS');
      }
      return null;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] Certificate retrieval failed:', error);
      }
      return null;
    }
  }

  /**
   * Check if mTLS is ready for requests (simplified approach)
   *
   * New approach: Only check if certificate exists in storage.
   * No pre-flight validation or test connection.
   * Let makeRequestMTLS() handle configuration and retry on failure.
   */
  async isMTLSReady(): Promise<boolean> {
    if (!this.mtlsAdapter || !this.certificateManager) {
      return false;
    }

    try {
      const hasCertificate = await this.certificateManager.hasCertificate();

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] ✅ mTLS readiness check:', {
          hasCertificate,
          approach: 'certificate-existence-only'
        });
      }

      return hasCertificate;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] ❌ mTLS readiness check failed:', error);
      }
      return false;
    }
  }

  /**
   * Determine authentication configuration for a request
   *
   * Authentication Matrix:
   * - SUPPLIER: JWT only (all platforms, all resources)
   * - MERCHANT: JWT for non-receipts, GET receipts; mTLS for POST/PUT/PATCH receipts on mobile; JWT+:444 for POST/PUT/PATCH receipts on web
   * - CASHIER: mTLS on mobile, JWT+:444 on web (receipts only)
   * - Web Platform: Always JWT, but uses :444 port for browser certificates when needed
   */
  async determineAuthConfig(url: string, explicitMode?: AuthMode, method?: string): Promise<AuthConfig> {
    // Step 1: Detect platform (web always uses JWT)
    let platform: 'web' | 'mobile' | 'unknown' = 'unknown';
    if (this.mtlsAdapter) {
      try {
        const platformInfo = this.mtlsAdapter.getPlatformInfo();
        platform = platformInfo.platform === 'web' ? 'web' : 'mobile';
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[MTLS-HANDLER] ⚠️ Platform detection failed, defaulting to web:', error);
        }
        platform = 'web'; // Default to web (JWT) for safety
      }
    } else {
      platform = 'web'; // No adapter means web platform
    }

    // Step 2: Get user role
    let userRole: string | null = null;
    if (this.userProvider) {
      try {
        const currentUser = await this.userProvider.getCurrentUser();
        if (currentUser && currentUser.roles) {
          // Identify primary role
          if (hasRole(currentUser.roles, 'ROLE_SUPPLIER')) {
            userRole = 'SUPPLIER';
          } else if (hasRole(currentUser.roles, 'ROLE_MERCHANT')) {
            userRole = 'MERCHANT';
          } else if (hasRole(currentUser.roles, 'ROLE_CACHIER')) {
            userRole = 'CASHIER';
          }
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[MTLS-HANDLER] ⚠️ Failed to get user role:', error);
        }
      }
    }

    // Step 3: Determine if this is a receipt endpoint
    const isReceiptEndpoint = url.includes('/receipts') || url.includes('/mf1/receipts');

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] 🔍 Auth decision factors:', {
        platform,
        userRole,
        isReceiptEndpoint,
        method: method || 'unknown',
        url
      });
    }

    // Step 4: Apply authentication matrix

    // SUPPLIER: Always JWT, no port 444 needed
    if (userRole === 'SUPPLIER') {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 👤 SUPPLIER role - JWT only');
      }
      return { mode: 'jwt', usePort444: false };
    }

    // CASHIER: Can only access receipts
    if (userRole === 'CASHIER') {
      if (!isReceiptEndpoint) {
        if (this.isDebugEnabled) {
          console.warn('[MTLS-HANDLER] ❌ CASHIER trying to access non-receipt endpoint');
        }
        // Cashiers can only access receipts - force JWT to let server reject
        return { mode: 'jwt', usePort444: false };
      }
      // Mobile cashier uses mTLS for receipts
      if (platform === 'mobile') {
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] 🏧 CASHIER on mobile - mTLS for receipts');
        }
        return { mode: 'mtls', usePort444: false };
      }
      // Web cashier uses JWT with :444 port for browser certificates
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 🏧 CASHIER on web - JWT with :444 for browser certificates');
      }
      return { mode: 'jwt', usePort444: true };
    }

    // MERCHANT: Complex rules
    if (userRole === 'MERCHANT') {
      // Non-receipt resources: Always JWT, no port 444
      if (!isReceiptEndpoint) {
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] 🏪 MERCHANT accessing non-receipt - JWT');
        }
        return { mode: 'jwt', usePort444: false };
      }

      // Receipt GET: Always JWT, no port 444
      if (method === 'GET') {
        // if is detailed receipt GET (with ID) /details use mTLS on mobile, JWT+:444 on web
        if (url.match(/\/receipts\/[a-f0-9\-]+\/details$/) || url.match(/\/mf1\/receipts\/[a-f0-9\-]+\/details$/)) {
          if (platform === 'mobile') {
            if (this.isDebugEnabled) {
              console.log('[MTLS-HANDLER] 🏪 MERCHANT GET detailed receipt on mobile - mTLS');
            }
            return { mode: 'mtls', usePort444: false };
          } else {
            // Web platform: JWT with :444 for browser certificates
            if (this.isDebugEnabled) {
              console.log('[MTLS-HANDLER] 🏪 MERCHANT GET detailed receipt on web - JWT with :444 for browser certificates');
            }
            return { mode: 'jwt', usePort444: true };
          }
        }
        
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] 🏪 MERCHANT GET receipt - JWT');
        }
        return { mode: 'jwt', usePort444: false };
      }

      // Receipt POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method || '')) {
        if (platform === 'mobile') {
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] 🏪 MERCHANT modify receipt on mobile - mTLS');
          }
          return { mode: 'mtls', usePort444: false };
        } else {
          // Web platform: JWT with :444 for browser certificates
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] 🏪 MERCHANT modify receipt on web - JWT with :444 for browser certificates');
          }
          return { mode: 'jwt', usePort444: true };
        }
      }

      // All other MERCHANT cases: JWT
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 🏪 MERCHANT default - JWT');
      }
      return { mode: 'jwt', usePort444: false };
    }

    // Step 5: Handle explicit mode override (if allowed)
    if (explicitMode) {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] ⚠️ Explicit auth mode requested:', explicitMode);
      }
      // Security: Don't allow overriding SUPPLIER to mTLS
      if (userRole === 'SUPPLIER' && explicitMode === 'mtls') {
        if (this.isDebugEnabled) {
          console.warn('[MTLS-HANDLER] ❌ Blocking mTLS override for SUPPLIER');
        }
        return { mode: 'jwt', usePort444: false };
      }
      return { mode: explicitMode, usePort444: false };
    }

    // Step 6: Default behavior for unknown roles
    // Web platform: Always use JWT for safety (never mTLS without explicit role)
    if (platform === 'web') {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 🌐 Web platform with unknown role - defaulting to JWT (safe)');
      }
      // Use port 444 only for receipt endpoints that might need browser certificates
      return { mode: 'jwt', usePort444: isReceiptEndpoint };
    }

    // Mobile platform: For receipts without a known role, prefer mTLS
    if (isReceiptEndpoint && platform === 'mobile') {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 📱 Mobile with unknown role, receipt endpoint - defaulting to mTLS');
      }
      return { mode: 'mtls', usePort444: false };
    }

    // Default to JWT for all other cases (unknown platform or non-receipt endpoints)
    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] 📝 Default case - JWT (platform:', platform, ')');
    }
    return { mode: 'jwt', usePort444: false };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use determineAuthConfig instead
   */
  async determineAuthMode(url: string, explicitMode?: AuthMode, method?: string): Promise<AuthMode> {
    const config = await this.determineAuthConfig(url, explicitMode, method);
    return config.mode;
  }


  /**
   * Generate a unique key for request deduplication
   */
  private generateRequestKey(
    url: string,
    config: { method?: string; data?: any; headers?: any; timeout?: number } = {},
    jwtToken?: string
  ): string {
    const method = config.method || 'GET';
    const dataHash = config.data ? JSON.stringify(config.data) : '';
    const authHash = jwtToken ? jwtToken.substring(0, 10) : 'no-auth';
    return `${method}:${url}:${dataHash}:${authHash}`;
  }

  /**
   * Make a request with mTLS authentication using retry-on-failure pattern
   * Includes request deduplication to prevent multiple concurrent requests to the same endpoint
   *
   * New approach: Try request → If fails → Reconfigure once → Retry → If fails → Error
   */
  async makeRequestMTLS<T>(
    url: string,
    config: { method?: string; data?: any; headers?: any; timeout?: number } = {},
    certificateOverride?: CertificateData,
    jwtToken?: string,
    isRetryAttempt: boolean = false
  ): Promise<T> {
    // Generate request key for deduplication (only for non-retry attempts)
    const requestKey = !isRetryAttempt ? this.generateRequestKey(url, config, jwtToken) : null;

    // Check if there's already a pending request for this exact same request
    if (requestKey && this.pendingRequests.has(requestKey)) {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 🔄 Deduplicating concurrent request:', {
          method: config.method || 'GET',
          url,
          requestKey: requestKey.substring(0, 50) + '...'
        });
      }

      // Return the existing promise to prevent duplicate requests
      return this.pendingRequests.get(requestKey)!;
    }

    // Create the actual request promise
    const requestPromise = this.executeRequestMTLS<T>(url, config, certificateOverride, jwtToken, isRetryAttempt);

    // Store the promise for deduplication (only for non-retry attempts)
    if (requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);

      // Clean up the pending request when it completes (success or failure)
      requestPromise
        .then(() => {
          this.pendingRequests.delete(requestKey);
        })
        .catch(() => {
          this.pendingRequests.delete(requestKey);
        });
    }

    return requestPromise;
  }

  /**
   * Execute the actual mTLS request (internal method)
   */
  private async executeRequestMTLS<T>(
    url: string,
    config: { method?: string; data?: any; headers?: any; timeout?: number } = {},
    certificateOverride?: CertificateData,
    jwtToken?: string,
    isRetryAttempt: boolean = false
  ): Promise<T> {
    if (!this.mtlsAdapter) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'mTLS adapter not available'
      );
    }

    // Get the single certificate
    const selectedCert = await this.getCertificate();
    const certificateData = certificateOverride || (selectedCert ? this.certificateToData(selectedCert) : null);

    if (!certificateData) {
      throw new MTLSError(
        MTLSErrorType.CERTIFICATE_NOT_FOUND,
        'No certificate available for mTLS request'
      );
    }

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Making mTLS request:', {
        method: config.method || 'GET',
        url,
        hasData: !!config.data,
        isRetryAttempt,
        approach: 'retry-on-failure'
      });
    }

    try {
      // Prepare headers including JWT Authorization if available
      const headers: Record<string, string> = {
        ...(config.headers || {}),
        ...(config.method !== 'GET' && config.data ? { 'Content-Type': 'application/json' } : {})
      };

      // Include JWT Authorization header if available
      if (jwtToken) {
        headers['Authorization'] = jwtToken;

        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] Including JWT Authorization header in mTLS request');
        }
      }

      const mtlsConfig: MTLSRequestConfig = {
        url: this.constructMTLSUrl(url),
        method: (config.method || 'GET') as any,
        headers,
        data: config.data,
        timeout: config.timeout
      };

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] mTLS request config:', JSON.stringify(mtlsConfig, undefined, 2));
      }

      const response = await this.mtlsAdapter.request<T>(mtlsConfig);

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] mTLS request successful:', {
          status: response.status,
          hasData: !!response.data,
          isRetryAttempt
        });
      }

      return response.data;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] mTLS request failed:', {
          error: error instanceof Error ? error.message : error,
          isRetryAttempt
        });
      }

      // If this is already a retry attempt, don't retry again to prevent infinite loops
      if (isRetryAttempt) {
        if (this.isDebugEnabled) {
          console.error('[MTLS-HANDLER] ❌ Retry attempt also failed - certificate may be invalid');
        }
        throw error;
      }

      // First attempt failed - try to reconfigure certificate and retry
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 🔄 First attempt failed, reconfiguring certificate and retrying...');
      }

      try {
        // Reconfigure the certificate in the mTLS adapter
        await this.mtlsAdapter.configureCertificate(certificateData);

        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] ✅ Certificate reconfigured, retrying request...');
        }

        // Retry the request (with flag to prevent infinite recursion)
        return await this.executeRequestMTLS<T>(url, config, certificateOverride, jwtToken, true);
      } catch (reconfigError) {
        if (this.isDebugEnabled) {
          console.error('[MTLS-HANDLER] ❌ Certificate reconfiguration failed:', reconfigError);
        }
        // If reconfiguration fails, throw the original error
        throw error;
      }
    }
  }

  /**
   * Store certificate with proper coordination between certificate manager and mTLS adapter
   * Ensures old certificates are cleared from both SDK storage and native keychain
   */
  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: { format?: 'pem' | 'p12' | 'pkcs12' } = {}
  ): Promise<void> {
    if (!this.certificateManager) {
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Certificate manager not available'
      );
    }

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Coordinated certificate storage initiated:', {
        format: options.format || 'pem',
        certificateLength: certificate.length,
        privateKeyLength: privateKey.length
      });
    }

    try {
      // Step 1: Clear any existing certificate from a native keychain
      if (this.mtlsAdapter) {
        try {
          await this.mtlsAdapter.removeCertificate();
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] Cleared old certificate from native keychain');
          }
        } catch (error) {
          if (this.isDebugEnabled) {
            console.warn('[MTLS-HANDLER] No existing certificate to clear from keychain:', error);
          }
        }
      }

      // Step 2: Store new certificate in certificate manager
      await this.certificateManager.storeCertificate(certificate, privateKey, options);

      // Step 3: Configure a certificate in mTLS adapter for immediate use
      if (this.mtlsAdapter) {
        try {
          const certificateData = {
            certificate,
            privateKey,
            format: (options.format?.toUpperCase() || 'PEM') as 'PEM' | 'P12',
            password: undefined // Not used in our simplified system
          };
          
          await this.mtlsAdapter.configureCertificate(certificateData);
          
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] Certificate configured in mTLS adapter');
          }
        } catch (error) {
          if (this.isDebugEnabled) {
            console.error('[MTLS-HANDLER] Failed to configure certificate in adapter:', error);
          }
          throw new MTLSError(
            MTLSErrorType.CONFIGURATION_ERROR,
            `Failed to configure certificate in mTLS adapter: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] Certificate stored and configured successfully');
      }

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] Coordinated certificate storage failed:', error);
      }
      throw error;
    }
  }

  /**
   * Clear certificate from both certificate manager and native keychain
   */
  async clearCertificate(): Promise<void> {
    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Coordinated certificate clearing initiated');
    }

    try {
      // Step 1: Clear from the native keychain
      if (this.mtlsAdapter) {
        try {
          await this.mtlsAdapter.removeCertificate();
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] Cleared certificate from native keychain');
          }
        } catch (error) {
          if (this.isDebugEnabled) {
            console.warn('[MTLS-HANDLER] No certificate to clear from keychain:', error);
          }
        }
      }

      // Step 2: Clear from the certificate manager
      if (this.certificateManager) {
        try {
          await this.certificateManager.clearCertificate();
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] Cleared certificate from certificate manager');
          }
        } catch (error) {
          if (this.isDebugEnabled) {
            console.warn('[MTLS-HANDLER] No certificate to clear from manager:', error);
          }
        }
      }

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] Certificate cleared successfully from all storage systems');
      }

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] Coordinated certificate clearing failed:', error);
      }
      throw error;
    }
  }

  /**
   * Test mTLS connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.mtlsAdapter) return false;
    
    try {
      const result = await this.mtlsAdapter.testConnection();
      
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] mTLS connection test:', result);
      }
      
      return result;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] mTLS connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * Clear all pending requests (useful for testing or cleanup)
   */
  clearPendingRequests(): void {
    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Clearing pending requests:', this.pendingRequests.size);
    }
    this.pendingRequests.clear();
  }

  /**
   * Get mTLS status information
   */
  async getStatus() {
    const status = {
      adapterAvailable: !!this.mtlsAdapter,
      certificateManagerAvailable: !!this.certificateManager,
      isReady: false,
      hasCertificate: false,
      certificateInfo: null as any,
      platformInfo: this.mtlsAdapter?.getPlatformInfo() || null,
      diagnosticTest: false, // Renamed to clarify this is diagnostic only
      diagnosticTestNote: 'Test endpoint may fail even when mTLS works - for diagnostic purposes only',
      pendingRequestsCount: this.pendingRequests.size
    };

    if (this.certificateManager) {
      try {
        status.hasCertificate = await this.certificateManager.hasCertificate();
        if (status.hasCertificate) {
          status.certificateInfo = await this.certificateManager.getCertificateInfo();
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.error('[MTLS-HANDLER] Failed to get certificate info:', error);
        }
      }
    }

    if (this.mtlsAdapter && this.certificateManager) {
      try {
        status.isReady = await this.isMTLSReady();

        // Run diagnostic test but don't let it affect overall status
        try {
          status.diagnosticTest = await this.testConnection();
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] 🔍 Diagnostic test completed (result does not affect isReady status)');
          }
        } catch (diagnosticError) {
          if (this.isDebugEnabled) {
            console.warn('[MTLS-HANDLER] 🔍 Diagnostic test failed (this is expected and normal):', diagnosticError);
          }
          status.diagnosticTest = false;
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.error('[MTLS-HANDLER] Status check failed:', error);
        }
      }
    }

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] mTLS Status:', {
        ...status,
        approach: 'retry-on-failure'
      });
    }

    return status;
  }

  /**
   * Convert StoredCertificate to CertificateData for mTLS adapter
   */
  private certificateToData(cert: StoredCertificate): CertificateData {
    return {
      certificate: cert.certificate,
      privateKey: cert.privateKey,
      format: cert.format.toUpperCase() as 'PEM' | 'P12'
    };
  }

  /**
   * Construct full absolute URL for mTLS requests
   */
  private constructMTLSUrl(relativePath: string): string {
    // Get the configured mTLS base URL from the adapter
    const mtlsBaseUrl = this.mtlsAdapter?.getBaseUrl();

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Constructing mTLS URL:', {
        relativePath,
        mtlsBaseUrl,
        source: mtlsBaseUrl ? 'adapter' : 'fallback'
      });
    }
    
    if (!mtlsBaseUrl) {
      // This should not happen in normal operation, but provide a fallback
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'mTLS adapter base URL not configured'
      );
    }
    
    return this.combineUrlAndPath(mtlsBaseUrl, relativePath);
  }

  /**
   * Combine base URL with a relative path, handling slashes correctly
   */
  private combineUrlAndPath(baseUrl: string, relativePath: string): string {
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    
    const fullUrl = baseUrl.endsWith('/') 
      ? `${baseUrl}${cleanPath}`
      : `${baseUrl}/${cleanPath}`;
    
    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] URL construction:', {
        baseUrl,
        relativePath,
        cleanPath,
        fullUrl
      });
    }
    
    return fullUrl;
  }
}