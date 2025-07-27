/**
 * Integration tests for PointOfSalesResource - OpenAPI Implementation
 * Tests for the new OpenAPI-based point of sales resource
 */

import { PointOfSalesResource, type DeviceStatus, type JournalSummary } from '@/resources/point-of-sales';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError } from '@/errors/index';
import { TestDataFactory, MockResponses, HttpTestHelpers } from '../setup';
import type { PointOfSaleOutput, ActivationRequest } from '@/resources/point-of-sales';

describe('PointOfSalesResource - OpenAPI Implementation', () => {
  let pointOfSalesResource: PointOfSalesResource;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    });
    pointOfSalesResource = new PointOfSalesResource(httpClient);
  });

  describe('list()', () => {
    it('should list point of sales devices', async () => {
      const mockPointOfSalesPage = MockResponses.paginatedResponse([MockResponses.pointOfSaleCreated]);

      HttpTestHelpers.mockFetchSuccess(mockPointOfSalesPage);

      const result = await pointOfSalesResource.list();

      expect(result).toEqual(mockPointOfSalesPage);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf2/point-of-sales');
    });
  });

  describe('retrieve()', () => {
    it('should retrieve a point of sale by serial number', async () => {
      const serialNumber = 'POS123456789';
      const mockPointOfSale: PointOfSaleOutput = MockResponses.pointOfSaleCreated;
      
      HttpTestHelpers.mockFetchSuccess(mockPointOfSale);

      const result = await pointOfSalesResource.retrieve(serialNumber);

      expect(result).toEqual(mockPointOfSale);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf2/point-of-sales/${serialNumber}`);
    });

    it('should handle not found errors', async () => {
      const serialNumber = 'NONEXISTENT';
      
      HttpTestHelpers.mockFetchError(404);

      await expect(
        pointOfSalesResource.retrieve(serialNumber)
      ).rejects.toThrow();
    });
  });

  describe('activate()', () => {
    it('should activate a PEM device with valid data', async () => {
      const serialNumber = 'POS123456789';
      const activationData: ActivationRequest = TestDataFactory.createActivationRequest();
      
      HttpTestHelpers.mockFetchSuccess({}, 200);

      await pointOfSalesResource.activate(serialNumber, activationData);

      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf2/point-of-sales/${serialNumber}/activation`, {
        method: 'POST',
        body: JSON.stringify(activationData),
      });
    });

    it('should validate registration key requirement', async () => {
      const serialNumber = 'POS123456789';
      const invalidActivationData: ActivationRequest = {
        ...TestDataFactory.createActivationRequest(),
        registration_key: '', // Empty registration key
      };

      await expect(
        pointOfSalesResource.activate(serialNumber, invalidActivationData)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate serial number format when enabled', async () => {
      const invalidSerialNumber = '123'; // Too short
      const activationData: ActivationRequest = TestDataFactory.createActivationRequest();

      await expect(
        pointOfSalesResource.activate(invalidSerialNumber, activationData, {
          validateSerialNumber: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should check activation status when enabled', async () => {
      const serialNumber = 'POS123456789';
      const activationData: ActivationRequest = TestDataFactory.createActivationRequest();
      const alreadyActivatedDevice: PointOfSaleOutput = {
        ...MockResponses.pointOfSaleCreated,
        status: 'ACTIVE',
      };
      
      HttpTestHelpers.mockFetchSuccess(alreadyActivatedDevice);

      await expect(
        pointOfSalesResource.activate(serialNumber, activationData, {
          checkActivationStatus: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('closeJournal()', () => {
    it('should close journal', async () => {
      HttpTestHelpers.mockFetchSuccess({}, 200);

      await pointOfSalesResource.closeJournal();

      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf2/point-of-sales/close-journal', {
        method: 'POST',
      });
    });
  });

  describe('createInactivityPeriod()', () => {
    it('should create an inactivity period', async () => {
      const serialNumber = 'POS123456789';
      const inactivityData = TestDataFactory.createInactivityRequest();
      
      HttpTestHelpers.mockFetchSuccess(undefined, 204);

      await pointOfSalesResource.createInactivityPeriod(serialNumber, inactivityData);

      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf2/point-of-sales/${serialNumber}/inactivity`, {
        method: 'POST',
        body: JSON.stringify(inactivityData),
      });
    });
  });

  describe('setOffline()', () => {
    it('should set point of sale status to offline', async () => {
      const serialNumber = 'POS123456789';
      
      HttpTestHelpers.mockFetchSuccess(undefined, 204);

      await pointOfSalesResource.setOffline(serialNumber);

      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf2/point-of-sales/${serialNumber}/offline`, {
        method: 'POST',
      });
    });
  });

  describe('getDeviceStatus()', () => {
    it('should get device status summary', async () => {
      const serialNumber = 'POS123456789';
      const mockPointOfSale: PointOfSaleOutput = MockResponses.pointOfSaleCreated;
      
      HttpTestHelpers.mockFetchSuccess(mockPointOfSale);

      const result = await pointOfSalesResource.getDeviceStatus(serialNumber);

      expect(result).toMatchObject({
        serialNumber: expect.any(String),
        status: expect.any(String),
        lastSeen: expect.any(String),
        connectivity: expect.any(String),
      });
    });
  });

  describe('getJournalSummary()', () => {
    it('should get journal summary for current date', async () => {
      const serialNumber = 'POS123456789';

      const result = await pointOfSalesResource.getJournalSummary(serialNumber);

      expect(result).toMatchObject({
        date: expect.any(String),
        transactionCount: 0,
        totalAmount: '0.00',
        vatAmount: '0.00',
        status: 'open',
      });
    });

    it('should get journal summary for specific date', async () => {
      const serialNumber = 'POS123456789';
      const date = '2024-01-04';

      const result = await pointOfSalesResource.getJournalSummary(serialNumber, date);

      expect(result).toMatchObject({
        date: '2024-01-04',
        transactionCount: 0,
        totalAmount: '0.00',
        vatAmount: '0.00',
        status: 'open',
      });
    });
  });

  describe('Static utility methods', () => {
    describe('validateSerialNumber()', () => {
      it('should validate correct serial number formats', () => {
        const validSerialNumbers = [
          'POS123456789',
          'DEVICE12345',
          'ABCD1234EFGH',
        ];

        validSerialNumbers.forEach(serialNumber => {
          const result = PointOfSalesResource.validateSerialNumber(serialNumber);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid serial number formats', () => {
        const invalidSerialNumbers = [
          '1234567',        // Too short
          'a'.repeat(25),   // Too long
          'pos123',         // Contains lowercase
          'SN@#$%',         // Invalid characters
          '',               // Empty
        ];

        invalidSerialNumbers.forEach(serialNumber => {
          const result = PointOfSalesResource.validateSerialNumber(serialNumber);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });
    });

    describe('analyzeDeviceStatus()', () => {
      it('should analyze device status from device data', () => {
        const device: PointOfSaleOutput = MockResponses.pointOfSaleCreated;

        const result = PointOfSalesResource.analyzeDeviceStatus(device);

        expect(result).toMatchObject({
          serialNumber: device.serial_number,
          status: device.status,
          lastSeen: expect.any(String),
          connectivity: expect.any(String),
        });
      });
    });

    describe('formatDeviceForDisplay()', () => {
      it('should format device for display', () => {
        const device: PointOfSaleOutput = MockResponses.pointOfSaleCreated;

        const result = PointOfSalesResource.formatDeviceForDisplay(device);

        expect(result).toMatchObject({
          displayName: expect.stringContaining('PEM'),
          statusBadge: expect.any(String),
          location: expect.any(String),
          lastActivity: expect.any(String),
          certificateStatus: 'Not Available',
        });
      });
    });

    describe('calculateUptime()', () => {
      it('should calculate device uptime', () => {
        const device: PointOfSaleOutput = MockResponses.pointOfSaleCreated;

        const result = PointOfSalesResource.calculateUptime(device);

        expect(result).toMatchObject({
          uptimeHours: expect.any(Number),
          uptimePercentage: expect.any(Number),
          availabilityStatus: expect.stringMatching(/^(excellent|good|poor|critical)$/),
        });
        expect(result.uptimePercentage).toBeGreaterThanOrEqual(0);
        expect(result.uptimePercentage).toBeLessThanOrEqual(100);
      });
    });

    describe('generateHealthReport()', () => {
      it('should generate health report for multiple devices', () => {
        const devices: PointOfSaleOutput[] = [
          MockResponses.pointOfSaleCreated,
          {
            ...MockResponses.pointOfSaleCreated,
            serial_number: 'POS987654321',
            status: 'OFFLINE',
          },
        ];

        const result = PointOfSalesResource.generateHealthReport(devices);

        expect(result).toMatchObject({
          totalDevices: 2,
          activeDevices: expect.any(Number),
          offlineDevices: expect.any(Number),
          devicesRequiringAttention: expect.any(Number),
          avgUptimePercentage: expect.any(Number),
          certificateExpiringCount: 0,
          statusBreakdown: expect.any(Object),
        });
      });
    });

    describe('validateJournalClosingEligibility()', () => {
      it('should validate journal closing eligibility', () => {
        const device: PointOfSaleOutput = {
          ...MockResponses.pointOfSaleCreated,
          status: 'ACTIVE',
        };

        const result = PointOfSalesResource.validateJournalClosingEligibility(device, '2024-01-04');

        expect(result).toMatchObject({
          canClose: expect.any(Boolean),
          reasons: expect.any(Array),
          requirements: expect.any(Array),
        });
        expect(result.requirements.length).toBeGreaterThan(0);
      });

      it('should reject closing for inactive devices', () => {
        const device: PointOfSaleOutput = {
          ...MockResponses.pointOfSaleCreated,
          status: 'OFFLINE',
        };

        const result = PointOfSalesResource.validateJournalClosingEligibility(device, '2024-01-04');

        expect(result.canClose).toBe(false);
        expect(result.reasons).toContain('Device must be in active status');
      });
    });

    describe('getMaintenanceSchedule()', () => {
      it('should get maintenance schedule for device', () => {
        const device: PointOfSaleOutput = MockResponses.pointOfSaleCreated;

        const result = PointOfSalesResource.getMaintenanceSchedule(device);

        expect(result).toMatchObject({
          nextMaintenance: expect.any(String),
          maintenanceType: 'routine',
          priority: 'low',
          description: 'Routine maintenance and inspection',
          estimatedDuration: '30-60 minutes',
        });
      });
    });

    describe('generateActivationCode()', () => {
      it('should generate valid activation codes', () => {
        const code1 = PointOfSalesResource.generateActivationCode();
        const code2 = PointOfSalesResource.generateActivationCode();

        expect(code1).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(code2).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(code1).not.toBe(code2); // Should be unique
      });
    });
  });
});