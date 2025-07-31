/**
 * Platform Diagnostics Service
 * Framework-agnostic platform detection debugging without UI dependencies
 */

/**
 * Platform diagnostics data structure
 */
export interface PlatformDiagnosticsData {
  // Environment objects
  globalExists: boolean;
  globalType: string;
  windowExists: boolean;
  windowType: string;
  
  // Navigator information
  navigatorExists: boolean;
  navigatorProduct: string;
  navigatorUserAgent: string;
  navigatorPlatform: string;
  
  // React Native specific checks
  __fbBatchedBridge: 'exists' | 'missing';
  HermesInternal: 'exists' | 'missing';
  __REACT_NATIVE_VERSION_CHECK__: 'exists' | 'missing';
  
  // Expo checks
  expoConstants: boolean;
  expoInWindow: 'exists' | 'missing';
  expoInGlobal: 'exists' | 'missing';
  expoConstantsAvailable: boolean;
  
  // React Native module check
  reactNativeAvailable: boolean;
  reactNativeError: string;
}

/**
 * Detailed platform detection results
 */
export interface DetailedPlatformDetection {
  platform: 'unknown' | 'web' | 'ios' | 'android';
  timestamp: string;
  checks: {
    reactNativePlatform?: {
      success: boolean;
      OS?: string;
      Version?: string | number;
      error?: string;
    };
    expoConstants?: {
      success: boolean;
      platform?: any;
      expoVersion?: string;
      deviceName?: string;
      error?: string;
    };
    navigator?: {
      product: string;
      userAgent: string;
      platform: string;
    };
    global?: {
      __fbBatchedBridge: boolean;
      HermesInternal: boolean;
      nativeCallSyncHook: boolean;
      expo: boolean;
    };
  };
}

/**
 * Platform Diagnostics Service
 * Pure TypeScript class for platform detection debugging
 */
