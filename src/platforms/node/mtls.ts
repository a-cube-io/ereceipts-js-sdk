/**
 * Node.js mTLS Adapter Implementation  
 * Uses https.Agent with client certificates + axios for mTLS authentication
 */

// TypeScript type imports for proper typing
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import axios from "axios";

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

// Conditionally import Node.js modules
let https: typeof import('node:https') | null = null;
let fs: typeof import('node:fs/promises') | null = null;
let existsSync: typeof import('node:fs').existsSync | null = null;

// Try to load Node.js specific modules
try {
  https = require('node:https');
  fs = require('node:fs/promises');
  const fsSync = require('node:fs');
  existsSync = fsSync.existsSync;
} catch (e) {
  // Handle case where Node.js modules are not available (e.g., React Native)
  console.warn('Node.js specific modules not available - mTLS functionality will be limited');
}

interface NodeMTLSConfiguration {
  httpsAgent: any; // Changed from https.Agent to any to handle non-Node environments
  axiosInstance: AxiosInstance;
  certificateInfo: CertificateInfo;
}

/**
 * Node.js mTLS Adapter using https.Agent + axios
 */
export class NodeMTLSAdapter implements IMTLSAdapter {
  private configuration: NodeMTLSConfiguration | null = null;
  private config: MTLSConnectionConfig | null = null;
  private debugEnabled = false;

