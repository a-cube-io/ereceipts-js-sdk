/**
 * Integration tests for PEMsResource - OpenAPI Implementation
 * Tests for the new OpenAPI-based PEMs (Point of Electronic Memorization) resource
 */

import { PEMsResource, type CertificateInfo, type PEMConfiguration } from '@/resources/pems';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError, FiscalError } from '@/errors/index';
import { TestDataFactory, MockResponses, HttpTestHelpers } from '../setup';
import type { PointOfSaleCreateInput, PointOfSaleOutput } from '@/resources/pems';

describe('PEMsResource - OpenAPI Implementation', () => {
  let pemsResource: PEMsResource;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    });
    pemsResource = new PEMsResource(httpClient);
  });

  describe('createPointOfSale()', () => {
    it('should create a Point of Sale with valid data', async () => {
      const posInput: PointOfSaleCreateInput = TestDataFactory.createPointOfSaleInput();
      
      const createdPOS: PointOfSaleOutput = MockResponses.pointOfSaleCreated;

      HttpTestHelpers.mockFetchSuccess(createdPOS, 201);

      const result = await pemsResource.createPointOfSale(posInput);

      expect(result).toEqual(createdPOS);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/pems/pos', {
        method: 'POST',
        body: JSON.stringify(posInput),
      });
    });

    it('should validate merchant UUID requirement', async () => {
      const invalidPOSInput: PointOfSaleCreateInput = {
        ...TestDataFactory.createPointOfSaleInput(),
        merchant_uuid: '', // Empty merchant UUID
      };

      await expect(
        pemsResource.createPointOfSale(invalidPOSInput)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate address requirement', async () => {
      const posInputWithoutAddress: PointOfSaleCreateInput = {
        ...TestDataFactory.createPointOfSaleInput(),
        address: undefined as any,
      };

      await expect(
        pemsResource.createPointOfSale(posInputWithoutAddress)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate address completeness', async () => {
      const posInputWithIncompleteAddress: PointOfSaleCreateInput = {
        ...TestDataFactory.createPointOfSaleInput(),
        address: {
          street_address: '', // Missing street address
          zip_code: '00100',
          city: 'Roma',
          province: 'RM',
        },
      };

      await expect(
        pemsResource.createPointOfSale(posInputWithIncompleteAddress)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getCertificates()', () => {
    it('should get certificates for a Point of Sale', async () => {
      const posId = 'E001-000001';
      const mockCertificatesResponse = {
        mtls_certificate: 'LS0tLS1CRUdJTi...',
        private_key: 'LS0tLS1CRUdJTi...',
      };
      
      HttpTestHelpers.mockFetchSuccess(mockCertificatesResponse);

      const result = await pemsResource.getCertificates(posId);

      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'mtls_cert',
          type: 'device',
          status: 'valid',
          issuer: 'Italian Tax Agency',
        })
      ]));
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/pems/${posId}/certificates`);
    });

    it('should handle empty certificate response', async () => {
      const posId = 'E001-000001';
      
      HttpTestHelpers.mockFetchSuccess({});

      const result = await pemsResource.getCertificates(posId);

      expect(result).toEqual([]);
    });
  });

  describe('validateCertificateChain()', () => {
    it('should validate certificate chain', async () => {
      const posId = 'E001-000001';
      const mockCertificatesResponse = {
        mtls_certificate: 'LS0tLS1CRUdJTi...',
        private_key: 'LS0tLS1CRUdJTi...',
      };
      
      HttpTestHelpers.mockFetchSuccess(mockCertificatesResponse);

      await expect(
        pemsResource.validateCertificateChain(posId)
      ).rejects.toThrow(FiscalError); // Will throw because no root certificate
    });
  });

  describe('getConfiguration()', () => {
    it('should get PEM configuration', async () => {
      const posId = 'E001-000001';
      const mockCertificatesResponse = {
        mtls_certificate: 'LS0tLS1CRUdJTi...',
        private_key: 'LS0tLS1CRUdJTi...',
      };
      
      HttpTestHelpers.mockFetchSuccess(mockCertificatesResponse);

      const result = await pemsResource.getConfiguration(posId);

      expect(result).toMatchObject({
        pemId: posId,
        deviceSerialNumber: expect.any(String),
        certificates: expect.any(Array),
        configuration: expect.objectContaining({
          fiscalMemorySize: '32MB',
          supportedOperations: expect.any(Array),
          maxDailyTransactions: 1000,
          complianceVersion: '2.1.0',
        }),
        status: expect.any(String),
      });
    });
  });

  describe('checkCompliance()', () => {
    it('should check compliance status', async () => {
      const posId = 'E001-000001';
      const mockCertificatesResponse = {
        mtls_certificate: 'LS0tLS1CRUdJTi...',
        private_key: 'LS0tLS1CRUdJTi...',
      };
      
      HttpTestHelpers.mockFetchSuccess(mockCertificatesResponse);

      const result = await pemsResource.checkCompliance(posId);

      expect(result).toMatchObject({
        level: expect.any(String),
        score: expect.any(Number),
        issues: expect.any(Array),
        recommendations: expect.any(Array),
        lastCheck: expect.any(String),
        nextCheck: expect.any(String),
      });
    });
  });

  describe('requestCertificateRenewal()', () => {
    it('should request certificate renewal', async () => {
      const posId = 'E001-000001';

      const result = await pemsResource.requestCertificateRenewal(posId, 'device');

      expect(result).toMatchObject({
        renewalId: expect.stringMatching(/^renewal_\d+$/),
        estimatedCompletion: expect.any(String),
      });
    });
  });

  describe('Static utility methods', () => {
    describe('buildCertificateChain()', () => {
      it('should build certificate chain with root and device certificates', () => {
        const certificates: CertificateInfo[] = [
          {
            id: 'root_cert',
            type: 'root',
            status: 'valid',
            issuer: 'Root CA',
            subject: 'Root Certificate',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: '2025-01-01T00:00:00Z',
            serialNumber: 'ROOT001',
            fingerprint: 'abc123...',
            keyUsage: ['keyCertSign'],
            issuedFor: 'Root CA',
          },
          {
            id: 'device_cert',
            type: 'device',
            status: 'valid',
            issuer: 'Root CA',
            subject: 'Device Certificate',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: '2025-01-01T00:00:00Z',
            serialNumber: 'DEV001',
            fingerprint: 'def456...',
            keyUsage: ['digitalSignature'],
            issuedFor: 'PEM Device',
          },
        ];

        const result = PEMsResource.buildCertificateChain(certificates);

        expect(result).toMatchObject({
          root: expect.objectContaining({ type: 'root' }),
          leaf: expect.objectContaining({ type: 'device' }),
          validationResults: expect.objectContaining({
            chainValid: expect.any(Boolean),
            rootTrusted: true,
            notExpired: true,
          }),
        });
      });

      it('should throw error for incomplete certificate chain', () => {
        const incompleteCertificates: CertificateInfo[] = [
          {
            id: 'device_cert',
            type: 'device',
            status: 'valid',
            issuer: 'Unknown CA',
            subject: 'Device Certificate',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: '2025-01-01T00:00:00Z',
            serialNumber: 'DEV001',
            fingerprint: 'def456...',
            keyUsage: ['digitalSignature'],
            issuedFor: 'PEM Device',
          },
        ];

        expect(() => PEMsResource.buildCertificateChain(incompleteCertificates))
          .toThrow(FiscalError);
      });
    });

    describe('buildPEMConfiguration()', () => {
      it('should build PEM configuration from certificates', () => {
        const posId = 'E001-000001';
        const certificates: CertificateInfo[] = [
          {
            id: 'device_cert',
            type: 'device',
            status: 'valid',
            issuer: 'Italian Tax Agency',
            subject: 'PEM Device',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: '2025-01-01T00:00:00Z',
            serialNumber: 'DEV001',
            fingerprint: 'abc123...',
            keyUsage: ['digitalSignature'],
            issuedFor: 'PEM Device',
          },
        ];

        const result = PEMsResource.buildPEMConfiguration(posId, certificates);

        expect(result).toMatchObject({
          pemId: posId,
          deviceSerialNumber: 'DEV001',
          certificates,
          configuration: expect.objectContaining({
            fiscalMemorySize: '32MB',
            supportedOperations: expect.arrayContaining(['sale', 'return', 'void']),
            maxDailyTransactions: 1000,
            complianceVersion: '2.1.0',
          }),
          status: expect.any(String),
        });
      });
    });

    describe('assessCompliance()', () => {
      it('should assess compliance for valid configuration', () => {
        const config: PEMConfiguration = {
          pemId: 'E001-000001' as any,
          deviceSerialNumber: 'DEV001',
          certificates: [
            {
              id: 'device_cert',
              type: 'device',
              status: 'valid',
              issuer: 'Italian Tax Agency',
              subject: 'PEM Device',
              validFrom: '2024-01-01T00:00:00Z',
              validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
              serialNumber: 'DEV001',
              fingerprint: 'abc123...',
              keyUsage: ['digitalSignature'],
              issuedFor: 'PEM Device',
            },
          ],
          configuration: {
            fiscalMemorySize: '32MB',
            supportedOperations: ['sale', 'return'],
            maxDailyTransactions: 1000,
            complianceVersion: '2.1.0',
          },
          status: 'active',
          lastAudit: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        };

        const result = PEMsResource.assessCompliance(config);

        expect(result).toMatchObject({
          level: expect.any(String),
          score: expect.any(Number),
          issues: expect.any(Array),
          recommendations: expect.any(Array),
          lastCheck: expect.any(String),
          nextCheck: expect.any(String),
        });
        expect(result.score).toBeGreaterThan(0);
      });
    });

    describe('formatCertificateForDisplay()', () => {
      it('should format certificate for display', () => {
        const certificate: CertificateInfo = {
          id: 'device_cert',
          type: 'device',
          status: 'valid',
          issuer: 'Italian Tax Agency, OU=PKI, C=IT',
          subject: 'PEM Device',
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2025-01-01T00:00:00Z',
          serialNumber: 'DEV001',
          fingerprint: 'abc123...',
          keyUsage: ['digitalSignature'],
          issuedFor: 'PEM Device',
        };

        const result = PEMsResource.formatCertificateForDisplay(certificate);

        expect(result).toMatchObject({
          displayName: 'DEVICE Certificate',
          statusBadge: 'VALID',
          validity: '2024-01-01 to 2025-01-01',
          issuerShort: 'Italian Tax Agency',
          expiresIn: expect.any(String),
        });
      });
    });

    describe('generateCertificateSummary()', () => {
      it('should generate certificate summary', () => {
        const certificates: CertificateInfo[] = [
          {
            id: 'valid_cert',
            type: 'device',
            status: 'valid',
            issuer: 'Italian Tax Agency',
            subject: 'Valid Certificate',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            serialNumber: 'VALID001',
            fingerprint: 'abc123...',
            keyUsage: ['digitalSignature'],
            issuedFor: 'PEM Device',
          },
          {
            id: 'expired_cert',
            type: 'signing',
            status: 'expired',
            issuer: 'Italian Tax Agency',
            subject: 'Expired Certificate',
            validFrom: '2023-01-01T00:00:00Z',
            validTo: '2023-12-31T23:59:59Z',
            serialNumber: 'EXP001',
            fingerprint: 'def456...',
            keyUsage: ['digitalSignature'],
            issuedFor: 'PEM Device',
          },
        ];

        const result = PEMsResource.generateCertificateSummary(certificates);

        expect(result).toMatchObject({
          totalCertificates: 2,
          validCertificates: expect.any(Number),
          expiredCertificates: expect.any(Number),
          expiringSoon: expect.any(Number),
          revokedCertificates: 0,
          typeBreakdown: expect.objectContaining({
            device: 1,
            signing: 1,
          }),
          nextExpiry: expect.any(String),
        });
      });
    });

    describe('validateCertificateSignature()', () => {
      it('should validate certificate signature', () => {
        const certificate: CertificateInfo = {
          id: 'device_cert',
          type: 'device',
          status: 'valid',
          issuer: 'Italian Tax Agency',
          subject: 'PEM Device',
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2025-01-01T00:00:00Z',
          serialNumber: 'DEV001',
          fingerprint: 'abc123...',
          keyUsage: ['digitalSignature'],
          issuedFor: 'PEM Device',
        };

        const result = PEMsResource.validateCertificateSignature(certificate);

        expect(result).toMatchObject({
          valid: expect.any(Boolean),
        });
      });
    });

    describe('generateRenewalRequest()', () => {
      it('should generate certificate renewal request', () => {
        const certificate: CertificateInfo = {
          id: 'device_cert',
          type: 'device',
          status: 'valid',
          issuer: 'Italian Tax Agency',
          subject: 'PEM Device',
          validFrom: '2024-01-01T00:00:00Z',
          validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
          serialNumber: 'DEV001',
          fingerprint: 'abc123...',
          keyUsage: ['digitalSignature'],
          issuedFor: 'PEM Device',
        };

        const result = PEMsResource.generateRenewalRequest(certificate);

        expect(result).toMatchObject({
          certificateId: 'device_cert',
          currentExpiry: certificate.validTo,
          requestedValidityPeriod: 365,
          justification: expect.any(String),
          urgency: 'medium', // 15 days remaining
        });
      });
    });
  });
});