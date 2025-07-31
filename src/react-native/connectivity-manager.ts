/**
 * React Native Connectivity Manager
 * Advanced network connectivity handling with intelligent retry, quality monitoring,
 * and adaptive behavior for mobile environments
 *
 * Features:
 * - Real-time network quality monitoring
 * - Intelligent retry strategies based on network conditions
 * - Adaptive timeouts and batch sizes
 * - Background/foreground app state handling
 * - Data usage optimization
 * - Connection pooling and reuse
 */

import { EventEmitter } from 'eventemitter3';

// Platform detection
const isReactNative = typeof navigator !== 'undefined' &&
  ((navigator as any).product === 'ReactNative' || (global as any).__REACT_NATIVE__);

/**
 * Network quality levels
 */
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

/**
 * Connection types
 */
export type ConnectionType =
  | 'wifi'
  | 'cellular'
  | '2g'
  | '3g'
  | '4g'
  | '5g'
  | 'ethernet'
  | 'bluetooth'
  | 'unknown'
  | 'none';

/**
 * Network state information
 */
export interface NetworkState {
  isConnected: boolean;
  connectionType: ConnectionType;
  quality: NetworkQuality;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number; // Mbps
  rtt?: number; // Round trip time in ms
  saveData?: boolean; // Data saver mode
  isExpensive?: boolean; // Metered connection
  strength?: number; // Signal strength 0-100
  timestamp: number;
}

/**
 * Retry configuration based on network conditions
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Network quality thresholds
 */
interface QualityThresholds {
  excellent: { minDownlink: number; maxRtt: number };
  good: { minDownlink: number; maxRtt: number };
  fair: { minDownlink: number; maxRtt: number };
  poor: { minDownlink: number; maxRtt: number };
}

/**
 * Connectivity manager configuration
 */
export interface ConnectivityConfig {
  /** Enable network quality monitoring */
  enableQualityMonitoring?: boolean;

  /** Quality check interval in ms */
  qualityCheckInterval?: number;

  /** Enable adaptive retry strategies */
  enableAdaptiveRetry?: boolean;

  /** Enable data usage optimization */
  enableDataOptimization?: boolean;

  /** Enable background/foreground optimization */
  enableAppStateOptimization?: boolean;

  /** Custom quality thresholds */
  qualityThresholds?: Partial<QualityThresholds>;

  /** Retry configurations by network quality */
  retryConfigs?: Record<NetworkQuality, RetryConfig>;

  /** Timeout configurations by network quality (ms) */
  timeoutConfigs?: Record<NetworkQuality, number>;

  /** Enable connection health monitoring */
  enableHealthMonitoring?: boolean;

  /** Health check URL */
  healthCheckUrl?: string;

  /** Health check interval in ms */
  healthCheckInterval?: number;
}

/**
 * Connectivity events
 */
interface ConnectivityEvents {
  'network:change': { current: NetworkState; previous: NetworkState };
  'quality:change': { quality: NetworkQuality; previous: NetworkQuality };
  'connection:lost': { lastState: NetworkState };
  'connection:restored': { newState: NetworkState };
  'health:check': { healthy: boolean; latency?: number };
  'app:background': { networkState: NetworkState };
  'app:foreground': { networkState: NetworkState };
  'data:optimization': { enabled: boolean; reason: string };
}

const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  excellent: { minDownlink: 10, maxRtt: 50 },
  good: { minDownlink: 2, maxRtt: 150 },
  fair: { minDownlink: 0.5, maxRtt: 300 },
  poor: { minDownlink: 0, maxRtt: 1000 },
};

const DEFAULT_RETRY_CONFIGS: Record<NetworkQuality, RetryConfig> = {
  excellent: { maxRetries: 2, baseDelay: 500, maxDelay: 2000, backoffMultiplier: 1.5, jitter: true },
  good: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffMultiplier: 2, jitter: true },
  fair: { maxRetries: 4, baseDelay: 2000, maxDelay: 10000, backoffMultiplier: 2, jitter: true },
  poor: { maxRetries: 5, baseDelay: 3000, maxDelay: 15000, backoffMultiplier: 2.5, jitter: true },
  unknown: { maxRetries: 3, baseDelay: 1500, maxDelay: 8000, backoffMultiplier: 2, jitter: true },
};

