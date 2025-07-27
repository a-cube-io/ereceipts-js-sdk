/**
 * Network Manager - Intelligent network monitoring and optimization for sync operations
 * Handles connection quality detection, bandwidth optimization, and adaptive sync strategies
 */

import { EventEmitter } from 'eventemitter3';
import type {
  ConnectionInfo,
  ConnectionType,
  ConnectionQuality,
  NetworkOptimization,
  SyncOptions,
} from './types';

// Extend Navigator interface for Network Information API
interface NetworkConnection {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

// Cross-platform timer type
type TimerHandle = ReturnType<typeof setInterval> | undefined;

declare global {
  interface Navigator {
    connection?: NetworkConnection;
  }
}

export interface NetworkManagerConfig {
  // Connection monitoring
  enableMonitoring: boolean;
  monitoringInterval: number; // ms
  qualityCheckInterval: number; // ms
  
  // Quality thresholds (in Mbps for bandwidth, ms for latency)
  qualityThresholds: {
    excellent: { bandwidth: 10, latency: 50 };
    good: { bandwidth: 5, latency: 100 };
    fair: { bandwidth: 1, latency: 300 };
    poor: { bandwidth: 0.1, latency: 1000 };
  };
  
  // Optimization settings
  adaptiveOptimization: boolean;
  conserveDataOnMetered: boolean;
  pauseOnPoorConnection: boolean;
  
  // Retry settings
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

/**
 * Network Manager for intelligent connection monitoring and sync optimization
 */
export class NetworkManager extends EventEmitter<NetworkEventMap> {
  private config: NetworkManagerConfig;
  private currentConnection: ConnectionInfo;
  private monitoringTimer?: TimerHandle;
  private qualityCheckTimer?: TimerHandle;
  private isMonitoring = false;
  private connectionHistory: ConnectionInfo[] = [];
  private lastQualityCheck = 0;

  constructor(config: Partial<NetworkManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentConnection = this.getInitialConnectionInfo();
  }

