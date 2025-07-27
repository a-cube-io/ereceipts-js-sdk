/**
 * Tests for BaseOpenAPIResource
 * Tests the foundational class for all OpenAPI-based resources
 */

import { BaseOpenAPIResource } from '@/resources/base-openapi';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError } from '@/errors/index';
import { HttpTestHelpers } from '../setup';
import type { EndpointDefinition } from '@/generated/endpoints';

// Test implementation of BaseOpenAPIResource
class TestResource extends BaseOpenAPIResource {
  constructor(client: HttpClient) {
    const mockEndpoints: Record<string, EndpointDefinition> = {
      list: {
        method: 'GET',
        path: '/test',
        operationId: 'listTest',
        parameters: [],
        responses: {
          200: { schema: 'TestOutput' }
        }
      },
      create: {
        method: 'POST',
        path: '/test',
        operationId: 'createTest',
        parameters: [],
        requestBody: { schema: 'TestInput' },
        responses: {
          201: { schema: 'TestOutput' }
        }
      },
      getById: {
        method: 'GET',
        path: '/test/{id}',
        operationId: 'getTestById',
        parameters: [
          { name: 'id', in: 'path', schema: 'string' }
        ],
        responses: {
          200: { schema: 'TestOutput' }
        }
      },
      update: {
        method: 'PUT',
        path: '/test/{id}',
        operationId: 'updateTest',
        parameters: [
          { name: 'id', in: 'path', schema: 'string' }
        ],
        requestBody: { schema: 'TestUpdateInput' },
        responses: {
          200: { schema: 'TestOutput' }
        }
      }
    };

    super({
      client,
      endpoints: mockEndpoints
    });
  }

  // Expose protected methods for testing
  public testExecuteRequest<TInput, TOutput>(
    endpointKey: string,
    data?: TInput,
    options?: any
  ): Promise<TOutput> {
    return this.executeRequest<TInput, TOutput>(endpointKey, data, options);
  }

  public testBuildUrl(endpoint: EndpointDefinition, pathParams?: Record<string, string | number>): string {
    return this.buildUrl(endpoint, pathParams);
  }

  public testValidateRequest(context: any): void {
    return this.validateRequest(context);
  }
}

