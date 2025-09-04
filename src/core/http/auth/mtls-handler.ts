import { 
  IMTLSAdapter, 
  CertificateData, 
  MTLSError, 
  MTLSErrorType,
  MTLSRequestConfig
} from '../../../adapters';
import { CertificateManager, StoredCertificate } from '../../certificates';

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
    debugEnabled: boolean = false
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
   * Check if mTLS is ready for requests
   */
  async isMTLSReady(): Promise<boolean> {
    if (!this.mtlsAdapter || !this.certificateManager) return false;
    
    try {
      const hasCertificate = await this.certificateManager.hasCertificate();
      
      if (this.isDebugEnabled) {
        console.log('[MTLS-HANDLER] mTLS ready check:', {
          adapterAvailable: !!this.mtlsAdapter,
          certificateManagerAvailable: !!this.certificateManager,
          hasCertificate
        });
      }
      
      return hasCertificate;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] mTLS ready check failed:', error);
      }
      return false;
    }
  }

  /**
   * Determine authentication mode for a request
   */
  determineAuthMode(url: string, explicitMode?: AuthMode): AuthMode {
    // Explicit mode specified
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

    // Configure certificate for this request
    try {
      await this.mtlsAdapter.configureCertificate(certificateData);
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[MTLS-HANDLER] Failed to configure certificate:', error);
      }
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        `Failed to configure certificate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

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