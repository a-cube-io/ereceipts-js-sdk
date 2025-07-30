/**
 * Network Manager - Simplified cross-platform network monitoring
 * Basic connection monitoring without browser-specific APIs
 */

import { EventEmitter } from 'eventemitter3';

import type {
  SyncOptions,
  ConnectionInfo,
  ConnectionType,
  ConnectionQuality,
  NetworkOptimization,
} from './types';

export interface NetworkManagerConfig {
  enableMonitoring: boolean;
  monitoringInterval: number;
  qualityCheckInterval: number;
  qualityThresholds: {
    excellent: { bandwidth: number; latency: number };
    good: { bandwidth: number; latency: number };
    fair: { bandwidth: number; latency: number };
    poor: { bandwidth: number; latency: number };
  };
  adaptiveOptimization: boolean;
  conserveDataOnMetered: boolean;
  pauseOnPoorConnection: boolean;
  maxRetryAttempts: number;
  retryBackoffMultiplier: number;
  maxRetryDelay: number;
}

const DEFAULT_CONFIG: NetworkManagerConfig = {
  enableMonitoring: true,
  monitoringInterval: 5000,
  qualityCheckInterval: 30000,
  qualityThresholds: {
    excellent: { bandwidth: 10, latency: 50 },
    good: { bandwidth: 5, latency: 100 },
    fair: { bandwidth: 1, latency: 300 },
    poor: { bandwidth: 0.1, latency: 1000 },
  },
  adaptiveOptimization: true,
  conserveDataOnMetered: true,
  pauseOnPoorConnection: false,
  maxRetryAttempts: 3,
  retryBackoffMultiplier: 2,
  maxRetryDelay: 30000,
};

export interface NetworkEventMap {
  'connection-changed': ConnectionInfo;
  'quality-changed': { previous: ConnectionQuality; current: ConnectionQuality };
  'optimization-applied': NetworkOptimization;
  'poor-connection-detected': ConnectionInfo;
  'connection-restored': ConnectionInfo;
}

// Cross-platform utilities
const getGlobal = (): any => {
  if (typeof globalThis !== 'undefined') {return globalThis;}
  if (typeof window !== 'undefined') {return window;}
  if (typeof global !== 'undefined') {return global;}
  return {};
};

const globalScope = getGlobal();
const isBrowser = typeof globalScope.window !== 'undefined';

/**
 * Cross-platform Network Manager
 */
export class NetworkManager extends EventEmitter<NetworkEventMap> {
  private config: NetworkManagerConfig;

  private currentConnection: ConnectionInfo;

  private monitoringTimer: ReturnType<typeof setInterval> | null = null;

  private qualityCheckTimer: ReturnType<typeof setInterval> | null = null;

  private isMonitoring = false;

  private connectionHistory: ConnectionInfo[] = [];

  private lastQualityCheck = 0;

  constructor(config: Partial<NetworkManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentConnection = this.getInitialConnectionInfo();
  }

  /**
   * Initialize the network manager
   */
  async initialize(): Promise<void> {
    this.startMonitoring();
  }

  /**
   * Add connection change listener
   */
  onConnectionChange(listener: (info: ConnectionInfo) => void): void {
    this.on('connection-changed', listener);
  }

  /**
   * Start network monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Set up periodic monitoring
    this.monitoringTimer = setInterval(() => {
      this.checkConnection();
    }, this.config.monitoringInterval);

    // Set up quality checks
    this.qualityCheckTimer = setInterval(() => {
      this.performQualityCheck();
    }, this.config.qualityCheckInterval);

    // Set up online/offline event listeners if in browser
    if (isBrowser && globalScope.window) {
      this.setupOnlineOfflineListeners();
    }

    // Initial connection check
    this.checkConnection();
  }

  /**
   * Stop network monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer !== null) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.qualityCheckTimer !== null) {
      clearInterval(this.qualityCheckTimer);
      this.qualityCheckTimer = null;
    }

    this.removeOnlineOfflineListeners();
  }

  /**
   * Get current connection information
   */
  getConnectionInfo(): ConnectionInfo {
    return { ...this.currentConnection };
  }

