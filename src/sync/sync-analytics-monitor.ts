/**
 * Sync Analytics & Monitoring - Enterprise-grade performance monitoring and analytics
 * Provides comprehensive metrics, alerting, and performance insights for all sync operations
 */

import { EventEmitter } from 'eventemitter3';
import type { ResourceType } from '@/storage/queue/types';
import type { SyncResult, SyncStatistics } from './types';

export type MetricType = 
  | 'counter' 
  | 'gauge' 
  | 'histogram' 
  | 'summary' 
  | 'timer';

export type AlertLevel = 
  | 'info' 
  | 'warning' 
  | 'error' 
  | 'critical';

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  labels?: string[];
  aggregationWindow?: number; // milliseconds
}

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string> | undefined;
}

export interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

export interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export interface SummaryData {
  quantiles: Record<string, number>; // e.g., "0.5": 123, "0.95": 456
  sum: number;
  count: number;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  resolvedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // How long condition must persist
  level: AlertLevel;
  enabled: boolean;
  cooldown: number; // Minimum time between alerts
  lastTriggered?: number;
}

export interface PerformanceBaseline {
  metric: string;
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  stdDev: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface SyncAnalyticsData {
  // Core sync metrics
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  
  // Performance metrics
  throughput: number; // syncs per minute
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  
  // Resource-specific metrics
  resourceMetrics: Record<ResourceType, {
    syncs: number;
    avgDuration: number;
    errorRate: number;
    lastSync: number;
  }>;
  
  // Real-time metrics
  activeSessions: number;
  connectedClients: number;
  operationsPerSecond: number;
  
  // Error analysis
  errorPatterns: Record<string, number>;
  topErrors: Array<{ error: string; count: number; lastOccurrence: number }>;
  
  // System health
  systemLoad: number;
  memoryUsage: number;
  networkLatency: number;
  
  // Conflict metrics
  conflictsDetected: number;
  conflictsResolved: number;
  autoResolutionRate: number;
  
  // Background sync metrics
  backgroundJobs: number;
  queuedJobs: number;
  averageQueueTime: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionPeriod: number; // Days
  aggregationIntervals: number[]; // Minutes
  enableAlerting: boolean;
  enableBaselining: boolean;
  enablePrediction: boolean;
  maxMetricHistory: number;
  performanceThresholds: {
    syncDuration: number; // ms
    errorRate: number; // percentage
    memoryUsage: number; // percentage
    systemLoad: number; // percentage
  };
  exportFormats: ('prometheus' | 'json' | 'csv')[];
}

export interface SyncAnalyticsEvents {
  'metric:recorded': { metric: string; value: MetricValue };
  'alert:triggered': { alert: Alert };
  'alert:resolved': { alert: Alert };
  'baseline:updated': { baseline: PerformanceBaseline };
  'anomaly:detected': { metric: string; value: number; expected: number };
  'export:completed': { format: string; path: string };
  'prediction:generated': { metric: string; prediction: number; confidence: number };
}

/**
 * SyncAnalyticsMonitor - Enterprise monitoring and analytics system
 * Provides comprehensive performance monitoring, alerting, and analytics
 */
export class SyncAnalyticsMonitor extends EventEmitter<SyncAnalyticsEvents> {
  private config: AnalyticsConfig;
  private isInitialized = false;

  // Metrics storage
  private metrics = new Map<string, MetricDefinition>();
  private metricData = new Map<string, MetricValue[]>();
  private histograms = new Map<string, HistogramData>();
  // private summaries = new Map<string, SummaryData>(); // Reserved for future use

  // Alerting system
  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];

  // Performance baselines
  private baselines = new Map<string, PerformanceBaseline>();