const DEFAULT_TIMEOUT_CONFIGS: Record<NetworkQuality, number> = {
  excellent: 5000,
  good: 10000,
  fair: 15000,
  poor: 30000,
  unknown: 15000,
};

const DEFAULT_CONFIG: Required<ConnectivityConfig> = {
  enableQualityMonitoring: true,
  qualityCheckInterval: 30000, // 30 seconds
  enableAdaptiveRetry: true,
  enableDataOptimization: true,
  enableAppStateOptimization: true,
  qualityThresholds: DEFAULT_QUALITY_THRESHOLDS,
  retryConfigs: DEFAULT_RETRY_CONFIGS,
  timeoutConfigs: DEFAULT_TIMEOUT_CONFIGS,
  enableHealthMonitoring: true,
  healthCheckUrl: 'https://ereceipts-it.acubeapi.com/health',
  healthCheckInterval: 60000, // 1 minute
};

/**
 * React Native Connectivity Manager
 */
export class ConnectivityManager extends EventEmitter<ConnectivityEvents> {
  private config: Required<ConnectivityConfig>;

  private currentState: NetworkState;

  private previousState?: NetworkState;

  private isInitialized = false;

  // React Native modules
  private NetInfo: any;

  private AppState: any;

  // Monitoring timers
  private qualityTimer?: NodeJS.Timeout;

  private healthTimer?: NodeJS.Timeout;

  // Connection health tracking
  private healthHistory: boolean[] = [];

  private currentAppState: 'active' | 'background' | 'inactive' = 'active';

  constructor(config: ConnectivityConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = this.getInitialState();

    this.initialize();
  }

  private getInitialState(): NetworkState {
    return {
      isConnected: false,
      connectionType: 'unknown',
      quality: 'unknown',
      timestamp: Date.now(),
    };
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized || !isReactNative) {return;}

    try {
      // Try to dynamically import React Native modules
      // This will fail in Expo Go for native modules
      // We use eval to prevent Metro from bundling these modules when not needed
      const netInfoPath = '@react-native-community/netinfo';
      const NetInfoModule = await import(/* webpackIgnore: true */ netInfoPath);
      this.NetInfo = NetInfoModule.default;

      const AppStateModule = await import('react-native');
      this.AppState = AppStateModule.AppState;

      // Setup listeners
      this.setupNetworkListener();
      this.setupAppStateListener();

      // Start monitoring
      if (this.config.enableQualityMonitoring) {
        this.startQualityMonitoring();
      }

      if (this.config.enableHealthMonitoring) {
        this.startHealthMonitoring();
      }

      // Get initial network state
      await this.updateNetworkState();

      this.isInitialized = true;
      console.log('[ACube SDK] ConnectivityManager initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[ACube SDK] Failed to initialize ConnectivityManager: ${errorMessage}`);
      
      // Provide helpful guidance for Expo Go users
      if (errorMessage.includes('native module') || errorMessage.includes('Cannot read property')) {
        console.log('[ACube SDK] This is normal in Expo Go. Native connectivity features require a development build.');
        console.log('[ACube SDK] See: https://docs.expo.dev/development/introduction/');
      }
      
      // Fallback to basic connectivity detection
      this.setupFallbackDetection();
    }
  }

  private setupNetworkListener(): void {
    if (!this.NetInfo) {return;}

    this.NetInfo.addEventListener((state: any) => {
      this.handleNetworkStateChange(state);
    });
  }

  private setupAppStateListener(): void {
    if (!this.AppState) {return;}

    this.AppState.addEventListener('change', (nextAppState: string) => {
      const previousAppState = this.currentAppState;
      this.currentAppState = nextAppState as any;

      if (previousAppState === 'background' && nextAppState === 'active') {
        this.emit('app:foreground', { networkState: this.currentState });
        // Refresh network state when coming back to foreground
        this.updateNetworkState();
      } else if (previousAppState === 'active' && nextAppState === 'background') {
        this.emit('app:background', { networkState: this.currentState });
      }
    });
  }

