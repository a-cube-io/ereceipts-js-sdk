import {
  API_ENDPOINTS,
  API_AUTH_ENDPOINTS,
  MF1_PATHS,
  MF2_PATHS,
  getBasePath,
  getBaseURL,
  getAuthBaseURL,
  type Environment,
  type BaseURLMode,
} from '../../constants/endpoints';

describe('Endpoints Constants', () => {
  describe('API_ENDPOINTS', () => {
    it('should have correct sandbox endpoint', () => {
      expect(API_ENDPOINTS.SANDBOX).toBe('https://ereceipts-it-sandbox.acubeapi.com');
    });

    it('should have correct production endpoint', () => {
      expect(API_ENDPOINTS.PRODUCTION).toBe('https://ereceipts-it.acubeapi.com');
    });

    it('should have correct development endpoint', () => {
      expect(API_ENDPOINTS.DEVELOPMENT).toBe('https://ereceipts-it.dev.acubeapi.com');
    });

    it('should have all required environment endpoints', () => {
      expect(Object.keys(API_ENDPOINTS)).toEqual(['SANDBOX', 'PRODUCTION', 'DEVELOPMENT']);
    });

    it('should have valid HTTPS URLs', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toMatch(/^https:\/\/.+/);
        expect(endpoint).toContain('acubeapi.com');
      });
    });
  });

  describe('API_AUTH_ENDPOINTS', () => {
    it('should have correct sandbox auth endpoint', () => {
      expect(API_AUTH_ENDPOINTS.SANDBOX).toBe('https://common-sandbox.api.acubeapi.com');
    });

    it('should have correct production auth endpoint', () => {
      expect(API_AUTH_ENDPOINTS.PRODUCTION).toBe('https://common.api.acubeapi.com');
    });

    it('should have correct development auth endpoint', () => {
      expect(API_AUTH_ENDPOINTS.DEVELOPMENT).toBe('https://common-sandbox.api.acubeapi.com');
    });

    it('should have all required environment endpoints', () => {
      expect(Object.keys(API_AUTH_ENDPOINTS)).toEqual(['SANDBOX', 'PRODUCTION', 'DEVELOPMENT']);
    });

    it('should have valid HTTPS URLs', () => {
      Object.values(API_AUTH_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toMatch(/^https:\/\/.+/);
        expect(endpoint).toContain('api.acubeapi.com');
      });
    });

    it('should have different endpoints from API_ENDPOINTS', () => {
      expect(API_AUTH_ENDPOINTS.SANDBOX).not.toBe(API_ENDPOINTS.SANDBOX);
      expect(API_AUTH_ENDPOINTS.PRODUCTION).not.toBe(API_ENDPOINTS.PRODUCTION);
      expect(API_AUTH_ENDPOINTS.DEVELOPMENT).not.toBe(API_ENDPOINTS.DEVELOPMENT);
    });
  });

  describe('MF1_PATHS', () => {
    describe('Authentication paths', () => {
      it('should have correct login path', () => {
        expect(MF1_PATHS.LOGIN).toBe('/mf1/login');
      });
    });

    describe('Cashier paths', () => {
      it('should have correct cashiers list path', () => {
        expect(MF1_PATHS.CASHIERS).toBe('/mf1/cashiers/');
      });

      it('should have correct cashier me path', () => {
        expect(MF1_PATHS.CASHIER_ME).toBe('/mf1/cashiers/me');
      });

      it('should generate correct cashier by ID path', () => {
        const cashierId = 123;
        const expectedPath = `/mf1/cashiers/${cashierId}`;
        expect(MF1_PATHS.CASHIER_BY_ID(cashierId)).toBe(expectedPath);
      });

      it('should handle different cashier ID types', () => {
        expect(MF1_PATHS.CASHIER_BY_ID(0)).toBe('/mf1/cashiers/0');
        expect(MF1_PATHS.CASHIER_BY_ID(999999)).toBe('/mf1/cashiers/999999');
        expect(MF1_PATHS.CASHIER_BY_ID(-1)).toBe('/mf1/cashiers/-1');
      });
    });

    describe('Point of Sales paths', () => {
      it('should have correct point of sales list path', () => {
        expect(MF1_PATHS.POINT_OF_SALES).toBe('/mf1/point-of-sales/');
      });

      it('should generate correct point of sale by serial path', () => {
        const serialNumber = 'POS123456';
        const expectedPath = `/mf1/point-of-sales/${serialNumber}`;
        expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL(serialNumber)).toBe(expectedPath);
      });

      it('should generate correct point of sale activation path', () => {
        const serialNumber = 'POS789012';
        const expectedPath = `/mf1/point-of-sales/${serialNumber}/activation`;
        expect(MF1_PATHS.POINT_OF_SALE_ACTIVATION(serialNumber)).toBe(expectedPath);
      });

      it('should generate correct point of sale inactivity path', () => {
        const serialNumber = 'POS345678';
        const expectedPath = `/mf1/point-of-sales/${serialNumber}/inactivity`;
        expect(MF1_PATHS.POINT_OF_SALE_INACTIVITY(serialNumber)).toBe(expectedPath);
      });

      it('should generate correct point of sale offline path', () => {
        const serialNumber = 'POS901234';
        const expectedPath = `/mf1/point-of-sales/${serialNumber}/status/offline`;
        expect(MF1_PATHS.POINT_OF_SALE_OFFLINE(serialNumber)).toBe(expectedPath);
      });

      it('should have correct close journal path', () => {
        expect(MF1_PATHS.CLOSE_JOURNAL).toBe('/mf1/point-of-sales/close');
      });

      it('should handle different serial number formats', () => {
        expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL('')).toBe('/mf1/point-of-sales/');
        expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL('POS-123-ABC')).toBe('/mf1/point-of-sales/POS-123-ABC');
        expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL('12345678901234567890')).toBe('/mf1/point-of-sales/12345678901234567890');
      });
    });

    describe('Receipt paths', () => {
      it('should have correct receipts list path', () => {
        expect(MF1_PATHS.RECEIPTS).toBe('/mf1/receipts/');
      });

      it('should generate correct receipt by UUID path', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const expectedPath = `/mf1/receipts/${uuid}`;
        expect(MF1_PATHS.RECEIPT_BY_UUID(uuid)).toBe(expectedPath);
      });

      it('should generate correct receipt details path', () => {
        const uuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const expectedPath = `/mf1/receipts/${uuid}/details`;
        expect(MF1_PATHS.RECEIPT_DETAILS(uuid)).toBe(expectedPath);
      });

      it('should have correct receipt void with proof path', () => {
        expect(MF1_PATHS.RECEIPT_VOID_WITH_PROOF).toBe('/mf1/receipts/void-with-proof');
      });

      it('should have correct receipt return path', () => {
        expect(MF1_PATHS.RECEIPT_RETURN).toBe('/mf1/receipts/return');
      });

      it('should have correct receipt return with proof path', () => {
        expect(MF1_PATHS.RECEIPT_RETURN_WITH_PROOF).toBe('/mf1/receipts/return-with-proof');
      });

      it('should handle different UUID formats', () => {
        expect(MF1_PATHS.RECEIPT_BY_UUID('')).toBe('/mf1/receipts/');
        expect(MF1_PATHS.RECEIPT_BY_UUID('simple-id')).toBe('/mf1/receipts/simple-id');
        expect(MF1_PATHS.RECEIPT_BY_UUID('123e4567-e89b-12d3-a456-426614174000')).toBe('/mf1/receipts/123e4567-e89b-12d3-a456-426614174000');
      });
    });

    describe('Cash Register paths', () => {
      it('should have correct cash register list path', () => {
        expect(MF1_PATHS.CASH_REGISTER).toBe('/mf1/cash-register/');
      });

      it('should generate correct cash register by ID path', () => {
        const id = 'CR123456';
        const expectedPath = `/mf1/cash-register/${id}`;
        expect(MF1_PATHS.CASH_REGISTER_BY_ID(id)).toBe(expectedPath);
      });

      it('should generate correct cash register MTLS certificate path', () => {
        const id = 'CR789012';
        const expectedPath = `/mf1/cash-register/${id}/mtls-certificate`;
        expect(MF1_PATHS.CASH_REGISTER_MTLS_CERT(id)).toBe(expectedPath);
      });

      it('should handle different cash register ID formats', () => {
        expect(MF1_PATHS.CASH_REGISTER_BY_ID('')).toBe('/mf1/cash-register/');
        expect(MF1_PATHS.CASH_REGISTER_BY_ID('CR-123-ABC')).toBe('/mf1/cash-register/CR-123-ABC');
        expect(MF1_PATHS.CASH_REGISTER_BY_ID('12345678901234567890')).toBe('/mf1/cash-register/12345678901234567890');
      });
    });

    describe('Path structure validation', () => {
      it('should have all paths starting with /mf1/', () => {
        Object.values(MF1_PATHS).forEach(path => {
          if (typeof path === 'string') {
            expect(path).toMatch(/^\/mf1\//);
          }
        });
      });

      it('should have function paths that generate correct structure', () => {
        const testId = 'test-id';
        const testNumber = 123;
        
        expect(MF1_PATHS.CASHIER_BY_ID(testNumber)).toMatch(/^\/mf1\/cashiers\/\d+$/);
        expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL(testId)).toMatch(/^\/mf1\/point-of-sales\/.+$/);
        expect(MF1_PATHS.RECEIPT_BY_UUID(testId)).toMatch(/^\/mf1\/receipts\/.+$/);
        expect(MF1_PATHS.CASH_REGISTER_BY_ID(testId)).toMatch(/^\/mf1\/cash-register\/.+$/);
      });
    });
  });

  describe('MF2_PATHS', () => {
    describe('Merchant paths', () => {
      it('should have correct merchants list path', () => {
        expect(MF2_PATHS.MERCHANTS).toBe('/mf2/merchants');
      });

      it('should generate correct merchant by UUID path', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const expectedPath = `/mf2/merchants/${uuid}`;
        expect(MF2_PATHS.MERCHANT_BY_UUID(uuid)).toBe(expectedPath);
      });

      it('should handle different UUID formats', () => {
        expect(MF2_PATHS.MERCHANT_BY_UUID('')).toBe('/mf2/merchants/');
        expect(MF2_PATHS.MERCHANT_BY_UUID('simple-id')).toBe('/mf2/merchants/simple-id');
        expect(MF2_PATHS.MERCHANT_BY_UUID('123e4567-e89b-12d3-a456-426614174000')).toBe('/mf2/merchants/123e4567-e89b-12d3-a456-426614174000');
      });
    });

    describe('Point of Sales (PEMs) paths', () => {
      it('should have correct point of sales list path', () => {
        expect(MF2_PATHS.POINT_OF_SALES).toBe('/mf2/point-of-sales');
      });

      it('should generate correct PEM certificates path', () => {
        const id = 'PEM123456';
        const expectedPath = `/mf2/point-of-sales/${id}/certificates`;
        expect(MF2_PATHS.PEM_CERTIFICATES(id)).toBe(expectedPath);
      });

      it('should handle different PEM ID formats', () => {
        expect(MF2_PATHS.PEM_CERTIFICATES('')).toBe('/mf2/point-of-sales//certificates');
        expect(MF2_PATHS.PEM_CERTIFICATES('PEM-123-ABC')).toBe('/mf2/point-of-sales/PEM-123-ABC/certificates');
        expect(MF2_PATHS.PEM_CERTIFICATES('12345678901234567890')).toBe('/mf2/point-of-sales/12345678901234567890/certificates');
      });
    });

    describe('Path structure validation', () => {
      it('should have all paths starting with /mf2/', () => {
        Object.values(MF2_PATHS).forEach(path => {
          if (typeof path === 'string') {
            expect(path).toMatch(/^\/mf2\//);
          }
        });
      });

      it('should have function paths that generate correct structure', () => {
        const testId = 'test-id';
        
        expect(MF2_PATHS.MERCHANT_BY_UUID(testId)).toMatch(/^\/mf2\/merchants\/.+$/);
        expect(MF2_PATHS.PEM_CERTIFICATES(testId)).toMatch(/^\/mf2\/point-of-sales\/.+\/certificates$/);
      });
    });
  });
});

