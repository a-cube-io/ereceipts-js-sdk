/**
 * Test Setup File
 * Global test configuration and utilities
 */

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly testing it
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Restore console for specific tests if needed
export const restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Mock process.exit to prevent tests from exiting
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`Process.exit called with code: ${code}`);
});

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Mock any external dependencies that might cause issues in tests
jest.mock('keytar', () => ({
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
}));

// Increase timeout for async operations
jest.setTimeout(10000);

// Mock Web Crypto API for Node.js environment
const mockCrypto = {
  subtle: {
    generateKey: jest.fn().mockImplementation((algorithm: any, extractable: boolean, usages: string[]) => {
      const algorithmName = algorithm.name || algorithm;
      const mockKey = {
        algorithm: { name: algorithmName },
        extractable,
        usages,
        type: 'secret',
      };

      if (algorithmName === 'ECDSA' || algorithmName === 'RSA-PSS' || algorithmName === 'RSA-OAEP') {
        return Promise.resolve({
          privateKey: { ...mockKey, type: 'private', algorithm: { name: algorithmName } },
          publicKey: { ...mockKey, type: 'public', algorithm: { name: algorithmName } },
        });
      }

      return Promise.resolve(mockKey);
    }),

    sign: jest.fn().mockImplementation((algorithm: any, key: any, data: ArrayBuffer) => {
      // Return a mock signature based on data for consistent results
      const input = new Uint8Array(data);
      let signatureSize = 64; // Default for ECDSA
      
      // Handle both object and string algorithm formats
      const algorithmName = typeof algorithm === 'string' ? algorithm : algorithm?.name;
      
      if (algorithmName === 'HMAC') {
        // Different sizes for different HMAC algorithms
        // For HMAC, get the hash algorithm from the key (which has the algorithm object)
        const hashAlg = key?.algorithm?.hash || 'SHA-256';
        signatureSize = hashAlg === 'SHA-256' ? 32 : hashAlg === 'SHA-384' ? 48 : 64;
      }
      
      const signature = new Uint8Array(signatureSize);
      // Make signature dependent on both data and algorithm for uniqueness
      const algorithmSeed = (algorithmName || '').charCodeAt(0) || 0;
      // For HMAC, include secret key data in signature generation
      let secretSeed = 0;
      if (algorithmName === 'HMAC' && key.secretData) {
        const secretArray = new Uint8Array(key.secretData);
        secretSeed = secretArray.reduce((sum, byte) => sum + byte, 0) % 256;
      }
      
      for (let i = 0; i < signature.length; i++) {
        signature[i] = (input[i % input.length] ?? 0 + i + algorithmSeed + secretSeed) % 256;
      }
      return Promise.resolve(signature.buffer);
    }),

    verify: jest.fn().mockImplementation((algorithm: any, key: any, signature: ArrayBuffer, data: ArrayBuffer) => {
      // Simple verification: re-sign the data and compare
      const input = new Uint8Array(data);
      const sigArray = new Uint8Array(signature);
      
      // Create expected signature the same way as sign()
      let signatureSize = 64; // Default for ECDSA
      
      // Handle both object and string algorithm formats
      const algorithmName = typeof algorithm === 'string' ? algorithm : algorithm?.name;
      
      if (algorithmName === 'HMAC') {
        // For HMAC, get the hash algorithm from the key (which has the algorithm object)
        const hashAlg = key?.algorithm?.hash || 'SHA-256';
        signatureSize = hashAlg === 'SHA-256' ? 32 : hashAlg === 'SHA-384' ? 48 : 64;
      }
      
      if (sigArray.length !== signatureSize) {
        return Promise.resolve(false);
      }
      
      // Check if signature matches expected pattern with algorithm and secret seed
      const algorithmSeed = (algorithmName || '').charCodeAt(0) || 0;
      let secretSeed = 0;
      if (algorithmName === 'HMAC' && key.secretData) {
        const secretArray = new Uint8Array(key.secretData);
        secretSeed = secretArray.reduce((sum, byte) => sum + byte, 0) % 256;
      }
      
      for (let i = 0; i < Math.min(signatureSize, sigArray.length); i++) {
        const expected = (input[i % input.length] ?? 0 + i + algorithmSeed + secretSeed) % 256;
        if (sigArray[i] !== expected) {
          return Promise.resolve(false);
        }
      }
      
      return Promise.resolve(true);
    }),

    encrypt: jest.fn().mockImplementation((algorithm: any, _key: any, data: ArrayBuffer) => {
      // Create a simple encryption mock that can be properly decrypted
      const originalData = new Uint8Array(data);
      const encrypted = new Uint8Array(originalData.length + 16); // +16 for auth tag or padding
      
      // Simple "encryption" - just XOR with a pattern and add auth tag for GCM
      for (let i = 0; i < originalData.length; i++) {
        encrypted[i] = (originalData[i] ?? 0) ^ (i % 256);
      }
      
      // Add deterministic "auth tag" for GCM
      if (algorithm.name === 'AES-GCM') {
        for (let i = originalData.length; i < encrypted.length; i++) {
          encrypted[i] = (i - originalData.length) + 100; // Deterministic tag
        }
      }
      
      return Promise.resolve(encrypted.buffer);
    }),

    decrypt: jest.fn().mockImplementation((algorithm: any, _key: any, data: ArrayBuffer) => {
      // Decrypt the mock encrypted data
      const encryptedData = new Uint8Array(data);
      const isGCM = algorithm.name === 'AES-GCM';
      const originalLength = isGCM ? encryptedData.length - 16 : encryptedData.length;
      const decrypted = new Uint8Array(originalLength);
      
      // Reverse the XOR "encryption"
      for (let i = 0; i < originalLength; i++) {
        decrypted[i] = (encryptedData[i] ?? 0) ^ (i % 256);
      }
      
      return Promise.resolve(decrypted.buffer);
    }),

    exportKey: jest.fn().mockImplementation((format: string, key: any) => {
      if (format === 'jwk') {
        // Check the key type and algorithm - handle undefined key gracefully
        const keyType = key?.type || 'secret';
        const algorithmName = key?.algorithm?.name || key?.algorithm || 'AES-GCM';
        
        if (algorithmName === 'ECDSA') {
          return Promise.resolve({
            kty: 'EC',
            crv: 'P-256',
            x: 'mock-x-coordinate',
            y: 'mock-y-coordinate',
            ...(keyType === 'private' ? { d: 'mock-private-key' } : {})
          });
        } else if (algorithmName === 'RSA-PSS' || algorithmName === 'RSA-OAEP') {
          return Promise.resolve({
            kty: 'RSA',
            n: 'mock-modulus',
            e: 'AQAB',
            ...(keyType === 'private' ? { d: 'mock-private-exponent' } : {})
          });
        } else {
          return Promise.resolve({
            kty: 'oct',
            k: 'mock-symmetric-key'
          });
        }
      } else {
        // Raw, SPKI, PKCS8 formats - return ArrayBuffer
        const mockData = new Uint8Array(32);
        for (let i = 0; i < mockData.length; i++) {
          mockData[i] = Math.floor(Math.random() * 256);
        }
        return Promise.resolve(mockData.buffer);
      }
    }),

    importKey: jest.fn().mockImplementation((format: string, keyData: any, algorithm: any, extractable: boolean, usages: string[]) => {
      // For HMAC, store the secret key data for later signature generation
      const mockKey = {
        algorithm: { name: algorithm.name || algorithm, hash: algorithm.hash },
        extractable,
        usages,
        type: format === 'jwk' && keyData.d ? 'private' : (algorithm.name === 'HMAC' ? 'secret' : 'public'),
      };
      
      // Store secret data for HMAC
      if (algorithm.name === 'HMAC' && format === 'raw') {
        (mockKey as any).secretData = keyData;
      }
      
      return Promise.resolve(mockKey);
    }),

    deriveKey: jest.fn().mockImplementation((_algorithm: any, _baseKey: any, derivedKeyType: any, extractable: boolean, usages: string[]) => {
      return Promise.resolve({
        algorithm: { name: derivedKeyType.name },
        extractable,
        usages,
        type: 'secret',
      });
    }),

    digest: jest.fn().mockImplementation((algorithm: string, data: ArrayBuffer) => {
      // Mock hash - just return first 32 bytes of data repeated
      const input = new Uint8Array(data);
      const hashSize = algorithm === 'SHA-256' ? 32 : algorithm === 'SHA-384' ? 48 : 64;
      const hash = new Uint8Array(hashSize);
      
      for (let i = 0; i < hashSize; i++) {
        hash[i] = input[i % input.length] || i;
      }
      
      return Promise.resolve(hash.buffer);
    }),
  },

  getRandomValues: jest.fn().mockImplementation((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Mock global crypto object
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock btoa and atob for base64 operations
Object.defineProperty(global, 'btoa', {
  value: (str: string) => Buffer.from(str, 'binary').toString('base64'),
  writable: true,
});

Object.defineProperty(global, 'atob', {
  value: (str: string) => Buffer.from(str, 'base64').toString('binary'),
  writable: true,
});

// Mock TextEncoder and TextDecoder
Object.defineProperty(global, 'TextEncoder', {
  value: class TextEncoder {
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf8'));
    }
  },
  writable: true,
});

Object.defineProperty(global, 'TextDecoder', {
  value: class TextDecoder {
    decode(input: Uint8Array): string {
      return Buffer.from(input).toString('utf8');
    }
  },
  writable: true,
});

// Mock CompressionStream and DecompressionStream
Object.defineProperty(global, 'CompressionStream', {
  value: class CompressionStream {
    readable: any;
    writable: any;
    
    constructor(_format: string) {
      // Mock implementation - just pass data through
      const chunks: Uint8Array[] = [];
      
      this.writable = {
        getWriter: () => ({
          write: (chunk: Uint8Array) => {
            chunks.push(chunk);
            return Promise.resolve();
          },
          close: () => Promise.resolve(),
        }),
      };
      
      this.readable = {
        getReader: () => ({
          read: () => {
            if (chunks.length > 0) {
              return Promise.resolve({ value: chunks.shift(), done: false });
            }
            return Promise.resolve({ done: true });
          },
        }),
      };
    }
  },
  writable: true,
});

Object.defineProperty(global, 'DecompressionStream', {
  value: class DecompressionStream {
    readable: any;
    writable: any;

    constructor(_format: string) {
      // Mock implementation - just pass data through
      const chunks: Uint8Array[] = [];
      
      this.writable = {
        getWriter: () => ({
          write: (chunk: Uint8Array) => {
            chunks.push(chunk);
            return Promise.resolve();
          },
          close: () => Promise.resolve(),
        }),
      };
      
      this.readable = {
        getReader: () => ({
          read: () => {
            if (chunks.length > 0) {
              return Promise.resolve({ value: chunks.shift(), done: false });
            }
            return Promise.resolve({ done: true });
          },
        }),
      };
    }
  },
  writable: true,
});
