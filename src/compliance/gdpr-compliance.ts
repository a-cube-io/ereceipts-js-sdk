/**
 * GDPR Compliance Manager for A-Cube SDK
 * Provides comprehensive GDPR compliance tools and data protection capabilities
 */

export interface GDPRConfig {
  enabled: boolean;
  dataRetention: {
    defaultPeriod: number; // milliseconds
    categories: Record<string, number>; // category -> retention period
  };
  consent: {
    required: boolean;
    granular: boolean; // Allow granular consent per data type
    withdrawalEnabled: boolean;
    consentVersion: string;
  };
  dataMinimization: {
    enabled: boolean;
    allowedFields: Record<string, string[]>; // purpose -> allowed fields
  };
  rightToErasure: {
    enabled: boolean;
    gracePeriod: number; // milliseconds before actual deletion
    cascadeDeletion: boolean; // Delete related data
  };
  dataPortability: {
    enabled: boolean;
    formats: ('json' | 'xml' | 'csv')[];
    includeMetadata: boolean;
  };
  anonymization: {
    enabled: boolean;
    techniques: ('pseudonymization' | 'aggregation' | 'suppression')[];
    retainStructure: boolean;
  };
}

export interface DataSubject {
  id: string;
  email?: string;
  createdAt: number;
  lastActivity: number;
  consentRecords: ConsentRecord[];
  dataCategories: string[];
  retentionOverrides: Record<string, number>;
  anonymizationStatus: 'none' | 'pseudonymized' | 'anonymized' | 'deleted';
}

export interface ConsentRecord {
  id: string;
  subjectId: string;
  purpose: string;
  dataTypes: string[];
  consentGiven: boolean;
  consentVersion: string;
  timestamp: number;
  expiresAt?: number;
  source: 'explicit' | 'implied' | 'legitimate_interest';
  withdrawnAt?: number;
  withdrawalReason?: string;
  metadata: Record<string, any>;
}

export interface DataProcessingRecord {
  id: string;
  subjectId: string;
  dataType: string;
  purpose: string;
  lawfulBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  processingActivity: string;
  timestamp: number;
  dataLocation: string;
  retentionPeriod: number;
  thirdPartySharing: boolean;
  encryptionUsed: boolean;
  metadata: Record<string, any>;
}

export interface DataExportRequest {
  id: string;
  subjectId: string;
  requestedAt: number;
  completedAt?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'json' | 'xml' | 'csv';
  includeMetadata: boolean;
  dataTypes?: string[];
  exportUrl?: string;
  expiresAt?: number;
}

export interface ErasureRequest {
  id: string;
  subjectId: string;
  requestedAt: number;
  scheduledAt: number;
  completedAt?: number;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed';
  reason: string;
  cascadeDelete: boolean;
  dataTypes?: string[];
  verificationRequired: boolean;
  metadata: Record<string, any>;
}

export interface GDPRAuditReport {
  generatedAt: number;
  period: { start: number; end: number };
  summary: {
    totalSubjects: number;
    activeConsents: number;
    withdrawnConsents: number;
    dataExportRequests: number;
    erasureRequests: number;
    dataProcessingActivities: number;
  };
  compliance: {
    consentCompliance: number; // percentage
    retentionCompliance: number; // percentage
    dataMinimizationCompliance: number; // percentage
    securityCompliance: number; // percentage
  };
  violations: GDPRViolation[];
  recommendations: string[];
}

export interface GDPRViolation {
  id: string;
  type: 'consent' | 'retention' | 'data_minimization' | 'security' | 'transparency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  subjectId?: string;
  detectedAt: number;
  resolvedAt?: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  remediation?: string;
  metadata: Record<string, any>;
}

export class GDPRComplianceManager {
  private config: GDPRConfig;

  private dataSubjects = new Map<string, DataSubject>();

  private consentRecords = new Map<string, ConsentRecord>();

  private processingRecords: DataProcessingRecord[] = [];

  private exportRequests = new Map<string, DataExportRequest>();

  private erasureRequests = new Map<string, ErasureRequest>();

  private violations: GDPRViolation[] = [];