  // Analytics data
  private analyticsData: SyncAnalyticsData = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageDuration: 0,
    throughput: 0,
    latency: { p50: 0, p95: 0, p99: 0 },
    resourceMetrics: {
      'receipts': { syncs: 0, avgDuration: 0, errorRate: 0, lastSync: 0 },
      'cashiers': { syncs: 0, avgDuration: 0, errorRate: 0, lastSync: 0 },
      'merchants': { syncs: 0, avgDuration: 0, errorRate: 0, lastSync: 0 },
      'cash-registers': { syncs: 0, avgDuration: 0, errorRate: 0, lastSync: 0 },
      'point-of-sales': { syncs: 0, avgDuration: 0, errorRate: 0, lastSync: 0 },
      'pems': { syncs: 0, avgDuration: 0, errorRate: 0, lastSync: 0 },
    },
    activeSessions: 0,
    connectedClients: 0,
    operationsPerSecond: 0,
    errorPatterns: {},
    topErrors: [],
    systemLoad: 0,
    memoryUsage: 0,
    networkLatency: 0,
    conflictsDetected: 0,
    conflictsResolved: 0,
    autoResolutionRate: 0,
    backgroundJobs: 0,
    queuedJobs: 0,
    averageQueueTime: 0,
  };

  // Monitoring intervals
  private metricsCollectionInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private baselineUpdateInterval?: NodeJS.Timeout;
  private dataRetentionInterval?: NodeJS.Timeout;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      retentionPeriod: 30, // 30 days
      aggregationIntervals: [1, 5, 15, 60], // 1min, 5min, 15min, 1hour
      enableAlerting: true,
      enableBaselining: true,
      enablePrediction: false,
      maxMetricHistory: 10000,
      performanceThresholds: {
        syncDuration: 30000, // 30 seconds
        errorRate: 5, // 5%
        memoryUsage: 80, // 80%
        systemLoad: 90, // 90%
      },
      exportFormats: ['json'],
      ...config,
    };

    this.registerDefaultMetrics();
    this.setupDefaultAlertRules();
  }

  /**
   * Initialize the analytics monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Start monitoring intervals
      this.startMetricsCollection();
      
      if (this.config.enableAlerting) {
        this.startAlertChecking();
      }
      
      if (this.config.enableBaselining) {
        this.startBaselineUpdates();
      }
      
      this.startDataRetention();

      this.isInitialized = true;
      console.log('Sync Analytics Monitor initialized');
    } catch (error) {
      console.error('Failed to initialize analytics monitor:', error);
      throw error;
    }
  }

  /**
   * Destroy the analytics monitor and cleanup resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Stop all intervals
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    if (this.baselineUpdateInterval) {
      clearInterval(this.baselineUpdateInterval);
    }
    if (this.dataRetentionInterval) {
      clearInterval(this.dataRetentionInterval);
    }

    this.isInitialized = false;
    console.log('Sync Analytics Monitor destroyed');
  }

  /**
   * Record a sync completion event
   */
  recordSyncEvent(result: SyncResult, resourceType?: ResourceType): void {
    if (!this.isInitialized) return;

    // Update core sync metrics
    this.recordCounter('sync_total', 1, { 
      status: result.status,
      operation: result.operation 
    });

    this.recordTimer('sync_duration', result.duration, {
      status: result.status,
      operation: result.operation
    });

    // Update analytics data
    this.analyticsData.totalSyncs++;
    if (result.status === 'success') {
      this.analyticsData.successfulSyncs++;
    } else {
      this.analyticsData.failedSyncs++;
    }

    // Update average duration
    const totalDuration = this.analyticsData.averageDuration * (this.analyticsData.totalSyncs - 1) + result.duration;
    this.analyticsData.averageDuration = totalDuration / this.analyticsData.totalSyncs;

    // Update resource-specific metrics
    if (resourceType && this.analyticsData.resourceMetrics[resourceType]) {
      const resourceMetric = this.analyticsData.resourceMetrics[resourceType];
      resourceMetric.syncs++;
      
      const avgDuration = (resourceMetric.avgDuration * (resourceMetric.syncs - 1) + result.duration) / resourceMetric.syncs;
      resourceMetric.avgDuration = avgDuration;
      resourceMetric.lastSync = Date.now();
      
      if (result.status !== 'success') {
        resourceMetric.errorRate = ((resourceMetric.errorRate * (resourceMetric.syncs - 1)) + 1) / resourceMetric.syncs;
      }
    }

    // Record errors if present
    if (result.errors && result.errors.length > 0) {
      for (const error of result.errors) {
        this.recordError(error.error.message, resourceType);
      }
    }

    // Record statistics
    if (result.statistics) {
      this.recordSyncStatistics(result.statistics);
    }
  }

  /**
   * Record real-time session metrics
   */
  recordRealtimeMetrics(activeSessions: number, connectedClients: number, operationsPerSecond: number): void {
    if (!this.isInitialized) return;

    this.recordGauge('realtime_sessions_active', activeSessions);
    this.recordGauge('realtime_clients_connected', connectedClients);
    this.recordGauge('realtime_operations_per_second', operationsPerSecond);

    this.analyticsData.activeSessions = activeSessions;
    this.analyticsData.connectedClients = connectedClients;
    this.analyticsData.operationsPerSecond = operationsPerSecond;
  }

  /**
   * Record conflict resolution metrics
   */
  recordConflictMetrics(detected: number, resolved: number, autoResolved: number): void {
    if (!this.isInitialized) return;

    this.recordCounter('conflicts_detected', detected);
    this.recordCounter('conflicts_resolved', resolved);
    this.recordCounter('conflicts_auto_resolved', autoResolved);

    this.analyticsData.conflictsDetected += detected;
    this.analyticsData.conflictsResolved += resolved;
    
    if (this.analyticsData.conflictsDetected > 0) {
      this.analyticsData.autoResolutionRate = (autoResolved / this.analyticsData.conflictsDetected) * 100;
    }
  }

  /**
   * Record system performance metrics
   */
  recordSystemMetrics(systemLoad: number, memoryUsage: number, networkLatency: number): void {
    if (!this.isInitialized) return;

    this.recordGauge('system_load_percent', systemLoad);
    this.recordGauge('memory_usage_percent', memoryUsage);
    this.recordGauge('network_latency_ms', networkLatency);

    this.analyticsData.systemLoad = systemLoad;
    this.analyticsData.memoryUsage = memoryUsage;
    this.analyticsData.networkLatency = networkLatency;
  }

  /**
   * Get current analytics data
   */
  getAnalytics(): SyncAnalyticsData {
    this.updateThroughputMetrics();
    this.updateLatencyMetrics();
    return { ...this.analyticsData };
  }

  /**
   * Get performance baselines
   */
  getBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100): Alert[] {
    return this.alertHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    this.activeAlerts.set(alertId, alert);
    return true;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const alertRule: AlertRule = { ...rule, id };
    
    this.alertRules.set(id, alertRule);
    return id;
  }

  /**
   * Export metrics in specified format
   */
  async exportMetrics(format: 'json' | 'prometheus' | 'csv' = 'json'): Promise<string> {
    if (!this.config.exportFormats.includes(format)) {
      throw new Error(`Export format ${format} not enabled`);
    }

    let output: string;

    switch (format) {
      case 'json':
        output = this.exportAsJSON();
        break;
      case 'prometheus':
        output = this.exportAsPrometheus();
        break;
      case 'csv':
        output = this.exportAsCSV();
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    this.emit('export:completed', { format, path: 'memory' });
    return output;
  }

  /**
   * Generate performance predictions (if enabled)
   */
  generatePredictions(): Record<string, { prediction: number; confidence: number }> {
    if (!this.config.enablePrediction) {
      return {};
    }

    const predictions: Record<string, { prediction: number; confidence: number }> = {};

    // Simple linear trend prediction for key metrics
    const keyMetrics = ['sync_duration', 'system_load_percent', 'memory_usage_percent'];
    
    for (const metric of keyMetrics) {
      const data = this.metricData.get(metric) || [];
      if (data.length >= 5) {
        const prediction = this.predictMetricTrend(data);
        predictions[metric] = prediction;
        
        this.emit('prediction:generated', {
          metric,
          prediction: prediction.prediction,
          confidence: prediction.confidence
        });
      }
    }

    return predictions;
  }

  // Private methods

  private registerDefaultMetrics(): void {
    const metrics: MetricDefinition[] = [
      {
        name: 'sync_total',
        type: 'counter',
        description: 'Total number of sync operations',
        labels: ['status', 'operation']
      },
      {
        name: 'sync_duration',
        type: 'histogram',
        description: 'Sync operation duration',
        unit: 'milliseconds',
        labels: ['status', 'operation']
      },
      {
        name: 'realtime_sessions_active',
        type: 'gauge',
        description: 'Number of active real-time sessions'
      },
      {
        name: 'realtime_clients_connected',
        type: 'gauge',
        description: 'Number of connected real-time clients'
      },
      {
        name: 'conflicts_detected',
        type: 'counter',
        description: 'Number of conflicts detected'
      },
      {
        name: 'system_load_percent',
        type: 'gauge',
        description: 'System load percentage',
        unit: 'percent'
      },
      {
        name: 'memory_usage_percent',
        type: 'gauge',
        description: 'Memory usage percentage',
        unit: 'percent'
      },
    ];

    for (const metric of metrics) {
      this.metrics.set(metric.name, metric);
    }
  }

  private setupDefaultAlertRules(): void {
    const rules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Error Rate',
        metric: 'sync_error_rate',
        condition: 'gt',
        threshold: this.config.performanceThresholds.errorRate,
        duration: 300000, // 5 minutes
        level: 'warning',
        enabled: true,
        cooldown: 900000, // 15 minutes
      },
      {
        name: 'Slow Sync Performance',
        metric: 'sync_duration_p95',
        condition: 'gt',
        threshold: this.config.performanceThresholds.syncDuration,
        duration: 180000, // 3 minutes
        level: 'warning',
        enabled: true,
        cooldown: 600000, // 10 minutes
      },
      {
        name: 'High System Load',
        metric: 'system_load_percent',
        condition: 'gt',
        threshold: this.config.performanceThresholds.systemLoad,
        duration: 120000, // 2 minutes
        level: 'error',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        name: 'High Memory Usage',
        metric: 'memory_usage_percent',
        condition: 'gt',
        threshold: this.config.performanceThresholds.memoryUsage,
        duration: 300000, // 5 minutes
        level: 'warning',
        enabled: true,
        cooldown: 600000, // 10 minutes
      },
    ];

    for (const rule of rules) {
      this.addAlertRule(rule);
    }
  }

  private recordCounter(name: string, value: number, labels?: Record<string, string>): void {
    const metricValue: MetricValue = {
      value,
      timestamp: Date.now(),
      ...(labels && { labels }),
    };

    const existing = this.metricData.get(name) || [];
    existing.push(metricValue);
    
    // Keep only recent data
    const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    const filtered = existing.filter(v => v.timestamp > cutoff);
    
    this.metricData.set(name, filtered.slice(-this.config.maxMetricHistory));
    this.emit('metric:recorded', { metric: name, value: metricValue });
  }

  private recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordCounter(name, value, labels);
  }

  private recordTimer(name: string, duration: number, labels?: Record<string, string>): void {
    this.recordCounter(name, duration, labels);
    this.updateHistogram(name, duration);
  }

  private updateHistogram(name: string, value: number): void {
    const histogram = this.histograms.get(name) || {
      buckets: [
        { le: 100, count: 0 },
        { le: 500, count: 0 },
        { le: 1000, count: 0 },
        { le: 5000, count: 0 },
        { le: 10000, count: 0 },
        { le: 30000, count: 0 },
        { le: Infinity, count: 0 },
      ],
      sum: 0,
      count: 0,
    };

    histogram.sum += value;
    histogram.count++;

    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }

    this.histograms.set(name, histogram);
  }

  private recordError(errorMessage: string, resourceType?: ResourceType): void {
    const errorKey = this.categorizeError(errorMessage);
    this.analyticsData.errorPatterns[errorKey] = (this.analyticsData.errorPatterns[errorKey] || 0) + 1;

    // Update top errors
    const existingError = this.analyticsData.topErrors.find(e => e.error === errorKey);
    if (existingError) {
      existingError.count++;
      existingError.lastOccurrence = Date.now();
    } else {
      this.analyticsData.topErrors.push({
        error: errorKey,
        count: 1,
        lastOccurrence: Date.now(),
      });
    }

    // Keep only top 10 errors
    this.analyticsData.topErrors.sort((a, b) => b.count - a.count);
    this.analyticsData.topErrors = this.analyticsData.topErrors.slice(0, 10);

    // Record error metrics
    this.recordCounter('error_total', 1, {
      type: errorKey,
      resource: resourceType || 'unknown',
    });
  }

  private categorizeError(errorMessage: string): string {
    const errorPatterns: Record<string, RegExp> = {
      'network': /network|connection|timeout|fetch/i,
      'authentication': /auth|token|permission|unauthorized/i,
      'validation': /validation|invalid|required|format/i,
      'conflict': /conflict|version|etag/i,
      'storage': /storage|disk|quota|space/i,
      'rate_limit': /rate.?limit|too.?many/i,
    };

    for (const [category, pattern] of Object.entries(errorPatterns)) {
      if (pattern.test(errorMessage)) {
        return category;
      }
    }

    return 'unknown';
  }

  private recordSyncStatistics(stats: SyncStatistics): void {
    this.recordGauge('sync_operations_total', stats.totalOperations);
    this.recordGauge('sync_operations_completed', stats.completedOperations);
    this.recordGauge('sync_operations_failed', stats.failedOperations);
    this.recordGauge('sync_bytes_transferred', stats.bytesTransferred);
    this.recordGauge('sync_records_synced', stats.recordsSynced);
    this.recordGauge('sync_network_requests', stats.networkRequests);
  }

  private updateThroughputMetrics(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const syncData = this.metricData.get('sync_total') || [];
    const recentSyncs = syncData.filter(m => m.timestamp > oneMinuteAgo);
    
    this.analyticsData.throughput = recentSyncs.length;
  }

  private updateLatencyMetrics(): void {
    const durationData = this.metricData.get('sync_duration') || [];
    if (durationData.length === 0) return;

    const recent = durationData.slice(-100); // Last 100 measurements
    const sorted = recent.map(d => d.value).sort((a, b) => a - b);
    
    this.analyticsData.latency = {
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  private predictMetricTrend(data: MetricValue[]): { prediction: number; confidence: number } {
    if (data.length < 5) {
      return { prediction: 0, confidence: 0 };
    }

    // Simple linear regression
    const recent = data.slice(-20); // Use last 20 points
    const n = recent.length;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = recent[i]!.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict next value
    const prediction = slope * n + intercept;
    
    // Calculate confidence based on R²
    const meanY = sumY / n;
    let ssRes = 0, ssTot = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      const actual = recent[i]!.value;
      ssRes += Math.pow(actual - predicted, 2);
      ssTot += Math.pow(actual - meanY, 2);
    }
    
    const r2 = 1 - (ssRes / ssTot);
    const confidence = Math.max(0, Math.min(1, r2)) * 100;
    
    return { prediction, confidence };
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.updateThroughputMetrics();
      this.updateLatencyMetrics();
    }, 30000) as unknown as NodeJS.Timeout; // Every 30 seconds
  }

  private startAlertChecking(): void {
    this.alertCheckInterval = setInterval(() => {
      this.checkAlertRules();
    }, 60000) as unknown as NodeJS.Timeout; // Every minute
  }

  private startBaselineUpdates(): void {
    this.baselineUpdateInterval = setInterval(() => {
      this.updateBaselines();
    }, 900000) as unknown as NodeJS.Timeout; // Every 15 minutes
  }

  private startDataRetention(): void {
    this.dataRetentionInterval = setInterval(() => {
      this.cleanupOldData();
    }, 3600000) as unknown as NodeJS.Timeout; // Every hour
  }

  private checkAlertRules(): void {
    const now = Date.now();
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) {
        continue;
      }
      
      const currentValue = this.getCurrentMetricValue(rule.metric);
      if (currentValue === null) continue;
      
      const shouldTrigger = this.evaluateCondition(currentValue, rule.condition, rule.threshold);
      
      if (shouldTrigger) {
        this.triggerAlert(rule, currentValue);
      }
    }
  }

  private getCurrentMetricValue(metricName: string): number | null {
    const data = this.metricData.get(metricName);
    if (!data || data.length === 0) return null;
    
    // Return the most recent value
    return data[data.length - 1]!.value;
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      level: rule.level,
      title: rule.name,
      description: `${rule.metric} is ${value}, exceeding threshold of ${rule.threshold}`,
      timestamp: Date.now(),
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    
    // Update rule
    rule.lastTriggered = Date.now();
    this.alertRules.set(rule.id, rule);
    
    this.emit('alert:triggered', { alert });
  }

  private updateBaselines(): void {
    for (const [metricName, data] of this.metricData.entries()) {
      if (data.length < 20) continue; // Need enough data
      
      const recent = data.slice(-100); // Last 100 measurements
      const values = recent.map(d => d.value).sort((a, b) => a - b);
      
      const baseline: PerformanceBaseline = {
        metric: metricName,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        stdDev: this.calculateStdDev(values),
        sampleCount: values.length,
        lastUpdated: Date.now(),
      };
      
      this.baselines.set(metricName, baseline);
      this.emit('baseline:updated', { baseline });
    }
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    
    for (const [metricName, data] of this.metricData.entries()) {
      const filtered = data.filter(d => d.timestamp > cutoff);
      this.metricData.set(metricName, filtered);
    }
    
    // Clean up alert history
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
  }

  private exportAsJSON(): string {
    return JSON.stringify({
      analytics: this.analyticsData,
      metrics: Object.fromEntries(this.metricData),
      baselines: Object.fromEntries(this.baselines),
      alerts: this.alertHistory.slice(-50),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  private exportAsPrometheus(): string {
    let output = '';
    
    for (const [metricName, data] of this.metricData.entries()) {
      const metric = this.metrics.get(metricName);
      if (!metric) continue;
      
      output += `# HELP ${metricName} ${metric.description}\n`;
      output += `# TYPE ${metricName} ${metric.type}\n`;
      
      if (data.length > 0) {
        const latest = data[data.length - 1]!;
        const labelString = latest.labels ? 
          Object.entries(latest.labels).map(([k, v]) => `${k}="${v}"`).join(',') : '';
        
        output += `${metricName}{${labelString}} ${latest.value} ${latest.timestamp}\n`;
      }
      
      output += '\n';
    }
    
    return output;
  }

  private exportAsCSV(): string {
    const headers = ['timestamp', 'metric', 'value', 'labels'];
    let output = headers.join(',') + '\n';
    
    for (const [metricName, data] of this.metricData.entries()) {
      for (const point of data.slice(-1000)) { // Last 1000 points
        const labels = point.labels ? JSON.stringify(point.labels).replace(/"/g, '""') : '';
        output += `${point.timestamp},${metricName},${point.value},"${labels}"\n`;
      }
    }
    
    return output;
  }
}

/**
 * Create sync analytics monitor with default configuration
 */
export function createSyncAnalyticsMonitor(
  config: Partial<AnalyticsConfig> = {}
): SyncAnalyticsMonitor {
  return new SyncAnalyticsMonitor(config);
}