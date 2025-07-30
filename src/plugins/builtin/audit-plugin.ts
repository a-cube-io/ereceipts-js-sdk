/**
 * Audit Plugin - Comprehensive audit logging and compliance for A-Cube SDK
 * Provides detailed audit trails, compliance reporting, and security monitoring
 */

import type { HttpResponse, RequestOptions } from '@/http/client';

import { BasePlugin } from '../core/base-plugin';

import type { PluginContext, PluginManifest } from '../core/plugin-manager';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'auth' | 'config' | 'error' | 'security' | 'data';
  action: string;
  actor: {
    userId?: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  };
  resource: {
    type: string;
    id?: string;
    path?: string;
  };
  outcome: 'success' | 'failure' | 'warning';
  details: Record<string, any>;
  risk: 'low' | 'medium' | 'high' | 'critical';
  compliance: {
    gdpr: boolean;
    fiscal: boolean;
    internal: boolean;
  };
  retention: number; // Days to retain
}

export interface ComplianceReport {
  period: { start: number; end: number };
  events: {
    total: number;
    byType: Record<string, number>;
    byRisk: Record<string, number>;
    byOutcome: Record<string, number>;
  };
  compliance: {
    gdpr: {
      dataAccess: number;
      dataModification: number;
      dataExport: number;
      dataDelete: number;
    };
    fiscal: {
      receiptCreation: number;
      receiptVoid: number;
      receiptModification: number;
      fiscalReports: number;
    };
    security: {
      authFailures: number;
      suspiciousActivity: number;
      privilegeEscalation: number;
      dataLeaks: number;
    };
  };
  violations: AuditEvent[];
  recommendations: string[];
}

export interface AuditFilter {
  type?: AuditEvent['type'][];
  action?: string[];
  outcome?: AuditEvent['outcome'][];
  risk?: AuditEvent['risk'][];
  timeRange?: { start: number; end: number };
  userId?: string;
  resource?: string;
  compliance?: ('gdpr' | 'fiscal' | 'internal')[];
}

