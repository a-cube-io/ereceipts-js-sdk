import { SDKConfig } from '@/shared/types';

interface InternalConfig {
  apiUrl: string;
  authUrl: string;
  timeout: number;
  retryAttempts: number;
  debug: boolean;
  telemetryEnabled: boolean;
  customHeaders: Record<string, string>;
}

export class ConfigManager {
  private config: InternalConfig;

  constructor(userConfig: SDKConfig) {
    this.config = this.buildConfig(userConfig);
  }

  private buildConfig(userConfig: SDKConfig): InternalConfig {
    return {
      apiUrl: userConfig.apiUrl,
      authUrl: userConfig.authUrl,
      timeout: 30000,
      retryAttempts: 3,
      debug: userConfig.debug ?? false,
      telemetryEnabled: userConfig.telemetryEnabled ?? false,
      customHeaders: {},
    };
  }

  getConfig(): SDKConfig {
    return {
      apiUrl: this.config.apiUrl,
      authUrl: this.config.authUrl,
      debug: this.config.debug,
      telemetryEnabled: this.config.telemetryEnabled,
    };
  }

  getApiUrl(): string {
    return this.config.apiUrl;
  }

  getAuthUrl(): string {
    return this.config.authUrl;
  }

  isDebugEnabled(): boolean {
    return this.config.debug;
  }

  isTelemetryEnabled(): boolean {
    return this.config.telemetryEnabled;
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
    if (updates.apiUrl) {
      this.config.apiUrl = updates.apiUrl;
    }
    if (updates.authUrl) {
      this.config.authUrl = updates.authUrl;
    }
    if (updates.debug !== undefined) {
      this.config.debug = updates.debug;
    }
  }
}
