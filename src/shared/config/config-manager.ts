import { Environment, SDKConfig } from '@/shared/types';

interface InternalConfig {
  environment: Environment;
  apiUrl: string;
  authUrl: string;
  timeout: number;
  retryAttempts: number;
  debug: boolean;
  customHeaders: Record<string, string>;
}

export class ConfigManager {
  private config: InternalConfig;

  constructor(userConfig: SDKConfig) {
    this.config = this.buildConfig(userConfig);
  }

  private buildConfig(userConfig: SDKConfig): InternalConfig {
    return {
      environment: userConfig.environment,
      apiUrl: this.getDefaultApiUrl(userConfig.environment),
      authUrl: this.getDefaultAuthUrl(userConfig.environment),
      timeout: 30000,
      retryAttempts: 3,
      debug: userConfig.debug ?? false,
      customHeaders: {},
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

  getConfig(): SDKConfig {
    return {
      environment: this.config.environment,
      debug: this.config.debug,
    };
  }

  getApiUrl(): string {
    return this.config.apiUrl;
  }

  getAuthUrl(): string {
    return this.config.authUrl;
  }

  getEnvironment(): Environment {
    return this.config.environment;
  }

  isDebugEnabled(): boolean {
    return this.config.debug;
  }

  getTimeout(): number {
    return this.config.timeout;
  }

  getRetryAttempts(): number {
    return this.config.retryAttempts;
  }

  getCustomHeaders(): Record<string, string> {
    return { ...this.config.customHeaders };
  }

  updateConfig(updates: Partial<SDKConfig>): void {
    if (updates.environment) {
      this.config.environment = updates.environment;
      this.config.apiUrl = this.getDefaultApiUrl(updates.environment);
      this.config.authUrl = this.getDefaultAuthUrl(updates.environment);
    }
    if (updates.debug !== undefined) {
      this.config.debug = updates.debug;
    }
  }
}