  constructor(config?: Partial<GDPRConfig>) {
    this.config = {
      enabled: true,
      dataRetention: {
        defaultPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
        categories: {
          'user_profile': 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
          'transaction_data': 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
          'analytics_data': 26 * 30 * 24 * 60 * 60 * 1000, // 26 months
          'marketing_data': 365 * 24 * 60 * 60 * 1000, // 1 year
        },
      },
      consent: {
        required: true,
        granular: true,
        withdrawalEnabled: true,
        consentVersion: '1.0.0',
      },
      dataMinimization: {
        enabled: true,
        allowedFields: {
          'user_registration': ['email', 'name', 'company'],
          'transaction_processing': ['amount', 'currency', 'timestamp'],
          'analytics': ['user_id', 'event_type', 'timestamp'],
        },
      },
      rightToErasure: {
        enabled: true,
        gracePeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
        cascadeDeletion: true,
      },
      dataPortability: {
        enabled: true,
        formats: ['json', 'csv'],
        includeMetadata: true,
      },
      anonymization: {
        enabled: true,
        techniques: ['pseudonymization', 'aggregation'],
        retainStructure: true,
      },
      ...config,
    };

    if (this.config.enabled) {
      this.initializeRetentionScheduler();
    }
  }

  /**
   * Register a new data subject
   */
  async registerDataSubject(
    subjectId: string,
    email?: string,
    initialConsent?: Partial<ConsentRecord>,
  ): Promise<void> {
    if (!this.config.enabled) {return;}

    const dataSubject: DataSubject = {
      id: subjectId,
      ...(email && { email }),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      consentRecords: [],
      dataCategories: [],
      retentionOverrides: {},
      anonymizationStatus: 'none',
    };

    this.dataSubjects.set(subjectId, dataSubject);

    // Record initial consent if provided
    if (initialConsent) {
      await this.recordConsent(subjectId, {
        purpose: initialConsent.purpose || 'service_provision',
        dataTypes: initialConsent.dataTypes || ['basic_profile'],
        consentGiven: true,
        source: 'explicit',
        ...initialConsent,
      });
    }

    this.recordProcessingActivity({
      subjectId,
      dataType: 'basic_profile',
      purpose: 'user_registration',
      lawfulBasis: initialConsent ? 'consent' : 'contract',
      processingActivity: 'data_subject_registration',
      dataLocation: 'internal_database',
      retentionPeriod: this.config.dataRetention.categories.user_profile || this.config.dataRetention.defaultPeriod,
      thirdPartySharing: false,
      encryptionUsed: true,
      metadata: { email: !!email },
    });
  }

  /**
   * Record consent for data processing
   */
  async recordConsent(
    subjectId: string,
    consent: Partial<ConsentRecord> & {
      purpose: string;
      dataTypes: string[];
      consentGiven: boolean;
    },
  ): Promise<string> {
    if (!this.config.enabled) {return '';}

    const consentId = this.generateConsentId();
    const now = Date.now();

    const consentRecord: ConsentRecord = {
      id: consentId,
      subjectId,
      consentVersion: this.config.consent.consentVersion,
      timestamp: now,
      source: 'explicit',
      metadata: {},
      ...consent,
    };

    // Set expiration if not provided
    if (!consentRecord.expiresAt && consent.purpose === 'marketing') {
      consentRecord.expiresAt = now + (365 * 24 * 60 * 60 * 1000); // 1 year for marketing
    }

    this.consentRecords.set(consentId, consentRecord);

    // Update data subject
    const dataSubject = this.dataSubjects.get(subjectId);
    if (dataSubject) {
      dataSubject.consentRecords.push(consentRecord);
      dataSubject.lastActivity = now;

      // Add data categories
      for (const dataType of consent.dataTypes) {
        if (!dataSubject.dataCategories.includes(dataType)) {
          dataSubject.dataCategories.push(dataType);
        }
      }
    }

    this.recordProcessingActivity({
      subjectId,
      dataType: 'consent_record',
      purpose: 'consent_management',
      lawfulBasis: 'legal_obligation',
      processingActivity: 'consent_recording',
      dataLocation: 'internal_database',
      retentionPeriod: this.config.dataRetention.defaultPeriod,
      thirdPartySharing: false,
      encryptionUsed: true,
      metadata: { consentId, purpose: consent.purpose },
    });

    return consentId;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    subjectId: string,
    consentId: string,
    reason?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.consent.withdrawalEnabled) {return;}

