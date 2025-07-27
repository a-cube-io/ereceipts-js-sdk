/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring service health
 */

import { CircuitBreakerError } from '../errors';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  healthCheckInterval?: number;
  name?: string;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChanges: Array<{
    from: CircuitBreakerState;
    to: CircuitBreakerState;
    timestamp: number;
    reason: string;
  }>;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    lastFailureTime: null,
    lastSuccessTime: null,
    stateChanges: [],
  };
  private nextAttemptTime = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(private config: CircuitBreakerConfig) {
    if (config.healthCheckInterval) {
      this.startHealthCheck();
    }
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName = 'unknown'
  ): Promise<T> {
    if (this.shouldRejectRequest()) {
      throw new CircuitBreakerError(
        `Circuit breaker is ${this.state} for operation: ${operationName}`,
        operationName,
        this.state as 'OPEN' | 'HALF_OPEN'
      );
    }

    this.metrics.totalRequests++;

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  private shouldRejectRequest(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return false;
      case 'OPEN':
        return Date.now() < this.nextAttemptTime;
      case 'HALF_OPEN':
        return false;
      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.metrics.successfulRequests++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    switch (this.state) {
      case 'HALF_OPEN':
        if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
          this.transitionTo('CLOSED', 'Success threshold reached');
        }
        break;
      case 'OPEN':
        this.transitionTo('HALF_OPEN', 'First success after opening');
        break;
    }
  }

  private onFailure(): void {
    this.metrics.failedRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    switch (this.state) {
      case 'CLOSED':
        if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
          this.transitionTo('OPEN', 'Failure threshold reached');
        }
        break;
      case 'HALF_OPEN':
        this.transitionTo('OPEN', 'Failed during half-open state');
        break;
    }
  }

  private transitionTo(newState: CircuitBreakerState, reason: string): void {
    const oldState = this.state;
    this.state = newState;

    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      reason,
    });

    // Keep only last 100 state changes
    if (this.metrics.stateChanges.length > 100) {
      this.metrics.stateChanges.shift();
    }

    if (newState === 'OPEN') {
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }

    console.log(`Circuit breaker ${this.config.name || 'unnamed'} transitioned from ${oldState} to ${newState}: ${reason}`);
  }

  private startHealthCheck(): void {
    if (this.config.healthCheckInterval) {
      this.healthCheckTimer = setInterval(() => {
        this.performHealthCheck();
      }, this.config.healthCheckInterval);
    }
  }

  private performHealthCheck(): void {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.transitionTo('HALF_OPEN', 'Health check triggered state change');
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getMetrics(): Readonly<CircuitBreakerMetrics> {
    return { ...this.metrics };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateChanges: [],
    };
    this.nextAttemptTime = 0;
  }

  public destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  public getHealthStatus(): {
    isHealthy: boolean;
    failureRate: number;
    avgResponseTime?: number;
    uptime: number;
  } {
    const now = Date.now();
    const uptime = this.metrics.lastSuccessTime 
      ? now - this.metrics.lastSuccessTime 
      : 0;
    
    const failureRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;

    return {
      isHealthy: this.state === 'CLOSED' && failureRate < 0.5,
      failureRate,
      uptime,
    };
  }
}