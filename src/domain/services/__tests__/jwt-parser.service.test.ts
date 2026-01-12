import { JwtPayload, extractRoles, isTokenExpired, parseJwt } from '../jwt-parser.service';

// Helper to create a valid JWT token from payload
function createJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}

describe('jwt-parser.service', () => {
  describe('parseJwt', () => {
    it('should parse a valid JWT with standard payload', () => {
      const payload = {
        uid: 123,
        username: 'testuser',
        roles: { 'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER'] },
        fid: 'fiscal-id',
        pid: 'partner-id',
        exp: 1700000000,
        iat: 1699990000,
      };
      const token = createJwt(payload);

      const result = parseJwt(token);

      expect(result).toEqual(payload);
    });

    it('should handle JWT with base64 padding needed', () => {
      // Create a payload that results in base64 string needing padding
      const payload = {
        uid: 1,
        username: 'a',
        roles: {},
        fid: 'f',
        pid: null,
        exp: 1,
        iat: 0,
      };
      const token = createJwt(payload);

      const result = parseJwt(token);

      expect(result.uid).toBe(1);
      expect(result.username).toBe('a');
    });

    it('should throw error for JWT with only 2 parts', () => {
      const invalidToken = 'header.payload';

      expect(() => parseJwt(invalidToken)).toThrow('Invalid JWT format');
    });

    it('should throw error for JWT with 4 parts', () => {
      const invalidToken = 'header.payload.signature.extra';

      expect(() => parseJwt(invalidToken)).toThrow('Invalid JWT format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseJwt('')).toThrow('Invalid JWT format');
    });

    it('should throw error for JWT with missing payload segment', () => {
      // This creates a token where the payload part is empty
      const tokenWithEmptyPayload = 'header..signature';

      expect(() => parseJwt(tokenWithEmptyPayload)).toThrow();
    });
  });

  describe('isTokenExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for token expired 1 hour ago', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const payload: JwtPayload = {
        uid: 1,
        username: 'test',
        roles: {},
        fid: 'f',
        pid: null,
        exp: Math.floor((now - 3600000) / 1000), // 1 hour ago
        iat: Math.floor((now - 7200000) / 1000),
      };

      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should return false for token expiring in 1 hour', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const payload: JwtPayload = {
        uid: 1,
        username: 'test',
        roles: {},
        fid: 'f',
        pid: null,
        exp: Math.floor((now + 3600000) / 1000), // 1 hour from now
        iat: Math.floor(now / 1000),
      };

      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should return true for token expiring in 4 minutes (within 5min buffer)', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const payload: JwtPayload = {
        uid: 1,
        username: 'test',
        roles: {},
        fid: 'f',
        pid: null,
        exp: Math.floor((now + 240000) / 1000), // 4 minutes from now
        iat: Math.floor(now / 1000),
      };

      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should return false for token expiring in 6 minutes (outside buffer)', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const payload: JwtPayload = {
        uid: 1,
        username: 'test',
        roles: {},
        fid: 'f',
        pid: null,
        exp: Math.floor((now + 360000) / 1000), // 6 minutes from now
        iat: Math.floor(now / 1000),
      };

      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should return true for token expiring exactly at 5 minute boundary', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const payload: JwtPayload = {
        uid: 1,
        username: 'test',
        roles: {},
        fid: 'f',
        pid: null,
        exp: Math.floor((now + 300000) / 1000), // exactly 5 minutes from now
        iat: Math.floor(now / 1000),
      };

      expect(isTokenExpired(payload)).toBe(true);
    });
  });

  describe('extractRoles', () => {
    it('should extract single SUPPLIER role', () => {
      const jwtRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER'],
      };

      const result = extractRoles(jwtRoles);

      expect(result).toEqual(['ROLE_SUPPLIER']);
    });

    it('should extract multiple valid roles from different contexts', () => {
      const jwtRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER', 'ROLE_CASHIER'],
        'other-context': ['ROLE_MERCHANT'],
      };

      const result = extractRoles(jwtRoles);

      expect(result).toContain('ROLE_SUPPLIER');
      expect(result).toContain('ROLE_CASHIER');
      expect(result).toContain('ROLE_MERCHANT');
      expect(result).toHaveLength(3);
    });

    it('should deduplicate roles appearing in multiple contexts', () => {
      const jwtRoles = {
        context1: ['ROLE_SUPPLIER'],
        context2: ['ROLE_SUPPLIER', 'ROLE_CASHIER'],
      };

      const result = extractRoles(jwtRoles);

      expect(result).toEqual(['ROLE_SUPPLIER', 'ROLE_CASHIER']);
    });

    it('should filter out invalid roles', () => {
      const jwtRoles = {
        context: ['ROLE_SUPPLIER', 'ROLE_ADMIN', 'ROLE_INVALID', 'ROLE_CASHIER'],
      };

      const result = extractRoles(jwtRoles);

      expect(result).toEqual(['ROLE_SUPPLIER', 'ROLE_CASHIER']);
      expect(result).not.toContain('ROLE_ADMIN');
      expect(result).not.toContain('ROLE_INVALID');
    });
  });
});
