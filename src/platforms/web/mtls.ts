/**
 * Web mTLS Adapter Implementation
 * Web browsers do not support client certificate configuration via JavaScript
 * This adapter provides graceful fallback with clear error messages
 */
import {
  CertificateData,
  CertificateInfo,
  IMTLSAdapter,
  MTLSConnectionConfig,
  MTLSError,
  MTLSErrorType,
  MTLSRequestConfig,
  MTLSResponse,
} from '../../adapters/mtls';

/**
 * Web mTLS Adapter - Graceful fallback for web browsers
 *
 * Web browsers handle client certificates through:
 * 1. Browser certificate store (managed by user)
 * 2. TLS handshake (automatic, not script-controlled)
 * 3. User prompts for certificate selection
 *
 * JavaScript cannot programmatically configure client certificates
 * due to security restrictions in the browser sandbox.
 */
export class WebMTLSAdapter implements IMTLSAdapter {
  private debugEnabled = false;

  constructor(debugEnabled = false) {
    this.debugEnabled = debugEnabled;

    if (this.debugEnabled) {
      console.warn(
        '[WEB-MTLS-ADAPTER] Web browsers do not support programmatic mTLS configuration'
      );
      console.info(
        '[WEB-MTLS-ADAPTER] Use JWT authentication or configure client certificates in browser settings'
      );
    }
  }

  async isMTLSSupported(): Promise<boolean> {
    // mTLS is not supported programmatically in web browsers
    const supported = false;

    if (this.debugEnabled) {
      console.log('[WEB-MTLS-ADAPTER] mTLS support check:', {
        supported,
        platform: this.getPlatformInfo().platform,
        reason: 'Browser security model prevents programmatic certificate configuration',
        alternatives: ['JWT authentication', 'Browser-managed certificates', 'Server-side proxy'],
      });
    }

    return supported;
  }

  async initialize(config: MTLSConnectionConfig): Promise<void> {
    if (this.debugEnabled) {
      console.warn('[WEB-MTLS-ADAPTER] Initialized but mTLS not available in web browsers:', {
        baseUrl: config.baseUrl,
        port: config.port,
        recommendation: 'Use standard HTTPS with JWT authentication',
      });
    }
  }

  async configureCertificate(certificateData: CertificateData): Promise<void> {
    if (this.debugEnabled) {
      console.error('[WEB-MTLS-ADAPTER] Certificate configuration attempted:', {
        format: certificateData.format,
        reason: 'Not supported in web browsers',
        alternatives: [
          'Import certificate into browser certificate store',
          'Use JWT authentication instead',
          'Configure server-side proxy for certificate handling',
        ],
      });
    }

    throw new MTLSError(
      MTLSErrorType.NOT_SUPPORTED,
      'mTLS client certificate configuration is not supported in web browsers. ' +
        'Web browsers manage client certificates through the browser certificate store. ' +
        'Please use JWT authentication or import certificates manually into your browser.'
    );
  }

  async hasCertificate(): Promise<boolean> {
    // We cannot detect if the browser has certificates configured
    if (this.debugEnabled) {
      console.log(
        '[WEB-MTLS-ADAPTER] Certificate availability check: Cannot detect browser certificates programmatically'
      );
    }

    return false;
  }

  async getCertificateInfo(): Promise<CertificateInfo | null> {
    if (this.debugEnabled) {
      console.log('[WEB-MTLS-ADAPTER] Certificate info requested: Not accessible in web browsers');
    }

    return null;
  }

  async request<T>(requestConfig: MTLSRequestConfig): Promise<MTLSResponse<T>> {
    if (this.debugEnabled) {
      console.error('[WEB-MTLS-ADAPTER] mTLS request attempted:', {
        method: requestConfig.method,
        url: requestConfig.url,
        reason: 'Not supported in web browsers',
        alternatives: [
          'Use standard fetch() or XMLHttpRequest',
          'Configure JWT authentication',
          'Rely on browser-managed certificates (if configured by user)',
        ],
      });
    }

    throw new MTLSError(
      MTLSErrorType.NOT_SUPPORTED,
      'mTLS requests are not supported in web browsers via JavaScript. ' +
        'Use standard HTTP client with JWT authentication, or ensure client certificates ' +
        'are properly configured in the browser certificate store.'
    );
  }

  async testConnection(): Promise<boolean> {
    if (this.debugEnabled) {
      console.log('[WEB-MTLS-ADAPTER] Connection test: mTLS not available in web browsers');
    }

    return false;
  }

  async removeCertificate(): Promise<void> {
    if (this.debugEnabled) {
      console.log(
        '[WEB-MTLS-ADAPTER] Remove certificate: No certificates to remove (not supported in web browsers)'
      );
    }

    // No-op - cannot remove certificates programmatically in browsers
  }

  /**
   * Get the configured mTLS base URL
   * Always returns null for web browsers as mTLS is not supported
   */
  getBaseUrl(): string | null {
    if (this.debugEnabled) {
      console.log('[WEB-MTLS-ADAPTER] Base URL requested: Not supported in web browsers');
    }
    return null;
  }

  getPlatformInfo() {
    return {
      platform: 'web' as const,
      mtlsSupported: false,
      certificateStorage: 'browser-managed' as const,
      fallbackToJWT: true,
      limitations: [
        'Browser security model prevents programmatic certificate access',
        'Client certificates managed through browser UI only',
        'TLS handshake handled automatically by browser',
        'Certificate selection prompts managed by browser',
      ],
      recommendations: [
        'Use JWT authentication for API access',
        'Configure client certificates in browser settings if required',
        'Consider server-side proxy for certificate handling',
        'Use standard fetch API with browser-managed certificates',
      ],
    };
  }

  /**
   * Check if running in web browser environment
   */
  static isWebEnvironment(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof navigator !== 'undefined'
    );
  }

  /**
   * Get browser information for debugging
   */
  getBrowserInfo() {
    if (!WebMTLSAdapter.isWebEnvironment()) {
      return null;
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    };
  }

  /**
   * Provide guidance for web-based mTLS alternatives
   */
  getAlternatives() {
    return {
      jwtAuthentication: {
        description: 'Use JWT tokens for API authentication',
        implementation: 'Include JWT token in Authorization header',
        security: 'Secure token storage and rotation recommended',
      },
      browserCertificates: {
        description: 'Use browser-managed client certificates',
        implementation: 'Import certificates into browser certificate store',
        limitation: 'User must manually configure certificates',
      },
      serverSideProxy: {
        description: 'Server-side proxy handles certificate authentication',
        implementation: 'Proxy server manages mTLS, web app uses standard HTTPS',
        benefit: 'Transparent to web application',
      },
      webAuthn: {
        description: 'Use WebAuthn for strong authentication',
        implementation: 'Browser native authentication APIs',
        benefit: 'Hardware-backed authentication without certificates',
      },
    };
  }
}
