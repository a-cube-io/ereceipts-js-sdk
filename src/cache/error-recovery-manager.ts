import { ICacheAdapter } from '../adapters';
import { OptimisticManager } from './optimistic-manager';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  baseRetryDelay?: number;
  /** Maximum retry delay (ms) */
  maxRetryDelay?: number;
  /** Enable automatic error recovery */
  autoRecovery?: boolean;
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold?: number;
  /** Circuit breaker reset timeout (ms) */
  circuitBreakerResetTimeout?: number;
  /** Enable performance monitoring integration */
  enablePerformanceMonitoring?: boolean;
}

/**
 * Error types for categorized handling
 */
export type ErrorType =
  | 'network_error'
  | 'timeout_error'
  | 'storage_error'
  | 'validation_error'
  | 'quota_exceeded'
  | 'permission_error'
  | 'server_error'
  | 'unknown_error';

/**
 * Error recovery strategy
 */
export type RecoveryStrategy =
  | 'retry'           // Retry the operation
  | 'fallback'        // Use fallback mechanism
  | 'circuit_breaker' // Open circuit breaker
  | 'graceful_degrade' // Reduce functionality
  | 'manual'          // Require manual intervention
  | 'ignore';         // Ignore and continue

/**
 * Recovery action result
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Strategy used for recovery */
  strategy: RecoveryStrategy;
  /** Number of attempts made */
  attempts: number;
  /** Time taken for recovery (ms) */
  recoveryTime: number;
  /** Final error if recovery failed */
  finalError?: Error;
  /** Any recovered data */
  recoveredData?: any;
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half_open';

/**
 * Circuit breaker for handling cascading failures
 */
