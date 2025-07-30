/**
 * Advanced Retry Logic with Exponential Backoff and Jitter
 * Prevents thundering herd problem and provides intelligent retry policies
 */

import { ACubeSDKError } from '../errors';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterType: 'none' | 'full' | 'equal' | 'decorrelated';
  retryableStatusCodes: number[];
  retryableErrors: string[];
  timeout?: number;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  error: Error;
  timestamp: number;
}

export interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageDelay: number;
  attempts: RetryAttempt[];
}

export class RetryHandler {
  private metrics: RetryMetrics = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageDelay: 0,
    attempts: [],
  };

  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    operationName = 'unknown',
  ): Promise<T> {
    let lastError: Error | null = null;
    let nextDelay = this.config.baseDelay;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      this.metrics.totalAttempts++;

      try {
        const result = await this.executeWithTimeout(operation);

        if (attempt > 1) {
          this.metrics.successfulRetries++;
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        const retryAttempt: RetryAttempt = {
          attempt,
          delay: nextDelay,
          error: lastError,
          timestamp: Date.now(),
        };

        this.metrics.attempts.push(retryAttempt);

        // Keep only last 100 attempts
        if (this.metrics.attempts.length > 100) {
          this.metrics.attempts.shift();
        }

        // Check if we should retry
        if (attempt === this.config.maxAttempts || !this.shouldRetry(lastError)) {
          this.metrics.failedRetries++;
          break;
        }

        // Calculate delay with jitter
        const delay = this.calculateDelay(attempt, nextDelay);

        console.log(
          `Retrying ${operationName} (attempt ${attempt}/${this.config.maxAttempts}) after ${delay}ms delay. Error: ${lastError.message}`,
        );

        await this.sleep(delay);

        // Update delay for next iteration
        nextDelay = Math.min(
          nextDelay * this.config.backoffMultiplier,
          this.config.maxDelay,
        );
      }
    }

    // All retries exhausted
    throw lastError || new Error('Unknown error during retry execution');
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!this.config.timeout) {
      return operation();
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  private shouldRetry(error: Error): boolean {
    // Check if error is explicitly marked as retryable
    if (error instanceof ACubeSDKError) {
      return error.retryable;
    }

    // Check HTTP status codes
    const statusCode = this.extractStatusCode(error);
    if (statusCode && this.config.retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Check error types/codes
    const errorCode = this.extractErrorCode(error);
    if (errorCode && this.config.retryableErrors.includes(errorCode)) {
      return true;
    }

    // Network errors are generally retryable
    if (this.isNetworkError(error)) {
      return true;
    }

    return false;
  }

  private calculateDelay(_attempt: number, baseDelay: number): number {
    switch (this.config.jitterType) {
      case 'none':
        return baseDelay;

      case 'full':
        return Math.random() * baseDelay;

      case 'equal':
        return baseDelay / 2 + Math.random() * (baseDelay / 2);

      case 'decorrelated':
        // Decorrelated jitter: sleep = random_between(base_delay, previous_sleep * 3)
        return Math.random() * (Math.min(this.config.maxDelay, baseDelay * 3) - this.config.baseDelay) + this.config.baseDelay;

      default:
        return baseDelay;
    }
  }

  private extractStatusCode(error: Error): number | null {
    // Try different ways to extract status code
    const err = error as any;
    return err.statusCode || err.status || err.response?.status || null;
  }

  private extractErrorCode(error: Error): string | null {
    const err = error as any;
    return err.code || err.errno || error.name || null;
  }

  private isNetworkError(error: Error): boolean {
    const networkErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      'ECONNABORTED',
    ];

    const errorCode = this.extractErrorCode(error);
    return errorCode ? networkErrorCodes.includes(errorCode) : false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getMetrics(): Readonly<RetryMetrics> {
    const totalDelay = this.metrics.attempts.reduce((sum, attempt) => sum + attempt.delay, 0);

    return {
      ...this.metrics,
      averageDelay: this.metrics.attempts.length > 0 ? totalDelay / this.metrics.attempts.length : 0,
    };
  }

  public reset(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageDelay: 0,
      attempts: [],
    };
  }
}

// Predefined retry configurations
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterType: 'equal',
  retryableStatusCodes: [500, 502, 503, 504, 429],
  retryableErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'NETWORK_ERROR',
    'RATE_LIMIT_ERROR',
  ],
  timeout: 30000,
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 60000,
  backoffMultiplier: 2.5,
  jitterType: 'decorrelated',
  retryableStatusCodes: [500, 502, 503, 504, 429, 408],
  retryableErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'NETWORK_ERROR',
    'RATE_LIMIT_ERROR',
    'CIRCUIT_BREAKER_ERROR',
  ],
  timeout: 45000,
};

export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 2000,
  maxDelay: 10000,
  backoffMultiplier: 1.5,
  jitterType: 'full',
  retryableStatusCodes: [500, 502, 503, 504],
  retryableErrors: ['NETWORK_ERROR'],
  timeout: 15000,
};