export class PlatformDiagnosticsService {
  private static instance: PlatformDiagnosticsService | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): PlatformDiagnosticsService {
    if (!PlatformDiagnosticsService.instance) {
      PlatformDiagnosticsService.instance = new PlatformDiagnosticsService();
    }
    return PlatformDiagnosticsService.instance;
  }

  /**
   * Gather comprehensive platform diagnostics
   */
  gatherDiagnostics(): PlatformDiagnosticsData {
    const diagnostics: PlatformDiagnosticsData = {
      // Check global object
      globalExists: typeof global !== 'undefined',
      globalType: typeof global,
      
      // Check window object
      windowExists: typeof window !== 'undefined',
      windowType: typeof window,
      
      // Check navigator
      navigatorExists: typeof navigator !== 'undefined',
      navigatorProduct: typeof navigator !== 'undefined' ? navigator.product : 'N/A',
      navigatorUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      navigatorPlatform: typeof navigator !== 'undefined' ? navigator.platform : 'N/A',
      
      // React Native specific checks
      __fbBatchedBridge: typeof global !== 'undefined' && (global as any).__fbBatchedBridge ? 'exists' : 'missing',
      HermesInternal: typeof global !== 'undefined' && (global as any).HermesInternal ? 'exists' : 'missing',
      __REACT_NATIVE_VERSION_CHECK__: typeof window !== 'undefined' && (window as any).__REACT_NATIVE_VERSION_CHECK__ ? 'exists' : 'missing',
      
      // Expo checks
      expoConstants: false,
      expoInWindow: typeof window !== 'undefined' && (window as any).expo ? 'exists' : 'missing',
      expoInGlobal: typeof global !== 'undefined' && (global as any).expo ? 'exists' : 'missing',
      expoConstantsAvailable: false,
      
      // React Native module check
      reactNativeAvailable: false,
      reactNativeError: '',
    };
    
    // Try to import Expo Constants
    try {
      const Constants = require('expo-constants').default;
      diagnostics.expoConstants = !!Constants;
      diagnostics.expoConstantsAvailable = true;
    } catch (e) {
      // Not available
    }
    
    // Try to require React Native
    try {
      const RN = require('react-native');
      diagnostics.reactNativeAvailable = !!RN;
    } catch (e) {
      diagnostics.reactNativeError = e instanceof Error ? e.message : 'Unknown error';
    }
    
    return diagnostics;
  }

  /**
   * Perform detailed platform detection with comprehensive logging
   */
  performDetailedDetection(): DetailedPlatformDetection {
    let detectedPlatform: 'unknown' | 'web' | 'ios' | 'android' = 'unknown';
    
    const detectionDetails: DetailedPlatformDetection = {
      platform: detectedPlatform,
      timestamp: new Date().toISOString(),
      checks: {},
    };
    
    // Method 1: Try React Native Platform
    try {
      const { Platform } = require('react-native');
      detectionDetails.checks.reactNativePlatform = {
        success: true,
        OS: Platform.OS,
        Version: Platform.Version,
      };
      detectedPlatform = Platform.OS;
    } catch (e) {
      detectionDetails.checks.reactNativePlatform = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
    
    // Method 2: Try Expo Constants
    try {
      const Constants = require('expo-constants').default;
      detectionDetails.checks.expoConstants = {
        success: true,
        platform: Constants.platform,
        expoVersion: Constants.expoVersion,
        deviceName: Constants.deviceName,
      };
      if (Constants.platform && detectedPlatform === 'unknown') {
        detectedPlatform = Constants.platform.ios ? 'ios' : Constants.platform.android ? 'android' : 'web';
      }
    } catch (e) {
      detectionDetails.checks.expoConstants = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
    
    // Method 3: Navigator check
    if (typeof navigator !== 'undefined') {
      detectionDetails.checks.navigator = {
        product: navigator.product,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };
    }
    
    // Method 4: Global checks
    if (typeof global !== 'undefined') {
      const g = global as any;
      detectionDetails.checks.global = {
        __fbBatchedBridge: !!g.__fbBatchedBridge,
        HermesInternal: !!g.HermesInternal,
        nativeCallSyncHook: !!g.nativeCallSyncHook,
        expo: !!g.expo,
      };
    }
    
    // Update detected platform
    detectionDetails.platform = detectedPlatform;
    
    return detectionDetails;
  }

  /**
   * Log diagnostics to console for debugging
   */
  logDiagnostics(): void {
    const diagnostics = this.gatherDiagnostics();
    
    console.log('=== Platform Diagnostics ===');
    console.log(JSON.stringify(diagnostics, null, 2));
    console.log('===========================');
    
    // Also check what happens when we try different detection methods
    console.log('Detection Results:');
    console.log('Method 1 (navigator.product):', typeof navigator !== 'undefined' && navigator.product === 'ReactNative');
    console.log('Method 2 (__fbBatchedBridge):', typeof global !== 'undefined' && (global as any).__fbBatchedBridge);
    console.log('Method 3 (HermesInternal):', typeof global !== 'undefined' && (global as any).HermesInternal);
    console.log('Method 4 (Expo check):', (typeof window !== 'undefined' && (window as any).expo) || (typeof global !== 'undefined' && (global as any).expo));
  }

  /**
   * Log detailed detection results
   */
  logDetailedDetection(): DetailedPlatformDetection {
    const details = this.performDetailedDetection();
    console.log('Platform Detection Details:', details);
    return details;
  }
}

/**
 * Default platform diagnostics service instance
 */
export const platformDiagnostics = PlatformDiagnosticsService.getInstance();

/**
 * Utility functions for platform diagnostics
 */
export const diagnosticsUtils = {
  /**
   * Quick diagnostics gathering
   */
  getDiagnostics: (): PlatformDiagnosticsData => platformDiagnostics.gatherDiagnostics(),

  /**
   * Quick detailed detection
   */
  getDetailedDetection: (): DetailedPlatformDetection => platformDiagnostics.performDetailedDetection(),

  /**
   * Log all diagnostics to console
   */
  logAll: (): void => {
    platformDiagnostics.logDiagnostics();
    platformDiagnostics.logDetailedDetection();
  },

  /**
   * Check if platform detection is working correctly
   */
  validateDetection: (): { isValid: boolean; issues: string[] } => {
    const diagnostics = platformDiagnostics.gatherDiagnostics();
    const issues: string[] = [];

    // Check for common issues
    if (!diagnostics.navigatorExists && !diagnostics.globalExists) {
      issues.push('Neither navigator nor global objects are available');
    }

    if (diagnostics.reactNativeError && diagnostics.reactNativeError !== '') {
      issues.push(`React Native module error: ${diagnostics.reactNativeError}`);
    }

    if (diagnostics.__fbBatchedBridge === 'missing' && 
        diagnostics.HermesInternal === 'missing' && 
        diagnostics.navigatorProduct !== 'ReactNative') {
      issues.push('No React Native indicators found');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  },

  /**
   * Get platform detection confidence score
   */
  getConfidenceScore: (): { score: number; factors: string[] } => {
    const diagnostics = platformDiagnostics.gatherDiagnostics();
    let score = 0;
    const factors: string[] = [];

    // Navigator check
    if (diagnostics.navigatorExists) {
      score += 20;
      factors.push('Navigator available');
      
      if (diagnostics.navigatorProduct === 'ReactNative') {
        score += 30;
        factors.push('Navigator product is ReactNative');
      }
    }

    // Global checks
    if (diagnostics.__fbBatchedBridge === 'exists') {
      score += 25;
      factors.push('Facebook batched bridge detected');
    }

    if (diagnostics.HermesInternal === 'exists') {
      score += 25;
      factors.push('Hermes engine detected');
    }

    // Module availability
    if (diagnostics.reactNativeAvailable) {
      score += 30;
      factors.push('React Native module available');
    }

    if (diagnostics.expoConstantsAvailable) {
      score += 15;
      factors.push('Expo constants available');
    }

    return {
      score: Math.min(score, 100),
      factors,
    };
  },
};