describe('URL Generation Functions', () => {
  describe('getBaseURL', () => {
    it('should return sandbox URL by default', () => {
      expect(getBaseURL()).toBe(API_ENDPOINTS.SANDBOX);
    });

    it('should return sandbox URL for sandbox environment', () => {
      expect(getBaseURL('sandbox')).toBe(API_ENDPOINTS.SANDBOX);
    });

    it('should return production URL for production environment', () => {
      expect(getBaseURL('production')).toBe(API_ENDPOINTS.PRODUCTION);
    });

    it('should return development URL for development environment', () => {
      expect(getBaseURL('development')).toBe(API_ENDPOINTS.DEVELOPMENT);
    });

    it('should handle all environment types', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const result = getBaseURL(env);
        expect(result).toBe(API_ENDPOINTS[env.toUpperCase() as keyof typeof API_ENDPOINTS]);
      });
    });

    it('should return valid HTTPS URLs', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const result = getBaseURL(env);
        expect(result).toMatch(/^https:\/\/.+/);
        expect(result).toContain('acubeapi.com');
      });
    });
  });

  describe('getAuthBaseURL', () => {
    it('should return sandbox auth URL by default', () => {
      expect(getAuthBaseURL()).toBe(API_AUTH_ENDPOINTS.SANDBOX);
    });

    it('should return sandbox auth URL for sandbox environment', () => {
      expect(getAuthBaseURL('sandbox')).toBe(API_AUTH_ENDPOINTS.SANDBOX);
    });

    it('should return production auth URL for production environment', () => {
      expect(getAuthBaseURL('production')).toBe(API_AUTH_ENDPOINTS.PRODUCTION);
    });

    it('should return development auth URL for development environment', () => {
      expect(getAuthBaseURL('development')).toBe(API_AUTH_ENDPOINTS.DEVELOPMENT);
    });

    it('should handle all environment types', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const result = getAuthBaseURL(env);
        expect(result).toBe(API_AUTH_ENDPOINTS[env.toUpperCase() as keyof typeof API_AUTH_ENDPOINTS]);
      });
    });

    it('should return valid HTTPS URLs', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const result = getAuthBaseURL(env);
        expect(result).toMatch(/^https:\/\/.+/);
        expect(result).toContain('api.acubeapi.com');
      });
    });

    it('should return different URLs from getBaseURL', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const authUrl = getAuthBaseURL(env);
        const apiUrl = getBaseURL(env);
        expect(authUrl).not.toBe(apiUrl);
      });
    });
  });

  describe('getBasePath', () => {
    it('should return API URL for api mode by default', () => {
      expect(getBasePath('api')).toBe(API_ENDPOINTS.SANDBOX);
    });

    it('should return auth URL for auth mode by default', () => {
      expect(getBasePath('auth')).toBe(API_AUTH_ENDPOINTS.SANDBOX);
    });

    it('should return correct API URL for api mode with environment', () => {
      expect(getBasePath('api', 'production')).toBe(API_ENDPOINTS.PRODUCTION);
      expect(getBasePath('api', 'development')).toBe(API_ENDPOINTS.DEVELOPMENT);
      expect(getBasePath('api', 'sandbox')).toBe(API_ENDPOINTS.SANDBOX);
    });

    it('should return correct auth URL for auth mode with environment', () => {
      expect(getBasePath('auth', 'production')).toBe(API_AUTH_ENDPOINTS.PRODUCTION);
      expect(getBasePath('auth', 'development')).toBe(API_AUTH_ENDPOINTS.DEVELOPMENT);
      expect(getBasePath('auth', 'sandbox')).toBe(API_AUTH_ENDPOINTS.SANDBOX);
    });

    it('should handle all mode and environment combinations', () => {
      const modes: BaseURLMode[] = ['api', 'auth'];
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      modes.forEach(mode => {
        environments.forEach(env => {
          const result = getBasePath(mode, env);
          expect(result).toMatch(/^https:\/\/.+/);
          
          if (mode === 'api') {
            expect(result).toContain('ereceipts-it');
          } else {
            expect(result).toContain('common');
          }
        });
      });
    });

    it('should delegate to correct function based on mode', () => {
      const spyGetBaseURL = jest.spyOn(require('../../constants/endpoints'), 'getBaseURL');
      const spyGetAuthBaseURL = jest.spyOn(require('../../constants/endpoints'), 'getAuthBaseURL');
      
      getBasePath('api', 'production');
      expect(spyGetBaseURL).toHaveBeenCalledWith('production');
      
      getBasePath('auth', 'development');
      expect(spyGetAuthBaseURL).toHaveBeenCalledWith('development');
      
      spyGetBaseURL.mockRestore();
      spyGetAuthBaseURL.mockRestore();
    });
  });
});

