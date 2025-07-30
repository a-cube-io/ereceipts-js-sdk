/**
 * Platform Detection Utility for A-Cube SDK
 * Detects the current runtime environment to enable platform-specific optimizations
 */

// Platform types
export type PlatformType = 'web' | 'react-native' | 'node' | 'unknown';

// Storage capabilities by platform
export interface PlatformCapabilities {
  readonly platform: PlatformType;
  readonly hasIndexedDB: boolean;
  readonly hasLocalStorage: boolean;
  readonly hasAsyncStorage: boolean;
  readonly hasFileSystem: boolean;
  readonly hasWebCrypto: boolean;
  readonly hasCompressionStreams: boolean;
  readonly supportsWorkers: boolean;
  readonly supportsNotifications: boolean;
  readonly isSecureContext: boolean;
  readonly maxStorageSize: number; // In bytes, 0 means unlimited
}

// Environment detection results
export interface EnvironmentInfo extends PlatformCapabilities {
  readonly userAgent?: string;
  readonly nodeVersion?: string;
  readonly reactNativeVersion?: string;
  readonly browserName?: string;
  readonly browserVersion?: string;
  readonly osName?: string;
  readonly osVersion?: string;
  readonly deviceType: 'mobile' | 'tablet' | 'desktop' | 'server' | 'unknown';
  readonly connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  readonly isOnline: boolean;
  readonly language: string;
  readonly timezone: string;
}

/**
 * Platform detector with comprehensive environment analysis
 */
export class PlatformDetector {
  private static instance: PlatformDetector | null = null;

  private cachedInfo: EnvironmentInfo | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  /**
   * Detect current platform type
   */
  detectPlatform(): PlatformType {
    // Check for Node.js environment
    if (typeof process !== 'undefined' &&
        process.versions &&
        process.versions.node &&
        typeof window === 'undefined') {
      return 'node';
    }

    // Check for React Native environment
    if (typeof navigator !== 'undefined' &&
        navigator.product === 'ReactNative') {
      return 'react-native';
    }

    // Check for web browser environment
    if (typeof window !== 'undefined' &&
        typeof document !== 'undefined') {
      return 'web';
    }

    return 'unknown';
  }

  /**
   * Get comprehensive environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = this.detectPlatform();

    this.cachedInfo = {
      ...this.detectCapabilities(platform),
      ...this.detectDeviceInfo(platform),
      ...this.detectNetworkInfo(),
      ...this.detectLocaleInfo(),
    };

    return this.cachedInfo;
  }

  /**
   * Detect storage and API capabilities
   */
  private detectCapabilities(platform: PlatformType): PlatformCapabilities {
    const baseCapabilities: PlatformCapabilities = {
      platform,
      hasIndexedDB: false,
      hasLocalStorage: false,
      hasAsyncStorage: false,
      hasFileSystem: false,
      hasWebCrypto: false,
      hasCompressionStreams: false,
      supportsWorkers: false,
      supportsNotifications: false,
      isSecureContext: false,
      maxStorageSize: 0,
    };

    switch (platform) {
      case 'web':
        return {
          ...baseCapabilities,
          hasIndexedDB: this.checkIndexedDBSupport(),
          hasLocalStorage: this.checkLocalStorageSupport(),
          hasWebCrypto: this.checkWebCryptoSupport(),
          hasCompressionStreams: this.checkCompressionStreamsSupport(),
          supportsWorkers: this.checkWebWorkersSupport(),
          supportsNotifications: this.checkNotificationSupport(),
          isSecureContext: this.checkSecureContext(),
          maxStorageSize: this.estimateWebStorageQuota(),
        };

      case 'react-native':
        return {
          ...baseCapabilities,
          hasAsyncStorage: this.checkAsyncStorageSupport(),
          hasFileSystem: this.checkFileSystemSupport(),
          hasWebCrypto: this.checkWebCryptoSupport(),
          supportsNotifications: this.checkNotificationSupport(),
          isSecureContext: true, // React Native is always secure
          maxStorageSize: 0, // Unlimited for mobile
        };

      case 'node':
        return {
          ...baseCapabilities,
          hasFileSystem: true,
          hasWebCrypto: this.checkNodeCryptoSupport(),
          hasCompressionStreams: this.checkNodeCompressionSupport(),
          supportsWorkers: this.checkWorkerThreadsSupport(),
          isSecureContext: true,
          maxStorageSize: 0, // Unlimited for server
        };

      default:
        return baseCapabilities;
    }
  }

