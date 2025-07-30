/**
 * Webhook Manager - Real-time updates via webhooks
 * Handles incoming webhooks from A-Cube service for real-time notifications
 * Provides event-driven updates for receipts, cashiers, merchants, and other resources
 */

import type { ResourceType } from '@/storage/queue/types';

import { EventEmitter } from 'events';

export type WebhookEventType =
  | 'receipt.created'
  | 'receipt.updated'
  | 'receipt.deleted'
  | 'cashier.created'
  | 'cashier.updated'
  | 'cashier.deleted'
  | 'merchant.created'
  | 'merchant.updated'
  | 'merchant.deleted'
  | 'cash-register.created'
  | 'cash-register.updated'
  | 'cash-register.deleted'
  | 'point-of-sale.created'
  | 'point-of-sale.updated'
  | 'point-of-sale.deleted'
  | 'pem.created'
  | 'pem.updated'
  | 'pem.deleted'
  | 'sync.conflict'
  | 'sync.completed'
  | 'system.maintenance'
  | 'system.error';

export interface WebhookPayload {
  readonly id: string;
  readonly type: WebhookEventType;
  readonly timestamp: number;
  readonly source: string;
  readonly version: string;
  readonly data: unknown;
  readonly metadata?: {
    readonly correlationId?: string;
    readonly userId?: string;
    readonly sessionId?: string;
    readonly environment?: 'sandbox' | 'production' | 'development';
    readonly region?: string;
    readonly [key: string]: unknown;
  };
}

export interface WebhookSubscription {
  readonly id: string;
  readonly eventTypes: WebhookEventType[];
  readonly url: string;
  readonly active: boolean;
  readonly createdAt: number;
  readonly lastTriggered: number | undefined;
  readonly retryPolicy: {
    readonly maxRetries: number;
    readonly retryDelay: number;
    readonly backoffFactor: number;
  };
  readonly headers: Record<string, string> | undefined;
  readonly secret: string | undefined;
}

export interface WebhookDelivery {
  readonly id: string;
  readonly subscriptionId: string;
  readonly payload: WebhookPayload;
  readonly status: 'pending' | 'delivered' | 'failed' | 'expired';
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly createdAt: number;
  readonly lastAttemptAt?: number;
  readonly nextAttemptAt?: number;
  readonly response?: {
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body: string;
    readonly duration: number;
  };
  readonly error?: string;
}

export interface WebhookStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  successRate: number;
  lastDeliveryAt: number | undefined;
  subscriptionStats: Record<string, {
    deliveries: number;
    successes: number;
    failures: number;
    averageResponseTime: number;
  }>;
}

export interface WebhookManagerConfig {
  readonly enabled: boolean;
  readonly maxSubscriptions: number;
  readonly defaultRetryPolicy: {
    readonly maxRetries: number;
    readonly retryDelay: number;
    readonly backoffFactor: number;
  };
  readonly deliveryTimeout: number;
  readonly cleanupInterval: number;
  readonly maxDeliveryHistory: number;
  readonly verifySignatures: boolean;
  readonly allowedOrigins?: string[];
}

export interface WebhookEvents {
  'webhook:received': { payload: WebhookPayload };
  'webhook:processed': { payload: WebhookPayload; result: unknown };
  'webhook:error': { payload: WebhookPayload; error: Error };
  'delivery:queued': { delivery: WebhookDelivery };
  'delivery:success': { delivery: WebhookDelivery };
  'delivery:failed': { delivery: WebhookDelivery; error: Error };
  'delivery:retry': { delivery: WebhookDelivery; attempt: number };
  'subscription:created': { subscription: WebhookSubscription };
  'subscription:updated': { subscription: WebhookSubscription };
  'subscription:deleted': { subscriptionId: string };
}

/**
 * WebhookManager - Enterprise webhook management system
 * Handles webhook subscriptions, deliveries, retries, and real-time event processing
 */
export class WebhookManager extends EventEmitter {
  private subscriptions = new Map<string, WebhookSubscription>();

  private deliveries = new Map<string, WebhookDelivery>();

  private handlers = new Map<WebhookEventType, Set<(payload: WebhookPayload) => Promise<void> | void>>();

  private stats: WebhookStats = {
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageDeliveryTime: 0,
    successRate: 0,
    lastDeliveryAt: undefined,
    subscriptionStats: {},
  };

  private deliveryQueue: WebhookDelivery[] = [];

  private processingDeliveries = new Set<string>();

  private cleanupInterval?: NodeJS.Timeout;

  private isInitialized = false;

  constructor(private config: WebhookManagerConfig) {
    super();
    this.setMaxListeners(100); // Support many event handlers
  }

