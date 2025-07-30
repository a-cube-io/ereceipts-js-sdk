# ACube SDK Error Handling & Troubleshooting Guide

Comprehensive error handling strategies, troubleshooting procedures, and recovery patterns for the A-Cube SDK ecosystem.

## 1. Introduction

The ACube SDK provides a robust error handling system designed for enterprise applications with comprehensive error types, recovery strategies, and troubleshooting tools. This guide covers:

- **Error Type Hierarchy**: Understanding different error categories and their handling
- **Recovery Strategies**: Automatic and manual recovery patterns
- **Troubleshooting Procedures**: Step-by-step diagnostic and resolution workflows
- **Monitoring Integration**: Error tracking and observability patterns
- **Best Practices**: Enterprise-grade error handling patterns

## 2. Error Type Hierarchy

### Base Error Classes

```typescript
// Base SDK error class
class ACubeSDKError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp: number;
  recoverable: boolean;
  
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message);
    this.name = 'ACubeSDKError';
    this.code = code;
    this.timestamp = Date.now();
    this.recoverable = options?.recoverable ?? false;
  }
}

// Authentication errors
class AuthenticationError extends ACubeSDKError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, { recoverable: true });
    this.name = 'AuthenticationError';
  }
}

// Authorization errors
class AuthorizationError extends ACubeSDKError {
  constructor(message: string, code: string = 'AUTHORIZATION_ERROR') {
    super(message, code, { recoverable: false });
    this.name = 'AuthorizationError';
  }
}

// Validation errors
class ValidationError extends ACubeSDKError {
  violations: ValidationViolation[];
  
  constructor(message: string, violations: ValidationViolation[] = []) {
    super(message, 'VALIDATION_ERROR', { recoverable: true });
    this.name = 'ValidationError';
    this.violations = violations;
  }
}

// Network errors
class NetworkError extends ACubeSDKError {
  constructor(message: string, code: string = 'NETWORK_ERROR') {
    super(message, code, { recoverable: true });
    this.name = 'NetworkError';
  }
}

// Rate limiting errors
class RateLimitError extends ACubeSDKError {
  retryAfter?: number;
  
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', { recoverable: true });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Server errors
class ServerError extends ACubeSDKError {
  constructor(message: string, statusCode: number) {
    super(message, 'SERVER_ERROR', { recoverable: statusCode >= 500 });
    this.name = 'ServerError';
    this.statusCode = statusCode;
  }
}
```

### Error Code Categories

#### Authentication Errors (AUTH_*)
| Code | Message | Scenario | Recovery Strategy |
|------|---------|----------|------------------|
| `AUTH_REQUIRED` | "Authentication required" | Request without valid token | Redirect to login |
| `AUTH_INVALID_CREDENTIALS` | "Invalid credentials" | Login with wrong username/password | Show error, allow retry |
| `AUTH_TOKEN_EXPIRED` | "Access token expired" | Expired JWT token | Auto-refresh token |
| `AUTH_REFRESH_FAILED` | "Token refresh failed" | Refresh token invalid/expired | Force re-login |
| `AUTH_MFA_REQUIRED` | "Multi-factor authentication required" | MFA step needed | Show MFA form |
| `AUTH_DEVICE_NOT_TRUSTED` | "Device not trusted" | New device login | Device verification flow |

#### Authorization Errors (AUTHZ_*)
| Code | Message | Scenario | Recovery Strategy |
|------|---------|----------|------------------|
| `AUTHZ_INSUFFICIENT_PERMISSIONS` | "Insufficient permissions" | Missing required role/permission | Show access denied |
| `AUTHZ_ROLE_REQUIRED` | "Required role not found" | Specific role needed | Suggest role switch |
| `AUTHZ_CONTEXT_INVALID` | "Invalid authorization context" | Wrong merchant/location context | Update context |
| `AUTHZ_PERMISSION_DENIED` | "Permission denied for resource" | Resource-specific access denied | Show detailed error |

#### Validation Errors (VALIDATION_*)
| Code | Message | Scenario | Recovery Strategy |
|------|---------|----------|------------------|
| `VALIDATION_REQUIRED_FIELD` | "Required field missing" | Missing required data | Highlight field |
| `VALIDATION_INVALID_FORMAT` | "Invalid data format" | Wrong data type/format | Show format example |
| `VALIDATION_OUT_OF_RANGE` | "Value out of allowed range" | Number/date outside limits | Show valid range |
| `VALIDATION_DUPLICATE_VALUE` | "Duplicate value not allowed" | Unique constraint violation | Show conflict |

