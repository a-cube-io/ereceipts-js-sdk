/**
 * Queue Analytics System
 * Enterprise-grade monitoring and insights for queue performance
 */

import type {
  // QueueItem,
  QueueStats,
  ResourceType,
  QueuePriority,
  QueueOperationType,
  // QueueItemStatus
} from './types';

export interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number;
  retentionDays: number;
  aggregationIntervals: number[];
  enableRealTimeMetrics: boolean;
  enableTrendAnalysis: boolean;
}

export interface PerformanceMetrics {
  timestamp: number;
  processingTime: number;
  queueSize: number;
  throughput: number;
  errorRate: number;
  priorityDistribution: Record<QueuePriority, number>;
  resourceDistribution: Record<ResourceType, number>;
  operationDistribution: Record<QueueOperationType, number>;
}

export interface TrendAnalysis {
  timeRange: string;
  avgProcessingTime: number;
  avgQueueSize: number;
  avgThroughput: number;
  peakQueueSize: number;
  errorRateChange: number;
  performanceScore: number;
  recommendations: string[];
}

export interface QueueInsights {
  bottlenecks: BottleneckAnalysis[];
  patterns: UsagePattern[];
  anomalies: Anomaly[];
  forecasts: PerformanceForecast[];
  healthScore: number;
}

export interface BottleneckAnalysis {
  type: 'resource' | 'priority' | 'operation' | 'time';
  identifier: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  suggestion: string;
}

export interface UsagePattern {
  pattern: 'peak_hours' | 'batch_processing' | 'retry_storm' | 'resource_hotspot';
  description: string;
  frequency: number;
  timeWindows: string[];
  impact: number;
}

export interface Anomaly {
  type: 'throughput' | 'latency' | 'error_rate' | 'queue_size';
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  deviation: number;
  expectedValue: number;
  actualValue: number;
}

export interface PerformanceForecast {
  metric: 'queue_size' | 'processing_time' | 'throughput' | 'error_rate';
  timeHorizon: number;
  predictedValue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class QueueAnalytics {
  private config: AnalyticsConfig;

  private metricsHistory: PerformanceMetrics[] = [];

  private realtimeMetrics: PerformanceMetrics | null = null;

  private aggregatedMetrics: Map<number, PerformanceMetrics[]> = new Map();

  private itemTimings: Map<string, number> = new Map();

  private processingStartTimes: Map<string, number> = new Map();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      retentionDays: 30,
      aggregationIntervals: [60000, 300000, 3600000], // 1min, 5min, 1hour
      enableRealTimeMetrics: true,
      enableTrendAnalysis: true,
      ...config,
    };