  /**
   * Detect device and browser information
   */
  private detectDeviceInfo(platform: PlatformType): Pick<EnvironmentInfo, 'userAgent' | 'nodeVersion' | 'reactNativeVersion' | 'browserName' | 'browserVersion' | 'osName' | 'osVersion' | 'deviceType'> {
    const info: any = {
      deviceType: 'unknown' as const,
    };

    if (platform === 'node') {
      info.nodeVersion = process.version;
      info.osName = process.platform;
      info.deviceType = 'server';
    } else if (platform === 'react-native') {
      info.reactNativeVersion = this.getReactNativeVersion();
      info.deviceType = this.detectMobileDeviceType();
      info.osName = this.getReactNativeOS();
    } else if (platform === 'web') {
      info.userAgent = navigator.userAgent;
      const browserInfo = this.parseBrowserInfo(navigator.userAgent);
      info.browserName = browserInfo.name;
      info.browserVersion = browserInfo.version;
      info.osName = this.parseOSInfo(navigator.userAgent);
      info.deviceType = this.detectWebDeviceType();
    }

    return info;
  }

  /**
   * Detect network information
   */
  private detectNetworkInfo(): Pick<EnvironmentInfo, 'connectionType' | 'isOnline'> {
    let isOnline = true;
    let connectionType: EnvironmentInfo['connectionType'] = 'unknown';

    if (typeof navigator !== 'undefined') {
      isOnline = navigator.onLine;

      // Network Information API (experimental)
      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection;

      if (connection) {
        const {effectiveType} = connection;
        if (effectiveType === 'slow-2g' || effectiveType === '2g' ||
            effectiveType === '3g' || effectiveType === '4g') {
          connectionType = 'cellular';
        } else {
          connectionType = 'wifi';
        }
      }
    }

    return { isOnline, connectionType };
  }

  /**
   * Detect locale information
   */
  private detectLocaleInfo(): Pick<EnvironmentInfo, 'language' | 'timezone'> {
    let language = 'en-US';
    let timezone = 'UTC';

    if (typeof navigator !== 'undefined') {
      language = navigator.language || 'en-US';
    }

    if (typeof Intl !== 'undefined') {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    return { language, timezone };
  }

  // Capability detection methods
  private checkIndexedDBSupport(): boolean {
    try {
      return typeof window !== 'undefined' &&
             'indexedDB' in window &&
             window.indexedDB !== null;
    } catch {
      return false;
    }
  }

  private checkLocalStorageSupport(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private checkAsyncStorageSupport(): boolean {
    try {
      // Check if AsyncStorage is available (React Native)
      return typeof require !== 'undefined' &&
             require('@react-native-async-storage/async-storage') !== null;
    } catch {
      return false;
    }
  }

  private checkFileSystemSupport(): boolean {
    try {
      return typeof require !== 'undefined' &&
             (require('fs') !== null || require('react-native-fs') !== null);
    } catch {
      return false;
    }
  }

  private checkWebCryptoSupport(): boolean {
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        return true;
      }
      // Node.js crypto module
      if (typeof require !== 'undefined') {
        const nodeCrypto = require('crypto');
        return nodeCrypto?.webcrypto;
      }
      return false;
    } catch {
      return false;
    }
  }