#### Network Errors (NETWORK_*)
| Code | Message | Scenario | Recovery Strategy |
|------|---------|----------|------------------|
| `NETWORK_CONNECTION_FAILED` | "Connection failed" | No network connectivity | Enable offline mode |
| `NETWORK_TIMEOUT` | "Request timeout" | Slow network/server | Retry with backoff |
| `NETWORK_DNS_ERROR` | "DNS resolution failed" | DNS issues | Check connectivity |
| `NETWORK_SSL_ERROR` | "SSL certificate error" | Certificate issues | Check security settings |

#### Business Logic Errors (BUSINESS_*)
| Code | Message | Scenario | Recovery Strategy |
|------|---------|----------|------------------|
| `BUSINESS_RESOURCE_NOT_FOUND` | "Resource not found" | Invalid ID or deleted resource | Refresh list view |
| `BUSINESS_RESOURCE_CONFLICT` | "Resource conflict" | Concurrent modification | Show conflict resolution |
| `BUSINESS_RULE_VIOLATION` | "Business rule violation" | Invalid operation per business rules | Show explanation |
| `BUSINESS_QUOTA_EXCEEDED` | "Quota exceeded" | Usage limits reached | Show upgrade options |

#### System Errors (SYSTEM_*)
| Code | Message | Scenario | Recovery Strategy |
|------|---------|----------|------------------|
| `SYSTEM_INTERNAL_ERROR` | "Internal system error" | Unexpected server error | Retry, contact support |
| `SYSTEM_SERVICE_UNAVAILABLE` | "Service temporarily unavailable" | Service maintenance | Show maintenance notice |
| `SYSTEM_RATE_LIMITED` | "Rate limit exceeded" | Too many requests | Implement backoff |

## 3. Error Handling Patterns

### Basic Error Handling

```typescript
import { 
  ACubeSDKError, 
  AuthenticationError, 
  ValidationError,
  NetworkError 
} from '@a-cube-io/ereceipts-js-sdk';

try {
  const receipt = await sdk.receipts.create(receiptData);
  console.log('Receipt created:', receipt.id);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication error
    console.log('Authentication required');
    redirectToLogin();
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.log('Validation failed:', error.violations);
    showValidationErrors(error.violations);
  } else if (error instanceof NetworkError) {
    // Handle network errors
    console.log('Network error:', error.message);
    if (error.recoverable) {
      showRetryOption();
    } else {
      showOfflineMode();
    }
  } else if (error instanceof ACubeSDKError) {
    // Handle other SDK errors
    console.log('SDK error:', error.code, error.message);
    showGenericError(error);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    showUnexpectedError(error);
  }
}
```

### Advanced Error Handling with Recovery

```typescript
class ErrorHandler {
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  
  async handleSDKOperation<T>(
    operation: () => Promise<T>,
    operationId: string,
    recoveryOptions?: RecoveryOptions
  ): Promise<T> {
    try {
      const result = await operation();
      // Reset retry count on success
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      return this.handleError(error, operation, operationId, recoveryOptions);
    }
  }
  
  private async handleError<T>(
    error: Error,
    operation: () => Promise<T>,
    operationId: string,
    options?: RecoveryOptions
  ): Promise<T> {
    const retryCount = this.retryAttempts.get(operationId) || 0;
    
    if (error instanceof AuthenticationError) {
      return this.handleAuthError(error, operation, operationId);
    } else if (error instanceof NetworkError && error.recoverable) {
      return this.handleNetworkError(error, operation, operationId);
    } else if (error instanceof RateLimitError) {
      return this.handleRateLimitError(error, operation, operationId);
    } else if (error instanceof ValidationError) {
      throw error; // Don't retry validation errors
    } else {
      // Generic retry logic
      if (retryCount < this.maxRetries && error.recoverable) {
        return this.retryOperation(operation, operationId, retryCount);
      }
      throw error;
    }
  }
  
  private async handleAuthError<T>(
    error: AuthenticationError,
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    if (error.code === 'AUTH_TOKEN_EXPIRED') {
      try {
        // Try to refresh token
        await sdk.authService.refreshToken();
        // Retry original operation
        return await operation();
      } catch (refreshError) {
        // Refresh failed, redirect to login
        this.redirectToLogin();
        throw error;
      }
    } else {
      // Other auth errors require user intervention
      this.redirectToLogin();
      throw error;
    }
  }
  
  private async handleNetworkError<T>(
    error: NetworkError,
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const retryCount = this.retryAttempts.get(operationId) || 0;
    
    if (retryCount < this.maxRetries) {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await this.delay(delay);
      return this.retryOperation(operation, operationId, retryCount);
    }
    
    // Max retries reached, enable offline mode if available
    if (sdk.offline?.enabled) {
      await sdk.queue.add({
        operation: operationId,
        data: operation,
        timestamp: Date.now()
      });
      throw new Error('Operation queued for offline processing');
    }
    
    throw error;
  }
  
  private async handleRateLimitError<T>(
    error: RateLimitError,
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const retryAfter = error.retryAfter || 1000;
    await this.delay(retryAfter);
    return await operation();
  }
  
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationId: string,
    currentRetryCount: number
  ): Promise<T> {
    this.retryAttempts.set(operationId, currentRetryCount + 1);
    return await operation();
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private redirectToLogin(): void {
    // Implementation depends on your routing system
    window.location.href = '/login';
  }
}

// Usage
const errorHandler = new ErrorHandler();

const createReceipt = async (data: CreateReceiptRequest) => {
  return await errorHandler.handleSDKOperation(
    () => sdk.receipts.create(data),
    'create-receipt',
    { enableOfflineQueue: true }
  );
};
```