    if (this.config.enabled) {
      this.initializeAggregationMaps();
      this.startRealtimeMetrics();
    }
  }

  /**
   * Record item processing start
   */
  recordProcessingStart(itemId: string): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {return;}

    this.processingStartTimes.set(itemId, Date.now());
  }

  /**
   * Record item processing completion
   */
  recordProcessingComplete(itemId: string, _success: boolean): void {
    if (!this.config.enabled) {return;}

    const startTime = this.processingStartTimes.get(itemId);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      this.itemTimings.set(itemId, processingTime);
      this.processingStartTimes.delete(itemId);
    }
  }

  /**
   * Record queue snapshot for metrics
   */
  recordQueueSnapshot(stats: QueueStats): void {
    if (!this.config.enabled) {return;}

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      processingTime: this.calculateAverageProcessingTime(),
      queueSize: stats.totalItems,
      throughput: this.calculateThroughput(),
      errorRate: this.calculateErrorRate(stats),
      priorityDistribution: stats.priorityDistribution,
      resourceDistribution: stats.resourceDistribution,
      operationDistribution: this.getOperationDistribution(stats),
    };

    this.addMetricsPoint(metrics);

    if (this.config.enableRealTimeMetrics) {
      this.realtimeMetrics = metrics;
    }
  }

  /**
   * Get comprehensive queue insights
   */
  getInsights(timeRangeMs: number = 86400000): QueueInsights {
    if (!this.config.enabled) {
      return this.getEmptyInsights();
    }

    const cutoffTime = Date.now() - timeRangeMs;
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);

    return {
      bottlenecks: this.analyzeBottlenecks(relevantMetrics),
      patterns: this.identifyPatterns(relevantMetrics),
      anomalies: this.detectAnomalies(relevantMetrics),
      forecasts: this.generateForecasts(relevantMetrics),
      healthScore: this.calculateHealthScore(relevantMetrics),
    };
  }

  /**
   * Get trend analysis for specified time range
   */
  getTrendAnalysis(timeRangeMs: number = 86400000): TrendAnalysis {
    if (!this.config.enabled || !this.config.enableTrendAnalysis) {
      return this.getEmptyTrendAnalysis();
    }

    const cutoffTime = Date.now() - timeRangeMs;
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);

    if (relevantMetrics.length === 0) {
      return this.getEmptyTrendAnalysis();
    }

    const avgProcessingTime = relevantMetrics.reduce((sum, m) => sum + m.processingTime, 0) / relevantMetrics.length;
    const avgQueueSize = relevantMetrics.reduce((sum, m) => sum + m.queueSize, 0) / relevantMetrics.length;
    const avgThroughput = relevantMetrics.reduce((sum, m) => sum + m.throughput, 0) / relevantMetrics.length;
    const peakQueueSize = Math.max(...relevantMetrics.map(m => m.queueSize));

    const errorRateChange = this.calculateErrorRateChange(relevantMetrics);
    const performanceScore = this.calculatePerformanceScore(relevantMetrics);

    return {
      timeRange: this.formatTimeRange(timeRangeMs),
      avgProcessingTime,
      avgQueueSize,
      avgThroughput,
      peakQueueSize,
      errorRateChange,
      performanceScore,
      recommendations: this.generateRecommendations(relevantMetrics),
    };
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): PerformanceMetrics | null {
    return this.realtimeMetrics;
  }

  /**
   * Get aggregated metrics for specific interval
   */
  getAggregatedMetrics(intervalMs: number, timeRangeMs: number = 86400000): PerformanceMetrics[] {
    const aggregated = this.aggregatedMetrics.get(intervalMs);
    if (!aggregated) {return [];}

    const cutoffTime = Date.now() - timeRangeMs;
    return aggregated.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Clear old metrics data
   */
  cleanup(): void {
    if (!this.config.enabled) {return;}

    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    // Clean main metrics history
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);

    // Clean aggregated metrics
    for (const [interval, metrics] of this.aggregatedMetrics) {
      this.aggregatedMetrics.set(interval, metrics.filter(m => m.timestamp >= cutoffTime));
    }

    // Clean old timings
    const oldTimingKeys = Array.from(this.itemTimings.keys()).slice(0, -1000); // Keep last 1000
    oldTimingKeys.forEach(key => this.itemTimings.delete(key));
  }

  /**
   * Export metrics data
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    return JSON.stringify(this.metricsHistory, null, 2);
  }

  // Private methods

  private initializeAggregationMaps(): void {
    for (const interval of this.config.aggregationIntervals) {
      this.aggregatedMetrics.set(interval, []);
    }
  }

  private startRealtimeMetrics(): void {
    if (!this.config.enableRealTimeMetrics) {return;}

    // Update real-time metrics every 30 seconds
    setInterval(() => {
      if (this.realtimeMetrics) {
        // Age the real-time metrics
        const age = Date.now() - this.realtimeMetrics.timestamp;
        if (age > 60000) { // Reset if older than 1 minute
          this.realtimeMetrics = null;
        }
      }
    }, 30000);
  }

  private addMetricsPoint(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);

    // Add to aggregated metrics
    for (const interval of this.config.aggregationIntervals) {
      this.addToAggregatedMetrics(metrics, interval);
    }

    // Keep history size manageable
    if (this.metricsHistory.length > 10000) {
      this.metricsHistory = this.metricsHistory.slice(-5000);
    }
  }

  private addToAggregatedMetrics(metrics: PerformanceMetrics, intervalMs: number): void {
    const aggregated = this.aggregatedMetrics.get(intervalMs);
    if (!aggregated) {return;}

    const bucketTime = Math.floor(metrics.timestamp / intervalMs) * intervalMs;

    // Find or create bucket
    let bucket = aggregated.find(m => m.timestamp === bucketTime);
    if (!bucket) {
      bucket = { ...metrics, timestamp: bucketTime };
      aggregated.push(bucket);
    } else {
      // Aggregate with existing bucket
      this.aggregateMetrics(bucket, metrics);
    }
  }

  private aggregateMetrics(bucket: PerformanceMetrics, newMetrics: PerformanceMetrics): void {
    // Simple averaging approach - could be more sophisticated
    bucket.processingTime = (bucket.processingTime + newMetrics.processingTime) / 2;
    bucket.queueSize = Math.max(bucket.queueSize, newMetrics.queueSize);
    bucket.throughput = (bucket.throughput + newMetrics.throughput) / 2;
    bucket.errorRate = (bucket.errorRate + newMetrics.errorRate) / 2;
  }

  private calculateAverageProcessingTime(): number {
    if (this.itemTimings.size === 0) {return 0;}

    const timings = Array.from(this.itemTimings.values());
    return timings.reduce((sum, time) => sum + time, 0) / timings.length;
  }

  private calculateThroughput(): number {
    // Calculate items processed per minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentTimings = Array.from(this.itemTimings.entries())
      .filter(([_, time]) => time >= oneMinuteAgo);

    return recentTimings.length;
  }

  private calculateErrorRate(stats: QueueStats): number {
    const total = stats.completedItems + stats.failedItems + stats.deadItems;
    if (total === 0) {return 0;}

    return ((stats.failedItems + stats.deadItems) / total) * 100;
  }

  private getOperationDistribution(_stats: QueueStats): Record<QueueOperationType, number> {
    // This would need to be tracked separately in a real implementation
    return {
      create: 0,
      update: 0,
      delete: 0,
      batch: 0,
      custom: 0,
    };
  }

  private analyzeBottlenecks(metrics: PerformanceMetrics[]): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];

    if (metrics.length === 0) {return bottlenecks;}

    // Analyze queue size growth
    const avgQueueSize = metrics.reduce((sum, m) => sum + m.queueSize, 0) / metrics.length;
    if (avgQueueSize > 50) {
      bottlenecks.push({
        type: 'resource',
        identifier: 'queue_size',
        severity: avgQueueSize > 200 ? 'critical' : 'high',
        impact: avgQueueSize,
        suggestion: 'Consider increasing processing capacity or implementing load balancing',
      });
    }

    // Analyze processing time
    const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
    if (avgProcessingTime > 5000) {
      bottlenecks.push({
        type: 'operation',
        identifier: 'processing_time',
        severity: avgProcessingTime > 15000 ? 'critical' : 'high',
        impact: avgProcessingTime,
        suggestion: 'Optimize operation processing or implement batching',
      });
    }

    return bottlenecks;
  }

  private identifyPatterns(metrics: PerformanceMetrics[]): UsagePattern[] {
    const patterns: UsagePattern[] = [];

    // Simple pattern detection - would be more sophisticated in real implementation
    const highThroughputPeriods = metrics.filter(m => m.throughput > 50);
    if (highThroughputPeriods.length > metrics.length * 0.3) {
      patterns.push({
        pattern: 'peak_hours',
        description: 'High throughput periods detected',
        frequency: highThroughputPeriods.length / metrics.length,
        timeWindows: ['9:00-11:00', '14:00-16:00'],
        impact: 0.7,
      });
    }

    return patterns;
  }

  private detectAnomalies(metrics: PerformanceMetrics[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (metrics.length < 10) {return anomalies;}

    // Detect throughput anomalies
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
    const throughputStdDev = this.calculateStandardDeviation(metrics.map(m => m.throughput));

    const recentMetrics = metrics.slice(-5);
    for (const metric of recentMetrics) {
      const deviation = Math.abs(metric.throughput - avgThroughput);
      if (deviation > throughputStdDev * 2) {
        anomalies.push({
          type: 'throughput',
          timestamp: metric.timestamp,
          severity: deviation > throughputStdDev * 3 ? 'high' : 'medium',
          description: 'Abnormal throughput detected',
          deviation: deviation / avgThroughput,
          expectedValue: avgThroughput,
          actualValue: metric.throughput,
        });
      }
    }

    return anomalies;
  }

  private generateForecasts(metrics: PerformanceMetrics[]): PerformanceForecast[] {
    const forecasts: PerformanceForecast[] = [];

    if (metrics.length < 20) {return forecasts;}

    // Simple linear trend forecasting
    const queueSizes = metrics.map(m => m.queueSize);
    const queueTrend = this.calculateTrend(queueSizes);

    forecasts.push({
      metric: 'queue_size',
      timeHorizon: 3600000, // 1 hour
      predictedValue: (queueSizes[queueSizes.length - 1] || 0) + queueTrend,
      confidence: 0.7,
      trend: queueTrend > 1 ? 'increasing' : queueTrend < -1 ? 'decreasing' : 'stable',
    });

    return forecasts;
  }

  private calculateHealthScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) {return 100;}

    let score = 100;

    // Deduct points for high error rate
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    score -= avgErrorRate * 2;

    // Deduct points for high queue size
    const avgQueueSize = metrics.reduce((sum, m) => sum + m.queueSize, 0) / metrics.length;
    if (avgQueueSize > 50) {
      score -= (avgQueueSize - 50) * 0.5;
    }

    // Deduct points for slow processing
    const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
    if (avgProcessingTime > 2000) {
      score -= (avgProcessingTime - 2000) * 0.01;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateErrorRateChange(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) {return 0;}

    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.errorRate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.errorRate, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics[]): number {
    return this.calculateHealthScore(metrics);
  }

  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];

    if (metrics.length === 0) {return recommendations;}

    const avgQueueSize = metrics.reduce((sum, m) => sum + m.queueSize, 0) / metrics.length;
    if (avgQueueSize > 100) {
      recommendations.push('Consider implementing horizontal scaling to handle queue backlog');
    }

    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    if (avgErrorRate > 10) {
      recommendations.push('Investigate and fix root causes of high error rate');
    }

    const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
    if (avgProcessingTime > 5000) {
      recommendations.push('Optimize operation processing or implement operation batching');
    }

    return recommendations;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean)**2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) {return 0;}

    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private formatTimeRange(timeRangeMs: number): string {
    const hours = timeRangeMs / (1000 * 60 * 60);
    if (hours < 24) {
      return `${Math.round(hours)} hours`;
    }
    return `${Math.round(hours / 24)} days`;
  }

  private exportAsCSV(): string {
    const headers = ['timestamp', 'processingTime', 'queueSize', 'throughput', 'errorRate'];
    const rows = this.metricsHistory.map(m => [
      m.timestamp,
      m.processingTime,
      m.queueSize,
      m.throughput,
      m.errorRate,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private getEmptyInsights(): QueueInsights {
    return {
      bottlenecks: [],
      patterns: [],
      anomalies: [],
      forecasts: [],
      healthScore: 100,
    };
  }

  private getEmptyTrendAnalysis(): TrendAnalysis {
    return {
      timeRange: '0 hours',
      avgProcessingTime: 0,
      avgQueueSize: 0,
      avgThroughput: 0,
      peakQueueSize: 0,
      errorRateChange: 0,
      performanceScore: 100,
      recommendations: [],
    };
  }

  // Cleanup
  destroy(): void {
    this.metricsHistory = [];
    this.aggregatedMetrics.clear();
    this.itemTimings.clear();
    this.processingStartTimes.clear();
    this.realtimeMetrics = null;
  }
}
