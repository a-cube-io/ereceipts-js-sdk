/**
 * Integration tests for CashRegistersResource - OpenAPI Implementation
 * Tests for the new OpenAPI-based cash registers resource
 */

import { CashRegistersResource } from '@/resources/cash-registers';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError } from '@/errors/index';
import { MockResponses, HttpTestHelpers } from '../setup';

import type { 
  CashRegisterInput, 
  CashRegisterOutput, 
  CashRegisterValidationOptions,
  CashRegisterPage 
} from '@/resources/cash-registers';

describe('CashRegistersResource - OpenAPI Implementation', () => {
  let cashRegistersResource: CashRegistersResource;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    });
    cashRegistersResource = new CashRegistersResource(httpClient);
  });

  describe('list()', () => {
    it('should list cash registers with pagination', async () => {
      const mockCashRegister: CashRegisterOutput = {
        id: 'cr_123456789',
        pem_serial_number: 'CR001234567890',
        name: 'NCR SelfServ 80',
        mtls_certificate: 'mock_certificate',
        private_key: 'mock_private_key',
      };

      const mockCashRegisterPage: CashRegisterPage = MockResponses.paginatedResponse([mockCashRegister]);

      HttpTestHelpers.mockFetchSuccess(mockCashRegisterPage);

      const result = await cashRegistersResource.list();

      expect(result).toEqual(mockCashRegisterPage);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/cash-registers');
    });

    it('should handle empty pagination parameters', async () => {
      const mockCashRegister: CashRegisterOutput = {
        id: 'cr_987654321',
        pem_serial_number: 'CR009876543210',
        name: 'Diebold Opteva 720',
        mtls_certificate: 'mock_certificate',
        private_key: 'mock_private_key',
      };

      const mockCashRegisterPage: CashRegisterPage = MockResponses.paginatedResponse([mockCashRegister]);

      HttpTestHelpers.mockFetchSuccess(mockCashRegisterPage);

      const result = await cashRegistersResource.list();

      expect(result).toEqual(mockCashRegisterPage);
    });
  });

  describe('create()', () => {
    it('should create a cash register with valid data', async () => {
      const cashRegisterInput: CashRegisterInput = {
        pem_serial_number: 'CR001234567890',
        name: 'NCR SelfServ 80',
      };
      
      const createdCashRegister: CashRegisterOutput = {
        id: 'cr_123456789',
        pem_serial_number: cashRegisterInput.pem_serial_number,
        name: cashRegisterInput.name,
        mtls_certificate: 'mock_certificate',
        private_key: 'mock_private_key',
      };

      HttpTestHelpers.mockFetchSuccess(createdCashRegister, 201);

      const result = await cashRegistersResource.create(cashRegisterInput);

      expect(result).toEqual(createdCashRegister);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/cash-registers', {
        method: 'POST',
        body: JSON.stringify(cashRegisterInput),
      });
    });

    it('should validate serial number format', async () => {
      const invalidCashRegisterInput: CashRegisterInput = {
        pem_serial_number: '123', // Too short
        name: 'NCR SelfServ 80',
      };

      await expect(
        cashRegistersResource.create(invalidCashRegisterInput, { 
          validateSerialNumber: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate name requirement when location validation is enabled', async () => {
      const cashRegisterInput: CashRegisterInput = {
        pem_serial_number: 'CR001234567890',
        name: '', // Empty name
      };

      await expect(
        cashRegistersResource.create(cashRegisterInput, { 
          enforceLocationValidation: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('retrieve()', () => {
    it('should retrieve a cash register by ID', async () => {
      const cashRegisterId = 1;
      const mockCashRegister: CashRegisterOutput = {
        id: 'cr_123456789',
        pem_serial_number: 'CR001234567890',
        name: 'NCR SelfServ 80',
        mtls_certificate: 'mock_certificate',
        private_key: 'mock_private_key',
      };
      
      HttpTestHelpers.mockFetchSuccess(mockCashRegister);

      const result = await cashRegistersResource.retrieve(cashRegisterId);

      expect(result).toEqual(mockCashRegister);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/cash-registers/${cashRegisterId}`);
    });

    it('should handle not found errors', async () => {
      const cashRegisterId = 999;
      
      HttpTestHelpers.mockFetchError(404);

      await expect(
        cashRegistersResource.retrieve(cashRegisterId)
      ).rejects.toThrow();
    });
  });

  describe('getConfiguration()', () => {
    it('should get cash register configuration', async () => {
      const cashRegisterId = 1;
      const mockCashRegister: CashRegisterOutput = {
        id: 'cr_123456789',
        pem_serial_number: 'CR001234567890',
        name: 'NCR SelfServ 80',
        mtls_certificate: 'mock_certificate',
        private_key: 'mock_private_key',
      };

      HttpTestHelpers.mockFetchSuccess(mockCashRegister);

      const result = await cashRegistersResource.getConfiguration(cashRegisterId);

      expect(result).toMatchObject({
        id: mockCashRegister.id,
        name: mockCashRegister.name,
        serialNumber: mockCashRegister.pem_serial_number,
        status: 'active',
      });
    });
  });

  describe('getStatistics()', () => {
    it('should get cash register statistics', async () => {
      const cashRegisterId = 1;
      const mockCashRegister: CashRegisterOutput = {
        id: 'cr_123456789',
        pem_serial_number: 'CR001234567890',
        name: 'NCR SelfServ 80',
        mtls_certificate: 'mock_certificate',
        private_key: 'mock_private_key',
      };

      HttpTestHelpers.mockFetchSuccess(mockCashRegister);

      const result = await cashRegistersResource.getStatistics(cashRegisterId);

      expect(result).toMatchObject({
        registerId: mockCashRegister.id,
        totalTransactions: expect.any(Number),
        totalAmount: expect.any(String),
        averageTransaction: expect.any(String),
        transactionsToday: expect.any(Number),
        amountToday: expect.any(String),
        uptime: expect.objectContaining({
          hours: expect.any(Number),
          percentage: expect.any(Number),
        }),
        errorCount: expect.any(Number),
        maintenanceScore: expect.any(Number),
      });
    });
  });

  describe('Static utility methods', () => {
    describe('validateSerialNumber()', () => {
      it('should validate correct serial number formats', () => {
        const validSerialNumbers = [
          'CR001234567890',
          'NCR-2024-001234',
          'ATM123456789012',
        ];

        validSerialNumbers.forEach(serialNumber => {
          const result = CashRegistersResource.validateSerialNumber(serialNumber);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid serial number formats', () => {
        const invalidSerialNumbers = [
          '123',           // Too short
          '',              // Empty
          'CR@#$%',        // Invalid characters
          'a very long serial number that exceeds the maximum allowed length', // Too long
        ];

        invalidSerialNumbers.forEach(serialNumber => {
          const result = CashRegistersResource.validateSerialNumber(serialNumber);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });
    });

    describe('buildConfiguration()', () => {
      it('should build configuration from cash register data', () => {
        const cashRegister: CashRegisterOutput = {
          id: 'cr_123456789',
          pem_serial_number: 'CR001234567890',
          name: 'NCR SelfServ 80',
          mtls_certificate: 'mock_certificate',
          private_key: 'mock_private_key',
        };

        const result = CashRegistersResource.buildConfiguration(cashRegister);

        expect(result).toMatchObject({
          id: cashRegister.id,
          name: cashRegister.name,
          serialNumber: cashRegister.pem_serial_number,
          status: 'active',
          settings: expect.objectContaining({
            printReceipts: expect.any(Boolean),
            enableLottery: expect.any(Boolean),
            defaultVATRate: expect.any(String),
            language: expect.any(String),
            currency: 'EUR',
          }),
        });
      });
    });

    describe('getDefaultSettings()', () => {
      it('should return default settings', () => {
        const settings = CashRegistersResource.getDefaultSettings();

        expect(settings).toMatchObject({
          printReceipts: true,
          enableLottery: true,
          defaultVATRate: '22',
          language: 'it',
          currency: 'EUR',
          timezone: 'Europe/Rome',
          paperSize: 'thermal_80mm',
          connectionType: 'ethernet',
        });
      });
    });

    describe('calculateStatistics()', () => {
      it('should calculate statistics for a cash register', () => {
        const cashRegister: CashRegisterOutput = {
          id: 'cr_123456789',
          pem_serial_number: 'CR001234567890',
          name: 'NCR SelfServ 80',
          mtls_certificate: 'mock_certificate',
          private_key: 'mock_private_key',
        };

        const result = CashRegistersResource.calculateStatistics(cashRegister);

        expect(result).toMatchObject({
          registerId: cashRegister.id,
          totalTransactions: expect.any(Number),
          totalAmount: expect.any(String),
          averageTransaction: expect.any(String),
          transactionsToday: expect.any(Number),
          amountToday: expect.any(String),
          uptime: expect.objectContaining({
            hours: expect.any(Number),
            percentage: expect.any(Number),
          }),
          errorCount: expect.any(Number),
          maintenanceScore: expect.any(Number),
        });
      });
    });

    describe('formatForDisplay()', () => {
      it('should format cash register for display', () => {
        const cashRegister: CashRegisterOutput = {
          id: 'cr_123456789',
          pem_serial_number: 'CR001234567890',
          name: 'NCR SelfServ 80',
          mtls_certificate: 'mock_certificate',
          private_key: 'mock_private_key',
        };

        const result = CashRegistersResource.formatForDisplay(cashRegister);

        expect(result).toMatchObject({
          displayName: cashRegister.name,
          statusBadge: 'ACTIVE',
          location: 'Unknown Location',
          lastActivity: 'Never',
          serialNumber: cashRegister.pem_serial_number,
        });
      });
    });

    describe('generateMaintenanceSchedule()', () => {
      it('should generate maintenance schedule', () => {
        const cashRegister: CashRegisterOutput = {
          id: 'cr_123456789',
          pem_serial_number: 'CR001234567890',
          name: 'NCR SelfServ 80',
          mtls_certificate: 'mock_certificate',
          private_key: 'mock_private_key',
        };

        const result = CashRegistersResource.generateMaintenanceSchedule(cashRegister);

        expect(result).toMatchObject({
          nextMaintenance: expect.any(String),
          maintenanceType: 'routine',
          priority: 'medium',
          description: 'Routine maintenance and inspection',
          estimatedDuration: '2 hours',
        });
      });
    });

    describe('validatePEMCompatibility()', () => {
      it('should validate PEM compatibility', () => {
        const cashRegister: CashRegisterOutput = {
          id: 'cr_123456789',
          pem_serial_number: 'CR001234567890',
          name: 'NCR SelfServ 80',
          mtls_certificate: 'mock_certificate',
          private_key: 'mock_private_key',
        };

        const result = CashRegistersResource.validatePEMCompatibility(cashRegister, 'PEM-X1');

        expect(result).toMatchObject({
          compatible: expect.any(Boolean),
          issues: expect.any(Array),
          recommendations: expect.any(Array),
        });
      });

      it('should detect legacy PEM compatibility issues', () => {
        const cashRegister: CashRegisterOutput = {
          id: 'cr_123456789',
          pem_serial_number: 'CR001234567890',
          name: 'NCR SelfServ 80',
          mtls_certificate: 'mock_certificate',
          private_key: 'mock_private_key',
        };

        const result = CashRegistersResource.validatePEMCompatibility(cashRegister, 'legacy-pem-v1');

        expect(result.compatible).toBe(false);
        expect(result.issues).toContain('Legacy PEM devices may have compatibility issues');
        expect(result.recommendations).toContain('Consider upgrading to newer PEM model');
      });
    });

    describe('generateFleetHealthReport()', () => {
      it('should generate fleet health report for multiple cash registers', () => {
        const cashRegisters: CashRegisterOutput[] = [
          {
            id: 'cr_123456789',
            pem_serial_number: 'CR001234567890',
            name: 'NCR SelfServ 80',
            mtls_certificate: 'mock_certificate',
            private_key: 'mock_private_key',
          },
          {
            id: 'cr_987654321',
            pem_serial_number: 'CR009876543210',
            name: 'Diebold Opteva 720',
            mtls_certificate: 'mock_certificate',
            private_key: 'mock_private_key',
          },
        ];

        const result = CashRegistersResource.generateFleetHealthReport(cashRegisters);

        expect(result).toMatchObject({
          totalRegisters: 2,
          activeRegisters: expect.any(Number),
          registersNeedingMaintenance: expect.any(Number),
          averageUptime: expect.any(Number),
          totalTransactionsToday: expect.any(Number),
          totalRevenueToday: expect.any(String),
          statusBreakdown: expect.any(Object),
          topPerformers: expect.any(Array),
        });
      });
    });

    describe('generateInstallationChecklist()', () => {
      it('should generate installation checklist', () => {
        const result = CashRegistersResource.generateInstallationChecklist();

        expect(result).toMatchObject({
          preInstallation: expect.any(Array),
          installation: expect.any(Array),
          postInstallation: expect.any(Array),
          testing: expect.any(Array),
        });

        expect(result.preInstallation.length).toBeGreaterThan(0);
        expect(result.installation.length).toBeGreaterThan(0);
        expect(result.postInstallation.length).toBeGreaterThan(0);
        expect(result.testing.length).toBeGreaterThan(0);
      });
    });
  });
});