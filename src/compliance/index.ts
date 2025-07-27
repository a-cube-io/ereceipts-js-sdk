/**
 * Compliance Tools for A-Cube SDK
 * Complete suite of compliance management tools for GDPR, fiscal audit, and access control
 */

import {
  GDPRComplianceManager,
  type GDPRConfig,
  type DataSubject,
  type ConsentRecord,
  type DataProcessingRecord,
  type DataExportRequest,
  type ErasureRequest,
  type GDPRAuditReport,
  type GDPRViolation,
} from './gdpr-compliance';

import {
  FiscalAuditManager,
  type FiscalConfig,
  type FiscalDocument,
  type FiscalLineItem,
  type VATBreakdown,
  type FiscalAuditEntry,
  type FiscalPeriod,
  type FiscalViolation,
  type FiscalReport,
} from './fiscal-audit';

import {
  AccessControlManager,
  type AccessControlConfig,
  type Role,
  type Permission,
  type AccessCondition,
  type User,
  type UserSession,
  type AccessRequest,
  type AccessContext,
  type AccessAuditEntry,
} from './access-control';

export {
  GDPRComplianceManager,
  type GDPRConfig,
  type DataSubject,
  type ConsentRecord,
  type DataProcessingRecord,
  type DataExportRequest,
  type ErasureRequest,
  type GDPRAuditReport,
  type GDPRViolation,
  FiscalAuditManager,
  type FiscalConfig,
  type FiscalDocument,
  type FiscalLineItem,
  type VATBreakdown,
  type FiscalAuditEntry,
  type FiscalPeriod,
  type FiscalViolation,
  type FiscalReport,
  AccessControlManager,
  type AccessControlConfig,
  type Role,
  type Permission,
  type AccessCondition,
  type User,
  type UserSession,
  type AccessRequest,
  type AccessContext,
  type AccessAuditEntry,
};

/**
 * Comprehensive Compliance Manager
 * Integrates all compliance components into a unified interface
 */
export class ComplianceManager {
  private gdpr: GDPRComplianceManager;
  private fiscal: FiscalAuditManager;
  private access: AccessControlManager;

  constructor(config?: {
    gdpr?: Partial<GDPRConfig>;
    fiscal?: Partial<FiscalConfig>;
    access?: Partial<AccessControlConfig>;
  }) {
    this.gdpr = new GDPRComplianceManager(config?.gdpr);
    this.fiscal = new FiscalAuditManager(config?.fiscal);
    this.access = new AccessControlManager(config?.access);
  }

  /**
   * Get GDPR compliance manager
   */
  getGDPR(): GDPRComplianceManager {
    return this.gdpr;
  }

  /**
   * Get fiscal audit manager
   */
  getFiscal(): FiscalAuditManager {
    return this.fiscal;
  }

  /**
   * Get access control manager
   */
  getAccess(): AccessControlManager {
    return this.access;
  }

  /**
   * Initialize compliance with default configurations
   */
  async initialize(): Promise<{
    gdprEnabled: boolean;
    fiscalEnabled: boolean;
    accessEnabled: boolean;
  }> {
    // Register default data subject for system operations
    await this.gdpr.registerDataSubject(
      'system',
      undefined,
      {
        purpose: 'system_operations',
        dataTypes: ['system_logs'],
        consentGiven: true,
        source: 'legitimate_interest',
      }
    );

    // Create default admin user
    await this.access.createUser(
      {
        email: 'admin@system.local',
        name: 'System Administrator',
        roles: ['admin'],
        attributes: { system: true },
        status: 'active',
      },
      'system'
    );

    return {
      gdprEnabled: true,
      fiscalEnabled: true,
      accessEnabled: true,
    };
  }