### React Error Boundaries

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ACubeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service
    console.error('ACube SDK Error:', error, errorInfo);
    
    // Send to error tracking
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { errorInfo }
      });
    }
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<ACubeErrorBoundary
  onError={(error, errorInfo) => {
    // Custom error handling
    console.log('Error caught by boundary:', error);
  }}
>
  <App />
</ACubeErrorBoundary>
```

## 4. Troubleshooting Procedures

### Diagnostic Tools

```typescript
class SDKDiagnostics {
  static async runDiagnostics(sdk: ACubeSDK): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: new Date(),
      sdkVersion: sdk.version,
      environment: sdk.config.environment,
      checks: []
    };
    
    // Network connectivity check
    report.checks.push(await this.checkNetworkConnectivity(sdk));
    
    // Authentication status check
    report.checks.push(await this.checkAuthentication(sdk));
    
    // API endpoints check
    report.checks.push(await this.checkAPIEndpoints(sdk));
    
    // Storage system check
    report.checks.push(await this.checkStorageSystem(sdk));
    
    // Configuration validation
    report.checks.push(await this.checkConfiguration(sdk));
    
    return report;
  }
  
  private static async checkNetworkConnectivity(sdk: ACubeSDK): Promise<DiagnosticCheck> {
    try {
      const response = await fetch(sdk.config.baseUrls.api + '/health');
      return {
        name: 'Network Connectivity',
        status: response.ok ? 'pass' : 'fail',
        message: response.ok ? 'API reachable' : `HTTP ${response.status}`,
        details: {
          url: sdk.config.baseUrls.api,
          status: response.status,
          responseTime: performance.now()
        }
      };
    } catch (error) {
      return {
        name: 'Network Connectivity',
        status: 'fail',
        message: 'Network unreachable',
        details: { error: error.message }
      };
    }
  }
  
  private static async checkAuthentication(sdk: ACubeSDK): Promise<DiagnosticCheck> {
    const isAuthenticated = sdk.isAuthenticated();
    const user = sdk.getCurrentUser();
    
    return {
      name: 'Authentication',
      status: isAuthenticated ? 'pass' : 'warn',
      message: isAuthenticated 
        ? `Authenticated as ${user?.email}` 
        : 'Not authenticated',
      details: {
        isAuthenticated,
        user: user ? {
          id: user.id,
          email: user.email,
          roles: user.roles
        } : null,
        tokenExists: !!await sdk.getAuthToken()
      }
    };
  }
  
  private static async checkAPIEndpoints(sdk: ACubeSDK): Promise<DiagnosticCheck> {
    const endpoints = [
      { name: 'receipts', path: '/receipts' },
      { name: 'cashiers', path: '/cashiers' },
      { name: 'merchants', path: '/merchants' }
    ];
    
    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const response = await sdk.apiClient.get(endpoint.path + '?limit=1');
        return { ...endpoint, status: response.status };
      })
    );
    
    const failedEndpoints = results
      .map((result, index) => ({ result, endpoint: endpoints[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ endpoint }) => endpoint.name);
    
    return {
      name: 'API Endpoints',
      status: failedEndpoints.length === 0 ? 'pass' : 'fail',
      message: failedEndpoints.length === 0 
        ? 'All endpoints accessible'
        : `Failed endpoints: ${failedEndpoints.join(', ')}`,
      details: { results }
    };
  }
  
  private static async checkStorageSystem(sdk: ACubeSDK): Promise<DiagnosticCheck> {
    if (!sdk.storage) {
      return {
        name: 'Storage System',
        status: 'skip',
        message: 'Storage not enabled'
      };
    }
    
    try {
      const testKey = 'diagnostic-test';
      const testValue = { timestamp: Date.now() };
      
      await sdk.storage.set(testKey, testValue);
      const retrieved = await sdk.storage.get(testKey);
      await sdk.storage.delete(testKey);
      
      const isWorking = JSON.stringify(retrieved) === JSON.stringify(testValue);
      
      return {
        name: 'Storage System',
        status: isWorking ? 'pass' : 'fail',
        message: isWorking ? 'Storage working correctly' : 'Storage test failed',
        details: {
          adapter: sdk.config.storageConfig?.adapter,
          testPassed: isWorking
        }
      };
    } catch (error) {
      return {
        name: 'Storage System',
        status: 'fail',
        message: 'Storage error',
        details: { error: error.message }
      };
    }
  }
  
  private static async checkConfiguration(sdk: ACubeSDK): Promise<DiagnosticCheck> {
    const issues: string[] = [];
    
    if (!sdk.config.apiKey) {
      issues.push('Missing API key');
    }
    
    if (!sdk.config.baseUrls?.api) {
      issues.push('Missing API base URL');
    }
    
    if (sdk.config.environment === 'production' && !sdk.config.baseUrls?.api?.includes('https')) {
      issues.push('Production environment should use HTTPS');
    }
    
    return {
      name: 'Configuration',
      status: issues.length === 0 ? 'pass' : 'warn',
      message: issues.length === 0 
        ? 'Configuration valid'
        : `Issues: ${issues.join(', ')}`,
      details: {
        config: {
          environment: sdk.config.environment,
          hasApiKey: !!sdk.config.apiKey,
          baseUrls: sdk.config.baseUrls
        },
        issues
      }
    };
  }
}