    const consentRecord = this.consentRecords.get(consentId);
    if (!consentRecord || consentRecord.subjectId !== subjectId) {
      throw new Error('Consent record not found or access denied');
    }

    consentRecord.withdrawnAt = Date.now();
    if (reason) {
      consentRecord.withdrawalReason = reason;
    }
    consentRecord.consentGiven = false;

    this.recordProcessingActivity({
      subjectId,
      dataType: 'consent_record',
      purpose: 'consent_management',
      lawfulBasis: 'legal_obligation',
      processingActivity: 'consent_withdrawal',
      dataLocation: 'internal_database',
      retentionPeriod: this.config.dataRetention.defaultPeriod,
      thirdPartySharing: false,
      encryptionUsed: true,
      metadata: { consentId, reason },
    });

    // Check if any data should be deleted due to lack of consent
    await this.checkDataRetentionAfterConsentWithdrawal(subjectId);
  }

  /**
   * Check if processing is lawful for a data subject
   */
  isProcessingLawful(
    subjectId: string,
    purpose: string,
    dataTypes: string[],
  ): { lawful: boolean; basis: string; warnings: string[] } {
    if (!this.config.enabled) {return { lawful: true, basis: 'not_applicable', warnings: [] };}

    const dataSubject = this.dataSubjects.get(subjectId);
    if (!dataSubject) {
      return { lawful: false, basis: 'no_subject', warnings: ['Data subject not registered'] };
    }

    const warnings: string[] = [];
    let hasValidConsent = false;
    let lawfulBasis = 'legitimate_interests';

    // Check for valid consent
    const relevantConsents = dataSubject.consentRecords.filter(
      consent =>
        consent.purpose === purpose &&
        consent.consentGiven &&
        !consent.withdrawnAt &&
        (!consent.expiresAt || consent.expiresAt > Date.now()) &&
        dataTypes.every(type => consent.dataTypes.includes(type)),
    );

    if (relevantConsents.length > 0) {
      hasValidConsent = true;
      lawfulBasis = 'consent';
    }

    // Check data minimization
    if (this.config.dataMinimization.enabled) {
      const allowedFields = this.config.dataMinimization.allowedFields[purpose] || [];
      const excessiveFields = dataTypes.filter(type => !allowedFields.includes(type));

      if (excessiveFields.length > 0) {
        warnings.push(`Excessive data types for purpose ${purpose}: ${excessiveFields.join(', ')}`);
      }
    }

    // Special cases for legitimate interests
    const legitimateInterestPurposes = ['fraud_prevention', 'security', 'service_provision'];
    if (!hasValidConsent && legitimateInterestPurposes.includes(purpose)) {
      lawfulBasis = 'legitimate_interests';
    }

    // Legal obligation basis
    const legalObligationPurposes = ['tax_compliance', 'anti_money_laundering', 'data_retention'];
    if (legalObligationPurposes.includes(purpose)) {
      lawfulBasis = 'legal_obligation';
    }

    const lawful = hasValidConsent ||
                   legitimateInterestPurposes.includes(purpose) ||
                   legalObligationPurposes.includes(purpose);

    return { lawful, basis: lawfulBasis, warnings };
  }

  /**
   * Record data processing activity
   */
  recordProcessingActivity(activity: Omit<DataProcessingRecord, 'id' | 'timestamp'>): void {
    if (!this.config.enabled) {return;}

    const record: DataProcessingRecord = {
      id: this.generateProcessingId(),
      timestamp: Date.now(),
      ...activity,
    };

    this.processingRecords.push(record);

    // Keep only recent records (last 10,000)
    if (this.processingRecords.length > 10000) {
      this.processingRecords = this.processingRecords.slice(-10000);
    }

    // Update data subject activity
    const dataSubject = this.dataSubjects.get(activity.subjectId);
    if (dataSubject) {
      dataSubject.lastActivity = Date.now();
    }
  }

  /**
   * Handle data export request (Right to Data Portability)
   */
  async requestDataExport(
    subjectId: string,
    options?: {
      format?: 'json' | 'xml' | 'csv';
      includeMetadata?: boolean;
      dataTypes?: string[];
    },
  ): Promise<string> {
    if (!this.config.enabled || !this.config.dataPortability.enabled) {
      throw new Error('Data portability not enabled');
    }

    const requestId = this.generateRequestId();
    const exportRequest: DataExportRequest = {
      id: requestId,
      subjectId,
      requestedAt: Date.now(),
      status: 'pending',
      format: options?.format || 'json',
      includeMetadata: options?.includeMetadata ?? this.config.dataPortability.includeMetadata,
      ...(options?.dataTypes && { dataTypes: options.dataTypes }),
    };

    this.exportRequests.set(requestId, exportRequest);

    // Process the export asynchronously
    setTimeout(() => this.processDataExport(requestId), 1000);

    this.recordProcessingActivity({
      subjectId,
      dataType: 'export_request',
      purpose: 'data_portability',
      lawfulBasis: 'legal_obligation',
      processingActivity: 'data_export_request',
      dataLocation: 'internal_database',
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      thirdPartySharing: false,
      encryptionUsed: true,
      metadata: { requestId, format: exportRequest.format },
    });

    return requestId;
  }

  /**
   * Handle data erasure request (Right to be Forgotten)
   */
  async requestDataErasure(
    subjectId: string,
    reason: string,
    options?: {
      immediateErasure?: boolean;
      dataTypes?: string[];
      cascadeDelete?: boolean;
    },
  ): Promise<string> {
    if (!this.config.enabled || !this.config.rightToErasure.enabled) {
      throw new Error('Right to erasure not enabled');
    }

    const requestId = this.generateRequestId();
    const now = Date.now();
    const scheduledAt = options?.immediateErasure
      ? now
      : now + this.config.rightToErasure.gracePeriod;

    const erasureRequest: ErasureRequest = {
      id: requestId,
      subjectId,
      requestedAt: now,
      scheduledAt,
      status: 'pending',
      reason,
      cascadeDelete: options?.cascadeDelete ?? this.config.rightToErasure.cascadeDeletion,
      ...(options?.dataTypes && { dataTypes: options.dataTypes }),
      verificationRequired: !options?.immediateErasure,
      metadata: {},
    };

    this.erasureRequests.set(requestId, erasureRequest);

    // Schedule the erasure
    setTimeout(() => this.processDataErasure(requestId), scheduledAt - now);

    this.recordProcessingActivity({
      subjectId,
      dataType: 'erasure_request',
      purpose: 'data_erasure',
      lawfulBasis: 'legal_obligation',
      processingActivity: 'data_erasure_request',
      dataLocation: 'internal_database',
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      thirdPartySharing: false,
      encryptionUsed: true,
      metadata: { requestId, reason, scheduledAt },
    });

    return requestId;
  }

  /**
   * Generate GDPR compliance report
   */
  generateComplianceReport(timeRangeMs: number = 30 * 24 * 60 * 60 * 1000): GDPRAuditReport {
    const now = Date.now();
    const start = now - timeRangeMs;

    // Get data for the period
    const periodProcessingRecords = this.processingRecords.filter(
      record => record.timestamp >= start,
    );

    const periodConsents = Array.from(this.consentRecords.values()).filter(
      consent => consent.timestamp >= start,
    );

    const periodExportRequests = Array.from(this.exportRequests.values()).filter(
      request => request.requestedAt >= start,
    );

    const periodErasureRequests = Array.from(this.erasureRequests.values()).filter(
      request => request.requestedAt >= start,
    );

    // Calculate compliance metrics
    const totalConsents = periodConsents.length;
    const activeConsents = periodConsents.filter(
      c => c.consentGiven && !c.withdrawnAt && (!c.expiresAt || c.expiresAt > now),
    ).length;
    const withdrawnConsents = periodConsents.filter(c => c.withdrawnAt).length;

    const consentCompliance = totalConsents > 0 ? (activeConsents / totalConsents) * 100 : 100;
    const retentionCompliance = this.calculateRetentionCompliance();
    const dataMinimizationCompliance = this.calculateDataMinimizationCompliance();
    const securityCompliance = this.calculateSecurityCompliance(periodProcessingRecords);

    return {
      generatedAt: now,
      period: { start, end: now },
      summary: {
        totalSubjects: this.dataSubjects.size,
        activeConsents,
        withdrawnConsents,
        dataExportRequests: periodExportRequests.length,
        erasureRequests: periodErasureRequests.length,
        dataProcessingActivities: periodProcessingRecords.length,
      },
      compliance: {
        consentCompliance,
        retentionCompliance,
        dataMinimizationCompliance,
        securityCompliance,
      },
      violations: this.violations.filter(v => v.detectedAt >= start),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Anonymize data for a subject
   */
  async anonymizeDataSubject(subjectId: string): Promise<void> {
    if (!this.config.enabled || !this.config.anonymization.enabled) {return;}

    const dataSubject = this.dataSubjects.get(subjectId);
    if (!dataSubject) {return;}

    if (this.config.anonymization.techniques.includes('pseudonymization')) {
      // Replace identifiable information with pseudonyms
      if (dataSubject.email) {
        const pseudonymizedEmail = this.pseudonymizeEmail(dataSubject.email);
        if (pseudonymizedEmail) {
          dataSubject.email = pseudonymizedEmail;
        }
      }
      dataSubject.anonymizationStatus = 'pseudonymized';
    }

    if (this.config.anonymization.techniques.includes('aggregation')) {
      // Aggregate processing records
      this.aggregateProcessingRecords(subjectId);
    }

    if (this.config.anonymization.techniques.includes('suppression')) {
      // Remove specific identifiable fields
      delete dataSubject.email;
      dataSubject.anonymizationStatus = 'anonymized';
    }

    this.recordProcessingActivity({
      subjectId,
      dataType: 'anonymization_record',
      purpose: 'data_anonymization',
      lawfulBasis: 'legal_obligation',
      processingActivity: 'data_anonymization',
      dataLocation: 'internal_database',
      retentionPeriod: this.config.dataRetention.defaultPeriod,
      thirdPartySharing: false,
      encryptionUsed: true,
      metadata: { techniques: this.config.anonymization.techniques },
    });
  }

  private async processDataExport(requestId: string): Promise<void> {
    const exportRequest = this.exportRequests.get(requestId);
    if (!exportRequest) {return;}

    try {
      exportRequest.status = 'processing';

      const dataSubject = this.dataSubjects.get(exportRequest.subjectId);
      if (!dataSubject) {
        exportRequest.status = 'failed';
        return;
      }

      // Collect all data for the subject
      const exportData: any = {
        subject: {
          id: dataSubject.id,
          email: dataSubject.email,
          createdAt: dataSubject.createdAt,
          lastActivity: dataSubject.lastActivity,
          dataCategories: dataSubject.dataCategories,
        },
        consents: dataSubject.consentRecords,
        processingActivities: this.processingRecords.filter(
          record => record.subjectId === exportRequest.subjectId,
        ),
      };

      if (exportRequest.includeMetadata) {
        exportData.metadata = {
          exportedAt: Date.now(),
          exportFormat: exportRequest.format,
          gdprVersion: '2018',
          retentionPolicies: this.config.dataRetention,
        };
      }

      // Convert to requested format
      let exportContent: string;
      switch (exportRequest.format) {
        case 'json':
          exportContent = JSON.stringify(exportData, null, 2);
          break;
        case 'csv':
          exportContent = this.convertToCSV(exportData);
          break;
        case 'xml':
          exportContent = this.convertToXML(exportData);
          break;
        default:
          throw new Error(`Unsupported format: ${exportRequest.format}`);
      }

      // In a real implementation, you'd save this to a secure location
      exportRequest.exportUrl = `data:text/plain;base64,${btoa(exportContent)}`;
      exportRequest.status = 'completed';
      exportRequest.completedAt = Date.now();
      exportRequest.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    } catch (error) {
      exportRequest.status = 'failed';
      console.error(`Data export failed for request ${requestId}:`, error);
    }
  }

  private async processDataErasure(requestId: string): Promise<void> {
    const erasureRequest = this.erasureRequests.get(requestId);
    if (!erasureRequest) {return;}

    try {
      erasureRequest.status = 'processing';

      const dataSubject = this.dataSubjects.get(erasureRequest.subjectId);
      if (!dataSubject) {
        erasureRequest.status = 'failed';
        return;
      }

      // Mark as deleted
      dataSubject.anonymizationStatus = 'deleted';

      // Remove or anonymize processing records
      if (erasureRequest.cascadeDelete) {
        this.processingRecords = this.processingRecords.filter(
          record => record.subjectId !== erasureRequest.subjectId,
        );
      } else {
        // Anonymize instead of delete
        await this.anonymizeDataSubject(erasureRequest.subjectId);
      }

      erasureRequest.status = 'completed';
      erasureRequest.completedAt = Date.now();

    } catch (error) {
      erasureRequest.status = 'failed';
      console.error(`Data erasure failed for request ${requestId}:`, error);
    }
  }

  private initializeRetentionScheduler(): void {
    // Check retention policies every 24 hours
    setInterval(() => {
      this.enforceDataRetention();
    }, 24 * 60 * 60 * 1000);

    // Initial check
    setTimeout(() => this.enforceDataRetention(), 5000);
  }

  private enforceDataRetention(): void {
    const now = Date.now();

    // Check each data subject for retention compliance
    for (const [subjectId, dataSubject] of this.dataSubjects.entries()) {
      for (const category of dataSubject.dataCategories) {
        const retentionPeriod = dataSubject.retentionOverrides[category] ||
                              this.config.dataRetention.categories[category] ||
                              this.config.dataRetention.defaultPeriod;

        if (now - dataSubject.createdAt > retentionPeriod) {
          // Data subject exceeds retention period
          this.scheduleDataSubjectDeletion(subjectId, category);
        }
      }
    }

    // Clean up old processing records
    const maxAge = Math.max(...Object.values(this.config.dataRetention.categories));
    this.processingRecords = this.processingRecords.filter(
      record => now - record.timestamp <= maxAge,
    );
  }

  private scheduleDataSubjectDeletion(subjectId: string, category: string): void {
    // In a real implementation, this would schedule proper deletion
    console.log(`Scheduling deletion for subject ${subjectId}, category ${category}`);
  }

  private async checkDataRetentionAfterConsentWithdrawal(subjectId: string): Promise<void> {
    const dataSubject = this.dataSubjects.get(subjectId);
    if (!dataSubject) {return;}

    const activeConsents = dataSubject.consentRecords.filter(
      consent => consent.consentGiven && !consent.withdrawnAt,
    );

    if (activeConsents.length === 0) {
      // No active consents, check if data can be retained under other lawful bases
      const legitimateInterestData = this.processingRecords.filter(
        record => record.subjectId === subjectId &&
                 record.lawfulBasis === 'legitimate_interests',
      );

      if (legitimateInterestData.length === 0) {
        // Schedule data deletion
        await this.requestDataErasure(subjectId, 'consent_withdrawn', { immediateErasure: false });
      }
    }
  }

  private calculateRetentionCompliance(): number {
    const now = Date.now();
    let compliantSubjects = 0;
    let totalSubjects = 0;

    for (const [_subjectId, dataSubject] of this.dataSubjects.entries()) {
      totalSubjects++;
      let subjectCompliant = true;

      for (const category of dataSubject.dataCategories) {
        const retentionPeriod = this.config.dataRetention.categories[category] ||
                              this.config.dataRetention.defaultPeriod;

        if (now - dataSubject.createdAt > retentionPeriod) {
          subjectCompliant = false;
          break;
        }
      }

      if (subjectCompliant) {
        compliantSubjects++;
      }
    }

    return totalSubjects > 0 ? (compliantSubjects / totalSubjects) * 100 : 100;
  }

  private calculateDataMinimizationCompliance(): number {
    if (!this.config.dataMinimization.enabled) {return 100;}

    const recentRecords = this.processingRecords.filter(
      record => Date.now() - record.timestamp <= 30 * 24 * 60 * 60 * 1000, // Last 30 days
    );

    let compliantRecords = 0;
    const totalRecords = recentRecords.length;

    for (const record of recentRecords) {
      const allowedFields = this.config.dataMinimization.allowedFields[record.purpose] || [];
      if (allowedFields.length === 0 || allowedFields.includes(record.dataType)) {
        compliantRecords++;
      }
    }

    return totalRecords > 0 ? (compliantRecords / totalRecords) * 100 : 100;
  }

  private calculateSecurityCompliance(records: DataProcessingRecord[]): number {
    const encryptedRecords = records.filter(record => record.encryptionUsed);
    return records.length > 0 ? (encryptedRecords.length / records.length) * 100 : 100;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check consent expiration
    const expiringConsents = Array.from(this.consentRecords.values()).filter(
      consent => consent.expiresAt &&
                consent.expiresAt - Date.now() <= 30 * 24 * 60 * 60 * 1000, // 30 days
    );

    if (expiringConsents.length > 0) {
      recommendations.push(`${expiringConsents.length} consents are expiring within 30 days`);
    }

    // Check data minimization
    if (this.config.dataMinimization.enabled) {
      const dataMinimizationScore = this.calculateDataMinimizationCompliance();
      if (dataMinimizationScore < 95) {
        recommendations.push('Review data collection practices to improve data minimization compliance');
      }
    }

    // Check retention policies
    const retentionScore = this.calculateRetentionCompliance();
    if (retentionScore < 95) {
      recommendations.push('Review and update data retention policies');
    }

    return recommendations;
  }

  private pseudonymizeEmail(email?: string): string | undefined {
    if (!email) {return undefined;}

    const emailParts = email.split('@');
    if (emailParts.length !== 2) {return undefined;}

    const [local, domain] = emailParts;
    if (!local || !domain) {return undefined;}
    const hash = btoa(local).substring(0, 8);
    return `user_${hash}@${domain}`;
  }

  private aggregateProcessingRecords(subjectId: string): void {
    const subjectRecords = this.processingRecords.filter(
      record => record.subjectId === subjectId,
    );

    // Group by purpose and create aggregated records
    const aggregated = subjectRecords.reduce((acc, record) => {
      const key = record.purpose;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          dataTypes: new Set<string>(),
          firstActivity: record.timestamp,
          lastActivity: record.timestamp,
        };
      }

      acc[key].count++;
      acc[key].dataTypes.add(record.dataType);
      acc[key].lastActivity = Math.max(acc[key].lastActivity, record.timestamp);

      return acc;
    }, {} as Record<string, any>);

    // Replace individual records with aggregated ones
    this.processingRecords = this.processingRecords.filter(
      record => record.subjectId !== subjectId,
    );

    for (const [purpose, stats] of Object.entries(aggregated)) {
      this.processingRecords.push({
        id: this.generateProcessingId(),
        subjectId: `anonymized_${btoa(subjectId).substring(0, 8)}`,
        dataType: 'aggregated',
        purpose,
        lawfulBasis: 'legitimate_interests',
        processingActivity: 'aggregated_analytics',
        timestamp: stats.lastActivity,
        dataLocation: 'internal_database',
        retentionPeriod: this.config.dataRetention.defaultPeriod,
        thirdPartySharing: false,
        encryptionUsed: true,
        metadata: {
          aggregated: true,
          count: stats.count,
          dataTypes: Array.from(stats.dataTypes),
          period: {
            start: stats.firstActivity,
            end: stats.lastActivity,
          },
        },
      });
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use proper CSV library
    const lines: string[] = [];

    // Headers
    lines.push('Type,ID,Timestamp,Data');

    // Subject data
    lines.push(`Subject,${data.subject.id},${data.subject.createdAt},${JSON.stringify(data.subject).replace(/,/g, ';')}`);

    // Consents
    for (const consent of data.consents) {
      lines.push(`Consent,${consent.id},${consent.timestamp},${JSON.stringify(consent).replace(/,/g, ';')}`);
    }

    return lines.join('\n');
  }

  private convertToXML(data: any): string {
    // Simplified XML conversion - in production, use proper XML library
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<gdpr-export>\n';

    xml += '  <subject>\n';
    xml += `    <id>${data.subject.id}</id>\n`;
    xml += `    <email>${data.subject.email || ''}</email>\n`;
    xml += `    <created-at>${data.subject.createdAt}</created-at>\n`;
    xml += '  </subject>\n';

    xml += '  <consents>\n';
    for (const consent of data.consents) {
      xml += '    <consent>\n';
      xml += `      <id>${consent.id}</id>\n`;
      xml += `      <purpose>${consent.purpose}</purpose>\n`;
      xml += `      <given>${consent.consentGiven}</given>\n`;
      xml += '    </consent>\n';
    }
    xml += '  </consents>\n';

    xml += '</gdpr-export>';
    return xml;
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateProcessingId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
