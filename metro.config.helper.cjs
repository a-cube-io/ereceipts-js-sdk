/**
 * Metro Configuration Helper for React Native
 * 
 * This file helps configure Metro bundler to properly resolve the React Native
 * version of the A-Cube SDK.
 * 
 * Usage in your Expo/React Native app's metro.config.js:
 * 
 * ```javascript
 * const { getDefaultConfig } = require('expo/metro-config');
 * const { withACubeSDK } = require('@a-cube-io/ereceipts-js-sdk/metro.config.helper');
 * 
 * const config = getDefaultConfig(__dirname);
 * 
 * module.exports = withACubeSDK(config);
 * ```
 */

const path = require('path');

/**
 * Configure Metro to use the React Native build of A-Cube SDK
 */
function withACubeSDK(config) {
  // Ensure resolver exists
  config.resolver = config.resolver || {};
  
  // Add custom resolver for the SDK
  const originalResolveRequest = config.resolver.resolveRequest || null;
  
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Check if this is the A-Cube SDK
    if (moduleName === '@a-cube-io/ereceipts-js-sdk') {
      try {
        // Force it to use the React Native build
        const sdkPath = require.resolve('@a-cube-io/ereceipts-js-sdk/package.json');
        const sdkDir = path.dirname(sdkPath);
        const rnPath = path.join(sdkDir, 'dist', 'index.react-native.js');
        
        return {
          filePath: rnPath,
          type: 'sourceFile',
        };
      } catch (error) {
        console.warn('[ACube SDK] Failed to resolve React Native build:', error.message);
      }
    }

    // Handle expo-crypto resolution issues
    if (moduleName === 'expo-crypto') {
      try {
        // Try to resolve expo-crypto normally first
        const resolved = originalResolveRequest 
          ? originalResolveRequest(context, moduleName, platform)
          : context.resolveRequest(context, moduleName, platform);
        return resolved;
      } catch (error) {
        console.warn('[ACube SDK] expo-crypto resolution failed, runtime fallback will handle this:', error.message);
        // Let the error propagate - our runtime polyfill will handle it
        throw error;
      }
    }
    
    // Use the original resolver for everything else
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    
    // Default Metro resolver
    return context.resolveRequest(context, moduleName, platform);
  };
  
  return config;
}

/**
 * Alternative: Configure package exports field support
 * This enables Metro to respect the "exports" field in package.json
 */
function withPackageExports(config) {
  config.resolver = config.resolver || {};
  
  // Enable package exports (experimental in Metro)
  config.resolver.unstable_enablePackageExports = true;
  
  // Ensure react-native condition is prioritized
  config.resolver.unstable_conditionNames = ['react-native', 'require', 'import'];
  
  return config;
}

module.exports = {
  withACubeSDK,
  withPackageExports,
};