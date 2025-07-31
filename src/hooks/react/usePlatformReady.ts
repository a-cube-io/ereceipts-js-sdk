/**
 * Platform Readiness Service
 * Framework-agnostic platform initialization detection without UI dependencies
 */

/**
 * Platform readiness information
 */
export interface PlatformReadinessInfo {
  isReady: boolean;
  readinessTime: number | null;
  detectionMethod: string | null;
  retryCount: number;
}

/**
 * Platform information structure
 */
export interface PlatformInfo {
  isReactNative: boolean;
  isExpo: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
  runtime: 'react-native' | 'expo' | 'web' | 'unknown';
}

/**
 * Platform Readiness Service
 * Pure TypeScript class for detecting platform initialization state
 */
export class PlatformReadinessService {
  private readinessInfo: PlatformReadinessInfo = {
    isReady: false,
    readinessTime: null,
    detectionMethod: null,
    retryCount: 0,
  };

  private platformInfo: PlatformInfo | null = null;

  private checkInterval: ReturnType<typeof setInterval> | null = null;

  private listeners: Array<(isReady: boolean) => void> = [];

  /**
   * Check if React Native platform is ready for use
   */
  checkPlatformReadiness(): PlatformReadinessInfo {
    if (this.readinessInfo.isReady) {
      return this.readinessInfo;
    }

    this.readinessInfo.retryCount++;

    try {
      // Multiple checks for React Native readiness
      if (typeof global !== 'undefined') {
        const g = global as any;
        
        // Check for React Native indicators
        if (
          g.__fbBatchedBridge ||
          g.HermesInternal ||
          g.nativeCallSyncHook ||
          g.nativeFlushQueueImmediate ||
          g.nativeQueueConfigFlushQueueImmediate
        ) {
          // Try to require React Native
          try {
            require('react-native');
            this.readinessInfo = {
              isReady: true,
              readinessTime: Date.now(),
              detectionMethod: 'react-native-bridge',
              retryCount: this.readinessInfo.retryCount,
            };
            this.notifyListeners(true);
            return this.readinessInfo;
          } catch (e) {
            // React Native not available yet
          }
        }
      }

      // Check for Expo
      if (typeof window !== 'undefined' && (window as any).expo) {
        this.readinessInfo = {
          isReady: true,
          readinessTime: Date.now(),
          detectionMethod: 'expo-window',
          retryCount: this.readinessInfo.retryCount,
        };
        this.notifyListeners(true);
        return this.readinessInfo;
      }

      // Check navigator
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        this.readinessInfo = {
          isReady: true,
          readinessTime: Date.now(),
          detectionMethod: 'navigator-product',
          retryCount: this.readinessInfo.retryCount,
        };
        this.notifyListeners(true);
        return this.readinessInfo;
      }

      return this.readinessInfo;
    } catch (error) {
      return this.readinessInfo;
    }
  }

  /**
   * Start monitoring platform readiness with periodic checks
   */
  startMonitoring(checkInterval: number = 100, maxRetries: number = 50): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.readinessInfo.isReady) {
        resolve(true);
        return;
      }

      let retryCount = 0;
      const check = () => {
        const result = this.checkPlatformReadiness();
        
        if (result.isReady) {
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
          }
          resolve(true);
          return;
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
          }
          resolve(false);
          
        }
      };

      // Check immediately
      check();

      // Set up periodic checking if not ready
      if (!this.readinessInfo.isReady && retryCount < maxRetries) {
        this.checkInterval = setInterval(check, checkInterval);
      }
    });
  }

  /**
   * Stop monitoring platform readiness
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get comprehensive platform information
   */
  getPlatformInfo(): PlatformInfo {
    if (this.platformInfo) {
      return this.platformInfo;
    }

    // Check readiness first
    const readiness = this.checkPlatformReadiness();
    
    if (!readiness.isReady) {
      // Default to web if not ready
      this.platformInfo = {
        isReactNative: false,
        isExpo: false,
        isWeb: true,
        platform: 'web',
        runtime: 'web',
      };
      return this.platformInfo;
    }

    try {
      const RN = require('react-native');
      const isRN = !!RN.Platform;
      const isExpo = !!(global as any).expo || !!(window as any).expo;
      
      this.platformInfo = {
        isReactNative: isRN,
        isExpo,
        isWeb: !isRN,
        platform: isRN ? RN.Platform.OS : 'web',
        runtime: isExpo ? 'expo' : isRN ? 'react-native' : 'web',
      };
    } catch (error) {
      // Keep default web platform
      this.platformInfo = {
        isReactNative: false,
        isExpo: false,
        isWeb: true,
        platform: 'web',
        runtime: 'web',
      };
    }

    return this.platformInfo;
  }

  /**
   * Add listener for readiness changes
   */
  addReadinessListener(listener: (isReady: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all cached state and reset service
   */
  reset(): void {
    this.readinessInfo = {
      isReady: false,
      readinessTime: null,
      detectionMethod: null,
      retryCount: 0,
    };
    this.platformInfo = null;
    this.stopMonitoring();
    this.listeners = [];
  }

  /**
   * Get readiness information
   */
  getReadinessInfo(): PlatformReadinessInfo {
    return this.readinessInfo;
  }

  /**
   * Notify all listeners of readiness change
   */
  private notifyListeners(isReady: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isReady);
      } catch (error) {
        console.error('Platform readiness listener error:', error);
      }
    });
  }
}

/**
 * Default platform readiness service instance
 */
export const platformReadiness = new PlatformReadinessService();

/**
 * Utility functions for platform readiness
 */
export const readinessUtils = {
  /**
   * Quick readiness check
   */
  isReady: (): boolean => platformReadiness.checkPlatformReadiness().isReady,

  /**
   * Wait for platform to be ready
   */
  waitForReady: (timeout: number = 5000): Promise<boolean> => {
    const maxRetries = Math.floor(timeout / 100);
    return platformReadiness.startMonitoring(100, maxRetries);
  },

  /**
   * Get platform information immediately
   */
  getPlatformInfo: (): PlatformInfo => platformReadiness.getPlatformInfo(),

  /**
   * Get readiness diagnostics
   */
  getDiagnostics: () => ({
    readiness: platformReadiness.getReadinessInfo(),
    platform: platformReadiness.getPlatformInfo(),
    timestamp: new Date().toISOString(),
  }),

  /**
   * Check if specific platform features are available
   */
  hasFeature: (feature: 'react-native' | 'expo' | 'hermes' | 'bridge'): boolean => {
    const readiness = platformReadiness.checkPlatformReadiness();
    
    if (!readiness.isReady) return false;

    switch (feature) {
      case 'react-native':
        try {
          require('react-native');
          return true;
        } catch {
          return false;
        }
      
      case 'expo':
        return !!(global as any).expo || !!(window as any).expo;
      
      case 'hermes':
        return typeof global !== 'undefined' && !!(global as any).HermesInternal;
      
      case 'bridge':
        return typeof global !== 'undefined' && !!(global as any).__fbBatchedBridge;
      
      default:
        return false;
    }
  },

  /**
   * Validate platform environment
   */
  validateEnvironment: (): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    const readiness = platformReadiness.getReadinessInfo();
    const platform = platformReadiness.getPlatformInfo();

    if (!readiness.isReady && platform.isReactNative) {
      issues.push('Platform detected as React Native but not ready');
    }

    if (readiness.retryCount > 10) {
      issues.push(`High retry count: ${readiness.retryCount}`);
    }

    if (platform.isReactNative && !readinessUtils.hasFeature('react-native')) {
      issues.push('React Native platform detected but module not available');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  },
};