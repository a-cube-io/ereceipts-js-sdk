/**
 * Analytics Plugin - Track API usage, performance metrics, and user behavior
 * Provides comprehensive analytics for A-Cube SDK usage
 */

import type { HttpResponse, RequestOptions } from '@/http/client';

import { BasePlugin } from '../core/base-plugin';

import type { PluginContext, PluginManifest } from '../core/plugin-manager';

export interface AnalyticsEvent {
  event: string;
  timestamp: number;
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  errorDistribution: Record<string, number>;
  timeRange: { start: number; end: number };
}

export class AnalyticsPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'analytics',
    version: '1.0.0',
    description: 'Track API usage, performance metrics, and user behavior',
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

  private sessionId: string = '';

  private requestMetrics: Map<string, { startTime: number; options: RequestOptions }> = new Map();

  private eventQueue: AnalyticsEvent[] = [];

  private performanceMetrics: PerformanceMetric[] = [];

  private flushInterval?: NodeJS.Timeout;

  protected async initialize(context: PluginContext): Promise<void> {
    // Generate session ID
    this.sessionId = this.generateSessionId();

    // Load configuration
    const config = this.getConfig<{
      enabled: boolean;
      batchSize: number;
      flushInterval: number;
      endpoint?: string;
      trackUserActions: boolean;
      trackPerformance: boolean;
    }>('settings') || {
      enabled: true,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      trackUserActions: true,
      trackPerformance: true,
    };

    if (!config.enabled) {
      this.log('info', 'Analytics disabled by configuration');
      return;
    }

    // Set up periodic flush
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, config.flushInterval) as unknown as NodeJS.Timeout;

    // Track session start
    this.trackEvent('session_start', {
      sdk_version: '2.0.0',
      environment: context.sdk.getConfig().environment,
      timestamp: Date.now(),
    });

    this.log('info', 'Analytics plugin initialized', { sessionId: this.sessionId });
  }

  protected async cleanup(_context: PluginContext): Promise<void> {
    // Flush remaining events
    await this.flushEvents();

    // Clear interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Track session end
    const sessionParts = this.sessionId.split('_');
    const sessionStart = sessionParts[1] ? parseInt(sessionParts[1]) : Date.now();
    this.trackEvent('session_end', {
      duration: Date.now() - sessionStart,
      total_requests: this.performanceMetrics.length,
    });

    // Final flush
    await this.flushEvents();

    this.log('info', 'Analytics plugin cleaned up');
  }

  protected override async processRequest(_context: PluginContext, options: RequestOptions): Promise<RequestOptions> {
    const config = this.getConfig<{ trackPerformance: boolean }>('settings');
    if (!config?.trackPerformance) {return options;}

    // Generate request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Store request start time
    this.requestMetrics.set(requestId, {
      startTime: Date.now(),
      options: { ...options },
    });

    // Add request ID to metadata for correlation
    options.metadata = {
      ...options.metadata,
      analyticsRequestId: requestId,
    };

    // Track API call event
    this.trackEvent('api_call_start', {
      method: options.method,
      url: this.sanitizeUrl(options.url),
      request_id: requestId,
    });

    return options;
  }

  protected override async processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> {
    const config = this.getConfig<{ trackPerformance: boolean }>('settings');
    if (!config?.trackPerformance) {return response;}

    const {requestId} = response;
    const requestData = this.requestMetrics.get(requestId);

    if (requestData) {
      const {duration} = response;
      const success = response.status >= 200 && response.status < 400;

      // Record performance metric
      const metric: PerformanceMetric = {
        operation: `${requestData.options.method} ${this.sanitizeUrl(requestData.options.url)}`,
        duration,
        timestamp: Date.now(),
        success,
        metadata: {
          status: response.status,
          method: requestData.options.method,
        },
      };

      this.performanceMetrics.push(metric);
      this.requestMetrics.delete(requestId);

      // Track API call completion
      this.trackEvent('api_call_complete', {
        method: requestData.options.method,
        url: this.sanitizeUrl(requestData.options.url),
        status: response.status,
        duration,
        success,
        request_id: requestId,
      });

      // Store metrics in cache for quick access
      this.updateCachedStats(metric);
    }

    return response;
  }

  protected override async handleError(_context: PluginContext, error: Error): Promise<Error> {
    // Track error event
    this.trackEvent('api_error', {
      error_type: error.constructor.name,
      error_message: error.message,
      timestamp: Date.now(),
    });

    return error;
  }

  /**
   * Track custom event
   */
  public trackEvent(event: string, properties: Record<string, any> = {}, userId?: string): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: Date.now(),
      properties,
      ...(userId && { userId }),
      sessionId: this.sessionId,
    };

    this.eventQueue.push(analyticsEvent);

    // Auto-flush if queue is full
    const config = this.getConfig<{ batchSize: number }>('settings');
    if (this.eventQueue.length >= (config?.batchSize || 50)) {
      this.flushEvents();
    }

    this.log('debug', `Tracked event: ${event}`, properties);
  }

  /**
   * Get usage statistics
   */
  public getUsageStats(timeRangeMs: number = 3600000): UsageStats {
    const now = Date.now();
    const startTime = now - timeRangeMs;

    const relevantMetrics = this.performanceMetrics.filter(
      m => m.timestamp >= startTime,
    );

    const totalRequests = relevantMetrics.length;
    const successfulRequests = relevantMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const averageResponseTime = totalRequests > 0
      ? relevantMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
      : 0;

    // Count endpoints
    const endpointCounts = relevantMetrics.reduce((acc, m) => {
      const endpoint = m.operation;
      acc[endpoint] = (acc[endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // Error distribution
    const errorDistribution = relevantMetrics
      .filter(m => !m.success)
      .reduce((acc, m) => {
        const errorCode = m.errorCode || 'unknown';
        acc[errorCode] = (acc[errorCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      topEndpoints,
      errorDistribution,
      timeRange: { start: startTime, end: now },
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(limit: number = 100): PerformanceMetric[] {
    return this.performanceMetrics
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all stored data
   */
  public clearData(): void {
    this.eventQueue = [];
    this.performanceMetrics = [];
    this.requestMetrics.clear();

    // Clear storage
    const keys = this.context?.storage.keys() || [];
    keys.forEach(key => {
      if (key.startsWith('analytics_')) {
        this.context?.storage.delete(key);
      }
    });

    this.log('info', 'Analytics data cleared');
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {return;}

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Store events locally
      const storageKey = `analytics_events_${Date.now()}`;
      this.setInStorage(storageKey, events);

      // Emit event for external analytics providers
      this.emitEvent('analytics_batch', { events, sessionId: this.sessionId });

      // Optionally send to external endpoint
      const config = this.getConfig<{ endpoint?: string }>('settings');
      if (config?.endpoint) {
        try {
          await this.makeRequest({
            method: 'POST',
            url: config.endpoint,
            data: { events, sessionId: this.sessionId },
          });
        } catch (error) {
          this.log('warn', 'Failed to send analytics to external endpoint', { error });
          // Re-queue events on failure
          this.eventQueue.unshift(...events);
        }
      }

      this.log('debug', `Flushed ${events.length} analytics events`);
    } catch (error) {
      this.log('error', 'Failed to flush analytics events', { error });
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  private updateCachedStats(metric: PerformanceMetric): void {
    try {
      const cached = this.getFromCache<UsageStats>('usage_stats') || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        topEndpoints: [],
        errorDistribution: {},
        timeRange: { start: Date.now(), end: Date.now() },
      };

      cached.totalRequests++;
      if (metric.success) {
        cached.successfulRequests++;
      } else {
        cached.failedRequests++;
      }

      // Update average response time
      cached.averageResponseTime = (
        (cached.averageResponseTime * (cached.totalRequests - 1) + metric.duration) /
        cached.totalRequests
      );

      cached.timeRange.end = Date.now();

      this.setInCache('usage_stats', cached, 300000); // Cache for 5 minutes
    } catch (error) {
      this.log('warn', 'Failed to update cached stats', { error });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private sanitizeUrl(url: string): string {
    // Remove sensitive parameters from URL for analytics
    try {
      const urlObj = new URL(url, 'https://example.com');
      urlObj.searchParams.delete('api_key');
      urlObj.searchParams.delete('token');
      urlObj.searchParams.delete('authorization');
      return urlObj.pathname + (urlObj.search || '');
    } catch {
      return url;
    }
  }
}
