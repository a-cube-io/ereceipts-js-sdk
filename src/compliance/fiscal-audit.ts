/**
 * Fiscal Audit Compliance for A-Cube SDK
 * Provides comprehensive fiscal compliance tools for Italian tax system
 */

export interface FiscalConfig {
  enabled: boolean;
  taxRegion: 'IT' | 'EU' | 'GLOBAL';
  retentionPeriod: number; // 10 years for Italian fiscal law
  digitalSignature: {
    required: boolean;
    algorithm: 'ECDSA' | 'RSA-PSS';
    certificateValidation: boolean;
  };
  receiptSequencing: {
    enforceSequential: boolean;
    allowGaps: boolean;
    maxGapSize: number;
  };
  auditTrail: {
    immutable: boolean;
    hashChaining: boolean;
    timestamping: boolean;
  };
  compliance: {
    agenziaEntrate: boolean; // Italian Revenue Agency
    vatCompliance: boolean;
    antiMoneyLaundering: boolean;
  };
}

export interface FiscalDocument {
  id: string;
  type: 'receipt' | 'invoice' | 'credit_note' | 'fiscal_report';
  sequenceNumber: number;
  fiscalYear: number;
  documentNumber: string;
  timestamp: number;
  amount: {
    net: number;
    vat: number;
    total: number;
    currency: string;
  };
  merchant: {
    vatNumber: string;
    fiscalCode: string;
    name: string;
    address: string;
  };
  customer?: {
    vatNumber?: string;
    fiscalCode?: string;
    name?: string;
  };
  items: FiscalLineItem[];
  vat: VATBreakdown[];
  paymentMethod: string;
  digitalSignature?: string;
  hash: string;
  previousHash?: string;
  auditTrail: FiscalAuditEntry[];
  compliance: {
    agenziaEntrateCompliant: boolean;
    vatCompliant: boolean;
    fiscallyValid: boolean;
    warnings: string[];
  };
  metadata: {
    pos_id?: string;
    operator_id?: string;
    location?: string;
    device_serial?: string;
  };
}

export interface FiscalLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  category?: string;
  sku?: string;
}

export interface VATBreakdown {
  rate: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  category: 'standard' | 'reduced' | 'exempt' | 'zero';
}

export interface FiscalAuditEntry {
  id: string;
  timestamp: number;
  action: 'created' | 'modified' | 'voided' | 'transmitted' | 'archived';
  userId: string;
  details: Record<string, any>;
  hash: string;
  signature?: string;
}

export interface FiscalPeriod {
  year: number;
  month?: number;
  quarter?: number;
  startDate: number;
  endDate: number;
  status: 'open' | 'closed' | 'transmitted' | 'archived';
  documents: string[]; // Document IDs
  summary: {
    totalDocuments: number;
    totalAmount: number;
    totalVAT: number;
    byType: Record<string, number>;
    byVATRate: Record<string, number>;
  };
  transmissionData?: {
    transmittedAt: number;
    batchId: string;
    acknowledgmentId?: string;
    status: 'pending' | 'accepted' | 'rejected';
  };
}

export interface FiscalViolation {
  id: string;
  type: 'sequence_gap' | 'invalid_vat' | 'missing_signature' | 'retention_violation' | 'transmission_failure';
  severity: 'warning' | 'error' | 'critical';
  documentId?: string;
  description: string;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: string;
  automaticResolution: boolean;
  metadata: Record<string, any>;
}

export interface FiscalReport {
  id: string;
  type: 'vat_summary' | 'sales_summary' | 'audit_trail' | 'compliance_check';
  period: FiscalPeriod;
  generatedAt: number;
  generatedBy: string;
  data: any;
  hash: string;
  signature?: string;
  format: 'json' | 'xml' | 'pdf';
  compliance: {
    agenziaEntrateFormat: boolean;
    digitallyValid: boolean;
    complete: boolean;
  };
}

