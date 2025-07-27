/**
 * Integration tests for HttpClient
 * Tests the HTTP client with circuit breaker, retry logic, and middleware
 */

import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { HttpTestHelpers } from '../setup';

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      enableLogging: false, // Disable logging in tests
    });
  });

  afterEach(() => {
    httpClient.removeAllListeners();
  });

  describe('Basic HTTP Operations', () => {
    it('should create HTTP client instance', () => {
      expect(httpClient).toBeInstanceOf(HttpClient);
    });

    it('should make GET requests', async () => {
      const mockResponse = { data: 'test' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const response = await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
      expect(typeof response.requestId).toBe('string');
      expect(typeof response.duration).toBe('number');
    });

    it('should make POST requests with data', async () => {
      const requestData = { name: 'test' };
      const mockResponse = { id: 1, name: 'test' };
      
      HttpTestHelpers.mockFetchSuccess(mockResponse, 201);

      const response = await httpClient.request({
        method: 'POST',
        url: '/test',
        data: requestData,
      });

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(201);
      
      // Verify the request was made with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
    });

    it('should make PUT requests', async () => {
      const requestData = { id: 1, name: 'updated' };
      const mockResponse = { id: 1, name: 'updated' };
      
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const response = await httpClient.request({
        method: 'PUT',
        url: '/test/1',
        data: requestData,
      });

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });

    it('should make DELETE requests', async () => {
      HttpTestHelpers.mockFetchSuccess({}, 204);

      const response = await httpClient.request({
        method: 'DELETE',
        url: '/test/1',
      });

      expect(response.status).toBe(204);
    });
  });

  describe('URL Construction', () => {
    it('should construct URLs correctly with baseUrl', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.any(Object)
      );
    });

    it('should handle query parameters', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      await httpClient.request({
        method: 'GET',
        url: '/test',
        params: { page: 1, size: 10 },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test?page=1&size=10',
        expect.any(Object)
      );
    });

    it('should handle complex query parameters', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      await httpClient.request({
        method: 'GET',
        url: '/test',
        params: { 
          filters: ['active', 'verified'],
          date: '2024-01-01',
          nested: { key: 'value' }
        },
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('https://api.example.com/test');
      expect(fetchCall).toContain('filters');
      expect(fetchCall).toContain('date=2024-01-01');
    });
  });

  describe('Headers and Middleware', () => {
    it('should include default headers', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json',
        'User-Agent': expect.stringContaining('ACube'),
        'X-Request-ID': expect.any(String),
      }));
    });

    it('should merge custom headers with defaults', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      await httpClient.request({
        method: 'POST',
        url: '/test',
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
        'X-Request-ID': expect.any(String),
      }));
    });

    it('should generate unique request IDs', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      const response1 = await httpClient.request({
        method: 'GET',
        url: '/test1',
      });

      HttpTestHelpers.mockFetchSuccess({});

      const response2 = await httpClient.request({
        method: 'GET',
        url: '/test2',
      });

      expect(response1.requestId).not.toBe(response2.requestId);
      expect(response1.requestId).toMatch(/^req_\d+_[a-f0-9]{8}$/);
      expect(response2.requestId).toMatch(/^req_\d+_[a-f0-9]{8}$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request errors', async () => {
      HttpTestHelpers.mockFetchError(400);

      await expect(
        httpClient.request({
          method: 'POST',
          url: '/test',
          data: { invalid: 'data' },
        })
      ).rejects.toThrow();
    });

    it('should handle 401 Unauthorized errors', async () => {
      HttpTestHelpers.mockFetchError(401);

      await expect(
        httpClient.request({
          method: 'GET',
          url: '/protected',
        })
      ).rejects.toThrow();
    });

    it('should handle 404 Not Found errors', async () => {
      HttpTestHelpers.mockFetchError(404);

      await expect(
        httpClient.request({
          method: 'GET',
          url: '/nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should handle 500 Internal Server errors', async () => {
      HttpTestHelpers.mockFetchError(500);

      await expect(
        httpClient.request({
          method: 'GET',
          url: '/test',
        })
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      HttpTestHelpers.mockFetchNetworkError();

      await expect(
        httpClient.request({
          method: 'GET',
          url: '/test',
        })
      ).rejects.toThrow();
    });
  });

  describe('Response Processing', () => {
    it('should measure request duration', async () => {
      HttpTestHelpers.mockFetchSuccess({});

      const response = await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      expect(typeof response.duration).toBe('number');
      expect(response.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include response headers', async () => {
      const mockHeaders = new Map([
        ['content-type', 'application/json'],
        ['x-rate-limit', '100'],
      ]);
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        json: async () => ({ success: true }),
      });

      const response = await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      expect(response.headers).toEqual(expect.objectContaining({
        'content-type': 'application/json',
        'x-rate-limit': '100',
      }));
    });
  });

  describe('Request Lifecycle Events', () => {
    it('should emit request start event', async () => {
      const startSpy = jest.fn();
      httpClient.on('request:start', startSpy);

      HttpTestHelpers.mockFetchSuccess({});

      await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/test'),
        requestId: expect.any(String),
      }));
    });

    it('should emit request complete event', async () => {
      const completeSpy = jest.fn();
      httpClient.on('request:complete', completeSpy);

      HttpTestHelpers.mockFetchSuccess({ data: 'test' });

      await httpClient.request({
        method: 'GET',
        url: '/test',
      });

      expect(completeSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        duration: expect.any(Number),
        requestId: expect.any(String),
      }));
    });

    it('should emit request error event on failures', async () => {
      const errorSpy = jest.fn();
      httpClient.on('request:error', errorSpy);

      HttpTestHelpers.mockFetchError(500);

      try {
        await httpClient.request({
          method: 'GET',
          url: '/test',
        });
      } catch {
        // Expected to throw
      }

      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(Error),
        requestId: expect.any(String),
      }));
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom timeout', async () => {
      const customClient = new HttpClient({
        ...DEFAULT_HTTP_CONFIG,
        baseUrl: 'https://api.example.com',
        timeout: 1000, // 1 second
      });

      HttpTestHelpers.mockFetchSuccess({});

      await customClient.request({
        method: 'GET',
        url: '/test',
        timeout: 500, // Override to 500ms
      });

      // Verify AbortController was used (indicating timeout was set)
      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions.signal).toBeDefined();
      
      customClient.removeAllListeners();
    });

    it('should handle custom user agent', () => {
      const customClient = new HttpClient({
        ...DEFAULT_HTTP_CONFIG,
        baseUrl: 'https://api.example.com',
        userAgent: 'CustomAgent/1.0.0',
      });

      expect(customClient).toBeInstanceOf(HttpClient);
      customClient.removeAllListeners();
    });
  });
});