/**
 * SDK Initialization and Management
 * Handles SDK lifecycle, authentication restoration, and cleanup
 */

import { createACubeSDK, type ACubeSDK, type ACubeSDKConfig } from '../../index.js';
import { loadConfig, loadAuth } from '../config/index.js';
import type { CLIAuthState } from '../types.js';
import { AuthenticationRequiredError } from '../types.js';

// Global SDK instance
let sdk: ACubeSDK | null = null;

export async function initializeSDK(requireAuth = true): Promise<ACubeSDK> {
  const config = await loadConfig();
  const auth = await loadAuth(config.currentProfile);
  
  // Create SDK configuration
  const sdkConfig: ACubeSDKConfig = {
    environment: config.environment,
  };
  
  // Add custom base URLs if configured
  if (config.baseUrls?.api || config.baseUrls?.auth) {
    // Note: Custom base URLs would be configured here when SDK supports it
    console.log('🔧 Debug: Custom URLs configured:', {
      api: config.baseUrls?.api,
      auth: config.baseUrls?.auth
    });
  }
  
  // Initialize SDK
  sdk = createACubeSDK(sdkConfig);
  
  // Initialize the SDK (this sets up auth service and middleware)
  await sdk.initialize();
  
  // Restore authentication if available
  if (auth && (auth.accessToken || auth.user)) {
    try {
      await restoreAuthentication(auth);
    } catch (error) {
      if (requireAuth) {
        // Provide user-friendly authentication error
        throw new AuthenticationRequiredError('Please login to continue: acube auth login');
      }
    }
  } else if (requireAuth) {
    throw new AuthenticationRequiredError('Please login to continue: acube auth login');
  }
  
  return sdk;
}

async function restoreAuthentication(auth: CLIAuthState): Promise<void> {
  if (!sdk) {
    throw new Error('SDK not initialized');
  }
  
  // For CLI, we need both user and access token for API requests
  if (!auth.user) {
    throw new Error('No user authentication data available');
  }
  
  if (!auth.accessToken) {
    throw new Error('No access token available. Please run "acube auth login" to re-authenticate.');
  }
  
  // Extract expiration from JWT token if not in stored data
  let expiresAt = auth.expiresAt;
  if (!expiresAt && auth.accessToken) {
    try {
      // Simple JWT parsing for CLI
      const parts = auth.accessToken.split('.');
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload && payload.exp) {
          expiresAt = payload.exp * 1000; // Convert to milliseconds
        }
      }
    } catch (error) {
      console.log('🔧 Debug: Failed to parse token:', error);
    }
  }
  
  // Check if token is expired
  if (expiresAt && Date.now() >= expiresAt) {
    throw new Error('Access token has expired. Please login again.');
  }
  
  // Directly update the auth service state (most reliable method for CLI)
  try {
    const authService = sdk.authService;
    (authService as any).updateState({
      isAuthenticated: true,
      user: auth.user,
      accessToken: auth.accessToken || null,
      refreshToken: auth.refreshToken || null,
      expiresAt,
      isLoading: false,
      error: null
    });
    
  } catch (error) {
    throw new Error('Failed to restore authentication state in SDK');
  }
}

export async function cleanupSDK(): Promise<void> {
  if (sdk) {
    try {
      // Cleanup SDK resources with timeout
      const cleanupPromise = sdk.destroy();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cleanup timeout')), 2000)
      );
      
      await Promise.race([cleanupPromise, timeoutPromise]);
    } catch (error) {
      // Ignore cleanup errors - we're shutting down anyway
    } finally {
      sdk = null;
    }
  }
  
  // Force cleanup of any remaining timers/handles
  if (global.gc) {
    global.gc();
  }
}

export function getSDK(): ACubeSDK | null {
  return sdk;
}

export function requireSDK(): ACubeSDK {
  if (!sdk) {
    throw new Error('SDK not initialized. Call initializeSDK() first.');
  }
  return sdk;
}