  /**
   * Initialize the webhook manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    // Start background processes
    this.startDeliveryProcessor();
    this.startCleanupProcess();

    this.isInitialized = true;
    console.log('WebhookManager initialized');
  }

  /**
   * Destroy the webhook manager and cleanup resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Stop background processes
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all data
    this.subscriptions.clear();
    this.deliveries.clear();
    this.handlers.clear();
    this.deliveryQueue = [];
    this.processingDeliveries.clear();

    this.isInitialized = false;
    console.log('WebhookManager destroyed');
  }

  /**
   * Create a new webhook subscription
   */
  async createSubscription(
    eventTypes: WebhookEventType[],
    url: string,
    options: {
      headers?: Record<string, string>;
      secret?: string;
      retryPolicy?: Partial<WebhookSubscription['retryPolicy']>;
    } = {},
  ): Promise<WebhookSubscription> {
    if (this.subscriptions.size >= this.config.maxSubscriptions) {
      throw new Error('Maximum number of subscriptions reached');
    }

    const subscription: WebhookSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      eventTypes,
      url,
      active: true,
      createdAt: Date.now(),
      lastTriggered: undefined,
      retryPolicy: {
        ...this.config.defaultRetryPolicy,
        ...options.retryPolicy,
      },
      headers: options.headers || undefined,
      secret: options.secret || undefined,
    };

    this.subscriptions.set(subscription.id, subscription);
    this.emit('subscription:created', { subscription });

