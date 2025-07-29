/**
 * Performance Plugin - Monitor and optimize A-Cube SDK performance
 * Provides comprehensive performance tracking and optimization recommendations
 */

import { BasePlugin } from '../core/base-plugin';
import type { PluginContext, PluginManifest } from '../core/plugin-manager';
import type { RequestOptions, HttpResponse } from '@/http/client';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'request' | 'memory' | 'bundle' | 'render' | 'custom';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  category: 'network' | 'computation' | 'memory' | 'storage' | 'ui';
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'critical';
  metric: string;
  threshold: number;
  actualValue: number;
  message: string;
  recommendation?: string;
}

export interface PerformanceBudget {
  metric: string;
  warning: number;
  critical: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  category: 'network' | 'computation' | 'memory' | 'storage' | 'ui';
}

export interface PerformanceReport {
  period: { start: number; end: number };
  metrics: {
    requests: {
      total: number;
      average: number;
      p50: number;
      p95: number;
      p99: number;
      slowest: PerformanceMetric[];
    };
    memory: {
      peak: number;
      average: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    budgets: {
      passed: number;
      warnings: number;
      critical: number;
    };
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
}

export class PerformancePlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'performance',
    version: '1.0.0',
    description: 'Monitor and optimize A-Cube SDK performance',
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

  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private budgets: PerformanceBudget[] = [];
  private requestStartTimes = new Map<string, number>();
  private memoryMonitor?: NodeJS.Timeout;
  private isEnabled: boolean = true;
  private maxMetrics: number = 5000;

  protected async initialize(_context: PluginContext): Promise<void> {
    // Load configuration
    const config = this.getConfig<{
      enabled: boolean;
      maxMetrics: number;
      budgets: PerformanceBudget[];
      memoryMonitoring: boolean;
      alertThresholds: {
        slowRequest: number;
        highMemory: number;
        errorRate: number;
      };
    }>('settings') || {
      enabled: true,
      maxMetrics: 5000,
      budgets: this.getDefaultBudgets(),
      memoryMonitoring: true,
      alertThresholds: {
        slowRequest: 5000, // 5 seconds
        highMemory: 100 * 1024 * 1024, // 100MB
        errorRate: 0.05, // 5%
      },
    };

    this.isEnabled = config.enabled;
    this.maxMetrics = config.maxMetrics;
    this.budgets = config.budgets;

    if (!this.isEnabled) {
      this.log('info', 'Performance plugin disabled by configuration');
      return;
    }

    // Start memory monitoring if enabled
    if (config.memoryMonitoring) {
      this.startMemoryMonitoring();
    }

    // Load persisted metrics
    await this.loadPersistedMetrics();

    // Track plugin initialization performance
    if (this.context?.sdk) {
      const sdk = this.context.sdk;
      this.recordMetric({
        id: `plugin_init_${Date.now()}`,
        timestamp: Date.now(),
        type: 'custom',
        name: 'performance_plugin_initialization',
        value: 0, // Plugin initialization complete
        unit: 'ms',
        category: 'computation',
        metadata: { 
          environment: sdk.getConfig()?.environment || 'unknown',
          version: '2.0.0' 
        },
      });
    }

    this.log('info', 'Performance plugin initialized', { 
      budgets: this.budgets.length,
      memoryMonitoring: config.memoryMonitoring 
    });
  }

  protected async cleanup(_context: PluginContext): Promise<void> {
    // Stop memory monitoring
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }

    // Persist metrics
    await this.persistMetrics();

    // Generate final report
    const report = this.generateReport(3600000); // Last hour
    this.emitEvent('performance_report', report);

    this.log('info', 'Performance plugin cleaned up');
  }

  protected override async processRequest(_context: PluginContext, options: RequestOptions): Promise<RequestOptions> {
    if (!this.isEnabled) return options;

    // Record request start time
    const requestId = `${options.method}_${options.url}_${Date.now()}`;
    this.requestStartTimes.set(requestId, performance.now());

    // Add performance tracking headers
    options.headers = {
      ...options.headers,
      'X-Performance-Tracking': 'enabled',
      'X-Request-Start': Date.now().toString(),
    };

    // Track request size if body exists
    if (options.data) {
      const bodySize = this.calculateSize(options.data);
      this.recordMetric({
        id: `request_size_${Date.now()}`,
        timestamp: Date.now(),
        type: 'request',
        name: 'request_size',
        value: bodySize,
        unit: 'bytes',
        category: 'network',
        metadata: {
          method: options.method,
          url: this.sanitizeUrl(options.url),
        },
      });
    }

    return options;
  }