describe('Type Safety', () => {
  describe('Environment type', () => {
    it('should accept valid environment values', () => {
      const validEnvironments: Environment[] = ['sandbox', 'production', 'development'];
      
      validEnvironments.forEach(env => {
        expect(typeof env).toBe('string');
        expect(['sandbox', 'production', 'development']).toContain(env);
      });
    });
  });

  describe('BaseURLMode type', () => {
    it('should accept valid mode values', () => {
      const validModes: BaseURLMode[] = ['auth', 'api'];
      
      validModes.forEach(mode => {
        expect(typeof mode).toBe('string');
        expect(['auth', 'api']).toContain(mode);
      });
    });
  });

  describe('Function return types', () => {
    it('should return string from getBaseURL', () => {
      const result = getBaseURL('sandbox');
      expect(typeof result).toBe('string');
    });

    it('should return string from getAuthBaseURL', () => {
      const result = getAuthBaseURL('sandbox');
      expect(typeof result).toBe('string');
    });

    it('should return string from getBasePath', () => {
      const result = getBasePath('api', 'sandbox');
      expect(typeof result).toBe('string');
    });

    it('should return string from path functions', () => {
      expect(typeof MF1_PATHS.CASHIER_BY_ID(123)).toBe('string');
      expect(typeof MF1_PATHS.POINT_OF_SALE_BY_SERIAL('test')).toBe('string');
      expect(typeof MF1_PATHS.RECEIPT_BY_UUID('test')).toBe('string');
      expect(typeof MF1_PATHS.CASH_REGISTER_BY_ID('test')).toBe('string');
      expect(typeof MF2_PATHS.MERCHANT_BY_UUID('test')).toBe('string');
      expect(typeof MF2_PATHS.PEM_CERTIFICATES('test')).toBe('string');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  describe('Path generation with edge cases', () => {
    it('should handle empty strings in path functions', () => {
      expect(MF1_PATHS.CASHIER_BY_ID(0)).toBe('/mf1/cashiers/0');
      expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL('')).toBe('/mf1/point-of-sales/');
      expect(MF1_PATHS.RECEIPT_BY_UUID('')).toBe('/mf1/receipts/');
      expect(MF1_PATHS.CASH_REGISTER_BY_ID('')).toBe('/mf1/cash-register/');
      expect(MF2_PATHS.MERCHANT_BY_UUID('')).toBe('/mf2/merchants/');
      expect(MF2_PATHS.PEM_CERTIFICATES('')).toBe('/mf2/point-of-sales//certificates');
    });

    it('should handle special characters in path functions', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL(specialChars)).toBe(`/mf1/point-of-sales/${specialChars}`);
      expect(MF1_PATHS.RECEIPT_BY_UUID(specialChars)).toBe(`/mf1/receipts/${specialChars}`);
      expect(MF2_PATHS.MERCHANT_BY_UUID(specialChars)).toBe(`/mf2/merchants/${specialChars}`);
    });

    it('should handle very long strings in path functions', () => {
      const longString = 'a'.repeat(1000);
      expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL(longString)).toBe(`/mf1/point-of-sales/${longString}`);
      expect(MF1_PATHS.RECEIPT_BY_UUID(longString)).toBe(`/mf1/receipts/${longString}`);
      expect(MF2_PATHS.MERCHANT_BY_UUID(longString)).toBe(`/mf2/merchants/${longString}`);
    });

    it('should handle unicode characters in path functions', () => {
      const unicodeString = 'café-ñáéíóú-中文-日本語';
      expect(MF1_PATHS.POINT_OF_SALE_BY_SERIAL(unicodeString)).toBe(`/mf1/point-of-sales/${unicodeString}`);
      expect(MF1_PATHS.RECEIPT_BY_UUID(unicodeString)).toBe(`/mf1/receipts/${unicodeString}`);
      expect(MF2_PATHS.MERCHANT_BY_UUID(unicodeString)).toBe(`/mf2/merchants/${unicodeString}`);
    });
  });

  describe('URL generation with edge cases', () => {
    it('should handle all environment values consistently', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const apiUrl = getBaseURL(env);
        const authUrl = getAuthBaseURL(env);
        
        expect(apiUrl).toBeTruthy();
        expect(authUrl).toBeTruthy();
        expect(apiUrl).not.toBe(authUrl);
      });
    });

    it('should handle mode switching correctly', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const apiPath = getBasePath('api', env);
        const authPath = getBasePath('auth', env);
        
        expect(apiPath).not.toBe(authPath);
        expect(apiPath).toContain('ereceipts-it');
        expect(authPath).toContain('common');
      });
    });
  });
});

