/**
 * Web mTLS Adapter Implementation
 * Web browsers do not support client certificate configuration via JavaScript
 * This adapter provides graceful fallback with clear error messages
 */
import {
  CertificateData,
  CertificateInfo,
  IMTLSPort as IMTLSAdapter,
  MTLSConnectionConfig,
  MTLSRequestConfig,
  MTLSResponse,
} from '@/application/ports/driven';
import { MTLSError, MTLSErrorType } from '@/domain/errors';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('WEB-MTLS');

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
  constructor() {
    log.warn('Web browsers do not support programmatic mTLS configuration');
    log.info('Use JWT authentication or configure client certificates in browser settings');
  }

  async isMTLSSupported(): Promise<boolean> {
    // mTLS is not supported programmatically in web browsers
    const supported = false;

    log.debug('mTLS support check:', {
      supported,
      platform: this.getPlatformInfo().platform,
      reason: 'Browser security model prevents programmatic certificate configuration',
      alternatives: ['JWT authentication', 'Browser-managed certificates', 'Server-side proxy'],
    });

    return supported;
  }

  async initialize(config: MTLSConnectionConfig): Promise<void> {
    log.warn('Initialized but mTLS not available in web browsers:', {
      baseUrl: config.baseUrl,
      port: config.port,
      recommendation: 'Use standard HTTPS with JWT authentication',
    });
  }

  async configureCertificate(certificateData: CertificateData): Promise<void> {
    log.error('Certificate configuration attempted:', {
      format: certificateData.format,
      reason: 'Not supported in web browsers',
      alternatives: [
        'Import certificate into browser certificate store',
        'Use JWT authentication instead',
        'Configure server-side proxy for certificate handling',
      ],
    });

    throw new MTLSError(
      MTLSErrorType.NOT_SUPPORTED,
      'mTLS client certificate configuration is not supported in web browsers. ' +
        'Web browsers manage client certificates through the browser certificate store. ' +
        'Please use JWT authentication or import certificates manually into your browser.'
    );
  }

  async hasCertificate(): Promise<boolean> {
    // We cannot detect if the browser has certificates configured
    log.debug(
      'Certificate availability check: Cannot detect browser certificates programmatically'
    );

    return false;
  }

  async getCertificateInfo(): Promise<CertificateInfo | null> {
    log.debug('Certificate info requested: Not accessible in web browsers');

    return null;
  }

  async request<T>(requestConfig: MTLSRequestConfig): Promise<MTLSResponse<T>> {
    log.error('mTLS request attempted:', {
      method: requestConfig.method,
      url: requestConfig.url,
      reason: 'Not supported in web browsers',
      alternatives: [
        'Use standard fetch() or XMLHttpRequest',
        'Configure JWT authentication',
        'Rely on browser-managed certificates (if configured by user)',
      ],
    });

    throw new MTLSError(
      MTLSErrorType.NOT_SUPPORTED,
      'mTLS requests are not supported in web browsers via JavaScript. ' +
        'Use standard HTTP client with JWT authentication, or ensure client certificates ' +
        'are properly configured in the browser certificate store.'
    );
  }

  async testConnection(): Promise<boolean> {
    log.debug('Connection test: mTLS not available in web browsers');

    return false;
  }

  async removeCertificate(): Promise<void> {
    log.debug('Remove certificate: No certificates to remove (not supported in web browsers)');

    // No-op - cannot remove certificates programmatically in browsers
  }

  /**
   * Get the configured mTLS base URL
   * Always returns null for web browsers as mTLS is not supported
   */
  getBaseUrl(): string | null {
    log.debug('Base URL requested: Not supported in web browsers');
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
}
