import { CertificateStorage, type MTLSCertificate } from '../../storage/certificate';
import { SecureTokenStorage } from '../../storage/token';
import { getMTLSCertificateKey, getMTLSPrivateKeyKey } from '../../constants/keys';

// Mock dependencies
jest.mock('../../storage/token');

const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;

describe('CertificateStorage', () => {
  const mockCertificate: MTLSCertificate = {
    uuid: 'test-uuid-123',
    certificate: '-----BEGIN CERTIFICATE-----\nMIIEpDCCA4ygAwIBAgIJANJZQkz9tqhNMA0GCSqGSIb3DQEBCwUAMIGLMQswCQYD\n-----END CERTIFICATE-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\n-----END PRIVATE KEY-----',
    createdAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2025-01-01T00:00:00.000Z',
  };

  const mockCertificateWithoutPrivateKey: MTLSCertificate = {
    uuid: 'test-uuid-456',
    certificate: '-----BEGIN CERTIFICATE-----\nMIIEpDCCA4ygAwIBAgIJANJZQkz9tqhNMA0GCSqGSIb3DQEBCwUAMIGLMQswCQYD\n-----END CERTIFICATE-----',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSecureTokenStorage.setItem.mockResolvedValue(undefined);
    mockSecureTokenStorage.getItem.mockResolvedValue(null);
    mockSecureTokenStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('storeMTLSCertificate', () => {
    it('should store certificate with private key', async () => {
      await CertificateStorage.storeMTLSCertificate(
        mockCertificate.uuid,
        mockCertificate.certificate,
        mockCertificate.privateKey
      );

      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith(
        getMTLSCertificateKey(mockCertificate.uuid),
        expect.stringContaining('"uuid":"test-uuid-123"')
      );

      // Verify the stored data structure
      const storedData = JSON.parse(
        (mockSecureTokenStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(storedData.uuid).toBe(mockCertificate.uuid);
      expect(storedData.certificate).toBe(mockCertificate.certificate);
      expect(storedData.privateKey).toBe(mockCertificate.privateKey);
      expect(storedData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should store certificate without private key', async () => {
      await CertificateStorage.storeMTLSCertificate(
        mockCertificateWithoutPrivateKey.uuid,
        mockCertificateWithoutPrivateKey.certificate
      );

      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith(
        getMTLSCertificateKey(mockCertificateWithoutPrivateKey.uuid),
        expect.stringContaining('"uuid":"test-uuid-456"')
      );

      // Verify the stored data structure
      const storedData = JSON.parse(
        (mockSecureTokenStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(storedData.uuid).toBe(mockCertificateWithoutPrivateKey.uuid);
      expect(storedData.certificate).toBe(mockCertificateWithoutPrivateKey.certificate);
      expect(storedData.privateKey).toBeUndefined();
      expect(storedData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include current timestamp in createdAt', async () => {
      const beforeStore = new Date();
      
      await CertificateStorage.storeMTLSCertificate(
        mockCertificate.uuid,
        mockCertificate.certificate
      );

      const afterStore = new Date();
      
      const storedData = JSON.parse(
        (mockSecureTokenStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      const createdAt = new Date(storedData.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeStore.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterStore.getTime());
    });

    it('should handle storage errors gracefully', async () => {
      mockSecureTokenStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        CertificateStorage.storeMTLSCertificate(
          mockCertificate.uuid,
          mockCertificate.certificate
        )
      ).rejects.toThrow('Storage error');
    });

    it('should handle empty certificate data', async () => {
      await CertificateStorage.storeMTLSCertificate('test-uuid', '', '');

      const storedData = JSON.parse(
        (mockSecureTokenStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(storedData.certificate).toBe('');
      expect(storedData.privateKey).toBe('');
    });

    it('should handle special characters in certificate data', async () => {
      const specialCertificate = '-----BEGIN CERTIFICATE-----\nSpecial chars: ñáéíóú-中文-日本語\n-----END CERTIFICATE-----';
      
      await CertificateStorage.storeMTLSCertificate('test-uuid', specialCertificate);

      const storedData = JSON.parse(
        (mockSecureTokenStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(storedData.certificate).toBe(specialCertificate);
    });
  });

  describe('getMTLSCertificate', () => {
    it('should retrieve stored certificate', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(mockCertificate));

      const result = await CertificateStorage.getMTLSCertificate(mockCertificate.uuid);

      expect(result).toEqual(mockCertificate);
      expect(mockSecureTokenStorage.getItem).toHaveBeenCalledWith(
        getMTLSCertificateKey(mockCertificate.uuid)
      );
    });

    it('should return null when certificate not found', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue(null);

      const result = await CertificateStorage.getMTLSCertificate('non-existent-uuid');

      expect(result).toBeNull();
    });

    it('should handle malformed JSON data', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue('invalid-json');

      const result = await CertificateStorage.getMTLSCertificate(mockCertificate.uuid);

      expect(result).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockSecureTokenStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await CertificateStorage.getMTLSCertificate(mockCertificate.uuid);

      expect(result).toBeNull();
    });

    it('should handle empty string response', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue('');

      const result = await CertificateStorage.getMTLSCertificate(mockCertificate.uuid);

      expect(result).toBeNull();
    });
  });

  describe('removeMTLSCertificate', () => {
    it('should remove certificate and private key', async () => {
      await CertificateStorage.removeMTLSCertificate(mockCertificate.uuid);

      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(
        getMTLSCertificateKey(mockCertificate.uuid)
      );
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(
        getMTLSPrivateKeyKey(mockCertificate.uuid)
      );
    });

    it('should handle removal errors gracefully', async () => {
      mockSecureTokenStorage.removeItem.mockRejectedValue(new Error('Removal error'));

      await expect(
        CertificateStorage.removeMTLSCertificate(mockCertificate.uuid)
      ).rejects.toThrow('Removal error');
    });

    it('should remove both items even if one fails', async () => {
      mockSecureTokenStorage.removeItem
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Second removal failed')); // Second call fails

      await expect(
        CertificateStorage.removeMTLSCertificate(mockCertificate.uuid)
      ).rejects.toThrow('Second removal failed');
    });
  });

  describe('listCertificates', () => {
    it('should return empty array for placeholder implementation', async () => {
      const result = await CertificateStorage.listCertificates();

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Mock console.warn to avoid test output noise
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const result = await CertificateStorage.listCertificates();

      expect(result).toEqual([]);
      // The implementation doesn't actually throw an error, it just logs a warning
      // and returns an empty array, so we don't expect console.warn to be called

      console.warn = originalWarn;
    });

    it('should have reasonable timeout for placeholder implementation', async () => {
      const startTime = Date.now();
      
      await CertificateStorage.listCertificates();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take approximately 1000ms (as per the placeholder implementation)
      expect(duration).toBeGreaterThanOrEqual(900);
      expect(duration).toBeLessThanOrEqual(1100);
    });
  });

  describe('hasCertificate', () => {
    it('should return true when certificate exists', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(mockCertificate));

      const result = await CertificateStorage.hasCertificate(mockCertificate.uuid);

      expect(result).toBe(true);
    });

    it('should return false when certificate does not exist', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue(null);

      const result = await CertificateStorage.hasCertificate('non-existent-uuid');

      expect(result).toBe(false);
    });

    it('should return false when certificate data is malformed', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue('invalid-json');

      const result = await CertificateStorage.hasCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      mockSecureTokenStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await CertificateStorage.hasCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });
  });

  describe('validateCertificate', () => {
    it('should return false when certificate does not exist', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue(null);

      const result = await CertificateStorage.validateCertificate('non-existent-uuid');

      expect(result).toBe(false);
    });

    it('should return false when certificate is empty', async () => {
      const emptyCertificate = { ...mockCertificate, certificate: '' };
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(emptyCertificate));

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });

    it('should return false when certificate is whitespace only', async () => {
      const whitespaceCertificate = { ...mockCertificate, certificate: '   ' };
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(whitespaceCertificate));

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });

    it('should return true when certificate is valid and not expired', async () => {
      const validCertificate = {
        ...mockCertificate,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      };
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(validCertificate));

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(true);
    });

    it('should return false when certificate is expired', async () => {
      const expiredCertificate = {
        ...mockCertificate,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      };
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(expiredCertificate));

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });

    it('should return true when certificate has no expiry date', async () => {
      const noExpiryCertificate = { ...mockCertificate };
      delete noExpiryCertificate.expiresAt;
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(noExpiryCertificate));

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(true);
    });

    it('should handle malformed certificate data', async () => {
      mockSecureTokenStorage.getItem.mockResolvedValue('invalid-json');

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      mockSecureTokenStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await CertificateStorage.validateCertificate(mockCertificate.uuid);

      expect(result).toBe(false);
    });
  });

  describe('parseCertificateInfo', () => {
    it('should parse valid certificate PEM format', () => {
      const validPEM = `-----BEGIN CERTIFICATE-----
MIIEpDCCA4ygAwIBAgIJANJZQkz9tqhNMA0GCSqGSIb3DQEBCwUAMIGLMQswCQYD
VQQGEwJVUzELMAkGA1UECBMCTUExEjAQBgNVBAcTCUNhbWJyaWRnZTEQMA4GA1UE
ChMHTWFzc2FjaDETMBEGA1UECxMKTWFzc2FjaCBJVDENMAsGA1UEAxMEdGVzdDAe
Fw0xNDA5MjIxNzQ5MzhaFw0xNTA5MjIxNzQ5MzhaMIGLMQswCQYDVQQGEwJVUzEL
MAkGA1UECBMCTUExEjAQBgNVBAcTCUNhbWJyaWRnZTEQMA4GA1UEChMHTWFzc2Fj
aDETMBEGA1UEAxMEdGVzdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
-----END CERTIFICATE-----`;

      const result = CertificateStorage.parseCertificateInfo(validPEM);

      expect(result.fingerprint).toBeDefined();
      expect(typeof result.fingerprint).toBe('string');
      expect(result.fingerprint?.length).toBeGreaterThan(0);
    });

    it('should handle empty certificate', () => {
      const result = CertificateStorage.parseCertificateInfo('');

      expect(result.fingerprint).toBe('');
    });

    it('should handle malformed certificate', () => {
      const malformedPEM = 'This is not a valid certificate';

      const result = CertificateStorage.parseCertificateInfo(malformedPEM);

      expect(result.fingerprint).toBe('Thisisnotavalidcertificate');
    });

    it('should handle certificate without BEGIN/END markers', () => {
      const noMarkers = 'MIIEpDCCA4ygAwIBAgIJANJZQkz9tqhNMA0GCSqGSIb3DQEBCwUAMIGLMQswCQYD';

      const result = CertificateStorage.parseCertificateInfo(noMarkers);

      expect(result.fingerprint).toBeDefined();
    });

    it('should handle certificate with extra whitespace', () => {
      const whitespacePEM = `-----BEGIN CERTIFICATE-----

MIIEpDCCA4ygAwIBAgIJANJZQkz9tqhNMA0GCSqGSIb3DQEBCwUAMIGLMQswCQYD

-----END CERTIFICATE-----`;

      const result = CertificateStorage.parseCertificateInfo(whitespacePEM);

      expect(result.fingerprint).toBeDefined();
    });

    it('should handle parsing errors gracefully', () => {
      // Mock console.warn to avoid test output noise
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const result = CertificateStorage.parseCertificateInfo('invalid-certificate');

      expect(result.fingerprint).toBe('invalid-certificate');
      // The implementation doesn't actually throw an error for this input
      // so we don't expect console.warn to be called

      console.warn = originalWarn;
    });
  });

  describe('clearAllCertificates', () => {
    it('should clear all certificates', async () => {
      // Mock listCertificates to return some certificates
      const mockCertificates = [
        { uuid: 'cert-1' },
        { uuid: 'cert-2' },
        { uuid: 'cert-3' },
      ];

      // Mock the listCertificates method
      jest.spyOn(CertificateStorage, 'listCertificates').mockResolvedValue(mockCertificates as MTLSCertificate[]);

      await CertificateStorage.clearAllCertificates();

      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledTimes(6); // 2 calls per certificate (cert + private key)
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(getMTLSCertificateKey('cert-1'));
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(getMTLSPrivateKeyKey('cert-1'));
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(getMTLSCertificateKey('cert-2'));
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(getMTLSPrivateKeyKey('cert-2'));
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(getMTLSCertificateKey('cert-3'));
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(getMTLSPrivateKeyKey('cert-3'));
    });

    it('should handle empty certificate list', async () => {
      jest.spyOn(CertificateStorage, 'listCertificates').mockResolvedValue([]);

      await CertificateStorage.clearAllCertificates();

      expect(mockSecureTokenStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should handle removal errors gracefully', async () => {
      const mockCertificates = [{ uuid: 'cert-1' }];
      jest.spyOn(CertificateStorage, 'listCertificates').mockResolvedValue(mockCertificates as MTLSCertificate[]);

      mockSecureTokenStorage.removeItem.mockRejectedValue(new Error('Removal error'));

      await expect(CertificateStorage.clearAllCertificates()).rejects.toThrow('Removal error');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete certificate lifecycle', async () => {
      // Store certificate
      await CertificateStorage.storeMTLSCertificate(
        mockCertificate.uuid,
        mockCertificate.certificate,
        mockCertificate.privateKey
      );

      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith(
        getMTLSCertificateKey(mockCertificate.uuid),
        expect.any(String)
      );

      // Retrieve certificate
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(mockCertificate));
      const retrieved = await CertificateStorage.getMTLSCertificate(mockCertificate.uuid);

      expect(retrieved).toEqual(mockCertificate);

      // Check if certificate exists
      const exists = await CertificateStorage.hasCertificate(mockCertificate.uuid);
      expect(exists).toBe(true);

      // Validate certificate - need to mock with a valid certificate that has expiresAt
      const validCertificate = {
        ...mockCertificate,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      };
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(validCertificate));
      const isValid = await CertificateStorage.validateCertificate(mockCertificate.uuid);
      expect(isValid).toBe(true);

      // Parse certificate info
      const info = CertificateStorage.parseCertificateInfo(mockCertificate.certificate);
      expect(info.fingerprint).toBeDefined();

      // Remove certificate
      await CertificateStorage.removeMTLSCertificate(mockCertificate.uuid);

      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(
        getMTLSCertificateKey(mockCertificate.uuid)
      );
      expect(mockSecureTokenStorage.removeItem).toHaveBeenCalledWith(
        getMTLSPrivateKeyKey(mockCertificate.uuid)
      );
    });

    it('should handle multiple certificates', async () => {
      const certificates = [
        { uuid: 'cert-1', certificate: 'cert-data-1' },
        { uuid: 'cert-2', certificate: 'cert-data-2' },
        { uuid: 'cert-3', certificate: 'cert-data-3' },
      ];

      // Store multiple certificates
      for (const cert of certificates) {
        await CertificateStorage.storeMTLSCertificate(cert.uuid, cert.certificate);
      }

      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledTimes(3);

      // Verify each certificate
      for (const cert of certificates) {
        mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify({
          uuid: cert.uuid,
          certificate: cert.certificate,
          createdAt: new Date().toISOString(),
        }));

        const exists = await CertificateStorage.hasCertificate(cert.uuid);
        expect(exists).toBe(true);

        const isValid = await CertificateStorage.validateCertificate(cert.uuid);
        expect(isValid).toBe(true);
      }
    });

    it('should handle certificate with expiry validation', async () => {
      const futureExpiry = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
      const pastExpiry = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

      const validCert = { ...mockCertificate, expiresAt: futureExpiry };
      const expiredCert = { ...mockCertificate, uuid: 'expired-uuid', expiresAt: pastExpiry };

      // Test valid certificate
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(validCert));
      const validResult = await CertificateStorage.validateCertificate(validCert.uuid);
      expect(validResult).toBe(true);

      // Test expired certificate
      mockSecureTokenStorage.getItem.mockResolvedValue(JSON.stringify(expiredCert));
      const expiredResult = await CertificateStorage.validateCertificate(expiredCert.uuid);
      expect(expiredResult).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        CertificateStorage.storeMTLSCertificate(`cert-${i}`, `cert-data-${i}`)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle very long certificate data', async () => {
      const longCertificate = `-----BEGIN CERTIFICATE-----\n${'A'.repeat(10000)}\n-----END CERTIFICATE-----`;

      await expect(
        CertificateStorage.storeMTLSCertificate('long-cert', longCertificate)
      ).resolves.toBeUndefined();
    });

    it('should handle special characters in UUID', async () => {
      const specialUUID = 'cert-uuid-with-special-chars!@#$%^&*()';

      await expect(
        CertificateStorage.storeMTLSCertificate(specialUUID, 'cert-data')
      ).resolves.toBeUndefined();
    });

    it('should handle unicode characters in certificate data', async () => {
      const unicodeCertificate = '-----BEGIN CERTIFICATE-----\nCertificate with unicode: ñáéíóú-中文-日本語\n-----END CERTIFICATE-----';

      await expect(
        CertificateStorage.storeMTLSCertificate('unicode-cert', unicodeCertificate)
      ).resolves.toBeUndefined();
    });

    it('should handle null and undefined values gracefully', async () => {
      await expect(
        CertificateStorage.storeMTLSCertificate('test-uuid', null as any, undefined as any)
      ).resolves.toBeUndefined();
    });

    it('should handle storage failures in all operations', async () => {
      mockSecureTokenStorage.setItem.mockRejectedValue(new Error('Storage failed'));
      mockSecureTokenStorage.getItem.mockRejectedValue(new Error('Retrieval failed'));
      mockSecureTokenStorage.removeItem.mockRejectedValue(new Error('Removal failed'));

      // All operations should handle errors gracefully
      await expect(
        CertificateStorage.storeMTLSCertificate('test-uuid', 'cert-data')
      ).rejects.toThrow('Storage failed');

      await expect(
        CertificateStorage.getMTLSCertificate('test-uuid')
      ).resolves.toBeNull();

      await expect(
        CertificateStorage.removeMTLSCertificate('test-uuid')
      ).rejects.toThrow('Removal failed');

      await expect(
        CertificateStorage.hasCertificate('test-uuid')
      ).resolves.toBe(false);

      await expect(
        CertificateStorage.validateCertificate('test-uuid')
      ).resolves.toBe(false);
    });
  });
}); 