  /**
   * Start network monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Set up connection monitoring
    if (typeof navigator !== 'undefined' && navigator.connection) {
      this.setupNavigatorConnectionAPI();
    }
    
    // Set up periodic monitoring
    this.monitoringTimer = setInterval(() => {
      this.checkConnection();
    }, this.config.monitoringInterval);

    // Set up quality checks
    this.qualityCheckTimer = setInterval(() => {
      this.performQualityCheck();
    }, this.config.qualityCheckInterval);

    // Set up online/offline event listeners
    this.setupOnlineOfflineListeners();

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

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.qualityCheckTimer) {
      clearInterval(this.qualityCheckTimer);
      this.qualityCheckTimer = undefined;
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
      optimizedOptions.strategy = 'scheduled'; // Delay until better connection
    } else if (this.currentConnection.quality === 'fair') {
      optimizedOptions.strategy = 'batched'; // Use batching for efficiency
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
    let delay = baseDelay * Math.pow(this.config.retryBackoffMultiplier, attempt - 1);
    
    // Adjust based on connection quality
    switch (quality) {
      case 'poor':
        delay *= 3; // Wait longer on poor connections
        break;
      case 'fair':
        delay *= 1.5; // Wait a bit longer on fair connections
        break;
      case 'good':
        delay *= 1; // Normal delay
        break;
      case 'excellent':
        delay *= 0.5; // Shorter delay on excellent connections
        break;
    }

    // Cap the maximum delay
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
    stability: number; // 0-1, higher is more stable
    history: ConnectionInfo[];
  } {
    const history = this.connectionHistory.slice(-20); // Last 20 measurements
    
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
    
    // Calculate stability (how consistent the connection is)
    const qualityChanges = history.slice(1).reduce((changes, conn, index) => {
      return changes + (conn.quality !== history[index]?.quality ? 1 : 0);
    }, 0);
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
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    return {
      type: this.detectConnectionType(),
      quality: isOnline ? 'good' : 'offline',
      bandwidth: 5, // Default assumption
      latency: 100, // Default assumption
      isMetered: this.detectIfMetered(),
      isOnline,
      lastChanged: new Date(),
    };
  }

  private detectConnectionType(): ConnectionType {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return 'wifi'; // Default assumption
    }

    const connection = navigator.connection as any;
    
    if (connection.type) {
      switch (connection.type) {
        case 'cellular':
          return 'cellular';
        case 'wifi':
          return 'wifi';
        case 'ethernet':
          return 'ethernet';
        default:
          return 'wifi';
      }
    }

    // Fallback to effective type
    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
        case '3g':
          return 'cellular';
        case '4g':
          return connection.type === 'wifi' ? 'wifi' : 'cellular';
        default:
          return 'wifi';
      }
    }

    return 'wifi';
  }

  private detectIfMetered(): boolean {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return false;
    }

    const connection = navigator.connection as any;
    return connection.saveData === true || connection.type === 'cellular';
  }

  private setupNavigatorConnectionAPI(): void {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return;
    }

    const connection = navigator.connection as any;
    
    const handleConnectionChange = () => {
      this.checkConnection();
    };

    connection.addEventListener('change', handleConnectionChange);
    
    // Store reference for cleanup
    this.connectionChangeHandler = handleConnectionChange;
  }

  private connectionChangeHandler?: () => void;

  private setupOnlineOfflineListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      this.updateConnectionStatus(true);
    };

    const handleOffline = () => {
      this.updateConnectionStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Store references for cleanup
    this.onlineHandler = handleOnline;
    this.offlineHandler = handleOffline;
  }

  private onlineHandler?: () => void;
  private offlineHandler?: () => void;

  private removeOnlineOfflineListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }
    
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
    }

    if (this.connectionChangeHandler && navigator.connection) {
      (navigator.connection as any).removeEventListener('change', this.connectionChangeHandler);
    }
  }

  private async checkConnection(): Promise<void> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const type = this.detectConnectionType();
    const isMetered = this.detectIfMetered();

    // Perform bandwidth/latency estimation if online
    let bandwidth = this.currentConnection.bandwidth;
    let latency = this.currentConnection.latency;

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
    // Simple quality measurement using a small test request
    // In a real implementation, you might use Network Information API or custom endpoints
    
    const startTime = performance.now();
    
    try {
      // Use a small image or endpoint to test latency and bandwidth
      const response = await fetch('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', {
        method: 'GET',
        cache: 'no-cache',
      });
      
      if (!response.ok) {
        throw new Error(`Network test failed: ${response.status}`);
      }
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // Estimate bandwidth based on navigator.connection API if available
      let bandwidth = 5; // Default
      
      if (typeof navigator !== 'undefined' && navigator.connection) {
        const connection = navigator.connection as any;
        if (connection.downlink) {
          bandwidth = connection.downlink;
        } else if (connection.effectiveType) {
          // Estimate based on effective type
          switch (connection.effectiveType) {
            case 'slow-2g':
              bandwidth = 0.05;
              break;
            case '2g':
              bandwidth = 0.25;
              break;
            case '3g':
              bandwidth = 1.5;
              break;
            case '4g':
              bandwidth = 10;
              break;
            default:
              bandwidth = 5;
          }
        }
      }
      
      return { bandwidth, latency };
    } catch (error) {
      // Return previous values or defaults if measurement fails
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
    } else if (bandwidth >= qualityThresholds.good.bandwidth && latency <= qualityThresholds.good.latency) {
      return 'good';
    } else if (bandwidth >= qualityThresholds.fair.bandwidth && latency <= qualityThresholds.fair.latency) {
      return 'fair';
    } else {
      return 'poor';
    }
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
        this.connectionHistory.shift(); // Keep last 100 measurements
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
          enableCompression: false, // Compression overhead not worth it
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