  protected override async processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> {
    if (!this.isEnabled) return response;

    const requestId = Object.keys(Object.fromEntries(this.requestStartTimes))
      .find(key => key.includes(response.config?.url || ''));

    if (requestId) {
      const startTime = this.requestStartTimes.get(requestId);
      if (startTime) {
        const duration = performance.now() - startTime;
        this.requestStartTimes.delete(requestId);

        // Record request duration
        this.recordMetric({
          id: `request_duration_${Date.now()}`,
          timestamp: Date.now(),
          type: 'request',
          name: 'request_duration',
          value: duration,
          unit: 'ms',
          category: 'network',
          metadata: {
            method: response.config?.method,
            url: this.sanitizeUrl(response.config?.url || ''),
            status: response.status,
            fromCache: response.fromCache,
          },
          tags: [
            response.status >= 400 ? 'error' : 'success',
            response.fromCache ? 'cached' : 'fresh',
          ],
        });

        // Check against budgets
        this.checkBudgets('request_duration', duration, 'ms');

        // Record response size
        const responseSize = this.calculateSize(response.data);
        this.recordMetric({
          id: `response_size_${Date.now()}`,
          timestamp: Date.now(),
          type: 'request',
          name: 'response_size',
          value: responseSize,
          unit: 'bytes',
          category: 'network',
          metadata: {
            method: response.config?.method,
            url: this.sanitizeUrl(response.config?.url || ''),
            status: response.status,
          },
        });
      }
    }

    return response;
  }

  protected override async handleError(_context: PluginContext, error: Error): Promise<Error> {
    if (!this.isEnabled) return error;

    // Record error metric
    this.recordMetric({
      id: `error_${Date.now()}`,
      timestamp: Date.now(),
      type: 'custom',
      name: 'request_error',
      value: 1,
      unit: 'count',
      category: 'network',
      metadata: {
        error: error.name,
        message: error.message,
        status: (error as any).status,
      },
      tags: ['error'],
    });

    return error;
  }

  /**
   * Record a custom performance metric
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'> & Partial<Pick<PerformanceMetric, 'id' | 'timestamp'>>): void {
    const fullMetric: PerformanceMetric = {
      id: metric.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: metric.timestamp || Date.now(),
      ...metric,
    };

    this.metrics.push(fullMetric);

    // Maintain max metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check budgets
    this.checkBudgets(fullMetric.name, fullMetric.value, fullMetric.unit);

    // Emit metric event
    this.emitEvent('performance_metric', fullMetric);

    this.log('debug', `Recorded metric: ${fullMetric.name}`, fullMetric);
  }

  /**
   * Set performance budgets
   */
  public setBudgets(budgets: PerformanceBudget[]): void {
    this.budgets = budgets;
    this.setConfig('budgets', budgets);
    this.log('info', 'Performance budgets updated', { count: budgets.length });
  }

  /**
   * Get performance metrics with optional filtering
   */
  public getMetrics(filter?: {
    type?: PerformanceMetric['type'][];
    category?: PerformanceMetric['category'][];
    timeRange?: { start: number; end: number };
    name?: string;
    tags?: string[];
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics];

    if (filter) {
      if (filter.type) {
        filteredMetrics = filteredMetrics.filter(m => filter.type!.includes(m.type));
      }
      
      if (filter.category) {
        filteredMetrics = filteredMetrics.filter(m => filter.category!.includes(m.category));
      }
      
      if (filter.timeRange) {
        filteredMetrics = filteredMetrics.filter(m => 
          m.timestamp >= filter.timeRange!.start && 
          m.timestamp <= filter.timeRange!.end
        );
      }
      
      if (filter.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name.includes(filter.name!));
      }
      
      if (filter.tags) {
        filteredMetrics = filteredMetrics.filter(m => 
          filter.tags!.some(tag => m.tags?.includes(tag))
        );
      }
    }

