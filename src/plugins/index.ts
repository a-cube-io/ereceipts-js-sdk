/**
 * A-Cube SDK Plugin System
 * Complete plugin architecture with core system and built-in plugins
 */

// Export core plugin system
// Import for internal use
import type { Plugin } from './core/plugin-manager';

export * from './core';

// Export all built-in plugins
export * from './builtin';

export type {
  BasePlugin,
  PluginBuilder,
} from './core/base-plugin';

// Re-export common types for convenience
export type {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginPermission,
  PluginLifecycleHooks,
} from './core/plugin-manager';

/**
 * Plugin system utilities
 */
export const PluginUtils = {
  /**
   * Create a plugin bundle with multiple plugins
   */
  createBundle: (plugins: Plugin[]) => ({
    plugins,
    register: async (manager: any) => {
      for (const plugin of plugins) {
        await manager.register(plugin);
      }
    },
  }),

  /**
   * Validate plugin compatibility
   */
  validateCompatibility: (plugin: Plugin, sdkVersion: string) => {
    const {manifest} = plugin;

    if (manifest.sdkVersion && manifest.sdkVersion !== sdkVersion) {
      throw new Error(`Plugin ${manifest.name} requires SDK version ${manifest.sdkVersion}, got ${sdkVersion}`);
    }

    return true;
  },

  /**
   * Get plugin dependencies
   */
  getDependencies: (plugin: Plugin): string[] => plugin.manifest.dependencies || [],

  /**
   * Check if plugin has permission
   */
  hasPermission: (plugin: Plugin, permission: string): boolean => (plugin.manifest.permissions || []).includes(permission as any),
};
