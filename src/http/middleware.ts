/**
 * Middleware Stack for HTTP Client
 * Allows for request/response interception and modification
 */

export interface RequestContext {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  metadata: Record<string, unknown>;
  startTime: number;
  requestId: string;
}

export interface ResponseContext {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  metadata: Record<string, unknown>;
  endTime: number;
  duration: number;
}

export interface Middleware {
  name: string;
  priority: number;
  
  beforeRequest?(context: RequestContext): Promise<RequestContext> | RequestContext;
  afterResponse?(
    context: RequestContext,
    response: ResponseContext
  ): Promise<ResponseContext> | ResponseContext;
  onError?(
    context: RequestContext,
    error: Error
  ): Promise<Error | void> | Error | void;
}

export class MiddlewareStack {
  private middlewares: Middleware[] = [];

  add(middleware: Middleware): this {
    this.middlewares.push(middleware);
    // Sort by priority (higher priority first)
    this.middlewares.sort((a, b) => b.priority - a.priority);
    return this;
  }

  remove(name: string): this {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
    return this;
  }

  async executeBeforeRequest(context: RequestContext): Promise<RequestContext> {
    let currentContext = context;
    
    for (const middleware of this.middlewares) {
      if (middleware.beforeRequest) {
        try {
          currentContext = await middleware.beforeRequest(currentContext);
        } catch (error) {
          console.warn(`Middleware ${middleware.name} failed in beforeRequest:`, error);
          // Continue with other middlewares
        }
      }
    }
    
    return currentContext;
  }

  async executeAfterResponse(
    context: RequestContext,
    response: ResponseContext
  ): Promise<ResponseContext> {
    let currentResponse = response;
    
    // Execute in reverse order for response middlewares
    for (const middleware of [...this.middlewares].reverse()) {
      if (middleware.afterResponse) {
        try {
          currentResponse = await middleware.afterResponse(context, currentResponse);
        } catch (error) {
          console.warn(`Middleware ${middleware.name} failed in afterResponse:`, error);
          // Continue with other middlewares
        }
      }
    }
    
    return currentResponse;
  }

  async executeOnError(
    context: RequestContext,
    error: Error
  ): Promise<Error> {
    let currentError = error;
    
    for (const middleware of this.middlewares) {
      if (middleware.onError) {
        try {
          const result = await middleware.onError(context, currentError);
          if (result instanceof Error) {
            currentError = result;
          }
          // If void is returned, keep the current error
        } catch (middlewareError) {
          console.warn(`Middleware ${middleware.name} failed in onError:`, middlewareError);
          // Continue with other middlewares
        }
      }
    }
    
    return currentError;
  }

  getMiddlewares(): Readonly<Middleware[]> {
    return [...this.middlewares];
  }

  clear(): this {
    this.middlewares = [];
    return this;
  }
}

// Built-in middlewares

// Authentication middleware
export class AuthenticationMiddleware implements Middleware {
  name = 'authentication';
  priority = 100;

  constructor(private getToken: () => Promise<string | null>) {}

  async beforeRequest(context: RequestContext): Promise<RequestContext> {
    const token = await this.getToken();
    if (token) {
      context.headers.Authorization = `Bearer ${token}`;
    }
    return context;
  }
}

// Request ID middleware
export class RequestIdMiddleware implements Middleware {
  name = 'request-id';
  priority = 90;

  beforeRequest(context: RequestContext): RequestContext {
    if (!context.headers['X-Request-ID']) {
      context.headers['X-Request-ID'] = context.requestId;
    }
    return context;
  }
}

// User Agent middleware
export class UserAgentMiddleware implements Middleware {
  name = 'user-agent';
  priority = 80;

  constructor(private userAgent: string) {}

  beforeRequest(context: RequestContext): RequestContext {
    if (!context.headers['User-Agent']) {
      context.headers['User-Agent'] = this.userAgent;
    }
    return context;
  }
}

// Content Type middleware
export class ContentTypeMiddleware implements Middleware {
  name = 'content-type';
  priority = 70;