export class AuditPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'audit',
    version: '1.0.0',
    description: 'Comprehensive audit logging and compliance for A-Cube SDK',
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

  private events: AuditEvent[] = [];

  private sessionId: string = '';

  private currentUser?: { id: string; role: string };

  private suspiciousActivity = new Map<string, number>();

  private isEnabled: boolean = true;

  private maxEvents: number = 10000;

  private retentionPeriods = {
    low: 30,      // 30 days
    medium: 90,   // 90 days
    high: 365,    // 1 year
    critical: 2555, // 7 years (Italian fiscal requirement)
  };

  protected async initialize(_context: PluginContext): Promise<void> {
    // Load configuration
    const config = this.getConfig<{
      enabled: boolean;
      maxEvents: number;
      retentionPeriods: Record<string, number>;
      complianceMode: 'strict' | 'standard' | 'minimal';
      realTimeAlerts: boolean;
      dataPrivacy: boolean;
    }>('settings') || {
      enabled: true,
      maxEvents: 10000,
      retentionPeriods: this.retentionPeriods,
      complianceMode: 'standard',
      realTimeAlerts: true,
      dataPrivacy: true,
    };

    this.isEnabled = config.enabled;
    this.maxEvents = config.maxEvents;
    this.retentionPeriods = { ...this.retentionPeriods, ...config.retentionPeriods };

    if (!this.isEnabled) {
      this.log('info', 'Audit plugin disabled by configuration');
      return;
    }

    // Generate session ID
    this.sessionId = this.generateSessionId();

    // Load persisted events
    await this.loadPersistedEvents();

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredEvents();
    }, 3600000); // Every hour

    // Set up real-time monitoring
    if (config.realTimeAlerts) {
      this.setupRealTimeMonitoring();
    }

    // Track plugin initialization
    this.recordAuditEvent({
      type: 'config',
      action: 'audit_plugin_initialized',
      resource: { type: 'plugin', id: 'audit' },
      outcome: 'success',
      details: {
        config: {
          maxEvents: this.maxEvents,
          complianceMode: config.complianceMode,
          realTimeAlerts: config.realTimeAlerts,
        },
      },
      risk: 'low',
      compliance: { gdpr: false, fiscal: false, internal: true },
    });

    this.log('info', 'Audit plugin initialized', {
      sessionId: this.sessionId,
      maxEvents: this.maxEvents,
      complianceMode: config.complianceMode,
    });
  }

  protected async cleanup(_context: PluginContext): Promise<void> {
    // Persist events
    await this.persistEvents();

    // Generate final compliance report
    const report = this.generateComplianceReport(86400000); // Last 24 hours
    this.emitEvent('compliance_report', report);

    // Track plugin shutdown
    this.recordAuditEvent({
      type: 'config',
      action: 'audit_plugin_shutdown',
      resource: { type: 'plugin', id: 'audit' },
      outcome: 'success',
      details: {
        totalEvents: this.events.length,
        sessionDuration: Date.now() - (parseInt(this.sessionId.split('_')[1] || '0') || Date.now()),
      },
      risk: 'low',
      compliance: { gdpr: false, fiscal: false, internal: true },
    });

    this.log('info', 'Audit plugin cleaned up');
  }

  protected override async processRequest(_context: PluginContext, options: RequestOptions): Promise<RequestOptions> {
    if (!this.isEnabled) {return options;}

    // Extract user context
    const authorization = options.headers?.Authorization || options.headers?.authorization;
    const userId = this.extractUserIdFromAuth(authorization);

    // Record request audit event
    this.recordAuditEvent({
      type: 'request',
      action: `${options.method.toLowerCase()}_request`,
      resource: {
        type: 'api_endpoint',
        path: this.sanitizePath(options.url),
      },
      outcome: 'success', // Will be updated in response handler
      details: {
        method: options.method,
        url: this.sanitizeUrl(options.url),
        headers: this.sanitizeHeaders(options.headers),
        bodySize: options.data ? this.calculateSize(options.data) : 0,
        userAgent: options.headers?.['User-Agent'],
      },
      risk: this.assessRequestRisk(options),
      compliance: this.assessRequestCompliance(options),
    }, userId);

    // Add audit correlation ID
    options.headers = {
      ...options.headers,
      'X-Audit-Correlation-ID': this.generateCorrelationId(),
    };

    return options;
  }

  protected override async processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> {
    if (!this.isEnabled) {return response;}

    const correlationId = response.headers?.['x-audit-correlation-id'];
    // Defensive typing for config property that may exist on extended response objects
    const responseConfig = (response as any).config;
    const userId = this.extractUserIdFromAuth(responseConfig?.headers?.Authorization);

    // Record response audit event
    this.recordAuditEvent({
      type: 'response',
      action: `${responseConfig?.method?.toLowerCase() || 'unknown'}_response`,
      resource: {
        type: 'api_endpoint',
        path: this.sanitizePath(responseConfig?.url || ''),
      },
      outcome: response.status >= 200 && response.status < 400 ? 'success' : 'failure',
      details: {
        status: response.status,
        statusText: response.statusText,
        duration: response.duration,
        responseSize: this.calculateSize(response.data),
        fromCache: 'fromCache' in response ? (response as any).fromCache : false,
        correlationId,
      },
      risk: this.assessResponseRisk(response),
      compliance: this.assessResponseCompliance(response),
    }, userId);

    // Check for suspicious activity
    if (response.status >= 400) {
      this.checkSuspiciousActivity(userId, response);
    }

    return response;
  }

  protected override async handleError(_context: PluginContext, error: Error): Promise<Error> {
    if (!this.isEnabled) {return error;}

    // Record error audit event
    this.recordAuditEvent({
      type: 'error',
      action: 'request_error',
      resource: {
        type: 'api_endpoint',
        path: this.sanitizePath((error as any).config?.url || ''),
      },
      outcome: 'failure',
      details: {
        error: error.name,
        message: error.message,
        code: (error as any).code,
        status: (error as any).status,
        stack: error.stack,
      },
      risk: this.assessErrorRisk(error),
      compliance: { gdpr: false, fiscal: false, internal: true },
    });

    return error;
  }

  /**
   * Record custom audit event
   */
  public recordAuditEvent(
    event: Omit<AuditEvent, 'id' | 'timestamp' | 'actor' | 'retention'>,
    userId?: string,
  ): void {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      actor: {
        ...(userId && { userId }),
        sessionId: this.sessionId,
        ...(() => {
          const ipAddress = this.getCurrentIpAddress();
          const userAgent = this.getCurrentUserAgent();
          return {
            ...(ipAddress && { ipAddress }),
            ...(userAgent && { userAgent }),
          };
        })(),
      },
      retention: this.retentionPeriods[event.risk],
      ...event,
    };

    this.events.push(auditEvent);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emit real-time event
    this.emitEvent('audit_event', auditEvent);

    // Check for compliance violations
    this.checkComplianceViolations(auditEvent);

    this.log('debug', `Audit event recorded: ${event.action}`, {
      type: event.type,
      risk: event.risk,
      outcome: event.outcome,
    });
  }

  /**
   * Set current user context
   */
  public setUserContext(userId: string, role: string): void {
    const previousUser = this.currentUser;
    this.currentUser = { id: userId, role };

    this.recordAuditEvent({
      type: 'auth',
      action: 'user_context_changed',
      resource: { type: 'user_session', id: userId },
      outcome: 'success',
      details: {
        previousUser: previousUser?.id,
        newUser: userId,
        role,
      },
      risk: 'medium',
      compliance: { gdpr: true, fiscal: false, internal: true },
    });

    this.log('info', 'User context set', { userId, role });
  }

  /**
   * Get audit events with filtering
   */
  public getAuditEvents(filter?: AuditFilter): AuditEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.type) {
        filteredEvents = filteredEvents.filter(e => filter.type!.includes(e.type));
      }

      if (filter.action) {
        filteredEvents = filteredEvents.filter(e =>
          filter.action!.some(action => e.action.includes(action)),
        );
      }

      if (filter.outcome) {
        filteredEvents = filteredEvents.filter(e => filter.outcome!.includes(e.outcome));
      }

      if (filter.risk) {
        filteredEvents = filteredEvents.filter(e => filter.risk!.includes(e.risk));
      }

      if (filter.timeRange) {
        filteredEvents = filteredEvents.filter(e =>
          e.timestamp >= filter.timeRange!.start &&
          e.timestamp <= filter.timeRange!.end,
        );
      }

      if (filter.userId) {
        filteredEvents = filteredEvents.filter(e => e.actor.userId === filter.userId);
      }

      if (filter.resource) {
        filteredEvents = filteredEvents.filter(e =>
          e.resource.type.includes(filter.resource!) ||
          e.resource.path?.includes(filter.resource!),
        );
      }

      if (filter.compliance) {
        filteredEvents = filteredEvents.filter(e =>
          filter.compliance!.some(comp => e.compliance[comp]),
        );
      }
    }

    return filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate compliance report
   */
  public generateComplianceReport(timeRangeMs: number = 86400000): ComplianceReport {
    const now = Date.now();
    const start = now - timeRangeMs;

    const periodEvents = this.getAuditEvents({
      timeRange: { start, end: now },
    });

    // Event statistics
    const events = {
      total: periodEvents.length,
      byType: this.groupBy(periodEvents, 'type'),
      byRisk: this.groupBy(periodEvents, 'risk'),
      byOutcome: this.groupBy(periodEvents, 'outcome'),
    };

    // GDPR compliance
    const gdprEvents = periodEvents.filter(e => e.compliance.gdpr);
    const gdpr = {
      dataAccess: gdprEvents.filter(e => e.action.includes('read') || e.action.includes('get')).length,
      dataModification: gdprEvents.filter(e => e.action.includes('update') || e.action.includes('patch')).length,
      dataExport: gdprEvents.filter(e => e.action.includes('export')).length,
      dataDelete: gdprEvents.filter(e => e.action.includes('delete')).length,
    };

    // Fiscal compliance
    const fiscalEvents = periodEvents.filter(e => e.compliance.fiscal);
    const fiscal = {
      receiptCreation: fiscalEvents.filter(e => e.action.includes('create_receipt')).length,
      receiptVoid: fiscalEvents.filter(e => e.action.includes('void_receipt')).length,
      receiptModification: fiscalEvents.filter(e => e.action.includes('modify_receipt')).length,
      fiscalReports: fiscalEvents.filter(e => e.action.includes('fiscal_report')).length,
    };

    // Security events
    const securityEvents = periodEvents.filter(e => e.type === 'security' || e.risk === 'critical');
    const security = {
      authFailures: securityEvents.filter(e => e.action.includes('auth') && e.outcome === 'failure').length,
      suspiciousActivity: securityEvents.filter(e => e.action.includes('suspicious')).length,
      privilegeEscalation: securityEvents.filter(e => e.action.includes('privilege')).length,
      dataLeaks: securityEvents.filter(e => e.action.includes('leak') || e.action.includes('breach')).length,
    };

    // Violations (high risk events with failures)
    const violations = periodEvents.filter(e =>
      (e.risk === 'high' || e.risk === 'critical') && e.outcome === 'failure',
    );

    // Recommendations
    const recommendations = this.generateRecommendations(periodEvents, violations);

    return {
      period: { start, end: now },
      events,
      compliance: { gdpr, fiscal, security },
      violations,
      recommendations,
    };
  }

  /**
   * Export audit data for external systems
   */
  public exportAuditData(filter?: AuditFilter): {
    metadata: {
      exportTime: number;
      totalEvents: number;
      filter?: AuditFilter;
    };
    events: AuditEvent[];
  } {
    const events = this.getAuditEvents(filter);

    this.recordAuditEvent({
      type: 'data',
      action: 'audit_data_export',
      resource: { type: 'audit_log' },
      outcome: 'success',
      details: {
        eventCount: events.length,
        filter,
        exportFormat: 'json',
      },
      risk: 'medium',
      compliance: { gdpr: true, fiscal: true, internal: true },
    });

    return {
      metadata: {
        exportTime: Date.now(),
        totalEvents: events.length,
        ...(filter && { filter }),
      },
      events,
    };
  }

  /**
   * Clear audit data (with compliance considerations)
   */
  public clearAuditData(olderThan?: number, preserveCompliance: boolean = true): number {
    const cutoff = olderThan ? Date.now() - olderThan : 0;
    const initialCount = this.events.length;

    if (preserveCompliance) {
      // Keep events that must be retained for compliance
      this.events = this.events.filter(e => {
        const retentionEnd = e.timestamp + (e.retention * 24 * 60 * 60 * 1000);
        return Date.now() < retentionEnd || e.timestamp > cutoff;
      });
    } else {
      this.events = this.events.filter(e => e.timestamp > cutoff);
    }

    const deletedCount = initialCount - this.events.length;

    this.recordAuditEvent({
      type: 'data',
      action: 'audit_data_cleared',
      resource: { type: 'audit_log' },
      outcome: 'success',
      details: {
        deletedCount,
        preserveCompliance,
        cutoffTime: cutoff,
      },
      risk: 'high',
      compliance: { gdpr: true, fiscal: true, internal: true },
    });

    this.log('info', `Cleared ${deletedCount} audit events`, {
      preserveCompliance,
      remaining: this.events.length,
    });

    return deletedCount;
  }

  private assessRequestRisk(options: RequestOptions): AuditEvent['risk'] {
    // High risk for authentication and configuration endpoints
    if (options.url.includes('/auth') || options.url.includes('/config')) {
      return 'high';
    }

    // Medium risk for data modification
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
      return 'medium';
    }

    return 'low';
  }

  private assessResponseRisk(response: HttpResponse<any>): AuditEvent['risk'] {
    // Critical risk for authentication failures
    if (response.status === 401 || response.status === 403) {
      return 'critical';
    }

    // High risk for server errors
    if (response.status >= 500) {
      return 'high';
    }

    // Medium risk for client errors
    if (response.status >= 400) {
      return 'medium';
    }

    return 'low';
  }

  private assessErrorRisk(error: Error): AuditEvent['risk'] {
    // Critical risk for security-related errors
    if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      return 'critical';
    }

    return 'high';
  }

  private assessRequestCompliance(options: RequestOptions): AuditEvent['compliance'] {
    const path = options.url.toLowerCase();

    return {
      gdpr: path.includes('/user') || path.includes('/profile') || path.includes('/data'),
      fiscal: path.includes('/receipt') || path.includes('/payment') || path.includes('/fiscal'),
      internal: true,
    };
  }

  private assessResponseCompliance(response: HttpResponse<any>): AuditEvent['compliance'] {
    const path = (response as any).config?.url?.toLowerCase() || '';

    return {
      gdpr: path.includes('/user') || path.includes('/profile') || path.includes('/data'),
      fiscal: path.includes('/receipt') || path.includes('/payment') || path.includes('/fiscal'),
      internal: true,
    };
  }

  private checkSuspiciousActivity(userId?: string, response?: HttpResponse<any>): void {
    if (!userId) {return;}

    const key = `${userId}_failures`;
    const failures = this.suspiciousActivity.get(key) || 0;
    const newFailures = failures + 1;

    this.suspiciousActivity.set(key, newFailures);

    // Alert on multiple failures
    if (newFailures >= 5) {
      this.recordAuditEvent({
        type: 'security',
        action: 'suspicious_activity_detected',
        resource: { type: 'user_account', id: userId },
        outcome: 'warning',
        details: {
          failureCount: newFailures,
          recentStatus: response?.status,
          pattern: 'multiple_auth_failures',
        },
        risk: 'critical',
        compliance: { gdpr: true, fiscal: false, internal: true },
      }, userId);
    }

    // Reset counter after 15 minutes
    setTimeout(() => {
      this.suspiciousActivity.delete(key);
    }, 900000);
  }

  private checkComplianceViolations(event: AuditEvent): void {
    const violations: string[] = [];

    // Check for data access without proper authorization
    if (event.compliance.gdpr && event.type === 'request' && !event.actor.userId) {
      violations.push('GDPR: Data access without user identification');
    }

    // Check for fiscal operations outside business hours
    if (event.compliance.fiscal && this.isOutsideBusinessHours()) {
      violations.push('Fiscal: Operation outside business hours');
    }

    // Check for critical operations without proper logging
    if (event.risk === 'critical' && !event.details) {
      violations.push('Security: Critical operation without detailed logging');
    }

    if (violations.length > 0) {
      this.recordAuditEvent({
        type: 'security',
        action: 'compliance_violation_detected',
        resource: event.resource,
        outcome: 'warning',
        details: {
          violations,
          originalEvent: event.id,
        },
        risk: 'critical',
        compliance: { gdpr: true, fiscal: true, internal: true },
      });
    }
  }

  private setupRealTimeMonitoring(): void {
    // Monitor for real-time compliance violations
    this.onEvent('audit_event', (event: AuditEvent) => {
      if (event.risk === 'critical' || event.outcome === 'failure') {
        this.emitEvent('security_alert', {
          type: 'real_time_alert',
          event,
          timestamp: Date.now(),
        });
      }
    });
  }

  private generateRecommendations(events: AuditEvent[], _violations: AuditEvent[]): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    const authFailures = events.filter(e =>
      e.action.includes('auth') && e.outcome === 'failure',
    ).length;

    if (authFailures > 10) {
      recommendations.push('Implement stronger authentication mechanisms (MFA, rate limiting)');
    }

    // Compliance recommendations
    const gdprEvents = events.filter(e => e.compliance.gdpr);
    const undocumentedGdprEvents = gdprEvents.filter(e => !e.details || Object.keys(e.details).length === 0);

    if (undocumentedGdprEvents.length > 0) {
      recommendations.push('Enhance GDPR event documentation and data processing records');
    }

    // Performance recommendations
    const slowRequests = events.filter(e =>
      e.type === 'response' && e.details?.duration > 5000,
    ).length;

    if (slowRequests > events.length * 0.1) {
      recommendations.push('Review and optimize slow API endpoints affecting audit performance');
    }

    return recommendations;
  }

  private generateSessionId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private extractUserIdFromAuth(authorization?: string): string | undefined {
    if (!authorization) {return undefined;}

    try {
      // Simple JWT extraction - in production, use proper JWT library
      const token = authorization.replace('Bearer ', '');
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {return undefined;}
      const payload = JSON.parse(atob(payloadPart));
      return payload.sub || payload.userId;
    } catch {
      return undefined;
    }
  }

  private getCurrentIpAddress(): string | undefined {
    // In browser environment, this would need to be provided by the application
    return undefined;
  }

  private getCurrentUserAgent(): string | undefined {
    return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  }

  private sanitizePath(url: string): string {
    try {
      const urlObj = new URL(url, 'https://example.com');
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'https://example.com');
      urlObj.searchParams.delete('api_key');
      urlObj.searchParams.delete('token');
      return urlObj.pathname + (urlObj.search || '');
    } catch {
      return url;
    }
  }

  private sanitizeHeaders(headers: Record<string, any> = {}): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private calculateSize(data: any): number {
    if (!data) {return 0;}

    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private groupBy(array: AuditEvent[], key: keyof AuditEvent): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private isOutsideBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Outside 9-17 Monday-Friday
    return hour < 9 || hour >= 17 || day === 0 || day === 6;
  }

  private cleanupExpiredEvents(): void {
    const now = Date.now();
    const initialCount = this.events.length;

    this.events = this.events.filter(event => {
      const retentionEnd = event.timestamp + (event.retention * 24 * 60 * 60 * 1000);
      return now < retentionEnd;
    });

    const deletedCount = initialCount - this.events.length;

    if (deletedCount > 0) {
      this.log('debug', `Cleaned up ${deletedCount} expired audit events`);
    }
  }

  private async loadPersistedEvents(): Promise<void> {
    try {
      const persistedEvents = this.getFromStorage<AuditEvent[]>('audit_events');

      if (persistedEvents) {
        // Only load non-expired events
        const now = Date.now();
        this.events = persistedEvents.filter(event => {
          const retentionEnd = event.timestamp + (event.retention * 24 * 60 * 60 * 1000);
          return now < retentionEnd;
        });
      }

      this.log('debug', 'Loaded persisted audit events', {
        events: this.events.length,
      });
    } catch (error) {
      this.log('warn', 'Failed to load persisted audit events', { error });
    }
  }

  private async persistEvents(): Promise<void> {
    try {
      this.setInStorage('audit_events', this.events);

      this.log('debug', 'Persisted audit events', {
        events: this.events.length,
      });
    } catch (error) {
      this.log('warn', 'Failed to persist audit events', { error });
    }
  }
}