export class FiscalAuditManager {
  private config: FiscalConfig;

  private documents = new Map<string, FiscalDocument>();

  private periods = new Map<string, FiscalPeriod>();

  private violations: FiscalViolation[] = [];

  private sequenceCounters = new Map<string, number>(); // type -> last sequence number

  private auditChain: string[] = []; // Hash chain for immutability

  private reports = new Map<string, FiscalReport>();

  constructor(config?: Partial<FiscalConfig>) {
    this.config = {
      enabled: true,
      taxRegion: 'IT',
      retentionPeriod: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
      digitalSignature: {
        required: true,
        algorithm: 'ECDSA',
        certificateValidation: true,
      },
      receiptSequencing: {
        enforceSequential: true,
        allowGaps: false,
        maxGapSize: 0,
      },
      auditTrail: {
        immutable: true,
        hashChaining: true,
        timestamping: true,
      },
      compliance: {
        agenziaEntrate: true,
        vatCompliance: true,
        antiMoneyLaundering: true,
      },
      ...config,
    };

    if (this.config.enabled) {
      this.initializeFiscalSystem();
    }
  }

  /**
   * Create a fiscal document (receipt, invoice, etc.)
   */
  async createFiscalDocument(
    type: FiscalDocument['type'],
    merchantInfo: FiscalDocument['merchant'],
    items: FiscalLineItem[],
    paymentMethod: string,
    customerInfo?: FiscalDocument['customer'],
    metadata?: FiscalDocument['metadata'],
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Fiscal audit system is disabled');
    }

    const documentId = this.generateDocumentId();
    const timestamp = Date.now();
    const fiscalYear = new Date(timestamp).getFullYear();

    // Generate sequence number
    const sequenceKey = `${type}_${fiscalYear}`;
    const sequenceNumber = this.getNextSequenceNumber(sequenceKey);

    // Validate sequence if required
    if (this.config.receiptSequencing.enforceSequential) {
      await this.validateSequence(type, sequenceNumber, fiscalYear);
    }

    // Calculate amounts and VAT
    const { amount, vat } = this.calculateAmounts(items);

    // Validate VAT compliance
    if (this.config.compliance.vatCompliance) {
      this.validateVATCompliance(items, vat);
    }

    // Create document
    const document: FiscalDocument = {
      id: documentId,
      type,
      sequenceNumber,
      fiscalYear,
      documentNumber: this.generateDocumentNumber(type, sequenceNumber, fiscalYear),
      timestamp,
      amount,
      merchant: merchantInfo,
      ...(customerInfo && { customer: customerInfo }),
      items,
      vat,
      paymentMethod,
      hash: '', // Will be calculated
      previousHash: this.getLastDocumentHash() || '',
      auditTrail: [],
      compliance: {
        agenziaEntrateCompliant: false,
        vatCompliant: false,
        fiscallyValid: false,
        warnings: [],
      },
      metadata: metadata || {},
    };

    // Calculate document hash
    document.hash = await this.calculateDocumentHash(document);

    // Add to audit chain
    if (this.config.auditTrail.hashChaining) {
      this.auditChain.push(document.hash);
    }

    // Create initial audit entry
    const auditEntry: FiscalAuditEntry = {
      id: this.generateAuditId(),
      timestamp,
      action: 'created',
      userId: metadata?.operator_id || 'system',
      details: {
        type,
        amount: amount.total,
        sequenceNumber,
        itemCount: items.length,
      },
      hash: await this.calculateAuditHash(documentId, 'created', timestamp),
    };

    document.auditTrail.push(auditEntry);

    // Digital signature if required
    if (this.config.digitalSignature.required) {
      document.digitalSignature = await this.signDocument(document);
    }

    // Validate compliance
    document.compliance = await this.validateCompliance(document);

    // Store document
    this.documents.set(documentId, document);

    // Update fiscal period
    await this.updateFiscalPeriod(document);