  private checkCompressionStreamsSupport(): boolean {
    try {
      return typeof CompressionStream !== 'undefined' &&
             typeof DecompressionStream !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkNodeCompressionSupport(): boolean {
    try {
      return typeof require !== 'undefined' &&
             require('zlib') !== null;
    } catch {
      return false;
    }
  }

  private checkWebWorkersSupport(): boolean {
    try {
      return typeof Worker !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkWorkerThreadsSupport(): boolean {
    try {
      return typeof require !== 'undefined' &&
             require('worker_threads') !== null;
    } catch {
      return false;
    }
  }

  private checkNotificationSupport(): boolean {
    try {
      return typeof Notification !== 'undefined' ||
             (typeof require !== 'undefined' &&
              require('react-native-push-notification') !== null);
    } catch {
      return false;
    }
  }

  private checkSecureContext(): boolean {
    if (typeof window !== 'undefined') {
      return window.isSecureContext || location.protocol === 'https:';
    }
    return true; // Node.js and React Native are considered secure
  }

  private checkNodeCryptoSupport(): boolean {
    try {
      const crypto = require('crypto');
      return crypto && (crypto.webcrypto || crypto.subtle);
    } catch {
      return false;
    }
  }

  private estimateWebStorageQuota(): number {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      // This will be resolved asynchronously, but we return 0 for now
      navigator.storage.estimate().then(estimate => estimate.quota || 0);
    }

    // Fallback estimates based on browser
    const userAgent = navigator?.userAgent || '';
    if (userAgent.includes('Chrome')) {
      return 1024 * 1024 * 1024; // ~1GB for Chrome
    } if (userAgent.includes('Firefox')) {
      return 2 * 1024 * 1024 * 1024; // ~2GB for Firefox
    } if (userAgent.includes('Safari')) {
      return 1024 * 1024 * 1024; // ~1GB for Safari
    }

    return 50 * 1024 * 1024; // 50MB default
  }

  private getReactNativeVersion(): string {
    try {
      const {Platform} = require('react-native');
      return Platform.constants?.reactNativeVersion?.string || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private getReactNativeOS(): string {
    try {
      const {Platform} = require('react-native');
      return Platform.OS;
    } catch {
      return 'unknown';
    }
  }

  private detectMobileDeviceType(): 'mobile' | 'tablet' {
    try {
      const {Dimensions} = require('react-native');
      const { width, height } = Dimensions.get('window');
      const aspectRatio = Math.max(width, height) / Math.min(width, height);

      // Simple heuristic: tablets typically have lower aspect ratios
      return aspectRatio < 1.6 ? 'tablet' : 'mobile';
    } catch {
      return 'mobile';
    }
  }

  private detectWebDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') {return 'desktop';}

    const {userAgent} = navigator;

    if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
      return 'tablet';
    } if (/iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    } 
      return 'desktop';
    
  }

  private parseBrowserInfo(userAgent: string): { name: string; version: string } {
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/(\d+\.\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+\.\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+\.\d+)/ },
      { name: 'Edge', regex: /Edge\/(\d+\.\d+)/ },
      { name: 'Opera', regex: /Opera\/(\d+\.\d+)/ },
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      if (match) {
        return { name: browser.name, version: match[1] || '0.0' };
      }
    }

    return { name: 'Unknown', version: '0.0' };
  }

  private parseOSInfo(userAgent: string): string {
    if (userAgent.includes('Windows')) {return 'Windows';}
    if (userAgent.includes('Mac OS')) {return 'macOS';}
    if (userAgent.includes('Linux')) {return 'Linux';}
    if (userAgent.includes('Android')) {return 'Android';}
    if (userAgent.includes('iOS')) {return 'iOS';}
    return 'Unknown';
  }

  /**
   * Clear cached information (useful for testing)
   */
  clearCache(): void {
    this.cachedInfo = null;
  }

  /**
   * Check if specific capability is available
   */
  hasCapability(capability: keyof PlatformCapabilities): boolean {
    const info = this.getEnvironmentInfo();
    return info[capability] as boolean;
  }

  /**
   * Get optimal storage adapter for current platform
   */
  getRecommendedStorageAdapter(): 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory' {
    const capabilities = this.getEnvironmentInfo();

    if (capabilities.hasIndexedDB) {
      return 'indexeddb';
    } if (capabilities.hasAsyncStorage) {
      return 'asyncstorage';
    } if (capabilities.hasLocalStorage) {
      return 'localstorage';
    } if (capabilities.hasFileSystem) {
      return 'filesystem';
    } 
      return 'memory';
    
  }

  /**
   * Get performance tier based on platform capabilities
   */
  getPerformanceTier(): 'high' | 'medium' | 'low' {
    const info = this.getEnvironmentInfo();

    if (info.platform === 'node' ||
        (info.platform === 'web' && info.deviceType === 'desktop')) {
      return 'high';
    } if (info.platform === 'react-native' && info.deviceType === 'tablet') {
      return 'medium';
    } 
      return 'low';
    
  }
}

// Export singleton instance
export const platformDetector = PlatformDetector.getInstance();

// Convenience functions
export const getPlatform = (): PlatformType => platformDetector.detectPlatform();
export const getEnvironmentInfo = (): EnvironmentInfo => platformDetector.getEnvironmentInfo();
export const hasCapability = (capability: keyof PlatformCapabilities): boolean =>
  platformDetector.hasCapability(capability);
export const getRecommendedStorageAdapter = () => platformDetector.getRecommendedStorageAdapter();
export const getPerformanceTier = () => platformDetector.getPerformanceTier();
