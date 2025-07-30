/**
 * Plugin Core System
 * Complete plugin architecture for A-Cube SDK
 */

export {
  BasePlugin,
  PluginBuilder,
} from './base-plugin';

export {
  type Plugin,
  PluginManager,
  type PluginError,
  type PluginCache,
  type PluginLogger,
  type PluginConfig,
  PluginManagerError,
  type PluginContext,
  type PluginStorage,
  type PluginManifest,
  type PluginPermission,
  type PluginHttpClient,
  type PluginRegistration,
  type PluginEventEmitter,
  type PluginLifecycleHooks,
} from './plugin-manager';