    // Check for violations
    await this.checkForViolations(document);

    return documentId;
  }

  /**
   * Void a fiscal document
   */
  async voidFiscalDocument(
    documentId: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check if document can be voided
    const voidDeadline = document.timestamp + (24 * 60 * 60 * 1000); // 24 hours
    if (Date.now() > voidDeadline && this.config.taxRegion === 'IT') {
      throw new Error('Document cannot be voided after 24 hours (Italian fiscal law)');
    }

    // Create void audit entry
    const auditEntry: FiscalAuditEntry = {
      id: this.generateAuditId(),
      timestamp: Date.now(),
      action: 'voided',
      userId,
      details: {
        reason,
        originalAmount: document.amount.total,
        voidedAt: Date.now(),
      },
      hash: await this.calculateAuditHash(documentId, 'voided', Date.now()),
    };

    document.auditTrail.push(auditEntry);

    // Recalculate document hash with void
    document.hash = await this.calculateDocumentHash(document);

    // Update fiscal period
    await this.updateFiscalPeriod(document);
  }

  /**
   * Generate fiscal period report
   */
  async generateFiscalReport(
    type: FiscalReport['type'],
    year: number,
    month?: number,
    quarter?: number,
  ): Promise<string> {
    const periodKey = this.generatePeriodKey(year, month, quarter);
    const period = this.periods.get(periodKey);

    if (!period) {
      throw new Error(`Fiscal period not found: ${periodKey}`);
    }

    const reportId = this.generateReportId();
    const timestamp = Date.now();

    let reportData: any;

    switch (type) {
      case 'vat_summary':
        reportData = await this.generateVATSummary(period);
        break;
      case 'sales_summary':
        reportData = await this.generateSalesSummary(period);
        break;
      case 'audit_trail':
        reportData = await this.generateAuditTrailReport(period);
        break;
      case 'compliance_check':
        reportData = await this.generateComplianceReport(period);
        break;
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }

    const report: FiscalReport = {
      id: reportId,
      type,
      period,
      generatedAt: timestamp,
      generatedBy: 'system',
      data: reportData,
      hash: '', // Will be calculated
      format: 'json',
      compliance: {
        agenziaEntrateFormat: this.config.compliance.agenziaEntrate,
        digitallyValid: false,
        complete: true,
      },
    };

    // Calculate report hash
    report.hash = await this.calculateReportHash(report);

    // Digital signature if required
    if (this.config.digitalSignature.required) {
      report.signature = await this.signReport(report);
      report.compliance.digitallyValid = true;
    }

    this.reports.set(reportId, report);
    return reportId;
  }

  /**
   * Validate fiscal document integrity
   */
  async validateDocumentIntegrity(documentId: string): Promise<{
    isValid: boolean;
    issues: string[];
    hashChainValid: boolean;
    signatureValid: boolean;
  }> {
    const document = this.documents.get(documentId);
    if (!document) {
      return {
        isValid: false,
        issues: ['Document not found'],
        hashChainValid: false,
        signatureValid: false,
      };
    }

    const issues: string[] = [];

    // Verify document hash
    const calculatedHash = await this.calculateDocumentHash(document);
    const hashValid = calculatedHash === document.hash;
    if (!hashValid) {
      issues.push('Document hash mismatch');
    }

    // Verify hash chain
    let hashChainValid = true;
    if (this.config.auditTrail.hashChaining && document.previousHash) {
      const previousDocument = this.findDocumentByHash(document.previousHash);
      if (!previousDocument) {
        hashChainValid = false;
        issues.push('Previous document not found in chain');
      }
    }

    // Verify digital signature
    let signatureValid = true;
    if (this.config.digitalSignature.required && document.digitalSignature) {
      signatureValid = await this.verifyDocumentSignature(document);
      if (!signatureValid) {
        issues.push('Digital signature invalid');
      }
    }

    // Verify audit trail
    for (const entry of document.auditTrail) {
      const auditHash = await this.calculateAuditHash(
        documentId,
        entry.action,
        entry.timestamp,
      );
      if (auditHash !== entry.hash) {
        issues.push(`Audit entry ${entry.id} hash mismatch`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      hashChainValid,
      signatureValid,
    };
  }

  /**
   * Get fiscal compliance status
   */
  getFiscalComplianceStatus(): {
    overall: 'compliant' | 'warnings' | 'violations';
    documents: {
      total: number;
      compliant: number;
      withWarnings: number;
      withViolations: number;
    };
    periods: {
      open: number;
      closed: number;
      transmitted: number;
    };
    violations: {
      total: number;
      critical: number;
      unresolved: number;
    };
    retention: {
      totalDocuments: number;
      expiringSoon: number; // Within 6 months
      expired: number;
    };
  } {
    const documents = Array.from(this.documents.values());
    const periods = Array.from(this.periods.values());

    const compliantDocs = documents.filter(d => d.compliance.fiscallyValid);
    const warningDocs = documents.filter(d => d.compliance.warnings.length > 0);
    const violationDocs = documents.filter(d => !d.compliance.fiscallyValid);

    const openPeriods = periods.filter(p => p.status === 'open').length;
    const closedPeriods = periods.filter(p => p.status === 'closed').length;
    const transmittedPeriods = periods.filter(p => p.status === 'transmitted').length;

    const criticalViolations = this.violations.filter(v => v.severity === 'critical').length;
    const unresolvedViolations = this.violations.filter(v => !v.resolvedAt).length;

    const now = Date.now();
    const sixMonthsFromNow = now + (6 * 30 * 24 * 60 * 60 * 1000);
    const retentionDeadline = now - this.config.retentionPeriod;

    const expiringSoon = documents.filter(d =>
      d.timestamp + this.config.retentionPeriod > now &&
      d.timestamp + this.config.retentionPeriod <= sixMonthsFromNow,
    ).length;

    const expired = documents.filter(d =>
      d.timestamp < retentionDeadline,
    ).length;

    let overall: 'compliant' | 'warnings' | 'violations' = 'compliant';
    if (criticalViolations > 0 || violationDocs.length > 0) {
      overall = 'violations';
    } else if (warningDocs.length > 0) {
      overall = 'warnings';
    }

    return {
      overall,
      documents: {
        total: documents.length,
        compliant: compliantDocs.length,
        withWarnings: warningDocs.length,
        withViolations: violationDocs.length,
      },
      periods: {
        open: openPeriods,
        closed: closedPeriods,
        transmitted: transmittedPeriods,
      },
      violations: {
        total: this.violations.length,
        critical: criticalViolations,
        unresolved: unresolvedViolations,
      },
      retention: {
        totalDocuments: documents.length,
        expiringSoon,
        expired,
      },
    };
  }

  /**
   * Export fiscal data for tax authorities
   */
  async exportFiscalData(
    year: number,
    format: 'xml' | 'json' = 'xml',
  ): Promise<string> {
    const yearDocuments = Array.from(this.documents.values())
      .filter(doc => doc.fiscalYear === year);

    const exportData = {
      metadata: {
        exportedAt: Date.now(),
        taxYear: year,
        totalDocuments: yearDocuments.length,
        software: 'A-Cube eReceipt SDK',
        version: '2.0.0',
      },
      merchant: yearDocuments[0]?.merchant || {},
      documents: yearDocuments.map(doc => ({
        id: doc.id,
        type: doc.type,
        documentNumber: doc.documentNumber,
        timestamp: doc.timestamp,
        amount: doc.amount,
        vat: doc.vat,
        hash: doc.hash,
        digitalSignature: doc.digitalSignature,
      })),
      summary: {
        totalAmount: yearDocuments.reduce((sum, doc) => sum + doc.amount.total, 0),
        totalVAT: yearDocuments.reduce((sum, doc) => sum + doc.amount.vat, 0),
        documentsByType: this.groupDocumentsByType(yearDocuments),
      },
      compliance: {
        agenziaEntrateCompliant: this.config.compliance.agenziaEntrate,
        retentionCompliant: true,
        digitallyValid: yearDocuments.every(doc => doc.digitalSignature),
      },
    };

    if (format === 'xml') {
      return this.convertToAgenziaEntrateXML(exportData);
    } 
      return JSON.stringify(exportData, null, 2);
    
  }

  private initializeFiscalSystem(): void {
    // Initialize current fiscal period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    this.ensureFiscalPeriod(currentYear, currentMonth);

    // Set up periodic compliance checks
    setInterval(() => {
      this.performPeriodicComplianceCheck();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private getNextSequenceNumber(sequenceKey: string): number {
    const current = this.sequenceCounters.get(sequenceKey) || 0;
    const next = current + 1;
    this.sequenceCounters.set(sequenceKey, next);
    return next;
  }

  private async validateSequence(
    type: string,
    sequenceNumber: number,
    fiscalYear: number,
  ): Promise<void> {
    if (!this.config.receiptSequencing.enforceSequential) {return;}

    const sequenceKey = `${type}_${fiscalYear}`;
    const expectedNumber = (this.sequenceCounters.get(sequenceKey) || 0) + 1;

    if (sequenceNumber !== expectedNumber) {
      if (!this.config.receiptSequencing.allowGaps) {
        throw new Error(`Sequence violation: expected ${expectedNumber}, got ${sequenceNumber}`);
      }

      const gap = Math.abs(sequenceNumber - expectedNumber);
      if (gap > this.config.receiptSequencing.maxGapSize) {
        throw new Error(`Sequence gap too large: ${gap} > ${this.config.receiptSequencing.maxGapSize}`);
      }

      // Record the gap as a violation
      this.recordViolation({
        type: 'sequence_gap',
        severity: 'warning',
        description: `Sequence gap detected: expected ${expectedNumber}, got ${sequenceNumber}`,
        metadata: { type, fiscalYear, expectedNumber, actualNumber: sequenceNumber },
      });
    }
  }

  private calculateAmounts(items: FiscalLineItem[]): {
    amount: FiscalDocument['amount'];
    vat: VATBreakdown[];
  } {
    let netTotal = 0;
    let vatTotal = 0;
    const vatBreakdown = new Map<number, { net: number; vat: number }>();

    for (const item of items) {
      const itemNet = item.quantity * item.unitPrice;
      const itemVat = itemNet * (item.vatRate / 100);

      netTotal += itemNet;
      vatTotal += itemVat;

      // Group by VAT rate
      const existing = vatBreakdown.get(item.vatRate) || { net: 0, vat: 0 };
      existing.net += itemNet;
      existing.vat += itemVat;
      vatBreakdown.set(item.vatRate, existing);
    }

    const vat: VATBreakdown[] = Array.from(vatBreakdown.entries()).map(([rate, amounts]) => ({
      rate,
      netAmount: amounts.net,
      vatAmount: amounts.vat,
      totalAmount: amounts.net + amounts.vat,
      category: this.getVATCategory(rate),
    }));

    return {
      amount: {
        net: netTotal,
        vat: vatTotal,
        total: netTotal + vatTotal,
        currency: 'EUR',
      },
      vat,
    };
  }

  private getVATCategory(rate: number): VATBreakdown['category'] {
    if (rate === 0) {return 'zero';}
    if (rate === 22) {return 'standard';} // Italy standard rate
    if (rate === 10 || rate === 4) {return 'reduced';} // Italy reduced rates
    return 'standard';
  }

  private validateVATCompliance(items: FiscalLineItem[], _vat: VATBreakdown[]): void {
    // Validate Italian VAT rates
    const validRates = [0, 4, 5, 10, 22]; // Valid Italian VAT rates

    for (const item of items) {
      if (!validRates.includes(item.vatRate)) {
        this.recordViolation({
          type: 'invalid_vat',
          severity: 'error',
          description: `Invalid VAT rate: ${item.vatRate}% (item: ${item.description})`,
          metadata: { itemId: item.id, vatRate: item.vatRate },
        });
      }
    }
  }

  private async calculateDocumentHash(document: FiscalDocument): Promise<string> {
    const hashData = {
      id: document.id,
      type: document.type,
      sequenceNumber: document.sequenceNumber,
      timestamp: document.timestamp,
      amount: document.amount,
      merchant: document.merchant,
      items: document.items,
      previousHash: document.previousHash,
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(hashData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async calculateAuditHash(
    documentId: string,
    action: string,
    timestamp: number,
  ): Promise<string> {
    const hashData = `${documentId}:${action}:${timestamp}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async calculateReportHash(report: FiscalReport): Promise<string> {
    const hashData = {
      id: report.id,
      type: report.type,
      period: report.period,
      generatedAt: report.generatedAt,
      data: report.data,
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(hashData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getLastDocumentHash(): string | undefined {
    return this.auditChain[this.auditChain.length - 1];
  }

  private findDocumentByHash(hash: string): FiscalDocument | undefined {
    return Array.from(this.documents.values()).find(doc => doc.hash === hash);
  }

  private async signDocument(document: FiscalDocument): Promise<string> {
    // Simplified digital signature - in production, use proper PKI
    const documentHash = await this.calculateDocumentHash(document);
    return `signature_${documentHash.substring(0, 16)}`;
  }

  private async signReport(report: FiscalReport): Promise<string> {
    // Simplified digital signature - in production, use proper PKI
    const reportHash = await this.calculateReportHash(report);
    return `signature_${reportHash.substring(0, 16)}`;
  }

  private async verifyDocumentSignature(document: FiscalDocument): Promise<boolean> {
    // Simplified verification - in production, use proper PKI
    if (!document.digitalSignature) {return false;}

    const documentHash = await this.calculateDocumentHash(document);
    const expectedSignature = `signature_${documentHash.substring(0, 16)}`;

    return document.digitalSignature === expectedSignature;
  }

  private async validateCompliance(document: FiscalDocument): Promise<FiscalDocument['compliance']> {
    const warnings: string[] = [];
    let agenziaEntrateCompliant = true;
    let vatCompliant = true;
    let fiscallyValid = true;

    // Check Agenzia delle Entrate compliance
    if (this.config.compliance.agenziaEntrate) {
      if (!document.merchant.vatNumber || !document.merchant.fiscalCode) {
        warnings.push('Missing merchant VAT number or fiscal code');
        agenziaEntrateCompliant = false;
      }

      if (!document.digitalSignature && this.config.digitalSignature.required) {
        warnings.push('Missing digital signature');
        agenziaEntrateCompliant = false;
      }
    }

    // Check VAT compliance
    if (this.config.compliance.vatCompliance) {
      const totalVAT = document.vat.reduce((sum, v) => sum + v.vatAmount, 0);
      if (Math.abs(totalVAT - document.amount.vat) > 0.01) {
        warnings.push('VAT calculation mismatch');
        vatCompliant = false;
      }
    }

    fiscallyValid = agenziaEntrateCompliant && vatCompliant;

    return {
      agenziaEntrateCompliant,
      vatCompliant,
      fiscallyValid,
      warnings,
    };
  }

  private generateDocumentNumber(type: string, sequenceNumber: number, fiscalYear: number): string {
    const typePrefix = {
      receipt: 'RC',
      invoice: 'FT',
      credit_note: 'NC',
      fiscal_report: 'RF',
    }[type] || 'DOC';

    return `${typePrefix}${fiscalYear}${String(sequenceNumber).padStart(6, '0')}`;
  }

  private ensureFiscalPeriod(year: number, month?: number, quarter?: number): void {
    const periodKey = this.generatePeriodKey(year, month, quarter);

    if (!this.periods.has(periodKey)) {
      const startDate = month
        ? new Date(year, month - 1, 1).getTime()
        : new Date(year, 0, 1).getTime();

      const endDate = month
        ? new Date(year, month, 0).getTime()
        : new Date(year + 1, 0, 0).getTime();

      const period: FiscalPeriod = {
        year,
        ...(month !== undefined && { month }),
        ...(quarter !== undefined && { quarter }),
        startDate,
        endDate,
        status: 'open',
        documents: [],
        summary: {
          totalDocuments: 0,
          totalAmount: 0,
          totalVAT: 0,
          byType: {},
          byVATRate: {},
        },
      };

      this.periods.set(periodKey, period);
    }
  }

  private async updateFiscalPeriod(document: FiscalDocument): Promise<void> {
    const date = new Date(document.timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    this.ensureFiscalPeriod(year, month);

    const periodKey = this.generatePeriodKey(year, month);
    const period = this.periods.get(periodKey)!;

    // Add document to period if not already present
    if (!period.documents.includes(document.id)) {
      period.documents.push(document.id);

      // Update summary
      period.summary.totalDocuments++;
      period.summary.totalAmount += document.amount.total;
      period.summary.totalVAT += document.amount.vat;

      // Update by type
      period.summary.byType[document.type] = (period.summary.byType[document.type] || 0) + 1;

      // Update by VAT rate
      for (const vat of document.vat) {
        const rateKey = `${vat.rate}%`;
        period.summary.byVATRate[rateKey] = (period.summary.byVATRate[rateKey] || 0) + vat.vatAmount;
      }
    }
  }

  private async checkForViolations(document: FiscalDocument): Promise<void> {
    // Check for missing required fields
    if (this.config.digitalSignature.required && !document.digitalSignature) {
      this.recordViolation({
        type: 'missing_signature',
        severity: 'critical',
        documentId: document.id,
        description: 'Document missing required digital signature',
        metadata: { documentType: document.type },
      });
    }

    // Check VAT compliance
    if (!document.compliance.vatCompliant) {
      this.recordViolation({
        type: 'invalid_vat',
        severity: 'error',
        documentId: document.id,
        description: 'VAT calculation errors detected',
        metadata: { warnings: document.compliance.warnings },
      });
    }
  }

  private recordViolation(violation: Omit<FiscalViolation, 'id' | 'detectedAt' | 'automaticResolution'>): void {
    const fullViolation: FiscalViolation = {
      id: this.generateViolationId(),
      detectedAt: Date.now(),
      automaticResolution: false,
      ...violation,
    };

    this.violations.push(fullViolation);
  }

  private async generateVATSummary(period: FiscalPeriod): Promise<any> {
    const documents = period.documents.map(id => this.documents.get(id)!).filter(Boolean);

    const vatSummary = documents.reduce((summary, doc) => {
      for (const vat of doc.vat) {
        const key = `${vat.rate}%`;
        if (!summary[key]) {
          summary[key] = { netAmount: 0, vatAmount: 0, totalAmount: 0 };
        }
        summary[key].netAmount += vat.netAmount;
        summary[key].vatAmount += vat.vatAmount;
        summary[key].totalAmount += vat.totalAmount;
      }
      return summary;
    }, {} as Record<string, any>);

    return {
      period: `${period.year}-${period.month?.toString().padStart(2, '0') || 'YEAR'}`,
      vatSummary,
      totalNet: Object.values(vatSummary).reduce((sum: number, v: any) => sum + v.netAmount, 0),
      totalVAT: Object.values(vatSummary).reduce((sum: number, v: any) => sum + v.vatAmount, 0),
      totalGross: Object.values(vatSummary).reduce((sum: number, v: any) => sum + v.totalAmount, 0),
    };
  }

  private async generateSalesSummary(period: FiscalPeriod): Promise<any> {
    return {
      period: `${period.year}-${period.month?.toString().padStart(2, '0') || 'YEAR'}`,
      summary: period.summary,
      documents: period.documents.length,
    };
  }

  private async generateAuditTrailReport(period: FiscalPeriod): Promise<any> {
    const documents = period.documents.map(id => this.documents.get(id)!).filter(Boolean);

    const auditEntries = documents.flatMap(doc =>
      doc.auditTrail.map(entry => ({
        documentId: doc.id,
        documentNumber: doc.documentNumber,
        ...entry,
      })),
    );

    return {
      period: `${period.year}-${period.month?.toString().padStart(2, '0') || 'YEAR'}`,
      auditEntries,
      totalEntries: auditEntries.length,
    };
  }

  private async generateComplianceReport(period: FiscalPeriod): Promise<any> {
    const documents = period.documents.map(id => this.documents.get(id)!).filter(Boolean);

    const compliantDocs = documents.filter(doc => doc.compliance.fiscallyValid);
    const nonCompliantDocs = documents.filter(doc => !doc.compliance.fiscallyValid);

    return {
      period: `${period.year}-${period.month?.toString().padStart(2, '0') || 'YEAR'}`,
      complianceRate: documents.length > 0 ? (compliantDocs.length / documents.length) * 100 : 100,
      totalDocuments: documents.length,
      compliantDocuments: compliantDocs.length,
      nonCompliantDocuments: nonCompliantDocs.length,
      violations: this.violations.filter(v =>
        v.documentId && period.documents.includes(v.documentId),
      ),
    };
  }

  private performPeriodicComplianceCheck(): void {
    // Check for documents approaching retention deadline
    const now = Date.now();
    const warningPeriod = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months

    for (const document of this.documents.values()) {
      const retentionDeadline = document.timestamp + this.config.retentionPeriod;

      if (retentionDeadline - now <= warningPeriod && retentionDeadline > now) {
        this.recordViolation({
          type: 'retention_violation',
          severity: 'warning',
          documentId: document.id,
          description: `Document approaching retention deadline`,
          metadata: {
            retentionDeadline,
            daysRemaining: Math.floor((retentionDeadline - now) / (24 * 60 * 60 * 1000)),
          },
        });
      }
    }
  }

  private convertToAgenziaEntrateXML(data: any): string {
    // Simplified XML conversion for Italian Revenue Agency format
    // In production, use proper XML library and official schema
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<DatiFattura versione="1.0">\n';
    xml += '  <DatiGenerali>\n';
    xml += `    <AnnoFiscale>${data.metadata.taxYear}</AnnoFiscale>\n`;
    xml += `    <NumeroDocumenti>${data.metadata.totalDocuments}</NumeroDocumenti>\n`;
    xml += '  </DatiGenerali>\n';
    xml += '  <Documenti>\n';

    for (const doc of data.documents) {
      xml += '    <Documento>\n';
      xml += `      <ID>${doc.id}</ID>\n`;
      xml += `      <Numero>${doc.documentNumber}</Numero>\n`;
      xml += `      <Data>${new Date(doc.timestamp).toISOString().split('T')[0]}</Data>\n`;
      xml += `      <Importo>${doc.amount.total}</Importo>\n`;
      xml += `      <IVA>${doc.amount.vat}</IVA>\n`;
      xml += '    </Documento>\n';
    }

    xml += '  </Documenti>\n';
    xml += '</DatiFattura>';

    return xml;
  }

  private groupDocumentsByType(documents: FiscalDocument[]): Record<string, number> {
    return documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generatePeriodKey(year: number, month?: number, quarter?: number): string {
    if (month) {return `${year}-${month.toString().padStart(2, '0')}`;}
    if (quarter) {return `${year}-Q${quarter}`;}
    return `${year}`;
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
