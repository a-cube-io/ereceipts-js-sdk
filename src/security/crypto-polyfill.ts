/**
 * Cross-platform crypto polyfill for React Native and Web
 * Provides crypto.getRandomValues functionality across platforms
 */

// Declare module for expo-crypto to help with TypeScript and bundling
declare const __DEV__: boolean | undefined;

// Global cache for expo-crypto to avoid repeated require attempts
let expoCryptoCache: any = null;
let expoCryptoChecked = false;

/**
 * Safely attempt to load expo-crypto with proper error handling
 * This approach focuses on runtime detection without dynamic requires
 */
function getExpoCrypto(): any {
  if (expoCryptoChecked) {
    return expoCryptoCache;
  }

  expoCryptoChecked = true;

  // Strategy 1: Check if expo-crypto is available in global scope (Expo SDK 47+)
  try {
    if (typeof global !== 'undefined' && (global as any).expo?.modules?.ExpoCrypto) {
      console.log('[ACube Crypto] Found expo-crypto in global.expo.modules');
      expoCryptoCache = (global as any).expo.modules.ExpoCrypto;
      return expoCryptoCache;
    }
  } catch (error) {
    // Continue to next strategy
  }

  // Strategy 2: Check if expo-crypto is available as a global
  try {
    if (typeof global !== 'undefined' && (global as any).ExpoCrypto) {
      console.log('[ACube Crypto] Found ExpoCrypto in global scope');
      expoCryptoCache = (global as any).ExpoCrypto;
      return expoCryptoCache;
    }
  } catch (error) {
    // Continue to next strategy
  }

  // Strategy 3: Check for Expo environment markers
  try {
    if (typeof global !== 'undefined' && (global as any).expo) {
      console.log('[ACube Crypto] In Expo environment but expo-crypto not directly available');
    }
  } catch (e) {
    // Not in Expo environment
  }

  console.log('[ACube Crypto] expo-crypto not available - using fallback');
  return null;
}

/**
 * Cross-platform random values generator
 */
export function getRandomValues<T extends ArrayBufferView>(array: T): T {
  // Web environment (has native crypto.getRandomValues)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(array);
  }

  // React Native environment with polyfill
  if (typeof global !== 'undefined' && typeof global.crypto?.getRandomValues === 'function') {
    return global.crypto.getRandomValues(array);
  }

  // Try to use expo-crypto if available
  const expoCrypto = getExpoCrypto();
  
  if (expoCrypto) {
    // Check if expo-crypto has getRandomValues (preferred method)
    if (expoCrypto.getRandomValues && typeof expoCrypto.getRandomValues === 'function') {
      console.log('[ACube Crypto] Using expo-crypto.getRandomValues');
      return expoCrypto.getRandomValues(array);
    }
    
    // Fallback to getRandomBytes if getRandomValues not available
    if (expoCrypto.getRandomBytes && typeof expoCrypto.getRandomBytes === 'function') {
      console.log('[ACube Crypto] Using expo-crypto.getRandomBytes');
      try {
        const randomBytes = expoCrypto.getRandomBytes(array.byteLength);
        
        if (array instanceof Uint8Array) {
          array.set(randomBytes);
        } else {
          // Handle other typed arrays
          const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          view.set(randomBytes);
        }
        return array;
      } catch (error) {
        console.warn('[ACube Crypto] expo-crypto.getRandomBytes failed:', error);
        // Fall through to other methods
      }
    }
    
    console.log('[ACube Crypto] expo-crypto available methods:', {
      getRandomValues: !!expoCrypto.getRandomValues,
      getRandomBytes: !!expoCrypto.getRandomBytes,
      getRandomBytesAsync: !!expoCrypto.getRandomBytesAsync
    });
  }

  // Try react-native-get-random-values if available
  try {
    require('react-native-get-random-values');
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(array);
    }
    if (typeof global !== 'undefined' && typeof global.crypto?.getRandomValues === 'function') {
      return global.crypto.getRandomValues(array);
    }
  } catch (error) {
    // react-native-get-random-values not available, continue to fallback
  }

  // Fallback: Use Math.random() (not cryptographically secure, but functional)
  console.warn('Using Math.random() fallback for crypto.getRandomValues - not cryptographically secure!');
  const bytes = new Uint8Array(array.byteLength);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  
  if (array instanceof Uint8Array) {
    array.set(bytes);
  } else {
    // Handle other typed arrays
    const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    view.set(bytes);
  }
  
  return array;
}

