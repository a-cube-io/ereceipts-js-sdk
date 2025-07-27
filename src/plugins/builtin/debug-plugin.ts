/**
 * Debug Plugin - Advanced debugging and logging for A-Cube SDK
 * Provides comprehensive debugging tools and request/response logging
 */

import { BasePlugin } from '../core/base-plugin';
import type { PluginContext, PluginManifest } from '../core/plugin-manager';
import type { RequestOptions, HttpResponse } from '@/http/client';

export interface DebugEvent {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  duration?: number;
  stackTrace?: string;
  correlationId?: string;
}

export interface DebugFilter {
  level?: ('debug' | 'info' | 'warn' | 'error')[];
  type?: ('request' | 'response' | 'error' | 'log')[];
  timeRange?: { start: number; end: number };
  keyword?: string;
  correlationId?: string;
}

export interface DebugSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  events: DebugEvent[];
  metadata: Record<string, any>;
}

export class DebugPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'debug',
    version: '1.0.0',
    description: 'Advanced debugging and logging for A-Cube SDK',
    author: 'A-Cube Team',
    permissions: [
      'http:read',
      'storage:read',
      'storage:write',
      'cache:read',
      'cache:write',
      'events:emit',
      'config:read',
      'config:write',
    ],
  };

  private events: DebugEvent[] = [];
  private sessions = new Map<string, DebugSession>();
  private activeSession?: string;
  private requestCorrelations = new Map<string, string>();
  private maxEvents: number = 1000;
  private isEnabled: boolean = true;

  protected async initialize(_context: PluginContext): Promise<void> {
    // Load configuration
    const config = this.getConfig<{
      enabled: boolean;
      maxEvents: number;
      autoSession: boolean;
      logLevel: 'debug' | 'info' | 'warn' | 'error';
      persistEvents: boolean;
    }>('settings') || {
      enabled: true,
      maxEvents: 1000,
      autoSession: true,
      logLevel: 'debug',
      persistEvents: false,
    };

    this.isEnabled = config.enabled;
    this.maxEvents = config.maxEvents;

    if (!this.isEnabled) {
      this.log('info', 'Debug plugin disabled by configuration');
      return;
    }

    // Load persisted events if enabled
    if (config.persistEvents) {
      await this.loadPersistedEvents();
    }

    // Start auto session if enabled
    if (config.autoSession) {
      this.startSession('main', { auto: true });
    }

    // Set up global error handler
    this.setupGlobalErrorHandler();

    this.log('info', 'Debug plugin initialized', { 
      maxEvents: this.maxEvents,
      autoSession: config.autoSession,
      logLevel: config.logLevel 
    });
  }

  protected async cleanup(_context: PluginContext): Promise<void> {
    const config = this.getConfig<{ persistEvents: boolean }>('settings');
    
    // Persist events if enabled
    if (config?.persistEvents) {
      await this.persistEvents();
    }

    // End active session
    if (this.activeSession) {
      this.endSession(this.activeSession);
    }

    this.log('info', 'Debug plugin cleaned up');
  }

  protected override async processRequest(_context: PluginContext, options: RequestOptions): Promise<RequestOptions> {
    if (!this.isEnabled) return options;

    // Generate correlation ID
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Store correlation for response tracking
    const requestId = `${options.method}_${options.url}_${Date.now()}`;
    this.requestCorrelations.set(requestId, correlationId);

    // Add debug headers
    options.headers = {
      ...options.headers,
      'X-Debug-Correlation-ID': correlationId,
      'X-Debug-Plugin': 'enabled',
    };

    // Log request
    this.addEvent({
      id: `${correlationId}_request`,
      timestamp: Date.now(),
      type: 'request',
      level: 'debug',
      message: `${options.method} ${options.url}`,
      data: {
        method: options.method,
        url: this.sanitizeUrl(options.url),
        headers: this.sanitizeHeaders(options.headers),
        body: this.sanitizeBody(options.data),
        timeout: options.timeout,
      },
      correlationId,
    });

    // Add correlation ID to options metadata
    options.metadata = {
      ...options.metadata,
      debugCorrelationId: correlationId,
    };

    return options;
  }

  protected override async processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> {
    if (!this.isEnabled) return response;

    const correlationId = response.headers?.['x-debug-correlation-id'] || 
                         (response as any).config?.metadata?.debugCorrelationId;

    // Log response
    this.addEvent({
      id: `${correlationId}_response`,
      timestamp: Date.now(),
      type: 'response',
      level: response.status >= 400 ? 'error' : 'debug',
      message: `${response.status} ${response.statusText}`,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: this.sanitizeHeaders(response.headers),
        data: this.sanitizeResponseBody(response.data),
        duration: response.duration,
        fromCache: 'fromCache' in response ? (response as any).fromCache : false,
      },
      duration: response.duration,
      correlationId,
    });

    return response;
  }

  protected override async handleError(_context: PluginContext, error: Error): Promise<Error> {
    if (!this.isEnabled) return error;

    // Extract correlation ID from error context
    const correlationId = (error as any).correlationId || 
                         (error as any).config?.metadata?.debugCorrelationId;

    // Log error with full stack trace
    this.addEvent({
      id: `${correlationId || 'unknown'}_error`,
      timestamp: Date.now(),
      type: 'error',
      level: 'error',
      message: error.message,
      data: {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        status: (error as any).status,
        response: (error as any).response ? {
          status: (error as any).response.status,
          statusText: (error as any).response.statusText,
          data: this.sanitizeResponseBody((error as any).response.data),
        } : undefined,
      },
      ...(error.stack && { stackTrace: error.stack }),
      ...(correlationId && { correlationId }),
    });

    return error;
  }

  /**
   * Start a debug session
   */
  public startSession(name: string, metadata: Record<string, any> = {}): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const session: DebugSession = {
      id: sessionId,
      name,
      startTime: Date.now(),
      events: [],
      metadata,
    };

    this.sessions.set(sessionId, session);
    this.activeSession = sessionId;

    this.addEvent({
      id: `${sessionId}_start`,
      timestamp: Date.now(),
      type: 'log',
      level: 'info',
      message: `Debug session started: ${name}`,
      data: { sessionId, metadata },
    });

    this.log('info', `Debug session started: ${name}`, { sessionId, metadata });
    return sessionId;
  }

  /**
   * End a debug session
   */
  public endSession(sessionId: string): DebugSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log('warn', `Session not found: ${sessionId}`);
      return undefined;
    }

    session.endTime = Date.now();
    session.events = this.events.filter(e => 
      e.timestamp >= session.startTime && 
      (!session.endTime || e.timestamp <= session.endTime)
    );

    this.addEvent({
      id: `${sessionId}_end`,
      timestamp: Date.now(),
      type: 'log',
      level: 'info',
      message: `Debug session ended: ${session.name}`,
      data: { 
        sessionId,
        duration: session.endTime - session.startTime,
        eventCount: session.events.length,
      },
    });

    if (this.activeSession === sessionId) {
      delete (this as any).activeSession;
    }

    this.log('info', `Debug session ended: ${session.name}`, { 
      sessionId,
      duration: session.endTime - session.startTime,
      eventCount: session.events.length,
    });

    return session;
  }

  /**
   * Add custom debug event
   */
  public addDebugLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.addEvent({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: Date.now(),
      type: 'log',
      level,
      message,
      data,
      ...(this.activeSession && { correlationId: this.activeSession }),
    });
  }

  /**
   * Get debug events with optional filtering
   */
  public getEvents(filter?: DebugFilter): DebugEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.level) {
        filteredEvents = filteredEvents.filter(e => filter.level!.includes(e.level));
      }
      
      if (filter.type) {
        filteredEvents = filteredEvents.filter(e => filter.type!.includes(e.type));
      }
      
      if (filter.timeRange) {
        filteredEvents = filteredEvents.filter(e => 
          e.timestamp >= filter.timeRange!.start && 
          e.timestamp <= filter.timeRange!.end
        );
      }
      
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        filteredEvents = filteredEvents.filter(e => 
          e.message.toLowerCase().includes(keyword) ||
          JSON.stringify(e.data || {}).toLowerCase().includes(keyword)
        );
      }
      
      if (filter.correlationId) {
        filteredEvents = filteredEvents.filter(e => e.correlationId === filter.correlationId);
      }
    }

    return filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get debug session
   */
  public getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  public getSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Export debug data
   */
  public exportDebugData(sessionId?: string): { session?: DebugSession; events: DebugEvent[] } {
    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    const events = sessionId && session 
      ? session.events 
      : this.events;

    return { ...(session && { session }), events };
  }

  /**
   * Clear debug data
   */
  public clearDebugData(sessionId?: string): void {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        // Remove session events from main events array
        this.events = this.events.filter(e => 
          !(e.timestamp >= session.startTime && 
            (!session.endTime || e.timestamp <= session.endTime))
        );
        this.sessions.delete(sessionId);
      }
    } else {
      this.events = [];
      this.sessions.clear();
      delete (this as any).activeSession;
    }

    this.log('info', 'Debug data cleared', { sessionId: sessionId || 'all' });
  }

  /**
   * Get debug statistics
   */
  public getDebugStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByLevel: Record<string, number>;
    activeSessions: number;
    averageRequestDuration: number;
    errorRate: number;
  } {
    const eventsByType = this.events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsByLevel = this.events.reduce((acc, e) => {
      acc[e.level] = (acc[e.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestEvents = this.events.filter(e => e.type === 'response' && e.duration);
    const averageRequestDuration = requestEvents.length > 0
      ? requestEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / requestEvents.length
      : 0;

    const errorEvents = this.events.filter(e => e.level === 'error').length;
    const errorRate = this.events.length > 0 ? errorEvents / this.events.length : 0;

    const activeSessions = Array.from(this.sessions.values()).filter(s => !s.endTime).length;

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsByLevel,
      activeSessions,
      averageRequestDuration,
      errorRate,
    };
  }

  private addEvent(event: DebugEvent): void {
    this.events.push(event);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emit event for external listeners
    this.emitEvent('debug_event', event);

    // Add to active session if exists
    if (this.activeSession) {
      const session = this.sessions.get(this.activeSession);
      if (session && !session.endTime) {
        session.events.push(event);
      }
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'https://example.com');
      // Remove sensitive parameters
      urlObj.searchParams.delete('api_key');
      urlObj.searchParams.delete('token');
      urlObj.searchParams.delete('password');
      return urlObj.pathname + (urlObj.search || '');
    } catch {
      return url;
    }
  }

  private sanitizeHeaders(headers: Record<string, any> = {}): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return this.sanitizeObject(parsed);
      } catch {
        return '[BINARY_DATA]';
      }
    }
    
    return this.sanitizeObject(body);
  }

  private sanitizeResponseBody(body: any): any {
    if (!body) return body;
    
    // Limit response body size for logging
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > 10000) {
      return '[LARGE_RESPONSE_TRUNCATED]';
    }
    
    return this.sanitizeObject(body);
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    const sanitized: any = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'credential'];
    
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeObject(value);
      }
    }
    
    return sanitized;
  }

  private setupGlobalErrorHandler(): void {
    // Browser error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.addEvent({
          id: `global_error_${Date.now()}`,
          timestamp: Date.now(),
          type: 'error',
          level: 'error',
          message: `Global error: ${event.message}`,
          data: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error?.message,
          },
          stackTrace: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.addEvent({
          id: `unhandled_rejection_${Date.now()}`,
          timestamp: Date.now(),
          type: 'error',
          level: 'error',
          message: `Unhandled promise rejection: ${event.reason}`,
          data: {
            reason: event.reason,
          },
        });
      });
    }
  }

  private async loadPersistedEvents(): Promise<void> {
    try {
      const persistedEvents = this.getFromStorage<DebugEvent[]>('events');
      const persistedSessions = this.getFromStorage<DebugSession[]>('sessions');
      
      if (persistedEvents) {
        this.events = persistedEvents.slice(-this.maxEvents);
      }
      
      if (persistedSessions) {
        for (const session of persistedSessions) {
          this.sessions.set(session.id, session);
        }
      }
      
      this.log('debug', 'Loaded persisted debug data', {
        events: this.events.length,
        sessions: this.sessions.size,
      });
    } catch (error) {
      this.log('warn', 'Failed to load persisted debug data', { error });
    }
  }

  private async persistEvents(): Promise<void> {
    try {
      this.setInStorage('events', this.events);
      this.setInStorage('sessions', Array.from(this.sessions.values()));
      
      this.log('debug', 'Persisted debug data', {
        events: this.events.length,
        sessions: this.sessions.size,
      });
    } catch (error) {
      this.log('warn', 'Failed to persist debug data', { error });
    }
  }
}