    return filteredMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance alerts
   */
  public getAlerts(level?: PerformanceAlert['level']): PerformanceAlert[] {
    let alerts = [...this.alerts];
    
    if (level) {
      alerts = alerts.filter(a => a.level === level);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate performance report
   */
  public generateReport(timeRangeMs: number = 3600000): PerformanceReport {
    const now = Date.now();
    const start = now - timeRangeMs;
    
    const periodMetrics = this.getMetrics({
      timeRange: { start, end: now }
    });

    // Request metrics
    const requestMetrics = periodMetrics.filter(m => m.name === 'request_duration');
    const requestDurations = requestMetrics.map(m => m.value).sort((a, b) => a - b);
    
    const requests = {
      total: requestMetrics.length,
      average: requestDurations.length > 0 ? requestDurations.reduce((a, b) => a + b, 0) / requestDurations.length : 0,
      p50: this.percentile(requestDurations, 50),
      p95: this.percentile(requestDurations, 95),
      p99: this.percentile(requestDurations, 99),
      slowest: requestMetrics
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    };

    // Memory metrics
    const memoryMetrics = periodMetrics.filter(m => m.name === 'memory_usage');
    const memoryValues = memoryMetrics.map(m => m.value);
    
    const memory = {
      peak: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
      average: memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0,
      trend: this.calculateTrend(memoryValues) as 'increasing' | 'decreasing' | 'stable',
    };

    // Budget compliance
    const recentAlerts = this.alerts.filter(a => a.timestamp >= start);
    const budgets = {
      passed: this.budgets.length - recentAlerts.filter(a => a.level === 'warning' || a.level === 'critical').length,
      warnings: recentAlerts.filter(a => a.level === 'warning').length,
      critical: recentAlerts.filter(a => a.level === 'critical').length,
    };

    // Recommendations
    const recommendations = this.generateRecommendations(periodMetrics, recentAlerts);

    return {
      period: { start, end: now },
      metrics: { requests, memory, budgets },
      alerts: recentAlerts,
      recommendations,
    };
  }

  /**
   * Clear performance data
   */
  public clearData(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
      this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    } else {
      this.metrics = [];
      this.alerts = [];
    }

    this.log('info', 'Performance data cleared', { olderThan });
  }

  /**
   * Get current performance summary
   */
  public getPerformanceSummary(): {
    totalMetrics: number;
    activeAlerts: number;
    averageRequestTime: number;
    errorRate: number;
    memoryUsage: number;
  } {
    const recentMetrics = this.getMetrics({
      timeRange: { start: Date.now() - 300000, end: Date.now() } // Last 5 minutes
    });

    const requestMetrics = recentMetrics.filter(m => m.name === 'request_duration');
    const errorMetrics = recentMetrics.filter(m => m.tags?.includes('error'));
    const memoryMetrics = recentMetrics.filter(m => m.name === 'memory_usage');

    const averageRequestTime = requestMetrics.length > 0
      ? requestMetrics.reduce((sum, m) => sum + m.value, 0) / requestMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0 ? errorMetrics.length / recentMetrics.length : 0;

    const memoryUsage = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1]?.value || 0
      : 0;

    return {
      totalMetrics: this.metrics.length,
      activeAlerts: this.alerts.filter(a => a.timestamp > Date.now() - 3600000).length,
      averageRequestTime,
      errorRate,
      memoryUsage,
    };
  }