// Usage
const diagnostics = await SDKDiagnostics.runDiagnostics(sdk);
console.log('Diagnostics Report:', diagnostics);
```

### Common Issues and Solutions

#### Issue: SDK Initialization Fails

**Symptoms:**
- `SDK_INITIALIZATION_FAILED` error
- Resources not available
- Timeout during setup

**Diagnostic Steps:**
```typescript
// Check configuration
console.log('SDK Config:', sdk.config);

// Verify network connectivity
try {
  const response = await fetch(sdk.config.baseUrls.api + '/health');
  console.log('API Health:', response.status);
} catch (error) {
  console.log('Network Error:', error.message);
}

// Check dependencies
console.log('Storage available:', !!sdk.storage);
console.log('Queue available:', !!sdk.queue);
```

**Solutions:**
1. Verify API key and environment configuration
2. Check network connectivity and firewall settings
3. Ensure required dependencies are installed
4. Initialize SDK with proper error handling

```typescript
try {
  await sdk.initialize();
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Enable offline mode
    await sdk.enableOfflineMode();
  } else {
    console.error('Initialization failed:', error);
  }
}
```

#### Issue: Authentication Token Expired

**Symptoms:**
- `AUTH_TOKEN_EXPIRED` error
- 401 Unauthorized responses
- User gets logged out unexpectedly

**Diagnostic Steps:**
```typescript
// Check token status
const token = await sdk.getAuthToken();
const user = sdk.getCurrentUser();
console.log('Token exists:', !!token);
console.log('User authenticated:', sdk.isAuthenticated());

// Check token expiration
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
}
```

**Solutions:**
1. Enable automatic token refresh
2. Handle token expiration gracefully
3. Implement proper session management

```typescript
const sdk = createACubeSDK({
  auth: {
    config: {
      enableTokenRotation: true,
      tokenRefreshBuffer: 5 // minutes
    }
  }
});