  /**
   * Process receipt with full compliance checks
   */
  async processReceiptWithCompliance(
    receiptData: {
      merchantInfo: any;
      items: any[];
      paymentMethod: string;
      customerInfo?: any;
    },
    sessionId: string,
    context: AccessContext
  ): Promise<{
    documentId?: string;
    accessGranted: boolean;
    gdprCompliant: boolean;
    fiscalCompliant: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    // Check access permissions
    const accessCheck = await this.access.checkAccess(
      sessionId,
      'receipts',
      'create',
      context
    );

    if (!accessCheck.granted) {
      return {
        accessGranted: false,
        gdprCompliant: false,
        fiscalCompliant: false,
        warnings: [accessCheck.reason || 'Access denied'],
      };
    }

    // Check GDPR compliance if customer data is present
    let gdprCompliant = true;
    if (receiptData.customerInfo) {
      const processingLawfulness = this.gdpr.isProcessingLawful(
        receiptData.customerInfo.id || 'anonymous',
        'transaction_processing',
        ['transaction_data', 'payment_info']
      );

      if (!processingLawfulness.lawful) {
        gdprCompliant = false;
        warnings.push(...processingLawfulness.warnings);
      }
    }

    // Create fiscal document
    let documentId: string | undefined;
    let fiscalCompliant = true;

    try {
      documentId = await this.fiscal.createFiscalDocument(
        'receipt',
        receiptData.merchantInfo,
        receiptData.items,
        receiptData.paymentMethod,
        receiptData.customerInfo
      );
    } catch (error) {
      fiscalCompliant = false;
      warnings.push(`Fiscal compliance error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record GDPR processing activity if customer data is involved
    if (receiptData.customerInfo && gdprCompliant) {
      this.gdpr.recordProcessingActivity({
        subjectId: receiptData.customerInfo.id || 'anonymous',
        dataType: 'transaction_data',
        purpose: 'payment_processing',
        lawfulBasis: 'contract',
        processingActivity: 'receipt_creation',
        dataLocation: 'internal_database',
        retentionPeriod: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years for fiscal
        thirdPartySharing: false,
        encryptionUsed: true,
        metadata: { documentId, amount: receiptData.items.reduce((sum, item) => sum + item.totalAmount, 0) },
      });
    }

    return {
      ...(documentId && { documentId }),
      accessGranted: true,
      gdprCompliant,
      fiscalCompliant,
      warnings,
    };
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(timeRangeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<{
    period: { start: number; end: number };
    gdpr: any;
    fiscal: any;
    access: any;
    overall: {
      complianceScore: number;
      criticalIssues: number;
      recommendations: string[];
    };
  }> {
    const now = Date.now();
    const start = now - timeRangeMs;

    // Get individual compliance reports
    const gdprReport = this.gdpr.generateComplianceReport(timeRangeMs);
    const fiscalStatus = this.fiscal.getFiscalComplianceStatus();
    const accessStats = this.access.getAccessControlStats();

    // Calculate overall compliance score
    const gdprScore = this.calculateGDPRScore(gdprReport);
    const fiscalScore = this.calculateFiscalScore(fiscalStatus);
    const accessScore = this.calculateAccessScore(accessStats);
    
    const overallScore = Math.round((gdprScore + fiscalScore + accessScore) / 3);

    // Identify critical issues
    const criticalIssues = 
      gdprReport.violations.filter(v => v.severity === 'critical').length +
      fiscalStatus.violations.critical +
      accessStats.audit.highRiskEvents;

    // Generate recommendations
    const recommendations = [
      ...gdprReport.recommendations,
      ...(fiscalStatus.overall !== 'compliant' ? ['Review fiscal compliance violations'] : []),
      ...(accessStats.audit.failedAttempts > 10 ? ['Investigate failed access attempts'] : []),
    ];

    return {
      period: { start, end: now },
      gdpr: gdprReport,
      fiscal: fiscalStatus,
      access: accessStats,
      overall: {
        complianceScore: overallScore,
        criticalIssues,
        recommendations,
      },
    };
  }

  /**
   * Handle data subject request (GDPR Article 15-22)
   */
  async handleDataSubjectRequest(
    type: 'access' | 'portability' | 'erasure' | 'rectification',
    subjectId: string,
    requestDetails?: any
  ): Promise<{
    requestId: string;
    status: 'pending' | 'processing' | 'completed';
    estimatedCompletion?: number;
  }> {
    switch (type) {
      case 'access':
        // Provide access to all data
        const exportId = await this.gdpr.requestDataExport(subjectId, {
          format: 'json',
          includeMetadata: true,
        });
        return {
          requestId: exportId,
          status: 'processing',
          estimatedCompletion: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };

      case 'portability':
        // Export data in machine-readable format
        const portabilityId = await this.gdpr.requestDataExport(subjectId, {
          format: 'json',
          includeMetadata: false,
        });
        return {
          requestId: portabilityId,
          status: 'processing',
          estimatedCompletion: Date.now() + (24 * 60 * 60 * 1000),
        };

      case 'erasure':
        // Right to be forgotten
        const erasureId = await this.gdpr.requestDataErasure(
          subjectId,
          requestDetails?.reason || 'data_subject_request',
          { immediateErasure: false }
        );
        return {
          requestId: erasureId,
          status: 'pending',
          estimatedCompletion: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        };

      case 'rectification':
        // Right to rectification - would need additional implementation
        return {
          requestId: `rectification_${Date.now()}`,
          status: 'pending',
          estimatedCompletion: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        };

      default:
        throw new Error(`Unsupported request type: ${type}`);
    }
  }

  /**
   * Perform automated compliance health check
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      component: 'gdpr' | 'fiscal' | 'access';
      status: 'pass' | 'warning' | 'fail';
      message: string;
    }>;
    recommendations: string[];
  }> {
    const checks: Array<{
      component: 'gdpr' | 'fiscal' | 'access';
      status: 'pass' | 'warning' | 'fail';
      message: string;
    }> = [];

    // GDPR health check
    const gdprReport = this.gdpr.generateComplianceReport(24 * 60 * 60 * 1000); // Last 24h
    const criticalGdprViolations = gdprReport.violations.filter(v => v.severity === 'critical').length;
    
    checks.push({
      component: 'gdpr',
      status: criticalGdprViolations > 0 ? 'fail' : gdprReport.violations.length > 0 ? 'warning' : 'pass',
      message: `${gdprReport.violations.length} violations found (${criticalGdprViolations} critical)`,
    });

    // Fiscal health check
    const fiscalStatus = this.fiscal.getFiscalComplianceStatus();
    checks.push({
      component: 'fiscal',
      status: fiscalStatus.overall === 'violations' ? 'fail' : fiscalStatus.overall === 'warnings' ? 'warning' : 'pass',
      message: `Fiscal compliance: ${fiscalStatus.overall} (${fiscalStatus.violations.critical} critical violations)`,
    });

    // Access control health check
    const accessStats = this.access.getAccessControlStats();
    const highRiskEvents = accessStats.audit.highRiskEvents;
    
    checks.push({
      component: 'access',
      status: highRiskEvents > 10 ? 'fail' : highRiskEvents > 0 ? 'warning' : 'pass',
      message: `${highRiskEvents} high-risk access events detected`,
    });

    // Overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warning').length;
    
    let status: 'healthy' | 'warning' | 'critical';
    if (failedChecks > 0) {
      status = 'critical';
    } else if (warningChecks > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalGdprViolations > 0) {
      recommendations.push('Address critical GDPR violations immediately');
    }
    if (fiscalStatus.violations.critical > 0) {
      recommendations.push('Review fiscal compliance violations');
    }
    if (highRiskEvents > 10) {
      recommendations.push('Investigate high-risk access events');
    }

    return { status, checks, recommendations };
  }

  private calculateGDPRScore(report: any): number {
    const totalEvents = report.summary.totalSubjects + report.summary.dataProcessingActivities;
    const violations = report.violations.length;
    
    if (totalEvents === 0) return 100;
    
    const violationRate = violations / totalEvents;
    return Math.max(0, Math.round(100 - (violationRate * 100)));
  }

  private calculateFiscalScore(status: any): number {
    if (status.overall === 'compliant') return 100;
    if (status.overall === 'warnings') return 75;
    if (status.violations.critical > 0) return 25;
    return 50;
  }

  private calculateAccessScore(stats: any): number {
    const totalAttempts = stats.audit.totalEntries;
    const failedAttempts = stats.audit.failedAttempts;
    const highRiskEvents = stats.audit.highRiskEvents;
    
    if (totalAttempts === 0) return 100;
    
    const failureRate = failedAttempts / totalAttempts;
    const riskRate = highRiskEvents / totalAttempts;
    
    const score = 100 - (failureRate * 50) - (riskRate * 50);
    return Math.max(0, Math.round(score));
  }
}

/**
 * Compliance utilities
 */
export const ComplianceUtils = {
  /**
   * Validate GDPR lawful basis
   */
  isValidLawfulBasis(basis: string): boolean {
    const validBases = [
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ];
    return validBases.includes(basis);
  },

  /**
   * Validate Italian VAT number
   */
  isValidItalianVAT(vatNumber: string): boolean {
    // Italian VAT format: IT + 11 digits
    const pattern = /^IT\d{11}$/;
    return pattern.test(vatNumber);
  },

  /**
   * Validate Italian fiscal code
   */
  isValidItalianFiscalCode(fiscalCode: string): boolean {
    // Italian fiscal code format: 16 alphanumeric characters
    const pattern = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
    return pattern.test(fiscalCode);
  },

  /**
   * Calculate data retention period based on category
   */
  getRetentionPeriod(category: string, region: string = 'IT'): number {
    const periods: Record<string, Record<string, number>> = {
      IT: {
        transaction_data: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
        user_profile: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
        marketing_data: 365 * 24 * 60 * 60 * 1000, // 1 year
        analytics_data: 26 * 30 * 24 * 60 * 60 * 1000, // 26 months (GDPR)
      },
    };

    return periods[region]?.[category] || (365 * 24 * 60 * 60 * 1000); // Default 1 year
  },

  /**
   * Check if data processing requires explicit consent
   */
  requiresExplicitConsent(purpose: string, dataTypes: string[]): boolean {
    const sensitiveDataTypes = ['health', 'biometric', 'genetic', 'political', 'religious'];
    const sensitiveDataPresent = dataTypes.some(type => sensitiveDataTypes.includes(type));

    const consentRequiredPurposes = ['marketing', 'profiling', 'advertising'];
    const purposeRequiresConsent = consentRequiredPurposes.includes(purpose);

    return sensitiveDataPresent || purposeRequiresConsent;
  },

  /**
   * Generate compliance report summary
   */
  summarizeCompliance(report: any): string {
    const { gdpr, fiscal, access, overall } = report;
    
    let summary = `Compliance Report Summary:\n`;
    summary += `Overall Score: ${overall.complianceScore}%\n`;
    summary += `Critical Issues: ${overall.criticalIssues}\n\n`;
    
    summary += `GDPR: ${gdpr.violations.length} violations\n`;
    summary += `Fiscal: ${fiscal.overall} status\n`;
    summary += `Access: ${access.audit.failedAttempts} failed attempts\n\n`;
    
    if (overall.recommendations.length > 0) {
      summary += `Recommendations:\n`;
      overall.recommendations.forEach((rec: string, i: number) => {
        summary += `${i + 1}. ${rec}\n`;
      });
    }
    
    return summary;
  },
};