/**
 * Async version for when expo-crypto returns promises
 */
export async function getRandomValuesAsync<T extends ArrayBufferView>(array: T): Promise<T> {
  // Try expo-crypto async first
  const expoCrypto = getExpoCrypto();
  
  if (expoCrypto) {
    // Use getRandomBytesAsync if available
    if (expoCrypto.getRandomBytesAsync && typeof expoCrypto.getRandomBytesAsync === 'function') {
      try {
        const randomBytes = await expoCrypto.getRandomBytesAsync(array.byteLength);
        const uint8Array = new Uint8Array(randomBytes);
        
        if (array instanceof Uint8Array) {
          array.set(uint8Array);
        } else {
          const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          view.set(uint8Array);
        }
        return array;
      } catch (error) {
        console.warn('[ACube Crypto] expo-crypto.getRandomBytesAsync failed:', error);
        // Fall through to sync methods
      }
    }
    
    // Fallback to sync getRandomValues if available
    if (expoCrypto.getRandomValues && typeof expoCrypto.getRandomValues === 'function') {
      return expoCrypto.getRandomValues(array);
    }
    
    // Fallback to sync getRandomBytes
    if (expoCrypto.getRandomBytes && typeof expoCrypto.getRandomBytes === 'function') {
      try {
        const randomBytes = expoCrypto.getRandomBytes(array.byteLength);
        
        if (array instanceof Uint8Array) {
          array.set(randomBytes);
        } else {
          const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          view.set(randomBytes);
        }
        return array;
      } catch (error) {
        console.warn('[ACube Crypto] expo-crypto.getRandomBytes failed:', error);
        // Fall through to sync version
      }
    }
  }

  // Fallback to sync version
  return getRandomValues(array);
}

/**
 * Debug function to test expo-crypto availability
 */
export function testExpoCrypto(): { available: boolean; methods: any; error?: string } {
  const expoCrypto = getExpoCrypto();
  
  if (expoCrypto) {
    return {
      available: true,
      methods: {
        getRandomValues: typeof expoCrypto.getRandomValues,
        getRandomBytes: typeof expoCrypto.getRandomBytes,
        getRandomBytesAsync: typeof expoCrypto.getRandomBytesAsync,
        digest: typeof expoCrypto.digest,
        digestStringAsync: typeof expoCrypto.digestStringAsync,
      }
    };
  }
  
  return {
    available: false,
    methods: {},
    error: 'expo-crypto not available through any import method'
  };
}

/**
 * Cross-platform crypto object
 */
export const crossPlatformCrypto = {
  getRandomValues,
  getRandomValuesAsync,
  testExpoCrypto,
};

/**
 * Check if secure crypto is available
 */
export function isSecureCryptoAvailable(): boolean {
  // Check for native Web Crypto API
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return true;
  }

  // Check for global crypto (react-native-get-random-values)
  if (typeof global !== 'undefined' && typeof global.crypto?.getRandomValues === 'function') {
    return true;
  }

  // Check for expo-crypto
  const expoCrypto = getExpoCrypto();
  return !!(expoCrypto && (expoCrypto.getRandomValues || expoCrypto.getRandomBytes || expoCrypto.getRandomBytesAsync));
}

/**
 * Get crypto environment info for debugging
 */
export function getCryptoEnvironmentInfo(): {
  hasNativeCrypto: boolean;
  hasGlobalCrypto: boolean;
  hasExpoCrypto: boolean;
  hasReactNativeGetRandomValues: boolean;
  isSecure: boolean;
} {
  const hasNativeCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
  const hasGlobalCrypto = typeof global !== 'undefined' && typeof global.crypto?.getRandomValues === 'function';
  
  const expoCrypto = getExpoCrypto();
  const hasExpoCrypto = !!(expoCrypto && (expoCrypto.getRandomValues || expoCrypto.getRandomBytes || expoCrypto.getRandomBytesAsync));

  let hasReactNativeGetRandomValues = false;
  try {
    require('react-native-get-random-values');
    hasReactNativeGetRandomValues = hasNativeCrypto || hasGlobalCrypto;
  } catch {
    hasReactNativeGetRandomValues = false;
  }

  return {
    hasNativeCrypto,
    hasGlobalCrypto,
    hasExpoCrypto,
    hasReactNativeGetRandomValues,
    isSecure: hasNativeCrypto || hasGlobalCrypto || hasExpoCrypto || hasReactNativeGetRandomValues,
  };
}