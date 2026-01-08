import { Environment, SDKConfig } from './types';

/**
 * Default SDK configuration
 */
const DEFAULT_CONFIG: Required<SDKConfig> = {
  environment: 'sandbox',
  apiUrl: '',
  authUrl: '',
  timeout: 30000,
  retryAttempts: 3,
  debug: false,
  customHeaders: {},
  certificateConfig: {},
};

/**
 * SDK Configuration manager
 */
export class ConfigManager {
  private config: Required<SDKConfig>;

  constructor(userConfig: SDKConfig) {
    this.config = this.mergeConfig(userConfig);
  }

  private mergeConfig(userConfig: SDKConfig): Required<SDKConfig> {
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      apiUrl: userConfig.apiUrl || this.getDefaultApiUrl(userConfig.environment),
      authUrl: userConfig.authUrl || this.getDefaultAuthUrl(userConfig.environment),
      certificateConfig: {
        ...DEFAULT_CONFIG.certificateConfig,
        ...userConfig.certificateConfig,
      },
    };
  }

  private getDefaultApiUrl(environment: Environment): string {
    switch (environment) {
      case 'production':
        return 'https://ereceipts-it.acubeapi.com';
      case 'development':
        return 'https://ereceipts-it.dev.acubeapi.com';
      case 'sandbox':
      default:
        return 'https://ereceipts-it-sandbox.acubeapi.com';
    }
  }

  private getDefaultAuthUrl(environment: Environment): string {
    switch (environment) {
      case 'production':
        return 'https://common.api.acubeapi.com';
      case 'development':
      case 'sandbox':
      default:
        return 'https://common-sandbox.api.acubeapi.com';
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<SDKConfig> {
    return { ...this.config };
  }

  /**
   * Get API URL
   */
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Get Auth URL
   */
  getAuthUrl(): string {
    return this.config.authUrl;
  }

  /**
   * Get environment
   */
  getEnvironment(): Environment {
    return this.config.environment;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.config.debug;
  }

  /**
   * Get timeout in milliseconds
   */
  getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Get retry attempts
   */
  getRetryAttempts(): number {
    return this.config.retryAttempts;
  }

  /**
   * Get custom headers
   */
  getCustomHeaders(): Record<string, string> {
    return { ...this.config.customHeaders };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SDKConfig>): void {
    this.config = this.mergeConfig({ ...this.config, ...updates });
  }
}