  constructor(debugEnabled = false) {
    this.debugEnabled = debugEnabled;
    
    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Node.js mTLS adapter initialized');
    }
  }

  async isMTLSSupported(): Promise<boolean> {
    // Node.js always supports mTLS through https.Agent
    const supported = typeof process !== 'undefined' && process.versions?.node;
    
    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] mTLS support check:', {
        supported: !!supported,
        platform: this.getPlatformInfo().platform,
        nodeVersion: process.versions?.node || 'unknown'
      });
    }
    
    return !!supported;
  }

  async initialize(config: MTLSConnectionConfig): Promise<void> {
    this.config = config;

    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Initialized with config:', {
        baseUrl: config.baseUrl,
        port: config.port,
        timeout: config.timeout,
        validateCertificate: config.validateCertificate
      });
    }
  }

  /**
   * Read certificate data - handles both file paths and PEM strings
   */
  private async readCertificateData(data: string): Promise<string> {
    // If it looks like a PEM string, return as-is
    if (data.includes('-----BEGIN') && data.includes('-----END')) {
      return data;
    }

    // If Node.js fs module is not available, only support PEM strings
    if (!fs || !existsSync) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'File system operations not supported in this environment. Please provide certificate data as PEM strings.'
      );
    }

    // If it looks like a file path, read the file
    if (existsSync(data)) {
      try {
        const fileContent = await fs.readFile(data, 'utf-8');
        return fileContent;
      } catch (error) {
        throw new MTLSError(
          MTLSErrorType.CERTIFICATE_INVALID,
          `Failed to read certificate file: ${data}`,
          error as Error
        );
      }
    }

    throw new MTLSError(
      MTLSErrorType.CERTIFICATE_INVALID,
      'Certificate data must be either PEM string or valid file path'
    );
  }

  async configureCertificate(certificateData: CertificateData): Promise<void> {
    if (!this.config) {
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Adapter not initialized. Call initialize() first.'
      );
    }

    if (!https) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'mTLS is not supported in this environment - Node.js https module is required'
      );
    }

    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Configuring certificate:', {
        format: certificateData.format,
        hasPassword: !!certificateData.password,
        certificateLength: certificateData.certificate.length,
        privateKeyLength: certificateData.privateKey.length
      });
    }

    try {
      // Only support a PEM format for Node.js (most common for server-side)
      if (certificateData.format !== 'PEM') {
        throw new MTLSError(
          MTLSErrorType.CERTIFICATE_INVALID,
          `Node.js adapter only supports PEM format, got: ${certificateData.format}`
        );
      }

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

      // Extract certificate and private key (could be file paths or PEM strings)
      const cert = await this.readCertificateData(certificateData.certificate);
      const key = await this.readCertificateData(certificateData.privateKey);

      // Create an HTTPS agent with client certificates
      const httpsAgent = new https.Agent({
        cert,
        key,
        rejectUnauthorized: this.config.validateCertificate ?? true,
        keepAlive: true,
        maxSockets: 10, // Connection pool
        timeout: this.config.timeout || 30000
      });

      // Create axios instance with the HTTPS agent
      const axiosInstance = axios.create({
        httpsAgent,
        timeout: this.config.timeout || 30000,
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      });

      // Add request/response interceptors for debugging
      if (this.debugEnabled) {
        axiosInstance.interceptors.request.use((config) => {
          console.log('[NODE-MTLS-ADAPTER] Making request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            headers: Object.keys(config.headers || {}).length
          });
          return config;
        });

        axiosInstance.interceptors.response.use(
          (response) => {
            console.log('[NODE-MTLS-ADAPTER] Request successful:', {
              status: response.status,
              statusText: response.statusText,
              url: response.config.url
            });
            return response;
          },
          (error) => {
            console.error('[NODE-MTLS-ADAPTER] Request failed:', {
              message: error.message,
              code: error.code,
              status: error.response?.status,
              url: error.config?.url
            });
            return Promise.reject(error);
          }
        );
      }

      // Parse certificate info for metadata
      const certificateInfo = this.parseCertificateInfo(cert);

      this.configuration = {
        httpsAgent,
        axiosInstance,
        certificateInfo
      };

      if (this.debugEnabled) {
        console.log('[NODE-MTLS-ADAPTER] Certificate configured successfully:', {
          subject: certificateInfo.subject,
          issuer: certificateInfo.issuer,
          validFrom: certificateInfo.validFrom,
          validTo: certificateInfo.validTo
        });
      }
    } catch (error) {
      if (error instanceof MTLSError) {
        throw error;
      }
      
      if (this.debugEnabled) {
        console.error('[NODE-MTLS-ADAPTER] Certificate configuration failed:', error);
      }
      
      throw new MTLSError(
        MTLSErrorType.CONFIGURATION_ERROR,
        'Failed to configure certificate',
        error as Error
      );
    }
  }

  async hasCertificate(): Promise<boolean> {
    const hasCert = this.configuration !== null;
    
    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Certificate availability check:', hasCert);
    }
    
    return hasCert;
  }

  async getCertificateInfo(): Promise<CertificateInfo | null> {
    if (!this.configuration) {
      return null;
    }

    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Certificate info requested');
    }
    
    return this.configuration.certificateInfo;
  }

  async request<T>(requestConfig: MTLSRequestConfig): Promise<MTLSResponse<T>> {
    if (!this.configuration) {
      throw new MTLSError(
        MTLSErrorType.CERTIFICATE_NOT_FOUND,
        'No certificate configured'
      );
    }

    if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Making mTLS request:', {
        method: requestConfig.method,
        url: requestConfig.url,
        hasData: !!requestConfig.data,
        headerCount: Object.keys(requestConfig.headers || {}).length
      });
    }

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: requestConfig.method,
        url: requestConfig.url,
        headers: requestConfig.headers,
        data: requestConfig.data,
        timeout: requestConfig.timeout || this.config?.timeout
      };

      const response = await this.configuration.axiosInstance.request(axiosConfig);

      if (this.debugEnabled) {
        console.log('[NODE-MTLS-ADAPTER] mTLS request successful:', {
          status: response.status,
          statusText: response.statusText,
          hasData: !!response.data
        });
      }

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>
      };
    } catch (error: any) {
      if (this.debugEnabled) {
        console.error('[NODE-MTLS-ADAPTER] mTLS request failed:', error);
      }

      // Handle specific Node.js/axios errors
      if (error.code === 'CERT_REJECTED') {
        throw new MTLSError(
          MTLSErrorType.CERTIFICATE_INVALID,
          'Client certificate rejected by server',
          error
        );
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new MTLSError(
          MTLSErrorType.CONNECTION_FAILED,
          'Connection refused - check server availability',
          error
        );
      }

      throw new MTLSError(
        MTLSErrorType.CONNECTION_FAILED,
        'mTLS request failed',
        error
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.configuration || !this.config) {
      return false;
    }

    try {
      // Make a simple GET request to test the connection
      const testUrl = `${this.config.baseUrl}/health`;
      
      if (this.debugEnabled) {
        console.log('[NODE-MTLS-ADAPTER] Testing connection to:', testUrl);
      }

      await this.request({
        method: 'GET',
        url: testUrl,
        timeout: 10000 // Shorter timeout for connection test
      });
      
      if (this.debugEnabled) {
        console.log('[NODE-MTLS-ADAPTER] Connection test successful');
      }
      
      return true;
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[NODE-MTLS-ADAPTER] Connection test failed:', error);
      }
      return false;
    }
  }

  async removeCertificate(): Promise<void> {
    if (this.configuration) {
      // Destroy the HTTPS agent to clean up connections
      this.configuration.httpsAgent.destroy();
      this.configuration = null;
      
      if (this.debugEnabled) {
        console.log('[NODE-MTLS-ADAPTER] Certificate removed successfully');
      }
    } else if (this.debugEnabled) {
      console.log('[NODE-MTLS-ADAPTER] Remove certificate: No certificate configured');
    }
  }

  /**
   * Get the configured mTLS base URL
   */
  getBaseUrl(): string | null {
    return this.config?.baseUrl || null;
  }

  getPlatformInfo() {
    return {
      platform: 'node' as const,
      mtlsSupported: true,
      certificateStorage: 'filesystem' as const,
      fallbackToJWT: true
    };
  }


  /**
   * Parse certificate info from PEM string
   */
  private parseCertificateInfo(_pemCert: string): CertificateInfo {
    // Basic parsing - in production, you might want to use a proper cert parser
    // This is a simplified implementation
    try {
      // Extract basic info from PEM (this is a placeholder implementation)
      // In production, use a library like 'node-forge' for proper parsing
      
      return {
        subject: 'Certificate Subject', // Would parse from PEM
        issuer: 'Certificate Issuer',   // Would parse from PEM
        validFrom: new Date(),           // Would parse from PEM
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Would parse from PEM
        serialNumber: 'unknown',         // Would parse from PEM
        fingerprint: 'unknown',          // Would calculate from PEM
        pemId: '',                       // Would parse from certificate subject
        cashRegisterUUID: ''             // Would parse from certificate subject
      };
    } catch (error) {
      // Return default values if parsing fails
      return {
        subject: 'unknown',
        issuer: 'unknown',
        validFrom: new Date(),
        validTo: new Date(),
        serialNumber: 'unknown',
        fingerprint: 'unknown',
        pemId: '',
        cashRegisterUUID: ''
      };
    }
  }
}