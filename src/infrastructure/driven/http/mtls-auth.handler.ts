import { AuthConfig, IAuthHandler } from '@/application/ports/driven/auth-handler.port';
import { ICertificatePort, StoredCertificate } from '@/application/ports/driven/certificate.port';
import {
  CertificateData,
  IMTLSPort,
  MTLSRequestConfig,
  MTLSResponse,
} from '@/application/ports/driven/mtls.port';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('MTLS-HANDLER');

export class MtlsAuthHandler implements IAuthHandler {
  private pendingRequests = new Map<string, Promise<unknown>>();

  constructor(
    private readonly mtlsAdapter: IMTLSPort | null,
    private readonly certificatePort: ICertificatePort | null
  ) {}

  async getAuthConfig(_url: string, _method: string): Promise<AuthConfig> {
    return { mode: 'mtls', usePort444: true };
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    return {};
  }

  async isMtlsReady(): Promise<boolean> {
    if (!this.mtlsAdapter || !this.certificatePort) {
      return false;
    }
    return this.certificatePort.hasCertificate();
  }

  async getCertificate(): Promise<StoredCertificate | null> {
    if (!this.certificatePort) {
      return null;
    }
    return this.certificatePort.getCertificate();
  }

  private generateRequestKey(
    url: string,
    config: { method?: string; data?: unknown },
    jwtToken?: string
  ): string {
    const method = config.method || 'GET';
    const dataHash = config.data ? JSON.stringify(config.data) : '';
    const authHash = jwtToken ? jwtToken.substring(0, 10) : 'no-auth';
    return `${method}:${url}:${dataHash}:${authHash}`;
  }

  private constructMtlsUrl(relativePath: string): string {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      throw new Error('mTLS adapter base URL not configured');
    }
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return baseUrl.endsWith('/') ? `${baseUrl}${cleanPath}` : `${baseUrl}/${cleanPath}`;
  }

  async makeRequest<T>(
    url: string,
    config: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: unknown;
      headers?: Record<string, string>;
      timeout?: number;
      responseType?: 'json' | 'blob' | 'arraybuffer' | 'text';
    },
    jwtToken?: string
  ): Promise<T> {
    const requestKey = this.generateRequestKey(url, config, jwtToken);

    if (this.pendingRequests.has(requestKey)) {
      log.debug('Deduplicating concurrent request:', url);
      return this.pendingRequests.get(requestKey) as Promise<T>;
    }

    const requestPromise = this.executeRequest<T>(url, config, jwtToken, false);
    this.pendingRequests.set(requestKey, requestPromise);

    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }

  private async executeRequest<T>(
    url: string,
    config: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: unknown;
      headers?: Record<string, string>;
      timeout?: number;
      responseType?: 'json' | 'blob' | 'arraybuffer' | 'text';
    },
    jwtToken?: string,
    isRetryAttempt: boolean = false
  ): Promise<T> {
    if (!this.mtlsAdapter) {
      throw new Error('mTLS adapter not available');
    }

    const certificate = await this.getCertificate();
    if (!certificate) {
      throw new Error('No certificate available for mTLS request');
    }

    const headers: Record<string, string> = {
      ...(config.method !== 'GET' && config.data ? { 'Content-Type': 'application/json' } : {}),
      ...(config.headers || {}),
    };

    if (jwtToken) {
      headers['Authorization'] = jwtToken;
    }

    const fullUrl = this.constructMtlsUrl(url);

    const mtlsConfig: MTLSRequestConfig = {
      url: fullUrl,
      method: config.method,
      headers,
      data: config.data,
      timeout: config.timeout,
      responseType: config.responseType,
    };

    log.debug(`${config.method} ${fullUrl}`);
    if (config.data) {
      log.debug('Request body:', config.data);
    }

    try {
      const response: MTLSResponse<T> = await this.mtlsAdapter.request<T>(mtlsConfig);
      log.debug(`Response ${response.status} from ${fullUrl}`);
      if (response.data) {
        log.debug('Response body:', response.data);
      }
      return response.data;
    } catch (error) {
      log.error(`Response error from ${fullUrl}:`, error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        if (axiosError.response?.data) {
          log.error('Response body:', axiosError.response.data);
        }
      }

      if (isRetryAttempt) {
        throw error;
      }

      const shouldRetry = this.shouldRetryRequest(error);
      if (!shouldRetry) {
        throw error;
      }

      log.debug('Request failed, reconfiguring certificate and retrying...');

      try {
        await this.configureCertificate(certificate);
        return await this.executeRequest<T>(url, config, jwtToken, true);
      } catch {
        throw error;
      }
    }
  }

  private shouldRetryRequest(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('certificate') ||
        message.includes('ssl') ||
        message.includes('tls') ||
        message.includes('handshake')
      );
    }
    return false;
  }

  async configureCertificate(certificate: StoredCertificate): Promise<void> {
    if (!this.mtlsAdapter) {
      throw new Error('mTLS adapter not available');
    }

    const certificateData: CertificateData = {
      certificate: certificate.certificate,
      privateKey: certificate.privateKey,
      format: certificate.format.toUpperCase() as 'PEM' | 'P12',
    };

    await this.mtlsAdapter.configureCertificate(certificateData);
  }

  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: { format?: 'pem' | 'p12' | 'pkcs12' } = {}
  ): Promise<void> {
    if (!this.certificatePort) {
      throw new Error('Certificate port not available');
    }

    if (this.mtlsAdapter) {
      try {
        await this.mtlsAdapter.removeCertificate();
      } catch {
        // No existing certificate to remove
      }
    }

    const format = (options.format || 'pem') as 'pem' | 'p12';
    await this.certificatePort.storeCertificate(certificate, privateKey, format);

    if (this.mtlsAdapter) {
      const certificateData: CertificateData = {
        certificate,
        privateKey,
        format: format.toUpperCase() as 'PEM' | 'P12',
      };
      await this.mtlsAdapter.configureCertificate(certificateData);
    }
  }

  async clearCertificate(): Promise<void> {
    if (this.mtlsAdapter) {
      try {
        await this.mtlsAdapter.removeCertificate();
      } catch {
        // No certificate to remove
      }
    }

    if (this.certificatePort) {
      await this.certificatePort.clearCertificate();
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.mtlsAdapter) {
      return false;
    }
    return this.mtlsAdapter.testConnection();
  }

  getBaseUrl(): string | null {
    if (!this.mtlsAdapter) {
      return null;
    }
    return this.mtlsAdapter.getBaseUrl();
  }

  async getStatus() {
    const status = {
      adapterAvailable: !!this.mtlsAdapter,
      certificatePortAvailable: !!this.certificatePort,
      isReady: false,
      hasCertificate: false,
      certificateInfo: null as { format: string } | null,
      platformInfo: this.mtlsAdapter?.getPlatformInfo() || null,
      pendingRequestsCount: this.pendingRequests.size,
    };

    if (this.certificatePort) {
      try {
        status.hasCertificate = await this.certificatePort.hasCertificate();
        if (status.hasCertificate) {
          status.certificateInfo = await this.certificatePort.getCertificateInfo();
        }
      } catch {
        // Ignore errors
      }
    }

    status.isReady = await this.isMtlsReady();
    return status;
  }

  clearPendingRequests(): void {
    this.pendingRequests.clear();
  }
}