describe('Integration Tests', () => {
  describe('Complete URL construction', () => {
    it('should construct complete API URLs correctly', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const baseUrl = getBaseURL(env);
        const loginPath = MF1_PATHS.LOGIN;
        const completeUrl = `${baseUrl}${loginPath}`;
        
        expect(completeUrl).toMatch(/^https:\/\/.+\/mf1\/login$/);
        expect(completeUrl).toContain('acubeapi.com');
      });
    });

    it('should construct complete auth URLs correctly', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const baseUrl = getAuthBaseURL(env);
        const loginPath = MF1_PATHS.LOGIN;
        const completeUrl = `${baseUrl}${loginPath}`;
        
        expect(completeUrl).toMatch(/^https:\/\/.+\/mf1\/login$/);
        expect(completeUrl).toContain('api.acubeapi.com');
      });
    });

    it('should construct dynamic paths correctly', () => {
      const baseUrl = getBaseURL('sandbox');
      const cashierId = 123;
      const serialNumber = 'POS123456';
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      
      const cashierUrl = `${baseUrl}${MF1_PATHS.CASHIER_BY_ID(cashierId)}`;
      const posUrl = `${baseUrl}${MF1_PATHS.POINT_OF_SALE_BY_SERIAL(serialNumber)}`;
      const receiptUrl = `${baseUrl}${MF1_PATHS.RECEIPT_BY_UUID(uuid)}`;
      
      expect(cashierUrl).toBe(`${baseUrl}/mf1/cashiers/${cashierId}`);
      expect(posUrl).toBe(`${baseUrl}/mf1/point-of-sales/${serialNumber}`);
      expect(receiptUrl).toBe(`${baseUrl}/mf1/receipts/${uuid}`);
    });
  });

  describe('Path consistency across environments', () => {
    it('should maintain path consistency regardless of environment', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      const testId = 'test-id';
      
      environments.forEach(env => {
        const baseUrl = getBaseURL(env);
        const path = MF1_PATHS.CASHIER_BY_ID(123);
        const url = `${baseUrl}${path}`;
        
        expect(url).toMatch(/^https:\/\/.+\/mf1\/cashiers\/123$/);
      });
    });

    it('should maintain auth path consistency regardless of environment', () => {
      const environments: Environment[] = ['sandbox', 'production', 'development'];
      
      environments.forEach(env => {
        const baseUrl = getAuthBaseURL(env);
        const path = MF1_PATHS.LOGIN;
        const url = `${baseUrl}${path}`;
        
        expect(url).toMatch(/^https:\/\/.+\/mf1\/login$/);
      });
    });
  });
}); 