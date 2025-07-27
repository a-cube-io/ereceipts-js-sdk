/**
 * Plugin Core System
 * Complete plugin architecture for A-Cube SDK
 */

export { 
  PluginManager, 
  PluginManagerError,
  type Plugin,
  type PluginManifest,
  type PluginContext,
  type PluginPermission,
  type PluginLifecycleHooks,
  type PluginRegistration,
  type PluginError,
  type PluginLogger,
  type PluginStorage,
  type PluginEventEmitter,
  type PluginConfig,
  type PluginCache,
  type PluginHttpClient,
} from './plugin-manager';

export { 
  BasePlugin, 
  PluginBuilder 
} from './base-plugin';