  private setupFallbackDetection(): void {
    // Basic online/offline detection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.currentState = {
          ...this.currentState,
          isConnected: true,
          timestamp: Date.now(),
        };
        this.emit('connection:restored', { newState: this.currentState });
      });

      window.addEventListener('offline', () => {
        const lastState = { ...this.currentState };
        this.currentState = {
          ...this.currentState,
          isConnected: false,
          timestamp: Date.now(),
        };
        this.emit('connection:lost', { lastState });
      });
    }
  }

  private async handleNetworkStateChange(netInfoState: any): Promise<void> {
    this.previousState = { ...this.currentState };

    const newState: NetworkState = {
      isConnected: netInfoState.isConnected,
      connectionType: this.mapConnectionType(netInfoState.type, netInfoState.details),
      quality: this.calculateNetworkQuality(netInfoState),
      effectiveType: netInfoState.details?.effectiveType,
      downlink: netInfoState.details?.downlink,
      rtt: netInfoState.details?.rtt,
      saveData: netInfoState.details?.saveData,
      isExpensive: netInfoState.details?.isConnectionExpensive,
      strength: netInfoState.details?.strength,
      timestamp: Date.now(),
    };

    this.currentState = newState;

    // Emit events
    this.emit('network:change', { current: newState, previous: this.previousState });

    if (this.previousState.quality !== newState.quality) {
      this.emit('quality:change', {
        quality: newState.quality,
        previous: this.previousState.quality,
      });
    }

    if (!this.previousState.isConnected && newState.isConnected) {
      this.emit('connection:restored', { newState });
    } else if (this.previousState.isConnected && !newState.isConnected) {
      this.emit('connection:lost', { lastState: this.previousState });
    }

    // Handle data optimization
    if (this.config.enableDataOptimization) {
      this.handleDataOptimization(newState);
    }
  }

  private mapConnectionType(type: string, details: any): ConnectionType {
    if (!type || type === 'none') {return 'none';}

    switch (type.toLowerCase()) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        // Try to determine cellular generation
        if (details?.cellularGeneration) {
          switch (details.cellularGeneration) {
            case '2g': return '2g';
            case '3g': return '3g';
            case '4g': return '4g';
            case '5g': return '5g';
            default: return 'cellular';
          }
        }
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      case 'bluetooth':
        return 'bluetooth';
      default:
        return 'unknown';
    }
  }

  private calculateNetworkQuality(netInfoState: any): NetworkQuality {
    const { details } = netInfoState;
    if (!details) {return 'unknown';}

    const downlink = details.downlink || 0;
    const rtt = details.rtt || 1000;
    const qualityThresholds = {
      ...DEFAULT_QUALITY_THRESHOLDS,
      ...this.config.qualityThresholds,
    };

    if (downlink >= qualityThresholds.excellent.minDownlink && rtt <= qualityThresholds.excellent.maxRtt) {
      return 'excellent';
    } if (downlink >= qualityThresholds.good.minDownlink && rtt <= qualityThresholds.good.maxRtt) {
      return 'good';
    } if (downlink >= qualityThresholds.fair.minDownlink && rtt <= qualityThresholds.fair.maxRtt) {
      return 'fair';
    } if (downlink >= qualityThresholds.poor.minDownlink && rtt <= qualityThresholds.poor.maxRtt) {
      return 'poor';
    }

    return 'unknown';
  }

  private handleDataOptimization(networkState: NetworkState): void {
    const shouldOptimize =
      networkState.saveData ||
      networkState.isExpensive ||
      networkState.quality === 'poor' ||
      ['2g', '3g'].includes(networkState.connectionType);

    if (shouldOptimize) {
      const reason = networkState.saveData ? 'data_saver' :
                   networkState.isExpensive ? 'expensive_connection' :
                   networkState.quality === 'poor' ? 'poor_quality' :
                   'slow_connection';

      this.emit('data:optimization', { enabled: true, reason });
    } else {
      this.emit('data:optimization', { enabled: false, reason: 'good_connection' });
    }
  }

  private startQualityMonitoring(): void {
    this.qualityTimer = setInterval(async () => {
      if (this.currentAppState === 'active') {
        await this.updateNetworkState();
      }
    }, this.config.qualityCheckInterval) as unknown as NodeJS.Timeout;
  }

  private startHealthMonitoring(): void {
    this.healthTimer = setInterval(async () => {
      if (this.currentState.isConnected && this.currentAppState === 'active') {
        await this.performHealthCheck();
      }
    }, this.config.healthCheckInterval) as unknown as NodeJS.Timeout;
  }

  private async updateNetworkState(): Promise<void> {
    if (!this.NetInfo) {return;}

    try {
      const netInfoState = await this.NetInfo.fetch();
      await this.handleNetworkStateChange(netInfoState);
    } catch (error) {
      console.warn('Failed to fetch network state:', error);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.config.healthCheckUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      const healthy = response.ok;

      // Update health history
      this.healthHistory.push(healthy);
      if (this.healthHistory.length > 10) {
        this.healthHistory.shift();
      }

      this.emit('health:check', { healthy, latency });
    } catch (error) {
      this.healthHistory.push(false);
      if (this.healthHistory.length > 10) {
        this.healthHistory.shift();
      }

      this.emit('health:check', { healthy: false });
    }
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.currentState };
  }

  /**
   * Check if network is available
   */
  isConnected(): boolean {
    return this.currentState.isConnected;
  }

  /**
   * Get current network quality
   */
  getNetworkQuality(): NetworkQuality {
    return this.currentState.quality;
  }

  /**
   * Get retry configuration for current network conditions
   */
  getRetryConfig(): RetryConfig {
    return this.config.retryConfigs[this.currentState.quality];
  }

  /**
   * Get timeout for current network conditions
   */
  getTimeout(): number {
    return this.config.timeoutConfigs[this.currentState.quality];
  }

  /**
   * Check if data optimization should be enabled
   */
  shouldOptimizeData(): boolean {
    return (
      this.currentState.saveData ||
      this.currentState.isExpensive ||
      this.currentState.quality === 'poor' ||
      ['2g', '3g'].includes(this.currentState.connectionType)
    );
  }

  /**
   * Get connection health score (0-1)
   */
  getHealthScore(): number {
    if (this.healthHistory.length === 0) {return 1;}

    const successCount = this.healthHistory.filter(h => h).length;
    return successCount / this.healthHistory.length;
  }

  /**
   * Wait for network connection to be restored
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.currentState.isConnected) {return true;}

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('connection:restored', onRestored);
        resolve(false);
      }, timeout);

      const onRestored = () => {
        clearTimeout(timer);
        resolve(true);
      };

      this.once('connection:restored', onRestored);
    });
  }

  /**
   * Execute a network operation with intelligent retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    customRetryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.getRetryConfig(), ...customRetryConfig };
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Wait for connection if not available
        if (!this.currentState.isConnected) {
          const connected = await this.waitForConnection(10000);
          if (!connected) {
            throw new Error('Network not available');
          }
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {break;}

        // Calculate delay with backoff and jitter
        let delay = Math.min(
          config.baseDelay * config.backoffMultiplier**attempt,
          config.maxDelay,
        );

        if (config.jitter) {
          delay *= (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Get adaptive batch size based on network conditions
   */
  getAdaptiveBatchSize(baseBatchSize: number = 50): number {
    switch (this.currentState.quality) {
      case 'excellent':
        return Math.min(baseBatchSize * 2, 200);
      case 'good':
        return baseBatchSize;
      case 'fair':
        return Math.max(Math.floor(baseBatchSize * 0.7), 10);
      case 'poor':
        return Math.max(Math.floor(baseBatchSize * 0.3), 5);
      default:
        return Math.max(Math.floor(baseBatchSize * 0.5), 10);
    }
  }

  /**
   * Destroy the connectivity manager
   */
  destroy(): void {
    if (this.qualityTimer) {
      clearInterval(this.qualityTimer);
    }

    if (this.healthTimer) {
      clearInterval(this.healthTimer);
    }

    this.removeAllListeners();
  }
}
