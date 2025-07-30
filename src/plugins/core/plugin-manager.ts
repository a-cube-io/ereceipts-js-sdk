/**
 * Plugin Manager - Core plugin system for A-Cube SDK
 * Provides extensible architecture with lifecycle hooks and middleware
 */

import type { ACubeSDK } from '@/core/sdk';
import type { HttpResponse, RequestOptions } from '@/http/client';

import { EventEmitter } from 'eventemitter3';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  peerDependencies?: string[];
  sdkVersion?: string;
  permissions?: PluginPermission[];
}

export type PluginPermission =
  | 'http:read'
  | 'http:write'
  | 'storage:read'
  | 'storage:write'
  | 'events:emit'
  | 'events:listen'
  | 'cache:read'
  | 'cache:write'
  | 'config:read'
  | 'config:write';

export interface PluginContext {
  sdk: ACubeSDK;
  logger: PluginLogger;
  storage: PluginStorage;
  events: PluginEventEmitter;
  config: PluginConfig;
  cache: PluginCache;
  http: PluginHttpClient;
}

export interface PluginLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export interface PluginStorage {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  keys(): string[];
}

export interface PluginEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): boolean;
}

export interface PluginConfig {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
}

export interface PluginCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface PluginHttpClient {
  request<T>(options: RequestOptions): Promise<HttpResponse<T>>;
  get<T>(url: string, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>;
  post<T>(url: string, data?: any, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>;
}

export interface PluginLifecycleHooks {
  onInit?(context: PluginContext): Promise<void> | void;
  onDestroy?(context: PluginContext): Promise<void> | void;
  onConfigChange?(context: PluginContext, key: string, value: any): Promise<void> | void;
  beforeRequest?(context: PluginContext, options: RequestOptions): Promise<RequestOptions> | RequestOptions;
  afterResponse?(context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> | HttpResponse<any>;
  onError?(context: PluginContext, error: Error): Promise<Error | void> | Error | void;
}

export interface Plugin extends PluginLifecycleHooks {
  manifest: PluginManifest;
}

export interface PluginRegistration {
  plugin: Plugin;
  context: PluginContext;
  isActive: boolean;
  loadedAt: Date;
  errors: PluginError[];
}

export interface PluginError {
  message: string;
  stack?: string;
  timestamp: Date;
  phase: 'load' | 'init' | 'runtime' | 'destroy';
}

export class PluginManager extends EventEmitter {
  private plugins = new Map<string, PluginRegistration>();

  private middleware: PluginMiddleware[] = [];

  private sdk: ACubeSDK;

  private globalConfig = new Map<string, any>();

  private globalCache = new Map<string, { value: any; expires?: number }>();

  constructor(sdk: ACubeSDK) {
    super();
    this.sdk = sdk;
  }

  /**
   * Register a plugin with the SDK
   */
  async register(plugin: Plugin): Promise<void> {
    const { name, version } = plugin.manifest;

    // Validate plugin
    this.validatePlugin(plugin);

    // Check if plugin already registered
    if (this.plugins.has(name)) {
      throw new PluginManagerError(`Plugin '${name}' is already registered`);
    }

    // Validate dependencies
    await this.validateDependencies(plugin);

    // Create plugin context
    const context = this.createPluginContext(plugin);

    const registration: PluginRegistration = {
      plugin,
      context,
      isActive: false,
      loadedAt: new Date(),
      errors: [],
    };

    try {
      // Initialize plugin
      if (plugin.onInit) {
        await plugin.onInit(context);
      }

      registration.isActive = true;
      this.plugins.set(name, registration);

      // Register middleware hooks
      this.registerMiddleware(plugin, context);

      this.emit('plugin:registered', { name, version });

      console.info(`Plugin '${name}@${version}' registered successfully`);
    } catch (error) {
      const pluginError: PluginError = {
        message: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack && { stack: error.stack }),
        timestamp: new Date(),
        phase: 'init',
      };

      registration.errors.push(pluginError);
      this.plugins.set(name, registration);

      this.emit('plugin:error', { name, error: pluginError });
      throw new PluginManagerError(`Failed to initialize plugin '${name}': ${pluginError.message}`);
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const registration = this.plugins.get(name);
    if (!registration) {
      throw new PluginManagerError(`Plugin '${name}' is not registered`);
    }

    try {
      // Call destroy hook
      if (registration.plugin.onDestroy) {
        await registration.plugin.onDestroy(registration.context);
      }

      // Remove middleware
      this.middleware = this.middleware.filter(m => m.pluginName !== name);

      this.plugins.delete(name);
      this.emit('plugin:unregistered', { name });

      console.info(`Plugin '${name}' unregistered successfully`);
    } catch (error) {
      const pluginError: PluginError = {
        message: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack && { stack: error.stack }),
        timestamp: new Date(),
        phase: 'destroy',
      };

      registration.errors.push(pluginError);
      this.emit('plugin:error', { name, error: pluginError });
      throw new PluginManagerError(`Failed to destroy plugin '${name}': ${pluginError.message}`);
    }
  }

  /**
   * Get information about registered plugins
   */
  getRegisteredPlugins(): Array<{ name: string; version: string; isActive: boolean; loadedAt: Date; errors: PluginError[] }> {
    return Array.from(this.plugins.values()).map(reg => ({
      name: reg.plugin.manifest.name,
      version: reg.plugin.manifest.version,
      isActive: reg.isActive,
      loadedAt: reg.loadedAt,
      errors: reg.errors,
    }));
  }

  /**
   * Check if plugin is registered
   */
  isRegistered(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * Execute middleware hooks
   */
  async executeBeforeRequestHooks(options: RequestOptions): Promise<RequestOptions> {
    let modifiedOptions = options;

    for (const middleware of this.middleware) {
      if (middleware.beforeRequest) {
        try {
          modifiedOptions = await middleware.beforeRequest(middleware.context, modifiedOptions) || modifiedOptions;
        } catch (error) {
          this.handleMiddlewareError(middleware.pluginName, 'beforeRequest', error);
        }
      }
    }

    return modifiedOptions;
  }

  async executeAfterResponseHooks(response: HttpResponse<any>): Promise<HttpResponse<any>> {
    let modifiedResponse = response;

    for (const middleware of this.middleware) {
      if (middleware.afterResponse) {
        try {
          modifiedResponse = await middleware.afterResponse(middleware.context, modifiedResponse) || modifiedResponse;
        } catch (error) {
          this.handleMiddlewareError(middleware.pluginName, 'afterResponse', error);
        }
      }
    }

    return modifiedResponse;
  }

  async executeErrorHooks(error: Error): Promise<Error> {
    let modifiedError = error;

    for (const middleware of this.middleware) {
      if (middleware.onError) {
        try {
          const result = await middleware.onError(middleware.context, modifiedError);
          if (result instanceof Error) {
            modifiedError = result;
          }
        } catch (hookError) {
          this.handleMiddlewareError(middleware.pluginName, 'onError', hookError);
        }
      }
    }

    return modifiedError;
  }

  /**
   * Cleanup all plugins
   */
  async destroy(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());

    for (const name of pluginNames) {
      try {
        await this.unregister(name);
      } catch (error) {
        console.error(`Failed to unregister plugin '${name}' during cleanup:`, error);
      }
    }

    this.removeAllListeners();
  }

  private validatePlugin(plugin: Plugin): void {
    const { name, version } = plugin.manifest;

    if (!name || typeof name !== 'string') {
      throw new PluginManagerError('Plugin manifest must have a valid name');
    }

    if (!version || typeof version !== 'string') {
      throw new PluginManagerError('Plugin manifest must have a valid version');
    }

    // Validate plugin name format
    if (!/^[a-z0-9-_]+$/i.test(name)) {
      throw new PluginManagerError('Plugin name can only contain letters, numbers, hyphens, and underscores');
    }
  }

  private async validateDependencies(plugin: Plugin): Promise<void> {
    const { dependencies = [], peerDependencies = [] } = plugin.manifest;

    // Check plugin dependencies
    for (const dep of dependencies) {
      if (!this.isRegistered(dep)) {
        throw new PluginManagerError(`Plugin dependency '${dep}' is not registered`);
      }
    }

    // Peer dependencies are warnings only
    for (const peerDep of peerDependencies) {
      if (!this.isRegistered(peerDep)) {
        console.warn(`Plugin peer dependency '${peerDep}' is not registered`);
      }
    }
  }

  private createPluginContext(plugin: Plugin): PluginContext {
    const pluginName = plugin.manifest.name;
    const permissions = plugin.manifest.permissions || [];

    return {
      sdk: this.sdk,
      logger: this.createPluginLogger(pluginName),
      storage: this.createPluginStorage(pluginName, permissions),
      events: this.createPluginEventEmitter(pluginName, permissions),
      config: this.createPluginConfig(pluginName, permissions),
      cache: this.createPluginCache(pluginName, permissions),
      http: this.createPluginHttpClient(permissions),
    };
  }

  private createPluginLogger(pluginName: string): PluginLogger {
    return {
      debug: (message, meta) => console.debug(`[${pluginName}] ${message}`, meta),
      info: (message, meta) => console.info(`[${pluginName}] ${message}`, meta),
      warn: (message, meta) => console.warn(`[${pluginName}] ${message}`, meta),
      error: (message, meta) => console.error(`[${pluginName}] ${message}`, meta),
    };
  }

  private createPluginStorage(pluginName: string, permissions: PluginPermission[]): PluginStorage {
    const canRead = permissions.includes('storage:read');
    const canWrite = permissions.includes('storage:write');
    const storageKey = `plugin:${pluginName}`;

    return {
      get: <T>(key: string): T | undefined => {
        if (!canRead) {throw new PluginManagerError('Plugin does not have storage:read permission');}
        const data = localStorage.getItem(`${storageKey}:${key}`);
        return data ? JSON.parse(data) : undefined;
      },
      set: <T>(key: string, value: T): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have storage:write permission');}
        localStorage.setItem(`${storageKey}:${key}`, JSON.stringify(value));
      },
      delete: (key: string): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have storage:write permission');}
        localStorage.removeItem(`${storageKey}:${key}`);
      },
      clear: (): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have storage:write permission');}
        const keys = Object.keys(localStorage).filter(k => k.startsWith(`${storageKey}:`));
        keys.forEach(k => localStorage.removeItem(k));
      },
      keys: (): string[] => {
        if (!canRead) {throw new PluginManagerError('Plugin does not have storage:read permission');}
        return Object.keys(localStorage)
          .filter(k => k.startsWith(`${storageKey}:`))
          .map(k => k.replace(`${storageKey}:`, ''));
      },
    };
  }

  private createPluginEventEmitter(pluginName: string, permissions: PluginPermission[]): PluginEventEmitter {
    const canListen = permissions.includes('events:listen');
    const canEmit = permissions.includes('events:emit');

    return {
      on: (event: string, listener: (...args: any[]) => void): void => {
        if (!canListen) {throw new PluginManagerError('Plugin does not have events:listen permission');}
        this.on(`plugin:${pluginName}:${event}`, listener);
      },
      off: (event: string, listener: (...args: any[]) => void): void => {
        if (!canListen) {throw new PluginManagerError('Plugin does not have events:listen permission');}
        this.off(`plugin:${pluginName}:${event}`, listener);
      },
      emit: (event: string, ...args: any[]): boolean => {
        if (!canEmit) {throw new PluginManagerError('Plugin does not have events:emit permission');}
        return this.emit(`plugin:${pluginName}:${event}`, ...args);
      },
    };
  }

  private createPluginConfig(pluginName: string, permissions: PluginPermission[]): PluginConfig {
    const canRead = permissions.includes('config:read');
    const canWrite = permissions.includes('config:write');

    return {
      get: <T>(key: string): T | undefined => {
        if (!canRead) {throw new PluginManagerError('Plugin does not have config:read permission');}
        return this.globalConfig.get(`${pluginName}:${key}`);
      },
      set: <T>(key: string, value: T): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have config:write permission');}
        this.globalConfig.set(`${pluginName}:${key}`, value);
      },
      has: (key: string): boolean => {
        if (!canRead) {throw new PluginManagerError('Plugin does not have config:read permission');}
        return this.globalConfig.has(`${pluginName}:${key}`);
      },
    };
  }

  private createPluginCache(pluginName: string, permissions: PluginPermission[]): PluginCache {
    const canRead = permissions.includes('cache:read');
    const canWrite = permissions.includes('cache:write');

    return {
      get: <T>(key: string): T | undefined => {
        if (!canRead) {throw new PluginManagerError('Plugin does not have cache:read permission');}
        const entry = this.globalCache.get(`${pluginName}:${key}`);
        if (!entry) {return undefined;}
        if (entry.expires && Date.now() > entry.expires) {
          this.globalCache.delete(`${pluginName}:${key}`);
          return undefined;
        }
        return entry.value;
      },
      set: <T>(key: string, value: T, ttl?: number): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have cache:write permission');}
        const expires = ttl ? Date.now() + ttl : undefined;
        this.globalCache.set(`${pluginName}:${key}`, { value, ...(expires && { expires }) });
      },
      delete: (key: string): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have cache:write permission');}
        this.globalCache.delete(`${pluginName}:${key}`);
      },
      clear: (): void => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have cache:write permission');}
        const keys = Array.from(this.globalCache.keys()).filter(k => k.startsWith(`${pluginName}:`));
        keys.forEach(k => this.globalCache.delete(k));
      },
    };
  }

  private createPluginHttpClient(permissions: PluginPermission[]): PluginHttpClient {
    const canRead = permissions.includes('http:read');
    const canWrite = permissions.includes('http:write');

    const httpClient = this.sdk.getClients().api;

    return {
      request: async <T>(options: RequestOptions): Promise<HttpResponse<T>> => {
        const isReadOperation = options.method === 'GET';
        const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method);

        if (isReadOperation && !canRead) {
          throw new PluginManagerError('Plugin does not have http:read permission');
        }
        if (isWriteOperation && !canWrite) {
          throw new PluginManagerError('Plugin does not have http:write permission');
        }

        return httpClient.request<T>(options);
      },
      get: async <T>(url: string, options?: Partial<RequestOptions>): Promise<HttpResponse<T>> => {
        if (!canRead) {throw new PluginManagerError('Plugin does not have http:read permission');}
        return httpClient.get<T>(url, options);
      },
      post: async <T>(url: string, data?: any, options?: Partial<RequestOptions>): Promise<HttpResponse<T>> => {
        if (!canWrite) {throw new PluginManagerError('Plugin does not have http:write permission');}
        return httpClient.post<T>(url, data, options);
      },
    };
  }

  private registerMiddleware(plugin: Plugin, context: PluginContext): void {
    const middleware: PluginMiddleware = {
      pluginName: plugin.manifest.name,
      context,
      ...(plugin.beforeRequest && { beforeRequest: plugin.beforeRequest }),
      ...(plugin.afterResponse && { afterResponse: plugin.afterResponse }),
      ...(plugin.onError && { onError: plugin.onError }),
    };

    this.middleware.push(middleware);
  }

  private handleMiddlewareError(pluginName: string, phase: string, error: unknown): void {
    const registration = this.plugins.get(pluginName);
    if (registration) {
      const pluginError: PluginError = {
        message: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack && { stack: error.stack }),
        timestamp: new Date(),
        phase: 'runtime',
      };

      registration.errors.push(pluginError);
      this.emit('plugin:error', { name: pluginName, error: pluginError });
    }

    console.error(`Plugin '${pluginName}' error in ${phase}:`, error);
  }
}

interface PluginMiddleware {
  pluginName: string;
  context: PluginContext;
  beforeRequest?: (context: PluginContext, options: RequestOptions) => Promise<RequestOptions> | RequestOptions;
  afterResponse?: (context: PluginContext, response: HttpResponse<any>) => Promise<HttpResponse<any>> | HttpResponse<any>;
  onError?: (context: PluginContext, error: Error) => Promise<Error | void> | Error | void;
}

export class PluginManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginManagerError';
  }
}
