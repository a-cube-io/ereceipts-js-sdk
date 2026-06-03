/**
 * Web mTLS Adapter Implementation
 *
 * Client certificates must be imported manually into the browser keystore (P12).
 * The SDK registers that import and performs mTLS requests via fetch(); the browser
 * attaches the client certificate during the TLS handshake.
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

export class WebMTLSAdapter implements IMTLSAdapter {
  private config: MTLSConnectionConfig | null = null;
  private browserCertificateConfigured = false;

  async isMTLSSupported(): Promise<boolean> {
    const supported = WebMTLSAdapter.isWebEnvironment() && typeof fetch !== 'undefined';

    log.debug('mTLS support check:', {
      supported,
      platform: 'web',
      certificateStorage: 'browser-managed',
    });

    return supported;
  }

  async initialize(config: MTLSConnectionConfig): Promise<void> {
    this.config = config;

    log.debug('Initialized with config:', {
      baseUrl: config.baseUrl,
      port: config.port,
      timeout: config.timeout,
    });
  }

  async configureCertificate(certificateData: CertificateData): Promise<void> {
    if (!this.config) {
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Adapter not initialized. Call initialize() first.'
      );
    }

    if (!certificateData.browserManaged) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'Web mTLS requires a P12 certificate imported manually into the browser certificate store. ' +
          'Use registerBrowserCertificate() after importing the certificate.'
      );
    }

    if (certificateData.format !== 'P12') {
      throw new MTLSError(
        MTLSErrorType.CERTIFICATE_INVALID,
        'Web browser-managed mTLS only supports P12 certificates'
      );
    }

    this.browserCertificateConfigured = true;

    log.info('Browser-managed client certificate registered', {
      format: certificateData.format,
      note: 'Ensure the P12 certificate is imported in your browser certificate store',
    });
  }

  async hasCertificate(): Promise<boolean> {
    log.debug('Certificate availability check:', this.browserCertificateConfigured);
    return this.browserCertificateConfigured;
  }

  async getCertificateInfo(): Promise<CertificateInfo | null> {
    return null;
  }

  async request<T>(requestConfig: MTLSRequestConfig): Promise<MTLSResponse<T>> {
    if (!this.config) {
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Adapter not initialized. Call initialize() first.'
      );
    }

    if (!this.browserCertificateConfigured) {
      throw new MTLSError(
        MTLSErrorType.CERTIFICATE_NOT_FOUND,
        'No browser-managed certificate registered. Import a P12 into your browser and call registerBrowserCertificate().'
      );
    }

    log.debug('Making mTLS request:', {
      method: requestConfig.method,
      url: requestConfig.url,
      hasData: !!requestConfig.data,
    });

    try {
      const response = await this.fetchWithTimeout(requestConfig);
      const data = await this.parseResponseBody<T>(response, requestConfig.responseType);

      if (response.status >= 500) {
        throw new MTLSError(
          MTLSErrorType.CONNECTION_FAILED,
          `mTLS request failed: ${response.statusText} (${response.status})`,
          undefined,
          response.status
        );
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.normalizeHeaders(response.headers),
      };
    } catch (error) {
      if (error instanceof MTLSError) {
        throw error;
      }

      log.error('mTLS request failed:', error);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new MTLSError(MTLSErrorType.CONNECTION_FAILED, 'mTLS request timed out', error);
      }

      const message =
        error instanceof TypeError
          ? 'Network error during mTLS request. Verify the certificate is imported in your browser.'
          : 'mTLS request failed';

      throw new MTLSError(
        MTLSErrorType.CONNECTION_FAILED,
        message,
        error instanceof Error ? error : undefined
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.browserCertificateConfigured) {
      return false;
    }

    return true;
  }

  async removeCertificate(): Promise<void> {
    this.browserCertificateConfigured = false;
    log.debug('Browser-managed certificate registration cleared');
  }

  getBaseUrl(): string | null {
    return this.config?.baseUrl || null;
  }

  getPlatformInfo() {
    return {
      platform: 'web' as const,
      mtlsSupported: true,
      certificateStorage: 'browser-managed' as const,
      fallbackToJWT: false,
    };
  }

  static isWebEnvironment(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof navigator !== 'undefined'
    );
  }

  /**
   * Web cannot attach PEM/P12 to fetch programmatically — the browser picks the client cert
   * from its keystore during TLS. This wrapper still mirrors Node/RN: timeout, JSON body, JWT headers.
   */
  private async fetchWithTimeout(requestConfig: MTLSRequestConfig): Promise<Response> {
    // fetch() has no timeout option; AbortController matches axios timeout on other platforms.
    const controller = new AbortController();
    const timeoutMs = requestConfig.timeout || this.config?.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers = new Headers(requestConfig.headers || {});
    const hasBody = requestConfig.data !== undefined && requestConfig.data !== null;
    const method = requestConfig.method || 'GET';

    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      return await fetch(requestConfig.url, {
        method,
        headers,
        body: hasBody
          ? typeof requestConfig.data === 'string'
            ? requestConfig.data
            : JSON.stringify(requestConfig.data)
          : undefined,
        // Required so the browser may offer the imported client certificate on this origin.
        credentials: 'include',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Maps the Fetch API Response to typed `data` for MTLSResponse (axios does this on Node/RN).
   * Response bodies are single-use: we read once via text/blob/arraybuffer.
   */
  private async parseResponseBody<T>(
    response: Response,
    responseType?: MTLSRequestConfig['responseType']
  ): Promise<T> {
    if (responseType === 'blob') {
      return (await response.blob()) as T;
    }

    if (responseType === 'arraybuffer') {
      return (await response.arrayBuffer()) as T;
    }

    if (responseType === 'text') {
      return (await response.text()) as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    // Default: JSON when declared or parseable; otherwise plain text (same tolerance as axios paths).
    if (responseType === 'json' || contentType.includes('application/json')) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  /** IMTLSPort expects plain header objects; browser fetch returns a Headers instance. */
  private normalizeHeaders(headers: Headers): Record<string, string> {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }
}
