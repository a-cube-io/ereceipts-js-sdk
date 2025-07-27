/**
 * Integration tests for CashiersResource - OpenAPI Implementation
 * Tests for the new OpenAPI-based cashiers resource
 */

import { CashiersResource } from '@/resources/cashiers';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError } from '@/errors/index';
import { TestDataFactory, MockResponses, HttpTestHelpers } from '../setup';
import { CashierCreateInput, CashierOutput, CashierPage } from '@/resources/cashiers';


describe('CashiersResource - OpenAPI Implementation', () => {
  let cashiersResource: CashiersResource;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    });
    cashiersResource = new CashiersResource(httpClient);
  });

  describe('list()', () => {
    it('should list cashiers with pagination', async () => {
      const mockCashierPage = MockResponses.paginatedResponse([MockResponses.cashierCreated]);

      HttpTestHelpers.mockFetchSuccess(mockCashierPage);

      const result = await cashiersResource.list({
        page: 1,
        size: 10,
      });

      expect(result).toEqual(mockCashierPage);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/cashiers');
    });

    it('should handle empty pagination parameters', async () => {
      const mockCashierPage = MockResponses.paginatedResponse([MockResponses.cashierCreated]);

      HttpTestHelpers.mockFetchSuccess(mockCashierPage);

      const result = await cashiersResource.list();

      expect(result).toEqual(mockCashierPage);
    });
  });

  describe('create()', () => {
    it('should create a cashier with valid data', async () => {
      const cashierInput: CashierCreateInput = TestDataFactory.createCashierInput();
      
      HttpTestHelpers.mockFetchSuccess(MockResponses.cashierCreated, 201);

      const result = await cashiersResource.create(cashierInput);

      expect(result).toEqual(MockResponses.cashierCreated);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/cashiers', {
        method: 'POST',
        body: JSON.stringify(cashierInput),
      });
    });

    it('should validate email format', async () => {
      const invalidCashierInput: CashierCreateInput = {
        ...TestDataFactory.createCashierInput(),
        email: 'invalid-email', // Invalid email format
      };

      await expect(
        cashiersResource.create(invalidCashierInput, { 
          enforceStrongPassword: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate password strength when enabled', async () => {
      const weakPasswordInput: CashierCreateInput = {
        ...TestDataFactory.createCashierInput(),
        password: '123', // Weak password
      };

      await expect(
        cashiersResource.create(weakPasswordInput, { 
          enforceStrongPassword: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate email domain when restricted', async () => {
      const cashierInput: CashierCreateInput = {
        ...TestDataFactory.createCashierInput(),
        email: 'test@unauthorized-domain.com',
      };

      await expect(
        cashiersResource.create(cashierInput, { 
          allowedEmailDomains: ['example.com', 'company.com'],
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('retrieve()', () => {
    it('should retrieve a cashier by ID', async () => {
      const cashierId = 1;
      
      HttpTestHelpers.mockFetchSuccess(MockResponses.cashierCreated);

      const result = await cashiersResource.retrieve(cashierId);

      expect(result).toEqual(MockResponses.cashierCreated);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/cashiers/${cashierId}`);
    });

    it('should handle not found errors', async () => {
      const cashierId = 999;
      
      HttpTestHelpers.mockFetchError(404);

      await expect(
        cashiersResource.retrieve(cashierId)
      ).rejects.toThrow();
    });
  });

  describe('me()', () => {
    it('should get current cashier profile', async () => {
      HttpTestHelpers.mockFetchSuccess(MockResponses.cashierCreated);

      const result = await cashiersResource.me();

      expect(result).toEqual(MockResponses.cashierCreated);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/cashiers/me');
    });
  });

  describe('delete()', () => {
    it('should delete a cashier', async () => {
      const cashierId = 1;
      
      HttpTestHelpers.mockFetchSuccess({}, 204);

      await cashiersResource.delete(cashierId);

      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/cashiers/${cashierId}`, {
        method: 'DELETE',
      });
    });
  });

  describe('Static utility methods', () => {
    describe('isValidEmail()', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'test+tag@example.org',
        ];

        validEmails.forEach(email => {
          const result = CashiersResource.isValidEmail(email);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'test@',
          'test..test@domain.com',
        ];

        invalidEmails.forEach(email => {
          const result = CashiersResource.isValidEmail(email);
          expect(result).toBe(false);
        });
      });
    });

    describe('checkPasswordStrength()', () => {
      it('should validate strong passwords', () => {
        const strongPasswords = [
          'TestPassword123!',
          'MySecure@Pass1',
          'Complex#Password2024',
        ];

        strongPasswords.forEach(password => {
          const result = CashiersResource.checkPasswordStrength(password);
          expect(result.isValid).toBe(true);
          expect(result.score).toBeGreaterThanOrEqual(4);
        });
      });

      it('should reject weak passwords', () => {
        const weakPasswords = [
          '123',
          'password',
          'Password',
          '12345678',
        ];

        weakPasswords.forEach(password => {
          const result = CashiersResource.checkPasswordStrength(password);
          expect(result.isValid).toBe(false);
          expect(result.score).toBeLessThan(4);
        });
      });

      it('should provide detailed strength feedback', () => {
        const result = CashiersResource.checkPasswordStrength('weak');

        expect(result.suggestions).toContain('Include uppercase letters');
        expect(result.suggestions).toContain('Include numbers');
        expect(result.suggestions).toContain('Include special characters');
        expect(result.suggestions).toContain('Use at least 8 characters');
      });
    });

    describe('generateSecurePassword()', () => {
      it('should generate passwords of specified length', () => {
        const lengths = [12, 16, 20];

        lengths.forEach(length => {
          const password = CashiersResource.generateSecurePassword(length);
          expect(password).toHaveLength(length);
        });
      });

      it('should generate passwords with required character sets', () => {
        const password = CashiersResource.generateSecurePassword(16);

        expect(password).toMatch(/[a-z]/); // lowercase
        expect(password).toMatch(/[A-Z]/); // uppercase
        expect(password).toMatch(/[0-9]/); // numbers
        expect(password).toMatch(/[!@#$%^&*]/); // special chars
      });

      it('should generate unique passwords', () => {
        const passwords = Array.from({ length: 10 }, () => 
          CashiersResource.generateSecurePassword(16)
        );
        const uniquePasswords = new Set(passwords);

        expect(uniquePasswords.size).toBe(10);
      });
    });

    describe('getEmailDomain()', () => {
      it('should extract domain from valid emails', () => {
        expect(CashiersResource.getEmailDomain('test@example.com')).toBe('example.com');
        expect(CashiersResource.getEmailDomain('user@subdomain.company.org')).toBe('subdomain.company.org');
      });

      it('should handle invalid emails', () => {
        expect(CashiersResource.getEmailDomain('invalid-email')).toBeNull();
        expect(CashiersResource.getEmailDomain('no-at-sign')).toBeNull();
        expect(CashiersResource.getEmailDomain('@domain.com')).toBeNull();
      });
    });

    describe('isAllowedEmailDomain()', () => {
      it('should validate allowed domains', () => {
        const allowedDomains = ['example.com', 'company.org'];

        expect(CashiersResource.isAllowedEmailDomain('test@example.com', allowedDomains)).toBe(true);
        expect(CashiersResource.isAllowedEmailDomain('user@company.org', allowedDomains)).toBe(true);
        expect(CashiersResource.isAllowedEmailDomain('test@unauthorized.com', allowedDomains)).toBe(false);
      });

      it('should be case insensitive', () => {
        const allowedDomains = ['EXAMPLE.COM'];

        expect(CashiersResource.isAllowedEmailDomain('test@example.com', allowedDomains)).toBe(true);
        expect(CashiersResource.isAllowedEmailDomain('test@EXAMPLE.COM', allowedDomains)).toBe(true);
      });
    });

    describe('generateUsername()', () => {
      it('should generate username from email', () => {
        expect(CashiersResource.generateUsername('john.doe@example.com')).toBe('john.doe');
        expect(CashiersResource.generateUsername('testuser@company.org')).toBe('testuser');
      });

      it('should handle emails with special characters', () => {
        expect(CashiersResource.generateUsername('test+tag@example.com')).toBe('test+tag');
        expect(CashiersResource.generateUsername('user.name-123@domain.co.uk')).toBe('user.name-123');
      });
    });

    describe('formatCashierForDisplay()', () => {
      it('should format cashier for display', () => {
        const cashier: CashierOutput = MockResponses.cashierCreated;

        const result = CashiersResource.formatCashierForDisplay(cashier);

        expect(result).toMatchObject({
          displayName: expect.any(String),
          maskedEmail: expect.any(String),
          status: 'active',
          permissions: expect.any(Array),
        });
      });
    });

    describe('formatEmailForDisplay()', () => {
      it('should mask email addresses for privacy', () => {
        expect(CashiersResource.formatEmailForDisplay('test@example.com')).toBe('tes*@example.com');
        expect(CashiersResource.formatEmailForDisplay('a@example.com')).toBe('a**@example.com');
        expect(CashiersResource.formatEmailForDisplay('longusername@example.com')).toBe('lon***********@example.com');
      });
    });
  });
});