    return subscription;
  }

  /**
   * Update an existing webhook subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<WebhookSubscription, 'eventTypes' | 'url' | 'active' | 'headers' | 'secret' | 'retryPolicy'>>,
  ): Promise<WebhookSubscription> {
    const existing = this.subscriptions.get(subscriptionId);
    if (!existing) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const updated: WebhookSubscription = {
      ...existing,
      ...updates,
      retryPolicy: updates.retryPolicy
        ? { ...existing.retryPolicy, ...updates.retryPolicy }
        : existing.retryPolicy,
    };

    this.subscriptions.set(subscriptionId, updated);
    this.emit('subscription:updated', { subscription: updated });

    return updated;
  }

  /**
   * Delete a webhook subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    this.subscriptions.delete(subscriptionId);

    // Cancel pending deliveries for this subscription
    this.deliveryQueue = this.deliveryQueue.filter(delivery => {
      if (delivery.subscriptionId === subscriptionId) {
        this.deliveries.delete(delivery.id);
        return false;
      }
      return true;
    });

    this.emit('subscription:deleted', { subscriptionId });
  }

  /**
   * Get all webhook subscriptions
   */
  getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get a specific webhook subscription
   */
  getSubscription(subscriptionId: string): WebhookSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Register an event handler for specific webhook event types
   */
  onEvent(eventType: WebhookEventType, handler: (payload: WebhookPayload) => Promise<void> | void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unregister an event handler
   */
  offEvent(eventType: WebhookEventType, handler: (payload: WebhookPayload) => Promise<void> | void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Process an incoming webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    this.emit('webhook:received', { payload });

    try {
      // Validate payload
      this.validatePayload(payload);

      // Process with registered handlers
      const handlers = this.handlers.get(payload.type);
      if (handlers && handlers.size > 0) {
        const promises = Array.from(handlers).map(handler =>
          Promise.resolve(handler(payload)).catch(error => {
            console.error(`Handler error for ${payload.type}:`, error);
            return error;
          }),
        );

        const results = await Promise.allSettled(promises);
        const errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason);

        if (errors.length > 0) {
          throw new Error(`Handler errors: ${errors.join(', ')}`);
        }
      }

      // Queue deliveries to subscriptions
      await this.queueDeliveries(payload);

      this.emit('webhook:processed', { payload, result: 'success' });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('webhook:error', { payload, error: err });
      throw err;
    }
  }

  /**
   * Get webhook delivery statistics
   */
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  /**
   * Get delivery history for a subscription
   */
  getDeliveryHistory(subscriptionId: string, limit = 50): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .filter(delivery => delivery.subscriptionId === subscriptionId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status !== 'failed') {
      throw new Error(`Delivery ${deliveryId} is not in failed state`);
    }

    // Reset delivery for retry
    const updatedDelivery: WebhookDelivery = {
      ...delivery,
      status: 'pending',
      nextAttemptAt: Date.now(),
    };

    this.deliveries.set(deliveryId, updatedDelivery);
    this.deliveryQueue.push(updatedDelivery);
  }

  /**
   * Validate webhook payload structure
   */
  private validatePayload(payload: WebhookPayload): void {
    if (!payload.id || !payload.type || !payload.timestamp || !payload.source) {
      throw new Error('Invalid webhook payload: missing required fields');
    }

    if (typeof payload.timestamp !== 'number' || payload.timestamp <= 0) {
      throw new Error('Invalid webhook payload: invalid timestamp');
    }

    // Check if event is too old (prevent replay attacks)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - payload.timestamp > maxAge) {
      throw new Error('Webhook payload is too old');
    }
  }

  /**
   * Queue webhook deliveries to matching subscriptions
   */
  private async queueDeliveries(payload: WebhookPayload): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active && sub.eventTypes.includes(payload.type));

    for (const subscription of matchingSubscriptions) {
      const delivery: WebhookDelivery = {
        id: `del_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        subscriptionId: subscription.id,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: subscription.retryPolicy.maxRetries + 1,
        createdAt: Date.now(),
        nextAttemptAt: Date.now(),
      };

      this.deliveries.set(delivery.id, delivery);
      this.deliveryQueue.push(delivery);
      this.emit('delivery:queued', { delivery });
    }

    this.stats.totalDeliveries += matchingSubscriptions.length;
  }

  /**
   * Start the background delivery processor
   */
  private startDeliveryProcessor(): void {
    const processQueue = async () => {
      if (this.deliveryQueue.length === 0) {
        return;
      }

      // Get deliveries ready for processing
      const now = Date.now();
      const readyDeliveries = this.deliveryQueue
        .filter(delivery =>
          !this.processingDeliveries.has(delivery.id) &&
          delivery.status === 'pending' &&
          (delivery.nextAttemptAt || 0) <= now,
        )
        .slice(0, 10); // Process max 10 at a time

      // Process deliveries in parallel
      const promises = readyDeliveries.map(delivery => this.processDelivery(delivery));
      await Promise.allSettled(promises);

      // Clean up completed deliveries from queue
      this.deliveryQueue = this.deliveryQueue.filter(delivery =>
        delivery.status === 'pending' || this.processingDeliveries.has(delivery.id),
      );
    };

    // Process queue every 1 second
    setInterval(processQueue, 1000);
  }

  /**
   * Process a single webhook delivery
   */
  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    const subscription = this.subscriptions.get(delivery.subscriptionId);
    if (!subscription) {
      // Subscription was deleted, mark delivery as expired
      const updatedDelivery: WebhookDelivery = {
        ...delivery,
        status: 'expired',
        error: 'Subscription was deleted',
      };
      this.deliveries.set(delivery.id, updatedDelivery);
      return;
    }

    this.processingDeliveries.add(delivery.id);

    try {
      const startTime = Date.now();

      // Prepare request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ACube-Webhook/1.0',
        ...subscription.headers,
      };

      // Add signature if secret is provided
      if (subscription.secret) {
        const signature = await this.generateSignature(delivery.payload, subscription.secret);
        headers['X-ACube-Signature'] = signature;
      }

      // Make HTTP request (simulated - in real implementation, use fetch or axios)
      const response = await this.makeWebhookRequest(
        subscription.url,
        delivery.payload,
        headers,
      );

      const duration = Date.now() - startTime;

      // Update delivery with success
      const updatedDelivery: WebhookDelivery = {
        ...delivery,
        status: 'delivered',
        attempts: delivery.attempts + 1,
        lastAttemptAt: Date.now(),
        response: {
          status: response.status,
          headers: response.headers,
          body: response.body,
          duration,
        },
      };

      this.deliveries.set(delivery.id, updatedDelivery);
      this.stats.successfulDeliveries++;
      this.updateSubscriptionStats(subscription.id, true, duration);
      this.emit('delivery:success', { delivery: updatedDelivery });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const attempts = delivery.attempts + 1;

      if (attempts >= delivery.maxAttempts) {
        // Max retries exceeded, mark as failed
        const updatedDelivery: WebhookDelivery = {
          ...delivery,
          status: 'failed',
          attempts,
          lastAttemptAt: Date.now(),
          error: err.message,
        };

        this.deliveries.set(delivery.id, updatedDelivery);
        this.stats.failedDeliveries++;
        this.updateSubscriptionStats(subscription.id, false, 0);
        this.emit('delivery:failed', { delivery: updatedDelivery, error: err });

      } else {
        // Schedule retry
        const retryDelay = this.calculateRetryDelay(attempts, subscription.retryPolicy);
        const updatedDelivery: WebhookDelivery = {
          ...delivery,
          attempts,
          lastAttemptAt: Date.now(),
          nextAttemptAt: Date.now() + retryDelay,
          error: err.message,
        };

        this.deliveries.set(delivery.id, updatedDelivery);
        this.emit('delivery:retry', { delivery: updatedDelivery, attempt: attempts });
      }
    } finally {
      this.processingDeliveries.delete(delivery.id);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, retryPolicy: WebhookSubscription['retryPolicy']): number {
    const baseDelay = retryPolicy.retryDelay;
    const {backoffFactor} = retryPolicy;
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

    return Math.floor(baseDelay * backoffFactor**(attempt - 1) + jitter);
  }

  /**
   * Generate webhook signature for payload verification
   */
  private async generateSignature(payload: WebhookPayload, secret: string): Promise<string> {
    const data = JSON.stringify(payload);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(data);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const hashArray = Array.from(new Uint8Array(signature));
      return `sha256=${  hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }

    // Fallback simple hash (not cryptographically secure)
    let hash = 0;
    const combined = secret + data;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return `simple=${  hash.toString(16)}`;
  }

  /**
   * Make HTTP request to webhook URL (simulated)
   */
  private async makeWebhookRequest(
    url: string,
    payload: WebhookPayload,
    requestHeaders: Record<string, string>,
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    // In a real implementation, this would use fetch() or a similar HTTP client
    // For now, we'll simulate a request

    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
    if (!isValidUrl) {
      throw new Error('Invalid webhook URL');
    }

    // Log headers for debugging (in real implementation, use for actual request)
    console.debug('Webhook request headers:', requestHeaders);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate success/failure based on URL
    const shouldFail = url.includes('fail') || Math.random() < 0.1; // 10% failure rate

    if (shouldFail) {
      throw new Error('Webhook delivery failed');
    }

    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ received: true, id: payload.id }),
    };
  }

  /**
   * Update subscription statistics
   */
  private updateSubscriptionStats(subscriptionId: string, success: boolean, responseTime: number): void {
    if (!this.stats.subscriptionStats[subscriptionId]) {
      this.stats.subscriptionStats[subscriptionId] = {
        deliveries: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
      };
    }

    const stats = this.stats.subscriptionStats[subscriptionId];
    stats.deliveries++;

    if (success) {
      stats.successes++;
      // Update average response time
      stats.averageResponseTime =
        (stats.averageResponseTime * (stats.successes - 1) + responseTime) / stats.successes;
    } else {
      stats.failures++;
    }

    // Update global stats
    this.stats.successRate = this.stats.totalDeliveries > 0
      ? (this.stats.successfulDeliveries / this.stats.totalDeliveries) * 100
      : 0;

    this.stats.lastDeliveryAt = Date.now();
  }

  /**
   * Start cleanup process for old deliveries
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      let cleanedCount = 0;

      // Clean up old completed deliveries
      for (const [id, delivery] of this.deliveries.entries()) {
        if (
          (delivery.status === 'delivered' || delivery.status === 'failed' || delivery.status === 'expired') &&
          delivery.createdAt < cutoff
        ) {
          this.deliveries.delete(id);
          cleanedCount++;
        }
      }

      // Limit delivery history size
      if (this.deliveries.size > this.config.maxDeliveryHistory) {
        const sortedDeliveries = Array.from(this.deliveries.entries())
          .sort(([, a], [, b]) => b.createdAt - a.createdAt);

        const toDelete = sortedDeliveries.slice(this.config.maxDeliveryHistory);
        for (const [id] of toDelete) {
          this.deliveries.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old webhook deliveries`);
      }
    }, this.config.cleanupInterval) as unknown as NodeJS.Timeout;
  }
}

/**
 * Create webhook manager with default configuration
 */