  /**
   * Check if the connection is suitable for sync operations
   */
  isSyncRecommended(syncType: 'light' | 'medium' | 'heavy' = 'medium'): boolean {
    const { quality, isOnline, isMetered } = this.currentConnection;

    if (!isOnline) {
      return false;
    }

    // Conservative approach for metered connections
    if (isMetered && this.config.conserveDataOnMetered) {
      return syncType === 'light' && ['excellent', 'good'].includes(quality);
    }

    // Quality-based recommendations
    switch (syncType) {
      case 'light':
        return ['excellent', 'good', 'fair'].includes(quality);
      case 'medium':
        return ['excellent', 'good'].includes(quality);
      case 'heavy':
        return quality === 'excellent';
      default:
        return false;
    }
  }

  /**
   * Optimize sync options based on current network conditions
   */
  optimizeForConnection(options: SyncOptions): SyncOptions & { networkOptimization: NetworkOptimization } {
    const optimization = this.calculateOptimization();

    const optimizedOptions: SyncOptions & { networkOptimization: NetworkOptimization } = {
      ...options,
      networkOptimization: optimization,
    };

    // Adjust batch size based on connection quality
    if (optimization.batchSize !== options.batchSize) {
      optimizedOptions.batchSize = optimization.batchSize;
    }

    // Adjust timeout based on connection quality
    if (optimization.timeoutMs !== options.timeoutMs) {
      optimizedOptions.timeoutMs = optimization.timeoutMs;
    }

    // Adjust strategy based on connection
    if (this.currentConnection.quality === 'poor' && this.config.pauseOnPoorConnection) {
      optimizedOptions.strategy = 'scheduled';
    } else if (this.currentConnection.quality === 'fair') {
      optimizedOptions.strategy = 'batched';
    }

    this.emit('optimization-applied', optimization);

    return optimizedOptions;
  }

