/**
 * Platform Detection Service
 * Framework-agnostic platform detection without any UI dependencies
 */

/**
 * Platform detection results
 */
export interface PlatformInfo {
  isReactNative: boolean;
  isWeb: boolean;
  isNode: boolean;
  isSSR: boolean;
  runtime: 'web' | 'react-native' | 'node' | 'unknown';
  details: {
    navigator?: {
      product?: string;
      userAgent?: string;
      platform?: string;
    };
    global?: {
      hasGlobal: boolean;
      hasFbBatchedBridge: boolean;
      hasHermesInternal: boolean;
      hasExpo: boolean;
    };
    window?: {
      hasWindow: boolean;
      hasReactNativeCheck: boolean;
      hasExpo: boolean;
    };
    process?: {
      hasProcess: boolean;
      isNode: boolean;
      platform?: string;
    };
  };
}

/**
 * Platform detection configuration
 */
export interface PlatformDetectionConfig {
  enableLogging?: boolean;
  cacheResults?: boolean;
  validateEnvironment?: boolean;
}

/**
 * Platform Detection Service
 * Pure TypeScript class for detecting runtime environment
 */
export class PlatformDetectionService {
  private config: Required<PlatformDetectionConfig>;

  private cachedResult: PlatformInfo | null = null;

  constructor(config: PlatformDetectionConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      cacheResults: config.cacheResults ?? true,
      validateEnvironment: config.validateEnvironment ?? false,
    };
  }

  /**
   * Detect current platform
   */
  detectPlatform(): PlatformInfo {
    if (this.config.cacheResults && this.cachedResult) {
      return this.cachedResult;
    }

    const info = this.performDetection();
    
    if (this.config.cacheResults) {
      this.cachedResult = info;
    }

    if (this.config.enableLogging) {
      this.logDetectionResults(info);
    }

    return info;
  }

  /**
   * Clear cached detection results
   */
  clearCache(): void {
    this.cachedResult = null;
  }

  /**
   * Validate current environment matches expected platform
   */
  validatePlatform(expectedPlatform: 'web' | 'react-native' | 'node'): boolean {
    const info = this.detectPlatform();
    return info.runtime === expectedPlatform;
  }

  /**
   * Perform actual platform detection
   */
  private performDetection(): PlatformInfo {
    const details = this.gatherEnvironmentDetails();
    
    // Determine platform type
    const isReactNative = this.detectReactNative(details);
    const isNode = this.detectNode(details);
    const isSSR = this.detectSSR(details);
    const isWeb = !isReactNative && !isNode;

    // Determine runtime
    let runtime: PlatformInfo['runtime'];
    if (isReactNative) {
      runtime = 'react-native';
    } else if (isNode) {
      runtime = 'node';
    } else if (isWeb) {
      runtime = 'web';
    } else {
      runtime = 'unknown';
    }

    return {
      isReactNative,
      isWeb,
      isNode,
      isSSR,
      runtime,
      details,
    };
  }

  /**
   * Gather environment details
   */
  private gatherEnvironmentDetails(): PlatformInfo['details'] {
    const details: PlatformInfo['details'] = {};

    // Navigator details
    if (typeof navigator !== 'undefined') {
      details.navigator = {
        product: navigator.product,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };
    }

    // Global details
    if (typeof global !== 'undefined') {
      const g = global as any;
      details.global = {
        hasGlobal: true,
        hasFbBatchedBridge: !!g.__fbBatchedBridge,
        hasHermesInternal: !!g.HermesInternal,
        hasExpo: !!g.expo,
      };
    } else {
      details.global = {
        hasGlobal: false,
        hasFbBatchedBridge: false,
        hasHermesInternal: false,
        hasExpo: false,
      };
    }

    // Window details
    if (typeof window !== 'undefined') {
      const w = window as any;
      details.window = {
        hasWindow: true,
        hasReactNativeCheck: !!w.__REACT_NATIVE_VERSION_CHECK__,
        hasExpo: !!w.expo,
      };
    } else {
      details.window = {
        hasWindow: false,
        hasReactNativeCheck: false,
        hasExpo: false,
      };
    }

    // Process details
    if (typeof process !== 'undefined') {
      details.process = {
        hasProcess: true,
        isNode: !!(process.versions && process.versions.node),
        platform: process.platform,
      };
    } else {
      details.process = {
        hasProcess: false,
        isNode: false,
      };
    }

    return details;
  }

  /**
   * Detect React Native environment
   */
  private detectReactNative(details: PlatformInfo['details']): boolean {
    // Method 1: Navigator product check
    if (details.navigator?.product === 'ReactNative') {
      return true;
    }

    // Method 2: Global bridge check
    if (details.global?.hasFbBatchedBridge) {
      return true;
    }

    // Method 3: Hermes engine check
    if (details.global?.hasHermesInternal) {
      return true;
    }

    // Method 4: Window React Native check
    if (details.window?.hasReactNativeCheck) {
      return true;
    }

    return false;
  }

  /**
   * Detect Node.js environment
   */
  private detectNode(details: PlatformInfo['details']): boolean {
    return details.process?.isNode ?? false;
  }

  /**
   * Detect Server-Side Rendering
   */
  private detectSSR(details: PlatformInfo['details']): boolean {
    return !details.window?.hasWindow && !this.detectReactNative(details);
  }

  /**
   * Log detection results for debugging
   */
  private logDetectionResults(info: PlatformInfo): void {
    console.log('[Platform Detection] Results:', {
      runtime: info.runtime,
      isReactNative: info.isReactNative,
      isWeb: info.isWeb,
      isNode: info.isNode,
      isSSR: info.isSSR,
    });
    
    if (this.config.validateEnvironment) {
      console.log('[Platform Detection] Environment Details:', info.details);
    }
  }
}

