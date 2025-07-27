import { B as BaseOpenAPIResource, H as HttpClient, c as components, P as PEMId } from '../generated-CJUuxFn-.js';
import 'eventemitter3';

/**
 * PEMs Resource - OpenAPI Implementation
 * Type-safe implementation for Point of Sale Module certificate management
 *
 * Features:
 * - PEM certificate lifecycle management
 * - Point of Sale creation and configuration
 * - Certificate validation and renewal
 * - Compliance and audit tracking
 */

type PointOfSaleCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateInput'];
type PointOfSaleOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateOutput'];
interface PEMValidationOptions {
    validateCertificateChain?: boolean;
    checkExpirationDate?: boolean;
    enforceComplianceRules?: boolean;
    validateSignatures?: boolean;
}
interface CertificateInfo {
    id: string;
    type: CertificateType;
    status: CertificateStatus;
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
    serialNumber: string;
    fingerprint: string;
    keyUsage: string[];
    issuedFor: string;
}
interface CertificateChain {
    root: CertificateInfo;
    intermediate?: CertificateInfo[];
    leaf: CertificateInfo;
    validationResults: {
        chainValid: boolean;
        rootTrusted: boolean;
        notExpired: boolean;
        revocationChecked: boolean;
        issues: string[];
    };
}
interface PEMConfiguration {
    pemId: PEMId;
    deviceSerialNumber: string;
    certificates: CertificateInfo[];
    configuration: {
        fiscalMemorySize: string;
        supportedOperations: string[];
        maxDailyTransactions: number;
        complianceVersion: string;
    };
    status: PEMStatus;
    lastAudit?: string;
    nextCertificateRenewal?: string;
}
type CertificateType = 'root' | 'intermediate' | 'device' | 'signing' | 'encryption';
type CertificateStatus = 'valid' | 'expired' | 'revoked' | 'pending' | 'invalid';
type PEMStatus = 'active' | 'inactive' | 'maintenance' | 'compliance_check' | 'certificate_renewal';
type ComplianceLevel = 'full' | 'partial' | 'non_compliant' | 'under_review';
/**
 * PEMs Resource Class - OpenAPI Based
 * Manages PEM devices and certificates with full Italian compliance
 */
declare class PEMsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Create a new Point of Sale
     *
     * @param data - Point of Sale creation input data
     * @param options - Validation options
     * @returns Promise resolving to created Point of Sale
     */
    createPointOfSale(data: PointOfSaleCreateInput, options?: PEMValidationOptions): Promise<PointOfSaleOutput>;
    /**
     * Get certificates for a Point of Sale
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to certificate information
     */
    getCertificates(posId: PEMId | string): Promise<CertificateInfo[]>;
    /**
     * Validate certificate chain for a PEM device
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to certificate chain validation
     */
    validateCertificateChain(posId: PEMId | string): Promise<CertificateChain>;
    /**
     * Get PEM configuration and status
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to PEM configuration
     */
    getConfiguration(posId: PEMId | string): Promise<PEMConfiguration>;
    /**
     * Check compliance status for a PEM device
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to compliance assessment
     */
    checkCompliance(posId: PEMId | string): Promise<{
        level: ComplianceLevel;
        score: number;
        issues: string[];
        recommendations: string[];
        lastCheck: string;
        nextCheck: string;
    }>;
    /**
     * Request certificate renewal for a PEM device
     *
     * @param posId - Point of Sale ID
     * @param certificateType - Type of certificate to renew
     * @returns Promise resolving when renewal is initiated
     */
    requestCertificateRenewal(_posId: PEMId | string, _certificateType?: CertificateType): Promise<{
        renewalId: string;
        estimatedCompletion: string;
    }>;
    /**
     * Validate Point of Sale input
     */
    private validatePointOfSaleInput;
    /**
     * Validate address information
     */
    private validateAddress;
    /**
     * Validate certificates
     * @deprecated This method is not used since certificates field is not available in OpenAPI schema
     */
    /**
     * Parse certificate response from API
     */
    private parseCertificateResponse;
    /**
     * Build certificate chain from individual certificates
     */
    static buildCertificateChain(certificates: CertificateInfo[]): CertificateChain;
    /**
     * Validate certificate chain integrity
     */
    private static validateCertificateChain;
    /**
     * Build PEM configuration from certificates
     */
    static buildPEMConfiguration(posId: PEMId | string, certificates: CertificateInfo[]): PEMConfiguration;
    /**
     * Determine PEM status based on certificates
     */
    private static determinePEMStatus;
    /**
     * Calculate next certificate renewal date
     */
    private static calculateNextRenewal;
    /**
     * Assess compliance level
     */
    static assessCompliance(config: PEMConfiguration): {
        level: ComplianceLevel;
        score: number;
        issues: string[];
        recommendations: string[];
        lastCheck: string;
        nextCheck: string;
    };
    /**
     * Format certificate for display
     */
    static formatCertificateForDisplay(cert: CertificateInfo): {
        displayName: string;
        statusBadge: string;
        validity: string;
        issuerShort: string;
        expiresIn: string;
    };
    /**
     * Generate certificate summary report
     */
    static generateCertificateSummary(certificates: CertificateInfo[]): {
        totalCertificates: number;
        validCertificates: number;
        expiredCertificates: number;
        expiringSoon: number;
        revokedCertificates: number;
        typeBreakdown: Record<CertificateType, number>;
        nextExpiry: string | null;
    };
    /**
     * Validate certificate signature (placeholder implementation)
     */
    static validateCertificateSignature(cert: CertificateInfo, issuerCert?: CertificateInfo): {
        valid: boolean;
        error?: string;
    };
    /**
     * Generate certificate renewal request
     */
    static generateRenewalRequest(cert: CertificateInfo): {
        certificateId: string;
        currentExpiry: string;
        requestedValidityPeriod: number;
        justification: string;
        urgency: 'low' | 'medium' | 'high' | 'critical';
    };
}

export { type CertificateChain, type CertificateInfo, type CertificateStatus, type CertificateType, type ComplianceLevel, type PEMConfiguration, type PEMStatus, type PEMValidationOptions, PEMsResource as PEMs, PEMsResource, type PointOfSaleCreateInput, type PointOfSaleOutput };
