/**
 * Base Plugin Class - Abstract base for all A-Cube SDK plugins
 * Provides common functionality and type-safe implementation
 */

import type { 
  Plugin, 
  PluginManifest, 
  PluginContext, 
  PluginPermission,
  PluginLifecycleHooks 
} from './plugin-manager';
import type { RequestOptions, HttpResponse } from '@/http/client';

export abstract class BasePlugin implements Plugin {
  abstract readonly manifest: PluginManifest;
  
  protected context?: PluginContext;

  /**
   * Initialize the plugin with context
   */
  async onInit(context: PluginContext): Promise<void> {
    this.context = context;
    this.log('info', 'Plugin initialized');
    await this.initialize(context);
  }

  /**
   * Cleanup plugin resources
   */
  async onDestroy(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin destroying');
    await this.cleanup(context);
    delete this.context;
  }

  /**
   * Handle configuration changes
   */
  async onConfigChange(context: PluginContext, key: string, value: any): Promise<void> {
    this.log('debug', `Config changed: ${key}`, { value });
    await this.handleConfigChange(context, key, value);
  }

  /**
   * Process requests before they are sent
   */
  async beforeRequest(context: PluginContext, options: RequestOptions): Promise<RequestOptions> {
    this.log('debug', `Processing request: ${options.method} ${options.url}`);
    return await this.processRequest(context, options) || options;
  }

  /**
   * Process responses after they are received
   */
  async afterResponse(context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> {
    this.log('debug', `Processing response: ${response.status}`);
    return await this.processResponse(context, response) || response;
  }

  /**
   * Handle errors
   */
  async onError(context: PluginContext, error: Error): Promise<Error | void> {
    this.log('error', 'Handling error', { error: error.message });
    return await this.handleError(context, error) || error;
  }

  // Abstract methods for subclasses to implement

  /**
   * Plugin-specific initialization logic
   */
  protected abstract initialize(context: PluginContext): Promise<void>;

  /**
   * Plugin-specific cleanup logic
   */
  protected abstract cleanup(context: PluginContext): Promise<void>;

  // Optional hooks for subclasses to override

  /**
   * Handle configuration changes (optional)
   */
  protected async handleConfigChange(_context: PluginContext, _key: string, _value: any): Promise<void> {
    // Default implementation - do nothing
  }

  /**
   * Process outgoing requests (optional)
   */
  protected async processRequest(_context: PluginContext, options: RequestOptions): Promise<RequestOptions | void> {
    // Default implementation - do nothing
    return options;
  }

  /**
   * Process incoming responses (optional)
   */
  protected async processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any> | void> {
    // Default implementation - do nothing
    return response;
  }

  /**
   * Handle errors (optional)
   */
  protected async handleError(_context: PluginContext, error: Error): Promise<Error | void> {
    // Default implementation - do nothing
    return error;
  }

  // Utility methods

  /**
   * Ensure plugin has required permissions
   */
  protected requirePermissions(...permissions: PluginPermission[]): void {
    const pluginPermissions = this.manifest.permissions || [];
    
    for (const permission of permissions) {
      if (!pluginPermissions.includes(permission)) {
        throw new Error(`Plugin '${this.manifest.name}' requires permission: ${permission}`);
      }
    }
  }

  /**
   * Check if plugin has permission
   */
  protected hasPermission(permission: PluginPermission): boolean {
    return (this.manifest.permissions || []).includes(permission);
  }

  /**
   * Log messages with plugin context
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.context) {
      this.context.logger[level](message, meta);
    } else {
      console[level](`[${this.manifest.name}] ${message}`, meta);
    }
  }

  /**
   * Get configuration value
   */
  protected getConfig<T>(key: string): T | undefined {
    this.requirePermissions('config:read');
    return this.context?.config.get<T>(key);
  }

  /**
   * Set configuration value
   */
  protected setConfig<T>(key: string, value: T): void {
    this.requirePermissions('config:write');
    this.context?.config.set(key, value);
  }

  /**
   * Get from cache
   */
  protected getFromCache<T>(key: string): T | undefined {
    this.requirePermissions('cache:read');
    return this.context?.cache.get<T>(key);
  }

  /**
   * Set in cache
   */
  protected setInCache<T>(key: string, value: T, ttl?: number): void {
    this.requirePermissions('cache:write');
    this.context?.cache.set(key, value, ttl);
  }

  /**
   * Get from storage
   */
  protected getFromStorage<T>(key: string): T | undefined {
    this.requirePermissions('storage:read');
    return this.context?.storage.get<T>(key);
  }

  /**
   * Set in storage
   */
  protected setInStorage<T>(key: string, value: T): void {
    this.requirePermissions('storage:write');
    this.context?.storage.set(key, value);
  }

  /**
   * Emit event
   */
  protected emitEvent(event: string, ...args: any[]): boolean {
    this.requirePermissions('events:emit');
    return this.context?.events.emit(event, ...args) || false;
  }

  /**
   * Listen to event
   */
  protected onEvent(event: string, listener: (...args: any[]) => void): void {
    this.requirePermissions('events:listen');
    this.context?.events.on(event, listener);
  }

  /**
   * Make HTTP request
   */
  protected async makeRequest<T>(options: RequestOptions): Promise<HttpResponse<T>> {
    const isReadOperation = options.method === 'GET';
    this.requirePermissions(isReadOperation ? 'http:read' : 'http:write');
    
    if (!this.context) {
      throw new Error('Plugin context not available');
    }
    
    return this.context.http.request<T>(options);
  }

  /**
   * Get SDK instance
   */
  protected get sdk() {
    if (!this.context) {
      throw new Error('Plugin context not available');
    }
    return this.context.sdk;
  }

  /**
   * Validate plugin manifest
   */
  public static validateManifest(manifest: PluginManifest): void {
    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error('Plugin manifest must have a valid name');
    }
    
    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error('Plugin manifest must have a valid version');
    }
    
