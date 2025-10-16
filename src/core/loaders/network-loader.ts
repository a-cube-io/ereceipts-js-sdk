import { INetworkMonitor } from '../../adapters';

// Static imports for all platforms
import { WebNetworkMonitor } from '../../platforms/web/network';
import { ReactNativeNetworkMonitor } from '../../platforms/react-native/network';
import { NodeNetworkMonitor } from '../../platforms/node/network';

/**
 * Load-platform-specific network monitor
 */
export function loadNetworkMonitor(platform: string): INetworkMonitor {
  switch (platform) {
    case 'web':
      return loadWebNetworkMonitor();
    case 'react-native':
      return loadReactNativeNetworkMonitor();
    case 'node':
      return loadNodeNetworkMonitor();
    default:
      return loadMemoryNetworkMonitor();
  }
}

/**
 * Load web network monitor (navigator.onLine-based)
 */
function loadWebNetworkMonitor(): INetworkMonitor {
  return new WebNetworkMonitor();
}

/**
 * Load React Native network monitor (NetInfo-based)
 */
function loadReactNativeNetworkMonitor(): INetworkMonitor {
  return new ReactNativeNetworkMonitor();
}

/**
 * Load Node.js network monitor (DNS-based connectivity check)
 */
function loadNodeNetworkMonitor(): INetworkMonitor {
  return new NodeNetworkMonitor();
}

/**
 * Load memory network monitor (fallback)
 */
function loadMemoryNetworkMonitor(): INetworkMonitor {
  return new NodeNetworkMonitor();
}