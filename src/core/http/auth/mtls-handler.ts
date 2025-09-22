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
 * mTLS Handler for certificate selection and mTLS requests
 */
export class MTLSHandler {
  private isDebugEnabled: boolean = false;

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
   * Check if mTLS is ready for requests (self-healing after app restart)
   *
   * Enhanced logic to handle expo-mutual-tls state management:
   * - Certificate data persists in iOS keychain (survives app restart)
   * - Service configuration is in-memory only (lost on app restart)
   * - hasCertificate() only checks data, not configuration
   * - Must test actual configuration to detect app restart scenario
   */
  async isMTLSReady(): Promise<boolean> {
    if (!this.mtlsAdapter || !this.certificateManager) return false;

    try {
      // Check if certificate exists in Certificate Manager (SDK storage)
      const hasCertificateInStorage = await this.certificateManager.hasCertificate();

      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 📋 Certificate storage check:', { hasCertificateInStorage });
      }

      if (!hasCertificateInStorage) {
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] ❌ No certificate in storage - mTLS not ready');
        }
        return false;
      }

      // Test if mTLS configuration actually works (not just if data exists)
      // This is critical because expo-mutual-tls has two types of state:
      // 1. Certificate data (persists in keychain)
      // 2. Service configuration (lost on app restart)
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] 🔍 Testing mTLS configuration...');
      }

      let configurationWorks = false;
      try {
        configurationWorks = await this.mtlsAdapter.testConnection();
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] 🧪 Configuration test result:', { configurationWorks });
        }
      } catch (testError) {
        if (this.isDebugEnabled) {
          console.warn('[MTLS-HANDLER] ⚠️ Configuration test failed:', testError);
        }
        configurationWorks = false;
      }

      // If certificate exists in storage but configuration doesn't work (app restart scenario)
      if (!configurationWorks) {
        if (this.isDebugEnabled) {
          console.log('[MTLS-HANDLER] 🔄 Auto-configuration needed: certificate data exists but service configuration lost');
        }

        try {
          // Get certificate from storage and reconfigure the adapter
          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] 📄 Retrieving certificate from storage...');
          }

          const certificate = await this.certificateManager.getCertificate();
          if (certificate) {
            if (this.isDebugEnabled) {
              console.log('[MTLS-HANDLER] 📄 Certificate retrieved, converting to adapter format...');
            }

            const certificateData = this.certificateToData(certificate);

            if (this.isDebugEnabled) {
              console.log('[MTLS-HANDLER] ⚙️ Reconfiguring certificate in mTLS adapter...', {
                format: certificateData.format,
                certificateLength: certificateData.certificate.length,
                privateKeyLength: certificateData.privateKey.length
              });
            }

            // This will do both service configuration AND data storage
            await this.mtlsAdapter.configureCertificate(certificateData);

            if (this.isDebugEnabled) {
              console.log('[MTLS-HANDLER] ✅ Successfully auto-configured certificate after app restart');
            }

            // Verify the configuration now works
            try {
              const retestResult = await this.mtlsAdapter.testConnection();
              if (this.isDebugEnabled) {
                console.log('[MTLS-HANDLER] 🧪 Post-configuration test result:', { retestResult });
              }
              return retestResult;
            } catch (retestError) {
              if (this.isDebugEnabled) {
                console.error('[MTLS-HANDLER] ❌ Post-configuration test failed:', retestError);
              }
              return false;
            }
          } else {
            if (this.isDebugEnabled) {
              console.error('[MTLS-HANDLER] ❌ Certificate retrieved but is null/empty');
            }
            return false;
          }
        } catch (configError) {
          if (this.isDebugEnabled) {
            console.error('[MTLS-HANDLER] ❌ Failed to auto-configure certificate:', configError);
          }
          return false;
        }
      }

      // Configuration works, mTLS is ready
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] ✅ mTLS is ready and properly configured');
      }

      return true;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] ❌ mTLS ready check failed:', error);
      }
      return false;
    }
  }

  /**
   * Determine authentication mode for a request
   *
   * Enhanced with role-based authentication:
   * - Supplier users (ROLE_SUPPLIER) are restricted to JWT-only authentication
   * - Other users follow URL-based logic for mTLS on receipt endpoints
   */
  async determineAuthMode(url: string, explicitMode?: AuthMode): Promise<AuthMode> {
    // Check if current user is a Supplier (ROLE_SUPPLIER users must use JWT only)
    if (this.userProvider) {
      try {
        const currentUser = await this.userProvider.getCurrentUser();
        if (currentUser) {
          const isSupplier = hasRole(currentUser.roles, 'ROLE_SUPPLIER');

          if (isSupplier) {
            if (this.isDebugEnabled) {
              console.log('[MTLS-HANDLER] 🚫 Supplier user detected - enforcing JWT-only authentication');
            }
            return 'jwt';
          }

          if (this.isDebugEnabled) {
            console.log('[MTLS-HANDLER] 👤 User role check:', {
              userId: currentUser.id,
              username: currentUser.username,
              isSupplier,
              roles: currentUser.roles
            });
          }
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[MTLS-HANDLER] ⚠️ Failed to get current user for role-based auth decision:', error);
        }
        // Continue with URL-based logic if user check fails
      }
    }

    // Explicit mode specified (overrides URL-based logic but not role restrictions)
    if (explicitMode) {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] Using explicit auth mode:', explicitMode);
      }
      return explicitMode;
    }

    // Receipt endpoints should use mTLS (A-Cube requirement)
    if (url.includes('/receipts') || url.includes('/mf1/receipts')) {
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] Receipt endpoint detected, using mTLS mode');
      }
      return 'mtls';
    }

    // Default to auto mode
    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Using auto auth mode');
    }
    return 'auto';
  }

  /**
   * Check if a route requires mTLS authentication
   */
  requiresMTLS(url: string): boolean {
    const mtlsRequiredRoutes = [
      '/receipts',
      '/mf1/receipts'
    ];

    return mtlsRequiredRoutes.some(route => url.includes(route));
  }

  /**
   * Make a request with mTLS authentication
   */
  async makeRequestMTLS<T>(
    url: string,
    config: { method?: string; data?: any; headers?: any; timeout?: number } = {},
    certificateOverride?: CertificateData,
    jwtToken?: string
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

    // Certificate configuration is now handled by isMTLSReady() method

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] Making mTLS request:', {
        method: config.method || 'GET',
        url,
        hasData: !!config.data,
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
        });
      }

      return response.data;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] mTLS request failed:', error);
      }
      throw error;
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
      connectionTest: false
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
        status.connectionTest = await this.testConnection();
      } catch (error) {
        if (this.isDebugEnabled) {
          console.error('[MTLS-HANDLER] Status check failed:', error);
        }
      }
    }

    if (this.isDebugEnabled) {
      console.log('[MTLS-HANDLER] mTLS Status:', status);
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