/**
 * Default platform detection service instance
 */
export const platformDetection = new PlatformDetectionService({
  enableLogging: false,
  cacheResults: true,
  validateEnvironment: false,
});

/**
 * Utility functions for common platform checks
 */
export const platformUtils = {
  /**
   * Quick platform detection (uses cached service)
   */
  detectPlatform: (): PlatformInfo => platformDetection.detectPlatform(),

  /**
   * Check if running in React Native
   */
  isReactNative: (): boolean => platformDetection.detectPlatform().isReactNative,

  /**
   * Check if running in web browser
   */
  isWeb: (): boolean => platformDetection.detectPlatform().isWeb,

  /**
   * Check if running in Node.js
   */
  isNode: (): boolean => platformDetection.detectPlatform().isNode,

  /**
   * Check if running in SSR environment
   */
  isSSR: (): boolean => platformDetection.detectPlatform().isSSR,

  /**
   * Get runtime environment name
   */
  getRuntime: (): 'web' | 'react-native' | 'node' | 'unknown' => platformDetection.detectPlatform().runtime,

  /**
   * Create platform-specific values
   */
  platformSelect: <T>(options: {
    web?: T;
    'react-native'?: T;
    node?: T;
    default: T;
  }): T => {
    const runtime = platformUtils.getRuntime();
    
    switch (runtime) {
      case 'web':
        return options.web ?? options.default;
      case 'react-native':
        return options['react-native'] ?? options.default;
      case 'node':
        return options.node ?? options.default;
      default:
        return options.default;
    }
  },

  /**
   * Execute platform-specific code
   */
  platformExecute: (handlers: {
    web?: () => void;
    'react-native'?: () => void;
    node?: () => void;
    default?: () => void;
  }): void => {
    const runtime = platformUtils.getRuntime();
    
    switch (runtime) {
      case 'web':
        if (handlers.web) {
          handlers.web();
        } else {
          handlers.default?.();
        }
        break;
      case 'react-native':
        if (handlers['react-native']) {
          handlers['react-native']();
        } else {
          handlers.default?.();
        }
        break;
      case 'node':
        if (handlers.node) {
          handlers.node();
        } else {
          handlers.default?.();
        }
        break;
      default:
        handlers.default?.();
        break;
    }
  },
};