    // Validate semantic version format
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    if (!semverRegex.test(manifest.version)) {
      throw new Error('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }
    
    // Validate permissions if provided
    if (manifest.permissions) {
      const validPermissions: PluginPermission[] = [
        'http:read', 'http:write', 'storage:read', 'storage:write',
        'events:emit', 'events:listen', 'cache:read', 'cache:write',
        'config:read', 'config:write'
      ];
      
      for (const permission of manifest.permissions) {
        if (!validPermissions.includes(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
    }
  }
}

/**
 * Plugin Builder - Utility class for creating plugins programmatically
 */
export class PluginBuilder {
  private manifest: Partial<PluginManifest> = {};
  private hooks: Partial<PluginLifecycleHooks> = {};

  static create(name: string, version: string): PluginBuilder {
    return new PluginBuilder().name(name).version(version);
  }

  name(name: string): this {
    this.manifest.name = name;
    return this;
  }

  version(version: string): this {
    this.manifest.version = version;
    return this;
  }

  description(description: string): this {
    this.manifest.description = description;
    return this;
  }

  author(author: string): this {
    this.manifest.author = author;
    return this;
  }

  permissions(...permissions: PluginPermission[]): this {
    this.manifest.permissions = permissions;
    return this;
  }

  dependencies(...dependencies: string[]): this {
    this.manifest.dependencies = dependencies;
    return this;
  }

  onInit(handler: (context: PluginContext) => Promise<void> | void): this {
    this.hooks.onInit = handler;
    return this;
  }

  onDestroy(handler: (context: PluginContext) => Promise<void> | void): this {
    this.hooks.onDestroy = handler;
    return this;
  }

  beforeRequest(handler: (context: PluginContext, options: RequestOptions) => Promise<RequestOptions> | RequestOptions): this {
    this.hooks.beforeRequest = handler;
    return this;
  }

  afterResponse(handler: (context: PluginContext, response: HttpResponse<any>) => Promise<HttpResponse<any>> | HttpResponse<any>): this {
    this.hooks.afterResponse = handler;
    return this;
  }

  onError(handler: (context: PluginContext, error: Error) => Promise<Error | void> | Error | void): this {
    this.hooks.onError = handler;
    return this;
  }

  build(): Plugin {
    if (!this.manifest.name || !this.manifest.version) {
      throw new Error('Plugin name and version are required');
    }

    const manifest = this.manifest as PluginManifest;
    BasePlugin.validateManifest(manifest);

    return {
      manifest,
      ...this.hooks,
    };
  }
}