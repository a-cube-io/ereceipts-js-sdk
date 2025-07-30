/**
 * Built-in Plugins for A-Cube SDK
 * Complete suite of enterprise-grade plugins for analytics, debugging, performance, caching, and auditing
 */

import { AuditPlugin } from '@/plugins/builtin/audit-plugin';
import { CachePlugin } from '@/plugins/builtin/cache-plugin';
import { DebugPlugin } from '@/plugins/builtin/debug-plugin';
import { AnalyticsPlugin } from '@/plugins/builtin/analytics-plugin';
import { PerformancePlugin } from '@/plugins/builtin/performance-plugin';

export { DebugPlugin } from './debug-plugin';
export { CachePlugin } from './cache-plugin';
export { AuditPlugin } from './audit-plugin';
// Export all built-in plugins
export { AnalyticsPlugin } from './analytics-plugin';
export { PerformancePlugin } from './performance-plugin';

export type {
  DebugEvent,
  DebugFilter,
  DebugSession,
} from './debug-plugin';

export type {
  AuditEvent,
  AuditFilter,
  ComplianceReport,
} from './audit-plugin';

// Export plugin types for convenience
export type {
  UsageStats,
  AnalyticsEvent,
  PerformanceMetric,
} from './analytics-plugin';

export type {
  CacheEntry,
  CacheStats,
  CacheConfig,
  CacheWarmupRule,
} from './cache-plugin';

export type {
  PerformanceAlert,
  PerformanceBudget,
  PerformanceReport,
  PerformanceMetric as PerfMetric,
} from './performance-plugin';

/**
 * Plugin registry for easy access to all built-in plugins
 */
export const BUILTIN_PLUGINS = {
  analytics: () => AnalyticsPlugin,
  debug: () => DebugPlugin,
  performance: () => PerformancePlugin,
  cache: () => CachePlugin,
  audit: () => AuditPlugin,
} as const;

/**
 * Plugin categories for organization
 */
export const PLUGIN_CATEGORIES = {
  monitoring: ['analytics', 'performance', 'debug'],
  optimization: ['cache', 'performance'],
  compliance: ['audit'],
  development: ['debug'],
} as const;

/**
 * Utility function to get plugin by name
 */
export function getBuiltinPlugin(name: keyof typeof BUILTIN_PLUGINS) {
  return BUILTIN_PLUGINS[name]();
}

/**
 * Utility function to get plugins by category
 */
export function getPluginsByCategory(category: keyof typeof PLUGIN_CATEGORIES) {
  return PLUGIN_CATEGORIES[category].map(name =>
    BUILTIN_PLUGINS[name](),
  );
}

/**
 * Plugin manifest information
 */
export const PLUGIN_MANIFESTS = {
  analytics: {
    name: 'analytics',
    version: '1.0.0',
    description: 'Track API usage, performance metrics, and user behavior',
    category: 'monitoring',
    dependencies: [],
    permissions: ['http:read', 'storage:read', 'storage:write', 'cache:read', 'cache:write', 'events:emit', 'config:read', 'config:write'],
  },
  debug: {
    name: 'debug',
    version: '1.0.0',
    description: 'Advanced debugging and logging for A-Cube SDK',
    category: 'development',
    dependencies: [],
    permissions: ['http:read', 'storage:read', 'storage:write', 'cache:read', 'cache:write', 'events:emit', 'config:read', 'config:write'],
  },
  performance: {
    name: 'performance',
    version: '1.0.0',
    description: 'Monitor and optimize A-Cube SDK performance',
    category: 'optimization',
    dependencies: [],
    permissions: ['http:read', 'storage:read', 'storage:write', 'cache:read', 'cache:write', 'events:emit', 'config:read', 'config:write'],
  },
  cache: {
    name: 'cache',
    version: '1.0.0',
    description: 'Advanced caching strategies for A-Cube SDK',
    category: 'optimization',
    dependencies: [],
    permissions: ['http:read', 'http:write', 'storage:read', 'storage:write', 'cache:read', 'cache:write', 'events:emit', 'config:read', 'config:write'],
  },
  audit: {
    name: 'audit',
    version: '1.0.0',
    description: 'Comprehensive audit logging and compliance for A-Cube SDK',
    category: 'compliance',
    dependencies: [],
    permissions: ['http:read', 'storage:read', 'storage:write', 'cache:read', 'cache:write', 'events:emit', 'config:read', 'config:write'],
  },
} as const;