  /**
   * Calculate appropriate retry delay based on network conditions
   */
  calculateRetryDelay(attempt: number, baseDelay = 1000): number {
    const { quality } = this.currentConnection;

    // Base exponential backoff
    let delay = baseDelay * this.config.retryBackoffMultiplier**(attempt - 1);

    // Adjust based on connection quality
    switch (quality) {
      case 'poor':
        delay *= 3;
        break;
      case 'fair':
        delay *= 1.5;
        break;
      case 'good':
        delay *= 1;
        break;
      case 'excellent':
        delay *= 0.5;
        break;
    }

    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Get connection quality metrics over time
   */
  getConnectionMetrics(): {
    current: ConnectionInfo;
    average: {
      bandwidth: number;
      latency: number;
      quality: ConnectionQuality;
    };
    stability: number;
    history: ConnectionInfo[];
  } {
    const history = this.connectionHistory.slice(-20);

    if (history.length === 0) {
      return {
        current: this.currentConnection,
        average: {
          bandwidth: this.currentConnection.bandwidth,
          latency: this.currentConnection.latency,
          quality: this.currentConnection.quality,
        },
        stability: 1,
        history: [],
      };
    }

    const avgBandwidth = history.reduce((sum, conn) => sum + conn.bandwidth, 0) / history.length;
    const avgLatency = history.reduce((sum, conn) => sum + conn.latency, 0) / history.length;
    const avgQuality = this.calculateQualityFromMetrics(avgBandwidth, avgLatency);

    const qualityChanges = history.slice(1).reduce((changes, conn, index) => changes + (conn.quality !== history[index]?.quality ? 1 : 0), 0);
    const stability = Math.max(0, 1 - (qualityChanges / history.length));

    return {
      current: this.currentConnection,
      average: {
        bandwidth: avgBandwidth,
        latency: avgLatency,
        quality: avgQuality,
      },
      stability,
      history: [...history],
    };
  }

  private getInitialConnectionInfo(): ConnectionInfo {
    // Default to online with reasonable assumptions
    const isOnline = isBrowser && globalScope.navigator ? globalScope.navigator.onLine : true;

    return {
      type: this.detectConnectionType(),
      quality: isOnline ? 'good' : 'offline',
      bandwidth: 5, // Default 5 Mbps
      latency: 100, // Default 100ms
      isMetered: false, // Default to non-metered
      isOnline,
      lastChanged: new Date(),
    };
  }

  private detectConnectionType(): ConnectionType {
    // Simple detection - default to wifi
    // In a real implementation, you could use platform-specific APIs
    return 'wifi';
  }

  private setupOnlineOfflineListeners(): void {
    if (!isBrowser || !globalScope.window) {
      return;
    }

    const handleOnline = () => {
      this.updateConnectionStatus(true);
    };

    const handleOffline = () => {
      this.updateConnectionStatus(false);
    };

    globalScope.window.addEventListener('online', handleOnline);
    globalScope.window.addEventListener('offline', handleOffline);

    // Store references for cleanup
    this.onlineHandler = handleOnline;
    this.offlineHandler = handleOffline;
  }

  private onlineHandler?: () => void;

  private offlineHandler?: () => void;

  private removeOnlineOfflineListeners(): void {
    if (!isBrowser || !globalScope.window) {
      return;
    }

    if (this.onlineHandler) {
      globalScope.window.removeEventListener('online', this.onlineHandler);
    }

    if (this.offlineHandler) {
      globalScope.window.removeEventListener('offline', this.offlineHandler);
    }
  }

  private async checkConnection(): Promise<void> {
    const isOnline = isBrowser && globalScope.navigator ? globalScope.navigator.onLine : true;
    const type = this.detectConnectionType();
    const isMetered = false; // Default to non-metered

    // Perform bandwidth/latency estimation if online
    let {bandwidth} = this.currentConnection;
    let {latency} = this.currentConnection;

    if (isOnline && Date.now() - this.lastQualityCheck > this.config.qualityCheckInterval) {
      try {
        const qualityMeasurement = await this.measureConnectionQuality();
        bandwidth = qualityMeasurement.bandwidth;
        latency = qualityMeasurement.latency;
        this.lastQualityCheck = Date.now();
      } catch (error) {
        // Use previous values if measurement fails
      }
    }

    const quality = isOnline ? this.calculateQualityFromMetrics(bandwidth, latency) : 'offline';

    const newConnection: ConnectionInfo = {
      type,
      quality,
      bandwidth,
      latency,
      isMetered,
      isOnline,
      lastChanged: new Date(),
    };

    this.updateConnection(newConnection);
  }

  private async measureConnectionQuality(): Promise<{ bandwidth: number; latency: number }> {
    if (!isBrowser || !globalScope.fetch || !globalScope.performance) {
      // Return default values for non-browser environments
      return {
        bandwidth: this.currentConnection.bandwidth,
        latency: this.currentConnection.latency,
      };
    }

    const startTime = globalScope.performance.now();

    try {
      // Use a small test request
      await globalScope.fetch('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', {
        method: 'GET',
      });

      const endTime = globalScope.performance.now();
      const latency = endTime - startTime;

      // Use a conservative bandwidth estimate
      const {bandwidth} = this.currentConnection;

      return { bandwidth, latency };
    } catch (error) {
      return {
        bandwidth: this.currentConnection.bandwidth,
        latency: this.currentConnection.latency,
      };
    }
  }

  private calculateQualityFromMetrics(bandwidth: number, latency: number): ConnectionQuality {
    const { qualityThresholds } = this.config;

    if (bandwidth >= qualityThresholds.excellent.bandwidth && latency <= qualityThresholds.excellent.latency) {
      return 'excellent';
    } if (bandwidth >= qualityThresholds.good.bandwidth && latency <= qualityThresholds.good.latency) {
      return 'good';
    } if (bandwidth >= qualityThresholds.fair.bandwidth && latency <= qualityThresholds.fair.latency) {
      return 'fair';
    } 
      return 'poor';
    
  }

  private updateConnection(newConnection: ConnectionInfo): void {
    const previousConnection = this.currentConnection;

    // Check if connection has meaningfully changed
    const hasChanged = (
      previousConnection.type !== newConnection.type ||
      previousConnection.quality !== newConnection.quality ||
      previousConnection.isOnline !== newConnection.isOnline ||
      Math.abs(previousConnection.bandwidth - newConnection.bandwidth) > 1 ||
      Math.abs(previousConnection.latency - newConnection.latency) > 50
    );

    if (hasChanged) {
      this.currentConnection = newConnection;

      // Add to history
      this.connectionHistory.push(newConnection);
      if (this.connectionHistory.length > 100) {
        this.connectionHistory.shift();
      }

      // Emit events
      this.emit('connection-changed', newConnection);

      if (previousConnection.quality !== newConnection.quality) {
        this.emit('quality-changed', {
          previous: previousConnection.quality,
          current: newConnection.quality,
        });
      }

      // Special events for poor connection detection
      if (newConnection.quality === 'poor' && previousConnection.quality !== 'poor') {
        this.emit('poor-connection-detected', newConnection);
      } else if (newConnection.quality !== 'poor' && previousConnection.quality === 'poor') {
        this.emit('connection-restored', newConnection);
      }
    }
  }

  private updateConnectionStatus(isOnline: boolean): void {
    if (this.currentConnection.isOnline !== isOnline) {
      this.currentConnection = {
        ...this.currentConnection,
        isOnline,
        quality: isOnline ? this.currentConnection.quality : 'offline',
        lastChanged: new Date(),
      };

      this.emit('connection-changed', this.currentConnection);
    }
  }

  private calculateOptimization(): NetworkOptimization {
    const { quality, isMetered } = this.currentConnection;

    let optimization: NetworkOptimization = {
      enableCompression: true,
      batchSize: 50,
      maxConcurrentRequests: 3,
      timeoutMs: 30000,
      retryStrategy: 'exponential',
      prioritizeOperations: false,
    };

    // Adjust based on connection quality
    switch (quality) {
      case 'excellent':
        optimization = {
          enableCompression: false,
          batchSize: 100,
          maxConcurrentRequests: 5,
          timeoutMs: 15000,
          retryStrategy: 'linear',
          prioritizeOperations: false,
        };
        break;
      case 'good':
        optimization = {
          enableCompression: true,
          batchSize: 75,
          maxConcurrentRequests: 3,
          timeoutMs: 20000,
          retryStrategy: 'exponential',
          prioritizeOperations: false,
        };
        break;
      case 'fair':
        optimization = {
          enableCompression: true,
          batchSize: 25,
          maxConcurrentRequests: 2,
          timeoutMs: 45000,
          retryStrategy: 'exponential',
          prioritizeOperations: true,
        };
        break;
      case 'poor':
        optimization = {
          enableCompression: true,
          batchSize: 10,
          maxConcurrentRequests: 1,
          timeoutMs: 60000,
          retryStrategy: 'adaptive',
          prioritizeOperations: true,
        };
        break;
    }

    // Additional adjustments for metered connections
    if (isMetered && this.config.conserveDataOnMetered) {
      optimization.enableCompression = true;
      optimization.batchSize = Math.min(optimization.batchSize, 20);
      optimization.maxConcurrentRequests = Math.min(optimization.maxConcurrentRequests, 2);
      optimization.prioritizeOperations = true;
    }

    return optimization;
  }

  private async performQualityCheck(): Promise<void> {
    if (!this.currentConnection.isOnline) {
      return;
    }

    try {
      const measurement = await this.measureConnectionQuality();
      const quality = this.calculateQualityFromMetrics(measurement.bandwidth, measurement.latency);

      if (quality !== this.currentConnection.quality) {
        this.updateConnection({
          ...this.currentConnection,
          bandwidth: measurement.bandwidth,
          latency: measurement.latency,
          quality,
          lastChanged: new Date(),
        });
      }
    } catch (error) {
      // Quality check failed, connection might be unstable
      if (this.currentConnection.quality !== 'poor') {
        this.updateConnection({
          ...this.currentConnection,
          quality: 'poor',
          lastChanged: new Date(),
        });
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.connectionHistory.length = 0;
  }
}
