/**
 * A-Cube SDK Plugin System
 * Complete plugin architecture with core system and built-in plugins
 */

// Export core plugin system
export * from './core';

// Export all built-in plugins
export * from './builtin';

// Re-export common types for convenience
export type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginPermission,
  PluginLifecycleHooks,
} from './core/plugin-manager';

// Import for internal use
import type { Plugin } from './core/plugin-manager';

export type {
  BasePlugin,
  PluginBuilder,
} from './core/base-plugin';

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
    const manifest = plugin.manifest;
    
    if (manifest.sdkVersion && manifest.sdkVersion !== sdkVersion) {
      throw new Error(`Plugin ${manifest.name} requires SDK version ${manifest.sdkVersion}, got ${sdkVersion}`);
    }
    
    return true;
  },

  /**
   * Get plugin dependencies
   */
  getDependencies: (plugin: Plugin): string[] => {
    return plugin.manifest.dependencies || [];
  },

  /**
   * Check if plugin has permission
   */
  hasPermission: (plugin: Plugin, permission: string): boolean => {
    return (plugin.manifest.permissions || []).includes(permission as any);
  },
};