sdk.on('auth.expired', () => {
  // Redirect to login
  window.location.href = '/login';
});
```

#### Issue: Offline Operations Not Working

**Symptoms:**
- Operations fail when offline
- Queue not processing when back online
- Data not syncing

**Diagnostic Steps:**
```typescript
// Check offline configuration
console.log('Offline enabled:', sdk.config.offline?.enabled);
console.log('Queue enabled:', sdk.config.features?.enableOfflineQueue);
console.log('Sync enabled:', sdk.config.features?.enableSync);

// Check queue status
if (sdk.queue) {
  const stats = sdk.queue.getStats();
  console.log('Queue stats:', stats);
}

// Check storage
if (sdk.storage) {
  const keys = await sdk.storage.keys();
  console.log('Storage keys:', keys.length);
}
```

**Solutions:**
1. Enable offline features in configuration
2. Implement proper offline handling
3. Process queue when back online

```typescript
const sdk = createACubeSDK({
  offline: { enabled: true },
  features: {
    enableOfflineQueue: true,
    enableSync: true
  }
});

// Handle network changes
window.addEventListener('online', async () => {
  if (sdk.queue) {
    await sdk.queue.process();
  }
});
```

## 5. Monitoring and Observability

### Error Tracking Integration

```typescript
class ErrorTracker {
  private static instance: ErrorTracker;
  private errorHistory: ErrorRecord[] = [];
  
  static getInstance(): ErrorTracker {
    if (!this.instance) {
      this.instance = new ErrorTracker();
    }
    return this.instance;
  }
  
  trackError(error: Error, context?: Record<string, unknown>): void {
    const errorRecord: ErrorRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      code: (error as ACubeSDKError).code,
      context,
      user: sdk.getCurrentUser()?.id,
      sessionId: this.getSessionId(),
      url: window.location.href
    };
    
    this.errorHistory.push(errorRecord);
    
    // Send to external monitoring services
    this.sendToSentry(errorRecord);
    this.sendToDatadog(errorRecord);
    this.sendToCustomAnalytics(errorRecord);
  }
  
  private sendToSentry(error: ErrorRecord): void {
    if (window.Sentry) {
      window.Sentry.captureException(new Error(error.message), {
        tags: {
          errorCode: error.code,
          errorType: error.type
        },
        contexts: {
          user: { id: error.user },
          session: { id: error.sessionId },
          custom: error.context
        }
      });
    }
  }
  
  private sendToDatadog(error: ErrorRecord): void {
    if (window.DD_RUM) {
      window.DD_RUM.addError(error.message, {
        errorCode: error.code,
        errorType: error.type,
        context: error.context
      });
    }
  }
  
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const last24Hours = this.errorHistory.filter(
      error => now - error.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    
    return {
      total: this.errorHistory.length,
      last24Hours: last24Hours.length,
      byType: this.groupBy(last24Hours, 'type'),
      byCode: this.groupBy(last24Hours, 'code'),
      mostRecent: this.errorHistory[this.errorHistory.length - 1]
    };
  }
}

// Initialize error tracking
const errorTracker = ErrorTracker.getInstance();

// SDK error handler
sdk.on('error', (error: Error) => {
  errorTracker.trackError(error, {
    operation: 'sdk_operation',
    component: 'core_sdk'
  });
});
```

### Health Monitoring

```typescript
class HealthMonitor {
  private metrics: HealthMetrics = {
    apiResponseTime: [],
    errorRate: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastHealthCheck: new Date()
  };
  
