/**
 * Integration tests for MerchantsResource - OpenAPI Implementation
 * Tests for the new OpenAPI-based merchants resource
 */

import { MerchantsResource } from '@/resources/merchants';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError } from '@/errors/index';
import { TestDataFactory, MockResponses, HttpTestHelpers } from '../setup';
import type { components } from '@/types/generated';

// Use the actual types from the resource implementation
type MerchantCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput'];
type MerchantOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput'];

describe('MerchantsResource - OpenAPI Implementation', () => {
  let merchantsResource: MerchantsResource;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    });
    merchantsResource = new MerchantsResource(httpClient);
  });

  describe('list()', () => {
    it('should list merchants', async () => {
      const mockMerchants = [MockResponses.merchantCreated];

      HttpTestHelpers.mockFetchSuccess(mockMerchants);

      const result = await merchantsResource.list();

      expect(result).toEqual(mockMerchants);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/merchants');
    });
  });

  describe('create()', () => {
    it('should create a merchant with valid data', async () => {
      const merchantInput: MerchantCreateInput = TestDataFactory.createMerchantInput();
      
      HttpTestHelpers.mockFetchSuccess(MockResponses.merchantCreated, 201);

      const result = await merchantsResource.create(merchantInput);

      expect(result).toEqual(MockResponses.merchantCreated);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/merchants', {
        method: 'POST',
        body: JSON.stringify(merchantInput),
      });
    });

    it('should validate VAT number format', async () => {
      const invalidMerchantInput: MerchantCreateInput = {
        ...TestDataFactory.createMerchantInput(),
        fiscal_id: '123456789', // Invalid VAT number (too short)
      };

      await expect(
        merchantsResource.create(invalidMerchantInput, { 
          validateVATNumber: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate address completeness', async () => {
      const incompleteAddressMerchant: MerchantCreateInput = {
        ...TestDataFactory.createMerchantInput(),
        address: {
          street_address: 'Via Roma 123',
          zip_code: '',
          city: 'Roma',
          province: 'RM',
        },
      };

      await expect(
        merchantsResource.create(incompleteAddressMerchant, { 
          enforceAddressValidation: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('retrieve()', () => {
    it('should retrieve a merchant by UUID', async () => {
      const merchantId = 'merchant_123456789';
      
      HttpTestHelpers.mockFetchSuccess(MockResponses.merchantCreated);

      const result = await merchantsResource.retrieve(merchantId);

      expect(result).toEqual(MockResponses.merchantCreated);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/merchants/${merchantId}`);
    });

    it('should handle not found errors', async () => {
      const merchantId = 'nonexistent_merchant';
      
      HttpTestHelpers.mockFetchError(404);

      await expect(
        merchantsResource.retrieve(merchantId)
      ).rejects.toThrow();
    });
  });

  describe('update()', () => {
    it('should update a merchant', async () => {
      const merchantId = 'merchant_123456789';
      const updateData = {
        name: 'Updated Merchant Name',
        address: {
          street_address: 'Via Roma 456',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM',
        },
      };
      
      const updatedMerchant = {
        ...MockResponses.merchantCreated,
        ...updateData,
      };

      HttpTestHelpers.mockFetchSuccess(updatedMerchant);

      const result = await merchantsResource.update(merchantId, updateData);

      expect(result).toEqual(updatedMerchant);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/merchants/${merchantId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
    });
  });

  describe('getAnalytics()', () => {
    it('should get business analytics', async () => {
      const merchantId = 'merchant_123456789';
      
      HttpTestHelpers.mockFetchSuccess(MockResponses.merchantCreated);

      const result = await merchantsResource.getAnalytics(merchantId);

      expect(result).toMatchObject({
        registrationDate: expect.any(String),
        businessAge: expect.any(Number),
        completenessScore: expect.any(Number),
        missingFields: expect.any(Array),
        recommendations: expect.any(Array),
        complianceStatus: expect.any(String),
      });
    });
  });

  describe('validateAddress()', () => {
    it('should validate Italian addresses', async () => {
      const validAddress = {
        street_address: 'Via Roma 123',
        zip_code: '00100',
        city: 'Roma',
        province: 'RM',
      };

      const result = await merchantsResource.validateAddress(validAddress);

      expect(result).toMatchObject({
        isValid: true,
        errors: [],
        suggestions: expect.any(Array),
        formattedAddress: expect.any(String),
      });
    });
  });

  describe('Static utility methods', () => {
    describe('isValidItalianVATNumber()', () => {
      it('should validate correct Italian VAT numbers', () => {
        const validVATNumbers = [
          '12345678903', // Valid 11-digit VAT number with correct checksum
          '00000000000', // Special case (all zeros)
        ];

        validVATNumbers.forEach(vatNumber => {
          const result = MerchantsResource.isValidItalianVATNumber(vatNumber);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid VAT number formats', () => {
        const invalidVATNumbers = [
          '123456789',     // Too short
          '123456789012',  // Too long
          'abcdefghijk',   // Non-numeric
          '',              // Empty
          '12345678900',   // Invalid checksum
        ];

        invalidVATNumbers.forEach(vatNumber => {
          const result = MerchantsResource.isValidItalianVATNumber(vatNumber);
          expect(result).toBe(false);
        });
      });
    });

    describe('isValidBusinessName()', () => {
      it('should validate business names', () => {
        const validNames = [
          'Test Company Ltd',
          'Azienda & Partners',
          'My Business (2024)',
        ];

        validNames.forEach(name => {
          const result = MerchantsResource.isValidBusinessName(name);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid business names', () => {
        const invalidNames = [
          '', // Empty
          'a'.repeat(201), // Too long
          'Test@Company#', // Invalid characters
        ];

        invalidNames.forEach(name => {
          const result = MerchantsResource.isValidBusinessName(name);
          expect(result).toBe(false);
        });
      });
    });

    describe('formatFiscalId()', () => {
      it('should format fiscal ID for display', () => {
        const fiscalId = '12345678901';
        const result = MerchantsResource.formatFiscalId(fiscalId);
        expect(result).toBe('123 456 78901');
      });
    });

    describe('analyzeBusinessProfile()', () => {
      it('should analyze business profile completeness', () => {
        const merchant: MerchantOutput = MockResponses.merchantCreated;

        const result = MerchantsResource.analyzeBusinessProfile(merchant);

        expect(result).toMatchObject({
          registrationDate: expect.any(String),
          businessAge: expect.any(Number),
          completenessScore: expect.any(Number),
          missingFields: expect.any(Array),
          recommendations: expect.any(Array),
          complianceStatus: expect.any(String),
        });
      });
    });

    describe('generateBusinessSummary()', () => {
      it('should generate business summary', () => {
        const merchant: MerchantOutput = MockResponses.merchantCreated;

        const result = MerchantsResource.generateBusinessSummary(merchant);

        expect(result).toContain(merchant.name);
        expect(result).toContain('VAT:');
      });
    });

    describe('validateItalianAddress()', () => {
      it('should validate complete Italian addresses', async () => {
        const completeAddress = {
          street_address: 'Via Roma 123',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM',
        };

        const result = await MerchantsResource.validateItalianAddress(completeAddress);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.formattedAddress).toBeDefined();
      });

      it('should identify incomplete addresses', async () => {
        const incompleteAddress = {
          street_address: 'Via Roma 123',
          zip_code: '',
          city: 'Roma',
          province: 'RM',
        };

        const result = await MerchantsResource.validateItalianAddress(incompleteAddress);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('ZIP code'))).toBe(true);
      });
    });

    describe('getProvinceCode()', () => {
      it('should extract province code from merchant', () => {
        const merchant: MerchantOutput = MockResponses.merchantCreated;

        const result = MerchantsResource.getProvinceCode(merchant);

        expect(result).toBe('RM');
      });
    });

    describe('getMerchantRegion()', () => {
      it('should determine merchant region', () => {
        const merchant: MerchantOutput = MockResponses.merchantCreated; // RM = Roma = Central Italy

        const result = MerchantsResource.getMerchantRegion(merchant);

        expect(result).toBe('Central Italy');
      });
    });

    describe('isInRegion()', () => {
      it('should check if merchant is in specific region', () => {
        const merchant: MerchantOutput = MockResponses.merchantCreated; // RM province
        const centralItalyProvinces = ['RM', 'MI', 'FI'];

        const result = MerchantsResource.isInRegion(merchant, centralItalyProvinces);

        expect(result).toBe(true);
      });
    });
  });
});