  private checkBudgets(metricName: string, value: number, unit: string): void {
    const budget = this.budgets.find(b => b.metric === metricName && b.unit === unit);
    if (!budget) return;

    let alertLevel: PerformanceAlert['level'] | null = null;
    let threshold = 0;

    if (value >= budget.critical) {
      alertLevel = 'critical';
      threshold = budget.critical;
    } else if (value >= budget.warning) {
      alertLevel = 'warning';
      threshold = budget.warning;
    }

    if (alertLevel) {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        timestamp: Date.now(),
        level: alertLevel,
        metric: metricName,
        threshold,
        actualValue: value,
        message: `${metricName} exceeded ${alertLevel} threshold: ${value}${unit} > ${threshold}${unit}`,
        recommendation: this.getBudgetRecommendation(metricName, budget.category),
      };

      this.alerts.push(alert);
      this.emitEvent('performance_alert', alert);
      
      this.log(alertLevel === 'critical' ? 'error' : 'warn', alert.message, alert);
    }
  }

  private startMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      this.memoryMonitor = setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.recordMetric({
            type: 'memory',
            name: 'memory_usage',
            value: memory.usedJSHeapSize,
            unit: 'bytes',
            category: 'memory',
            metadata: {
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
            },
          });
        }
      }, 5000) as unknown as NodeJS.Timeout; // Every 5 seconds
    }
  }

  private getDefaultBudgets(): PerformanceBudget[] {
    return [
      { metric: 'request_duration', warning: 1000, critical: 3000, unit: 'ms', category: 'network' },
      { metric: 'response_size', warning: 1024 * 1024, critical: 5 * 1024 * 1024, unit: 'bytes', category: 'network' },
      { metric: 'memory_usage', warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024, unit: 'bytes', category: 'memory' },
    ];
  }

  private calculateSize(data: any): number {
    if (!data) return 0;
    
    if (typeof data === 'string') {
      return new Blob([data]).size;
    }
    
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'https://example.com');
      urlObj.searchParams.delete('api_key');
      urlObj.searchParams.delete('token');
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil(values.length * p / 100) - 1;
    return values[Math.max(0, index)] || 0;
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';
    
    const first = values.slice(0, Math.ceil(values.length / 3));
    const last = values.slice(-Math.ceil(values.length / 3));
    
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
    
    const change = (lastAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private generateRecommendations(metrics: PerformanceMetric[], alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];
    
    // Request performance recommendations
    const slowRequests = metrics.filter(m => m.name === 'request_duration' && m.value > 2000);
    if (slowRequests.length > 0) {
      recommendations.push('Consider implementing request caching for slow endpoints');
      recommendations.push('Review API payload sizes and optimize data transfer');
    }
    
    // Memory recommendations
    const memoryAlerts = alerts.filter(a => a.metric === 'memory_usage');
    if (memoryAlerts.length > 0) {
      recommendations.push('Monitor for memory leaks and optimize object lifecycle');
      recommendations.push('Consider implementing pagination for large datasets');
    }
    
    // Error rate recommendations
    const errorMetrics = metrics.filter(m => m.tags?.includes('error'));
    if (errorMetrics.length > metrics.length * 0.05) {
      recommendations.push('Implement retry logic for failed requests');
      recommendations.push('Review error handling and add circuit breakers');
    }
    
    return recommendations;
  }

  private getBudgetRecommendation(metric: string, category: PerformanceBudget['category']): string {
    const recommendations: Record<string, Record<string, string>> = {
      network: {
        request_duration: 'Consider implementing caching, optimizing API calls, or adding request deduplication',
        response_size: 'Implement response compression, reduce payload size, or use pagination',
      },
      memory: {
        memory_usage: 'Review object lifecycle, implement garbage collection optimization, or reduce memory footprint',
      },
      computation: {
        default: 'Optimize algorithms, reduce computational complexity, or implement background processing',
      },
    };
    
    return recommendations[category]?.[metric] || recommendations[category]?.default || 'Review and optimize this metric';
  }

  private async loadPersistedMetrics(): Promise<void> {
    try {
      const persistedMetrics = this.getFromStorage<PerformanceMetric[]>('metrics');
      const persistedAlerts = this.getFromStorage<PerformanceAlert[]>('alerts');
      
      if (persistedMetrics) {
        this.metrics = persistedMetrics.slice(-this.maxMetrics);
      }
      
      if (persistedAlerts) {
        this.alerts = persistedAlerts;
      }
      
      this.log('debug', 'Loaded persisted performance data', {
        metrics: this.metrics.length,
        alerts: this.alerts.length,
      });
    } catch (error) {
      this.log('warn', 'Failed to load persisted performance data', { error });
    }
  }

  private async persistMetrics(): Promise<void> {
    try {
      this.setInStorage('metrics', this.metrics);
      this.setInStorage('alerts', this.alerts);
      
      this.log('debug', 'Persisted performance data', {
        metrics: this.metrics.length,
        alerts: this.alerts.length,
      });
    } catch (error) {
      this.log('warn', 'Failed to persist performance data', { error });
    }
  }
}