  startMonitoring(sdk: ACubeSDK): void {
    // Monitor API response times
    sdk.apiClient.on('response', (response) => {
      this.metrics.apiResponseTime.push(response.duration);
      this.metrics.successfulRequests++;
    });
    
    sdk.apiClient.on('error', () => {
      this.metrics.failedRequests++;
    });
    
    // Regular health checks
    setInterval(() => {
      this.performHealthCheck(sdk);
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  private async performHealthCheck(sdk: ACubeSDK): Promise<void> {
    try {
      const startTime = performance.now();
      await fetch(sdk.config.baseUrls.api + '/health');
      const responseTime = performance.now() - startTime;
      
      this.metrics.apiResponseTime.push(responseTime);
      this.metrics.lastHealthCheck = new Date();
      
      // Alert if response time is too high
      if (responseTime > 5000) {
        this.alert('High API response time', { responseTime });
      }
    } catch (error) {
      this.alert('Health check failed', { error: error.message });
    }
  }
  
  getHealthStatus(): HealthStatus {
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    const errorRate = totalRequests > 0 
      ? this.metrics.failedRequests / totalRequests 
      : 0;
    
    const avgResponseTime = this.metrics.apiResponseTime.length > 0
      ? this.metrics.apiResponseTime.reduce((a, b) => a + b, 0) / this.metrics.apiResponseTime.length
      : 0;
    
    return {
      status: this.determineOverallStatus(errorRate, avgResponseTime),
      errorRate,
      avgResponseTime,
      lastHealthCheck: this.metrics.lastHealthCheck,
      alerts: this.getActiveAlerts()
    };
  }
  
  private determineOverallStatus(errorRate: number, avgResponseTime: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorRate > 0.1 || avgResponseTime > 10000) {
      return 'unhealthy';
    } else if (errorRate > 0.05 || avgResponseTime > 5000) {
      return 'degraded';
    }
    return 'healthy';
  }
}
```

## 6. Best Practices

### 1. Error Handling Strategy

```typescript
// Use specific error types for different scenarios
const handleOperation = async () => {
  try {
    return await sdk.receipts.create(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Show field-specific errors
      showFieldErrors(error.violations);
    } else if (error instanceof AuthorizationError) {
      // Show access denied message
      showAccessDenied();
    } else if (error instanceof NetworkError && error.recoverable) {
      // Retry or queue for offline
      retryOrQueue(operation);
    } else {
      // Generic error handling
      showGenericError(error);
    }
  }
};
```

### 2. Graceful Degradation

```typescript
const GracefulComponent = () => {
  const [degradationLevel, setDegradationLevel] = useState('full');
  
  useEffect(() => {
    sdk.on('error', (error) => {
      if (error instanceof NetworkError) {
        setDegradationLevel('offline');
      } else if (error instanceof AuthenticationError) {
        setDegradationLevel('unauthenticated');
      }
    });
  }, []);
  
  return (
    <div>
      {degradationLevel === 'full' && <FullFeatureSet />}
      {degradationLevel === 'offline' && <OfflineFeatureSet />}
      {degradationLevel === 'unauthenticated' && <PublicFeatureSet />}
    </div>
  );
};
```

### 3. Error Boundaries with Recovery

```typescript
const RecoverableErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };
  
  if (error) {
    return (
      <ErrorRecoveryUI 
        error={error}
        onRetry={handleRetry}
        canRetry={retryCount < 3}
      />
    );
  }
  
  return (
    <ErrorBoundary key={retryCount} onError={setError}>
      {children}
    </ErrorBoundary>
  );
};
```

## 7. FAQ

### Q: How do I handle intermittent network failures?

**A:** Implement retry logic with exponential backoff and enable offline queue:

```typescript
const sdk = createACubeSDK({
  features: {
    enableRetry: true,
    enableOfflineQueue: true
  },
  httpConfig: {
    retries: 3,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000)
  }
});
```

### Q: What should I do when authentication fails repeatedly?

**A:** Check for common issues and implement proper error handling:

```typescript
sdk.on('auth.failed', (error) => {
  if (error.code === 'AUTH_INVALID_CREDENTIALS') {
    // Show login form with error
    showLoginError('Invalid credentials');
  } else if (error.code === 'AUTH_ACCOUNT_LOCKED') {
    // Show account locked message
    showAccountLocked();
  } else {
    // Generic auth error
    showAuthError(error.message);
  }
});
```

### Q: How do I debug performance issues?

**A:** Use the built-in diagnostics and monitoring tools:

```typescript
// Run diagnostics
const report = await SDKDiagnostics.runDiagnostics(sdk);
console.log('Performance issues:', report.checks.filter(c => c.status === 'fail'));

// Monitor API performance
sdk.apiClient.on('response', (response) => {
  if (response.duration > 5000) {
    console.warn('Slow API response:', response.url, response.duration);
  }
});
```

## 8. Changelog

### v2.0.0 – Current Release
- **NEW**: Comprehensive error type hierarchy with specific recovery strategies
- **NEW**: Advanced error handling patterns with automatic retry and recovery
- **NEW**: Diagnostic tools and health monitoring capabilities
- **NEW**: Integration with external monitoring services (Sentry, Datadog)
- **NEW**: React error boundaries with recovery mechanisms
- **IMPROVED**: Error messages with actionable information
- **IMPROVED**: Troubleshooting procedures with step-by-step guidance
- **IMPROVED**: Best practices documentation with real-world examples