export function createWebhookManager(config: Partial<WebhookManagerConfig> = {}): WebhookManager {
  const defaultConfig: WebhookManagerConfig = {
    enabled: true,
    maxSubscriptions: 100,
    defaultRetryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffFactor: 2,
    },
    deliveryTimeout: 30000,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    maxDeliveryHistory: 10000,
    verifySignatures: true,
  };

  return new WebhookManager({ ...defaultConfig, ...config });
}

/**
 * Utility function to map resource types to webhook event types
 */
export function getWebhookEventType(resource: ResourceType, operation: 'create' | 'update' | 'delete'): WebhookEventType {
  const eventMap: Record<ResourceType, Record<string, WebhookEventType>> = {
    'receipts': {
      'create': 'receipt.created',
      'update': 'receipt.updated',
      'delete': 'receipt.deleted',
    },
    'cashiers': {
      'create': 'cashier.created',
      'update': 'cashier.updated',
      'delete': 'cashier.deleted',
    },
    'merchants': {
      'create': 'merchant.created',
      'update': 'merchant.updated',
      'delete': 'merchant.deleted',
    },
    'cash-registers': {
      'create': 'cash-register.created',
      'update': 'cash-register.updated',
      'delete': 'cash-register.deleted',
    },
    'point-of-sales': {
      'create': 'point-of-sale.created',
      'update': 'point-of-sale.updated',
      'delete': 'point-of-sale.deleted',
    },
    'pems': {
      'create': 'pem.created',
      'update': 'pem.updated',
      'delete': 'pem.deleted',
    },
  };

  return eventMap[resource]?.[operation] || 'system.error' as WebhookEventType;
}
