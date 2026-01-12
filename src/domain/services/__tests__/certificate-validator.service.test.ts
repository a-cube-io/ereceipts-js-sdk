import { CertificateValidator } from '../certificate-validator.service';

describe('CertificateValidator', () => {
  describe('validatePEMFormat', () => {
    const validCertificate = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4P2dG1TANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
-----END CERTIFICATE-----`;

    const validPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7
-----END PRIVATE KEY-----`;

    const validRsaPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7
-----END RSA PRIVATE KEY-----`;

    it('should return true for valid certificate and private key', () => {
      const result = CertificateValidator.validatePEMFormat(validCertificate, validPrivateKey);

      expect(result).toBe(true);
    });

    it('should return true for valid certificate and RSA private key', () => {
      const result = CertificateValidator.validatePEMFormat(validCertificate, validRsaPrivateKey);

      expect(result).toBe(true);
    });

    it('should return false when certificate missing BEGIN marker', () => {
      const invalidCert = `MIICpDCCAYwCCQDU+pQ4P2dG1TANBgkqhkiG9w0BAQsFADA
-----END CERTIFICATE-----`;

      const result = CertificateValidator.validatePEMFormat(invalidCert, validPrivateKey);

      expect(result).toBe(false);
    });

    it('should return false when certificate missing END marker', () => {
      const invalidCert = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4P2dG1TANBgkqhkiG9w0BAQsFADA`;

      const result = CertificateValidator.validatePEMFormat(invalidCert, validPrivateKey);

      expect(result).toBe(false);
    });

    it('should return false when private key missing BEGIN marker', () => {
      const invalidKey = `MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7
-----END PRIVATE KEY-----`;

      const result = CertificateValidator.validatePEMFormat(validCertificate, invalidKey);

      expect(result).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(CertificateValidator.validatePEMFormat('', '')).toBe(false);
      expect(CertificateValidator.validatePEMFormat(validCertificate, '')).toBe(false);
      expect(CertificateValidator.validatePEMFormat('', validPrivateKey)).toBe(false);
    });
  });

  describe('isCertificateExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for certificate expired yesterday', () => {
      const now = new Date('2024-06-15T12:00:00Z');
      jest.setSystemTime(now);

      const expiredDate = new Date('2024-06-14T12:00:00Z'); // Yesterday

      expect(CertificateValidator.isCertificateExpired(expiredDate)).toBe(true);
    });

    it('should return false for certificate expiring tomorrow', () => {
      const now = new Date('2024-06-15T12:00:00Z');
      jest.setSystemTime(now);

      const futureDate = new Date('2024-06-16T12:00:00Z'); // Tomorrow

      expect(CertificateValidator.isCertificateExpired(futureDate)).toBe(false);
    });
  });

  describe('getDaysUntilExpiry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 10 for certificate expiring in 10 days', () => {
      const now = new Date('2024-06-15T12:00:00Z');
      jest.setSystemTime(now);

      const expiryDate = new Date('2024-06-25T12:00:00Z'); // 10 days later

      expect(CertificateValidator.getDaysUntilExpiry(expiryDate)).toBe(10);
    });

    it('should return 2 for certificate expiring in 25 hours (Math.ceil)', () => {
      const now = new Date('2024-06-15T12:00:00Z');
      jest.setSystemTime(now);

      const expiryDate = new Date('2024-06-16T13:00:00Z'); // 25 hours later

      expect(CertificateValidator.getDaysUntilExpiry(expiryDate)).toBe(2);
    });
  });
});