  beforeRequest(context: RequestContext): RequestContext {
    if (context.body && !context.headers['Content-Type']) {
      context.headers['Content-Type'] = 'application/json';
    }
    return context;
  }
}

// Request/Response logging middleware
export class LoggingMiddleware implements Middleware {
  name = 'logging';
  priority = 10;

  constructor(
    private logger: {
      debug: (message: string, meta?: unknown) => void;
      warn: (message: string, meta?: unknown) => void;
      error: (message: string, meta?: unknown) => void;
    },
    private options: {
      logRequests: boolean;
      logResponses: boolean;
      logHeaders: boolean;
      logBody: boolean;
      sanitizeHeaders?: string[];
    } = {
      logRequests: true,
      logResponses: true,
      logHeaders: false,
      logBody: false,
      sanitizeHeaders: ['authorization', 'cookie', 'x-api-key'],
    }
  ) {}

  beforeRequest(context: RequestContext): RequestContext {
    if (this.options.logRequests) {
      const logData: Record<string, unknown> = {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
      };

      if (this.options.logHeaders) {
        logData.headers = this.sanitizeHeaders(context.headers);
      }

      if (this.options.logBody && context.body) {
        logData.body = this.sanitizeBody(context.body);
      }

      this.logger.debug('HTTP Request', logData);
    }
    return context;
  }

  afterResponse(
    context: RequestContext,
    response: ResponseContext
  ): ResponseContext {
    if (this.options.logResponses) {
      const logData: Record<string, unknown> = {
        requestId: context.requestId,
        status: response.status,
        statusText: response.statusText,
        duration: response.duration,
      };

      if (this.options.logHeaders) {
        logData.headers = this.sanitizeHeaders(response.headers);
      }

      if (this.options.logBody && response.data) {
        logData.body = this.sanitizeBody(response.data);
      }

      const logLevel = response.status >= 400 ? 'error' : 'debug';
      this.logger[logLevel]('HTTP Response', logData);
    }
    return response;
  }

  onError(context: RequestContext, error: Error): Error {
    this.logger.error('HTTP Error', {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      error: error.message,
      stack: error.stack,
    });
    return error;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    this.options.sanitizeHeaders?.forEach(header => {
      const key = Object.keys(sanitized).find(k => 
        k.toLowerCase() === header.toLowerCase()
      );
      if (key) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeBody(body: unknown): unknown {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body as Record<string, unknown> };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

// Rate limiting middleware
export class RateLimitingMiddleware implements Middleware {
  name = 'rate-limiting';
  priority = 50;

  private requests: Map<string, number[]> = new Map();

  constructor(
    private config: {
      requestsPerMinute: number;
      keyGenerator?: (context: RequestContext) => string;
    }
  ) {}

  async beforeRequest(context: RequestContext): Promise<RequestContext> {
    const key = this.config.keyGenerator?.(context) || 'default';
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Get existing requests for this key
    const requests = this.requests.get(key) || [];
    
    // Remove requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Check if we're over the limit
    if (recentRequests.length >= this.config.requestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${this.config.requestsPerMinute} requests per minute`);
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return context;
  }
}

// Performance monitoring middleware
export class PerformanceMiddleware implements Middleware {
  name = 'performance';
  priority = 5;

  private metrics: Map<string, {
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
  }> = new Map();

  afterResponse(
    context: RequestContext,
    response: ResponseContext
  ): ResponseContext {
    const endpoint = `${context.method} ${context.url}`;
    const duration = response.duration;
    
    const existing = this.metrics.get(endpoint) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
    };
    
    this.metrics.set(endpoint, {
      count: existing.count + 1,
      totalDuration: existing.totalDuration + duration,
      minDuration: Math.min(existing.minDuration, duration),
      maxDuration: Math.max(existing.maxDuration, duration),
    });
    
    return response;
  }

  getMetrics(): Record<string, {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((value, key) => {
      result[key] = {
        count: value.count,
        averageDuration: value.totalDuration / value.count,
        minDuration: value.minDuration === Infinity ? 0 : value.minDuration,
        maxDuration: value.maxDuration,
      };
    });
    
    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}