describe('BaseOpenAPIResource', () => {
  let httpClient: HttpClient;
  let testResource: TestResource;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      enableLogging: false,
    });
    testResource = new TestResource(httpClient);
  });

  afterEach(() => {
    httpClient.removeAllListeners();
  });

  describe('Constructor', () => {
    it('should create resource instance with client and endpoints', () => {
      expect(testResource).toBeInstanceOf(BaseOpenAPIResource);
      expect(testResource).toBeInstanceOf(TestResource);
    });
  });

  describe('URL Building', () => {
    it('should build simple URLs without path parameters', () => {
      const endpoint: EndpointDefinition = {
        method: 'GET',
        path: '/test',
        operationId: 'listTest',
        parameters: [],
        responses: { 200: { schema: 'TestOutput' } }
      };

      const url = testResource.testBuildUrl(endpoint);
      expect(url).toBe('/test');
    });

    it('should build URLs with path parameters', () => {
      const endpoint: EndpointDefinition = {
        method: 'GET',
        path: '/test/{id}',
        operationId: 'getTest',
        parameters: [{ name: 'id', in: 'path', schema: 'string' }],
        responses: { 200: { schema: 'TestOutput' } }
      };

      const url = testResource.testBuildUrl(endpoint, { id: '123' });
      expect(url).toBe('/test/123');
    });

    it('should build URLs with multiple path parameters', () => {
      const endpoint: EndpointDefinition = {
        method: 'GET',
        path: '/test/{category}/{id}',
        operationId: 'getTest',
        parameters: [
          { name: 'category', in: 'path', schema: 'string' },
          { name: 'id', in: 'path', schema: 'string' }
        ],
        responses: { 200: { schema: 'TestOutput' } }
      };

      const url = testResource.testBuildUrl(endpoint, { category: 'widgets', id: '123' });
      expect(url).toBe('/test/widgets/123');
    });

    it('should handle numeric path parameters', () => {
      const endpoint: EndpointDefinition = {
        method: 'GET',
        path: '/test/{id}',
        operationId: 'getTest',
        parameters: [{ name: 'id', in: 'path', schema: 'number' }],
        responses: { 200: { schema: 'TestOutput' } }
      };

      const url = testResource.testBuildUrl(endpoint, { id: 123 });
      expect(url).toBe('/test/123');
    });
  });

  describe('Request Execution', () => {
    it('should execute GET requests without data', async () => {
      const mockResponse = { id: 1, name: 'test' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('list');

      expect(result).toEqual(mockResponse);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/test', {
        method: 'GET',
      });
    });

    it('should execute POST requests with data', async () => {
      const requestData = { name: 'test item' };
      const mockResponse = { id: 1, name: 'test item' };
      
      HttpTestHelpers.mockFetchSuccess(mockResponse, 201);

      const result = await testResource.testExecuteRequest('create', requestData);

      expect(result).toEqual(mockResponse);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/test', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
    });

    it('should execute requests with path parameters', async () => {
      const mockResponse = { id: 123, name: 'specific item' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('getById', undefined, {
        pathParams: { id: '123' }
      });

      expect(result).toEqual(mockResponse);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/test/123', {
        method: 'GET',
      });
    });

    it('should execute PUT requests with path parameters and data', async () => {
      const requestData = { name: 'updated item' };
      const mockResponse = { id: 123, name: 'updated item' };
      
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('update', requestData, {
        pathParams: { id: '123' }
      });

      expect(result).toEqual(mockResponse);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/test/123', {
        method: 'PUT',
        body: JSON.stringify(requestData),
      });
    });

    it('should handle query parameters', async () => {
      const mockResponse = { items: [], total: 0 };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('list', undefined, {
        queryParams: { page: 1, size: 10, filter: 'active' }
      });

      expect(result).toEqual(mockResponse);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('/test');
      expect(fetchCall).toContain('page=1');
      expect(fetchCall).toContain('size=10');
      expect(fetchCall).toContain('filter=active');
    });

    it('should include custom headers', async () => {
      const mockResponse = { success: true };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      await testResource.testExecuteRequest('list', undefined, {
        headers: { 'X-Custom-Header': 'custom-value' }
      });

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions.headers).toEqual(expect.objectContaining({
        'X-Custom-Header': 'custom-value',
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 Not Found errors', async () => {
      HttpTestHelpers.mockFetchError(404);

      await expect(
        testResource.testExecuteRequest('getById', undefined, {
          pathParams: { id: 'nonexistent' }
        })
      ).rejects.toThrow();
    });

    it('should handle 400 Bad Request errors', async () => {
      HttpTestHelpers.mockFetchError(400, {
        type: '/errors/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request data',
      });

      await expect(
        testResource.testExecuteRequest('create', { invalid: 'data' })
      ).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      HttpTestHelpers.mockFetchError(422, {
        status: 422,
        violations: [
          { propertyPath: 'name', message: 'Name is required' }
        ],
      });

      await expect(
        testResource.testExecuteRequest('create', {})
      ).rejects.toThrow();
    });

    it('should handle 500 Internal Server errors', async () => {
      HttpTestHelpers.mockFetchError(500);

      await expect(
        testResource.testExecuteRequest('list')
      ).rejects.toThrow();
    });
  });

  describe('Request Validation', () => {
    it('should validate missing required path parameters', () => {
      const context = {
        endpoint: {
          method: 'GET' as const,
          path: '/test/{id}',
          operationId: 'getTest',
          parameters: [{ name: 'id', in: 'path' as const, schema: 'string' }],
          responses: { 200: { schema: 'TestOutput' } }
        },
        operation: 'getTest',
        pathParams: {}, // Missing required 'id' parameter
      };

      expect(() => testResource.testValidateRequest(context))
        .toThrow(ValidationError);
    });

    it('should pass validation with valid parameters', () => {
      const context = {
        endpoint: {
          method: 'GET' as const,
          path: '/test/{id}',
          operationId: 'getTest',
          parameters: [{ name: 'id', in: 'path' as const, schema: 'string' }],
          responses: { 200: { schema: 'TestOutput' } }
        },
        operation: 'getTest',
        pathParams: { id: '123' },
      };

      expect(() => testResource.testValidateRequest(context))
        .not.toThrow();
    });
  });

  describe('Metadata and Options', () => {
    it('should pass through request options', async () => {
      const mockResponse = { data: 'test' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      await testResource.testExecuteRequest('list', undefined, {
        timeout: 1000,
        skipRetry: true,
        skipCircuitBreaker: true,
        metadata: { operation: 'test_operation' }
      });

      // Verify the request was made (exact option verification would require deeper inspection)
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle empty options', async () => {
      const mockResponse = { data: 'test' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('list', undefined, {});

      expect(result).toEqual(mockResponse);
    });

    it('should handle undefined options', async () => {
      const mockResponse = { data: 'test' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('list');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle endpoints with no parameters', async () => {
      const mockResponse = { message: 'success' };
      HttpTestHelpers.mockFetchSuccess(mockResponse);

      const result = await testResource.testExecuteRequest('list');

      expect(result).toEqual(mockResponse);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/test');
    });

    it('should handle empty response data', async () => {
      HttpTestHelpers.mockFetchSuccess(null);

      const result = await testResource.testExecuteRequest('create', { name: 'test' });

      expect(result).toBeNull();
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        user: {
          name: 'John Doe',
          settings: {
            notifications: true,
            privacy: { level: 'high' }
          },
          tags: ['developer', 'typescript']
        }
      };

      const mockResponse = { id: 1, ...complexData };
      HttpTestHelpers.mockFetchSuccess(mockResponse, 201);

      const result = await testResource.testExecuteRequest('create', complexData);

      expect(result).toEqual(mockResponse);
      
      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(fetchOptions.body)).toEqual(complexData);
    });
  });
});