class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private threshold: number,
    private resetTimeout: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half_open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'half_open') {
        this.successCount++;
        if (this.successCount >= 3) { // Require 3 successes to close
          this.reset();
        }
      } else {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Error recovery and resilience manager
 */
export class ErrorRecoveryManager {
  private config: Required<ErrorRecoveryConfig>;
  private performanceMonitor?: PerformanceMonitor;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, { error: Error; timestamp: number }>();

  constructor(
    private cache: ICacheAdapter,
    private optimisticManager?: OptimisticManager,
    config: ErrorRecoveryConfig = {},
    performanceMonitor?: PerformanceMonitor
  ) {
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 30000, // 30 seconds
      autoRecovery: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeout: 60000, // 1 minute
      enablePerformanceMonitoring: false,
      ...config,
    };

    this.performanceMonitor = performanceMonitor;
  }

  /**
   * Execute operation with error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(context);
    
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      const errorType = this.categorizeError(error);
      const strategy = this.determineRecoveryStrategy(errorType, context);
      
      return await this.executeRecovery(
        operation,
        context,
        error as Error,
        errorType,
        strategy,
        fallback
      );
    }
  }

  /**
   * Recover from cache operation failure
   */
  async recoverCacheOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    key?: string
  ): Promise<RecoveryResult & { data?: T }> {
    const startTime = performance.now();
    let attempts = 0;
    let finalError: Error | undefined;

    try {
      const fallback = key ? () => this.createCacheFallback<T>(key, operationName) : undefined;
      const data = await this.executeWithRecovery(operation, operationName, fallback);
      
      return {
        success: true,
        strategy: 'retry',
        attempts: attempts + 1,
        recoveryTime: performance.now() - startTime,
        data: data as T,
      };
    } catch (error) {
      finalError = error as Error;
      
      // Try graceful degradation
      if (this.config.autoRecovery) {
        const degradedResult = await this.attemptGracefulDegradation(operationName, key);
        if (degradedResult.success) {
          return {
            ...degradedResult,
            recoveryTime: performance.now() - startTime,
          } as RecoveryResult & { data?: T };
        }
      }

      return {
        success: false,
        strategy: 'manual',
        attempts: attempts + 1,
        recoveryTime: performance.now() - startTime,
        finalError,
      };
    }
  }

  /**
   * Recover from optimistic operation failure
   */
  async recoverOptimisticOperation(
    operationId: string,
    error: Error
  ): Promise<RecoveryResult> {
    const startTime = performance.now();
    
    if (!this.optimisticManager) {
      return {
        success: false,
        strategy: 'manual',
        attempts: 0,
        recoveryTime: performance.now() - startTime,
        finalError: new Error('OptimisticManager not available'),
      };
    }

    try {
      // Try to rollback the optimistic operation
      await this.optimisticManager.rollbackOptimisticUpdate(
        operationId,
        `Recovery from error: ${error.message}`
      );

      // Record the recovery
      this.recordRecovery('optimistic_rollback');

      return {
        success: true,
        strategy: 'fallback',
        attempts: 1,
        recoveryTime: performance.now() - startTime,
      };
    } catch (rollbackError) {
      return {
        success: false,
        strategy: 'manual',
        attempts: 1,
        recoveryTime: performance.now() - startTime,
        finalError: rollbackError as Error,
      };
    }
  }

  /**
   * Recover from storage quota exceeded error
   */
  async recoverFromQuotaExceeded(): Promise<RecoveryResult> {
    const startTime = performance.now();

    try {
      // Trigger aggressive cache cleanup
      const cleanupResult = await this.cache.cleanup();
      
      if (cleanupResult > 0) {
        this.recordRecovery('quota_cleanup');
        
        return {
          success: true,
          strategy: 'graceful_degrade',
          attempts: 1,
          recoveryTime: performance.now() - startTime,
          recoveredData: { entriesRemoved: cleanupResult },
        };
      }

      // If cleanup didn't help, try clearing old data
      await this.clearOldCacheData();
      
      return {
        success: true,
        strategy: 'graceful_degrade',
        attempts: 2,
        recoveryTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        strategy: 'manual',
        attempts: 2,
        recoveryTime: performance.now() - startTime,
        finalError: error as Error,
      };
    }
  }

  /**
   * Recover from network connectivity issues
   */
  async recoverFromNetworkError(_context: string): Promise<RecoveryResult> {
    const startTime = performance.now();
    let attempts = 0;

    // Implement exponential backoff retry
    while (attempts < this.config.maxRetries) {
      attempts++;
      
      try {
        const delay = Math.min(
          this.config.baseRetryDelay * Math.pow(2, attempts - 1),
          this.config.maxRetryDelay
        );
        
        await this.sleep(delay);
        
        // Test network connectivity
        if (await this.testNetworkConnectivity()) {
          this.recordRecovery('network_reconnect');
          
          return {
            success: true,
            strategy: 'retry',
            attempts,
            recoveryTime: performance.now() - startTime,
          };
        }
      } catch (error) {
        if (attempts === this.config.maxRetries) {
          return {
            success: false,
            strategy: 'graceful_degrade',
            attempts,
            recoveryTime: performance.now() - startTime,
            finalError: error as Error,
          };
        }
      }
    }

    return {
      success: false,
      strategy: 'graceful_degrade',
      attempts,
      recoveryTime: performance.now() - startTime,
    };
  }

  /**
   * Get error recovery statistics
   */
  getRecoveryStats(): {
    totalErrors: number;
    recoveryAttempts: number;
    successfulRecoveries: number;
    circuitBreakerStates: Record<string, CircuitState>;
    recentErrors: Array<{ context: string; error: string; timestamp: number }>;
  } {
    const circuitBreakerStates: Record<string, CircuitState> = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      circuitBreakerStates[key] = breaker.getState();
    }

    const recentErrors = Array.from(this.lastErrors.entries()).map(([context, { error, timestamp }]) => ({
      context,
      error: error.message,
      timestamp,
    }));

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      recoveryAttempts: 0, // Would need to track this separately
      successfulRecoveries: 0, // Would need to track this separately
      circuitBreakerStates,
      recentErrors,
    };
  }

  /**
   * Reset error recovery state
   */
  resetRecoveryState(context?: string): void {
    if (context) {
      this.errorCounts.delete(context);
      this.lastErrors.delete(context);
      this.circuitBreakers.delete(context);
    } else {
      this.errorCounts.clear();
      this.lastErrors.clear();
      this.circuitBreakers.clear();
    }
  }

  /**
   * Categorize error for appropriate handling
   */
  private categorizeError(error: any): ErrorType {
    if (!error) return 'unknown_error';

    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (name.includes('networkerror') || message.includes('network')) {
      return 'network_error';
    }
    
    if (name.includes('timeout') || message.includes('timeout')) {
      return 'timeout_error';
    }
    
    if (message.includes('quota') || message.includes('storage full')) {
      return 'quota_exceeded';
    }
    
    if (message.includes('permission') || message.includes('access denied')) {
      return 'permission_error';
    }
    
    if (message.includes('validation') || error.code === 'VALIDATION_ERROR') {
      return 'validation_error';
    }
    
    if (message.includes('storage') || name.includes('dom')) {
      return 'storage_error';
    }
    
    if (error.status && error.status >= 500) {
      return 'server_error';
    }

    return 'unknown_error';
  }

  /**
   * Determine recovery strategy based on error type
   */
  private determineRecoveryStrategy(errorType: ErrorType, context: string): RecoveryStrategy {
    const errorCount = this.errorCounts.get(context) || 0;

    switch (errorType) {
      case 'network_error':
      case 'timeout_error':
        return errorCount < this.config.maxRetries ? 'retry' : 'circuit_breaker';
      
      case 'quota_exceeded':
        return 'graceful_degrade';
      
      case 'storage_error':
        return 'fallback';
      
      case 'validation_error':
        return 'ignore'; // Usually not recoverable
      
      case 'permission_error':
        return 'manual';
      
      case 'server_error':
        return errorCount < 2 ? 'retry' : 'circuit_breaker';
      
      default:
        return 'manual';
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecovery<T>(
    operation: () => Promise<T>,
    context: string,
    error: Error,
    _errorType: ErrorType,
    strategy: RecoveryStrategy,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.recordError(context, error);

    switch (strategy) {
      case 'retry':
        return await this.retryWithBackoff(operation, context);
      
      case 'fallback':
        if (fallback) {
          return await fallback();
        }
        throw new Error(`No fallback available for ${context}`);
      
      case 'graceful_degrade':
        // Attempt fallback first, then throw if not available
        if (fallback) {
          return await fallback();
        }
        throw error;
      
      default:
        throw error;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const errorCount = this.errorCounts.get(context) || 0;
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, errorCount),
      this.config.maxRetryDelay
    );

    await this.sleep(delay);
    return await operation();
  }

  /**
   * Create cache fallback operation
   */
  private async createCacheFallback<T>(_key: string, operationName: string): Promise<T> {
    switch (operationName) {
      case 'get':
        // Return null for failed cache gets
        return null as any;
      
      case 'set':
      case 'setItem':
        // For set operations, just resolve successfully
        return undefined as any;
      
      default:
        throw new Error(`No fallback available for operation: ${operationName}`);
    }
  }

  /**
   * Attempt graceful degradation
   */
  private async attemptGracefulDegradation<T>(
    operationName: string,
    _key?: string
  ): Promise<RecoveryResult & { data?: T }> {
    try {
      switch (operationName) {
        case 'get':
          // Return empty result for failed gets
          return {
            success: true,
            strategy: 'graceful_degrade',
            attempts: 1,
            recoveryTime: 0,
            data: null as any,
          };
        
        case 'set':
        case 'setItem':
          // Skip failed sets gracefully
          return {
            success: true,
            strategy: 'graceful_degrade',
            attempts: 1,
            recoveryTime: 0,
          };
        
        default:
          return {
            success: false,
            strategy: 'manual',
            attempts: 0,
            recoveryTime: 0,
          };
      }
    } catch (error) {
      return {
        success: false,
        strategy: 'manual',
        attempts: 1,
        recoveryTime: 0,
        finalError: error as Error,
      };
    }
  }

  /**
   * Clear old cache data to free up space
   */
  private async clearOldCacheData(): Promise<void> {
    try {
      // Get all keys and remove entries older than 1 hour
      const keys = await this.cache.getKeys();
      const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      for (const key of keys) {
        try {
          const item = await this.cache.get(key);
          if (item && item.timestamp < cutoffTime) {
            await this.cache.invalidate(key);
          }
        } catch (error) {
          // Ignore errors for individual key operations
        }
      }
    } catch (error) {
      // If we can't clean up, clear everything as last resort
      await this.cache.clear();
    }
  }

  /**
   * Test network connectivity
   */
  private async testNetworkConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity test - attempt to resolve a reliable endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Record error for tracking
   */
  private recordError(context: string, error: Error): void {
    const currentCount = this.errorCounts.get(context) || 0;
    this.errorCounts.set(context, currentCount + 1);
    this.lastErrors.set(context, { error, timestamp: Date.now() });
  }

  /**
   * Record successful recovery
   */
  private recordRecovery(_recoveryType: string): void {
    // Could be integrated with performance monitor
    if (this.performanceMonitor) {
      // Performance monitor doesn't have recovery tracking yet,
      // but could be extended
    }
  }

  /**
   * Get or create circuit breaker for context
   */
  private getOrCreateCircuitBreaker(context: string): CircuitBreaker {
    if (!this.circuitBreakers.has(context)) {
      this.circuitBreakers.set(
        context,
        new CircuitBreaker(
          this.config.circuitBreakerThreshold,
          this.config.circuitBreakerResetTimeout
        )
      );
    }
    return this.circuitBreakers.get(context)!;
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.circuitBreakers.clear();
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}