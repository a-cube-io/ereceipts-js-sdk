/**
 * Platform detection utilities
 */

export type Platform = 'web' | 'react-native' | 'node' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  isReactNative: boolean;
  isWeb: boolean;
  isNode: boolean;
  isExpo: boolean;
}

// Type declarations for global variables that may not be available
declare const global: typeof globalThis & {
  __DEV__?: boolean;
  navigator?: { product?: string };
  Expo?: unknown;
  expo?: unknown;
};
declare const process: { versions?: { node?: string } } | undefined;
declare const window: { document?: unknown; navigator?: unknown } | undefined;

/**
 * Detect the current platform
 */
export function detectPlatform(): PlatformInfo {
  // Check for React Native
  if (
    typeof global !== 'undefined' &&
    global.__DEV__ !== undefined &&
    typeof global.navigator !== 'undefined' &&
    global.navigator.product === 'ReactNative'
  ) {
    return {
      platform: 'react-native',
      isReactNative: true,
      isWeb: false,
      isNode: false,
      isExpo: checkExpo(),
    };
  }

  // Check for Web/Browser
  if (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.navigator !== 'undefined'
  ) {
    return {
      platform: 'web',
      isReactNative: false,
      isWeb: true,
      isNode: false,
      isExpo: false,
    };
  }

  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return {
      platform: 'node',
      isReactNative: false,
      isWeb: false,
      isNode: true,
      isExpo: false,
    };
  }

  // Unknown platform
  return {
    platform: 'unknown',
    isReactNative: false,
    isWeb: false,
    isNode: false,
    isExpo: false,
  };
}

/**
 * Check if running in Expo
 */
function checkExpo(): boolean {
  try {
    return (
      typeof global !== 'undefined' &&
      (typeof global.Expo !== 'undefined' || typeof global.expo !== 'undefined')
    );
  } catch {
    return false;
  }
}
