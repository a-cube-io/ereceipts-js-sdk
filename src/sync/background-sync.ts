/**
 * Background Sync Service - Cross-platform background synchronization
 * Handles Service Worker integration for web and background tasks for React Native
 */

import { EventEmitter } from 'eventemitter3';
import type {
  SyncOptions,
  SyncResult,
  BackgroundSyncConfig,
  BackgroundSyncJob,
  BackgroundSyncTrigger,
  SyncEventTypeMap,
} from './types';

export interface BackgroundSyncServiceConfig extends BackgroundSyncConfig {
  // Service Worker specific
  serviceWorkerPath?: string;
  swScope?: string;
  
  // Storage for job persistence
  storageProvider: 'memory' | 'localStorage' | 'indexedDB';
  maxJobHistory: number;
  
  // Network awareness
  networkSensitive: boolean;
  minimumConnectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
}

const DEFAULT_CONFIG: BackgroundSyncServiceConfig = {
  enabled: true,
  triggers: ['periodic', 'connectivity', 'data-change'],
  periodicInterval: 300000, // 5 minutes
  maxBackgroundTime: 30000, // 30 seconds
  batteryOptimization: true,
  wifiOnly: false,
  requiresCharging: false,
  serviceWorkerPath: '/sw.js',
  swScope: '/',
  storageProvider: 'memory',
  maxJobHistory: 100,
  networkSensitive: true,
  minimumConnectionQuality: 'fair',
};

export interface BackgroundSyncEventMap extends SyncEventTypeMap {
  'job-scheduled': BackgroundSyncJob;
  'job-started': BackgroundSyncJob;
  'job-completed': { job: BackgroundSyncJob; result: SyncResult };
  'job-failed': { job: BackgroundSyncJob; error: Error };
  'job-cancelled': BackgroundSyncJob;
  'service-worker-registered': { registration: any };
  'service-worker-error': { error: Error };
  'background-sync-available': boolean;
}

// Cross-platform detection
const isBrowser = typeof window !== 'undefined';
const isServiceWorkerSupported = isBrowser && 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration?.prototype;

/**
 * Background Sync Service for cross-platform background synchronization
 */
export class BackgroundSyncService extends EventEmitter<BackgroundSyncEventMap> {
  private config: BackgroundSyncServiceConfig;
  private isInitialized = false;
  private serviceWorkerRegistration: any = null;
  private scheduledJobs = new Map<string, BackgroundSyncJob>();
  private jobHistory: Array<{ job: BackgroundSyncJob; result?: SyncResult; error?: Error }> = [];
  private periodicTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<BackgroundSyncServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the background sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.config.enabled) {
        if (isBrowser && isServiceWorkerSupported) {
          await this.initializeServiceWorker();
        } else {
          await this.initializeFallbackSync();
        }
      }

      this.setupPeriodicSync();
      this.isInitialized = true;
      
      this.emit('background-sync-available', this.isBackgroundSyncAvailable());
    } catch (error) {
      this.emit('service-worker-error', { error: error as Error });
      // Fall back to regular sync if Service Worker fails
      await this.initializeFallbackSync();
      this.isInitialized = true;
    }
  }

  /**
   * Check if background sync is available
   */
  isBackgroundSyncAvailable(): boolean {
    return this.isInitialized && (isServiceWorkerSupported || this.config.enabled);
  }

  /**
   * Schedule a background sync job
   */
  async scheduleSync(
    options: SyncOptions,
    trigger: BackgroundSyncTrigger = 'user-action',
    priority = 1
  ): Promise<string> {
    const job: BackgroundSyncJob = {
      id: this.generateJobId(),
      trigger,
      scheduledTime: new Date(),
      options,
      priority,
      estimatedDuration: this.estimateJobDuration(options),
      maxRetries: options.maxRetries || 3,
      currentRetries: 0,
    };

    this.scheduledJobs.set(job.id, job);
    this.emit('job-scheduled', job);

    // Try to execute immediately if conditions are met
    if (this.shouldExecuteImmediately(job)) {
      this.executeJob(job);
    } else if (isServiceWorkerSupported && this.serviceWorkerRegistration) {
      // Register with Service Worker background sync
      await this.registerBackgroundSync(job);
    }

    return job.id;
  }

  /**
   * Cancel a scheduled sync job
   */
  async cancelSync(jobId: string): Promise<boolean> {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      return false;
    }

    this.scheduledJobs.delete(jobId);
    this.emit('job-cancelled', job);

    // Also try to unregister from Service Worker if applicable
    if (isServiceWorkerSupported && this.serviceWorkerRegistration) {
      try {
        await this.unregisterBackgroundSync(jobId);
      } catch (error) {
        // Ignore unregister errors
      }
    }

    return true;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): BackgroundSyncJob[] {
    return Array.from(this.scheduledJobs.values());
  }

  /**
   * Get job history
   */
  getJobHistory(): Array<{ job: BackgroundSyncJob; result?: SyncResult; error?: Error }> {
    return [...this.jobHistory];
  }

  /**
   * Force execution of all pending jobs (for testing or manual sync)
   */
  async executePendingJobs(): Promise<void> {
    const jobs = Array.from(this.scheduledJobs.values());
    
    for (const job of jobs) {
      try {
        await this.executeJob(job);
      } catch (error) {
        // Continue with other jobs even if one fails
        console.warn(`Background sync job ${job.id} failed:`, error);
      }
    }
  }

  private async initializeServiceWorker(): Promise<void> {
    if (!isBrowser || !navigator.serviceWorker) {
      throw new Error('Service Worker not supported');
    }

    try {
      // Register Service Worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        this.config.serviceWorkerPath!,
        { ...(this.config.swScope && { scope: this.config.swScope }) }
      );

      this.emit('service-worker-registered', { 
        registration: this.serviceWorkerRegistration 
      });

      // Listen for messages from Service Worker
      this.setupServiceWorkerMessageHandling();

    } catch (error) {
      throw new Error(`Failed to register Service Worker: ${error}`);
    }
  }

  private async initializeFallbackSync(): Promise<void> {
    // Fallback implementation for environments without Service Worker support
    // This will use timers and event listeners for basic background sync
    console.info('Using fallback background sync (no Service Worker support)');
  }

  private setupServiceWorkerMessageHandling(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, jobId, result, error } = event.data;

      switch (type) {
        case 'background-sync-completed':
          this.handleBackgroundSyncCompleted(jobId, result);
          break;
        case 'background-sync-failed':
          this.handleBackgroundSyncFailed(jobId, error);
          break;
      }
    });
  }

  private setupPeriodicSync(): void {
    if (!this.config.triggers.includes('periodic')) {
      return;
    }

    this.periodicTimer = setInterval(() => {
      this.triggerPeriodicSync();
    }, this.config.periodicInterval);
  }

  private async triggerPeriodicSync(): Promise<void> {
    // Schedule a low-priority background sync
    await this.scheduleSync(
      {
        operation: 'delta',
        strategy: 'batched',
        priority: 'low',
      },
      'periodic',
      0 // Low priority
    );
  }

  private async registerBackgroundSync(job: BackgroundSyncJob): Promise<void> {
    if (!this.serviceWorkerRegistration?.sync) {
      throw new Error('Background Sync API not available');
    }

    try {
      await this.serviceWorkerRegistration.sync.register(job.id);
    } catch (error) {
      throw new Error(`Failed to register background sync: ${error}`);
    }
  }

  private async unregisterBackgroundSync(jobId: string): Promise<void> {
    // Note: There's no standard way to unregister a background sync
    // This is a placeholder for potential future API
    console.debug(`Attempting to unregister background sync: ${jobId}`);
  }

  private shouldExecuteImmediately(job: BackgroundSyncJob): boolean {
    // Execute immediately if:
    // 1. High priority job
    // 2. User-initiated action
    // 3. Good network conditions (if network sensitive)
    
    if (job.priority > 5 || job.trigger === 'user-action') {
      return true;
    }

    if (this.config.networkSensitive) {
      // This would integrate with the NetworkManager
      // For now, assume good conditions
      return false;
    }

    return false;
  }

  private async executeJob(job: BackgroundSyncJob): Promise<void> {
    if (!this.scheduledJobs.has(job.id)) {
      return; // Job was cancelled
    }

    this.emit('job-started', job);

    try {
      // This would integrate with the SyncEngine
      const result = await this.performSync(job.options);
      
      this.handleJobCompleted(job, result);
    } catch (error) {
      this.handleJobFailed(job, error as Error);
    }
  }

  private async performSync(options: SyncOptions): Promise<SyncResult> {
    // This is a placeholder implementation
    // In the real implementation, this would call the SyncEngine
    
    // Simulate sync operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `sync_${Date.now()}`,
      operation: options.operation || 'full',
      status: 'success',
      startTime: new Date(),
      endTime: new Date(),
      duration: 1000,
      statistics: {
        totalOperations: 1,
        completedOperations: 1,
        failedOperations: 0,
        bytesTransferred: 1024,
        recordsSynced: 10,
        conflictsDetected: 0,
        conflictsResolved: 0,
        networkRequests: 1,
        cacheHits: 0,
      },
      errors: [],
      conflicts: [],
      metadata: {},
    };
  }

  private handleJobCompleted(job: BackgroundSyncJob, result: SyncResult): void {
    this.scheduledJobs.delete(job.id);
    
    // Add to history
    this.addToHistory({ job, result });
    
    this.emit('job-completed', { job, result });
  }

  private handleJobFailed(job: BackgroundSyncJob, error: Error): void {
    job.currentRetries++;
    
    if (job.currentRetries < job.maxRetries) {
      // Reschedule with exponential backoff
      const delay = Math.pow(2, job.currentRetries) * 1000;
      setTimeout(() => {
        this.executeJob(job);
      }, delay);
    } else {
      // Max retries reached, remove job
      this.scheduledJobs.delete(job.id);
      
      // Add to history
      this.addToHistory({ job, error });
      
      this.emit('job-failed', { job, error });
    }
  }

  private handleBackgroundSyncCompleted(jobId: string, result: SyncResult): void {
    const job = this.scheduledJobs.get(jobId);
    if (job) {
      this.handleJobCompleted(job, result);
    }
  }

  private handleBackgroundSyncFailed(jobId: string, error: Error): void {
    const job = this.scheduledJobs.get(jobId);
    if (job) {
      this.handleJobFailed(job, error);
    }
  }

  private addToHistory(entry: { job: BackgroundSyncJob; result?: SyncResult; error?: Error }): void {
    this.jobHistory.push(entry);
    
    // Keep history within limits
    if (this.jobHistory.length > this.config.maxJobHistory) {
      this.jobHistory.shift();
    }
  }

  private estimateJobDuration(options: SyncOptions): number {
    // Simple estimation based on operation type
    switch (options.operation) {
      case 'delta':
        return 5000; // 5 seconds
      case 'full':
        return 30000; // 30 seconds
      case 'realtime':
        return 1000; // 1 second
      default:
        return 10000; // 10 seconds
    }
  }

  private generateJobId(): string {
    return `bg_sync_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }

    this.scheduledJobs.clear();
    this.jobHistory.length = 0;
    this.removeAllListeners();
    this.isInitialized = false;
  }
}

/**
 * Service Worker script template for background sync
 * This would typically be in a separate service worker file
 */
export const SERVICE_WORKER_SCRIPT = `
// Background Sync Service Worker
self.addEventListener('sync', function(event) {
  if (event.tag.startsWith('bg_sync_')) {
    event.waitUntil(handleBackgroundSync(event.tag));
  }
});

async function handleBackgroundSync(jobId) {
  try {
    // Perform the actual sync operation
    // This would integrate with your API
    const result = await performBackgroundSync(jobId);
    
    // Notify the main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'background-sync-completed',
          jobId,
          result
        });
      });
    });
  } catch (error) {
    // Notify the main thread of failure
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'background-sync-failed',
          jobId,
          error: error.message
        });
      });
    });
  }
}

async function performBackgroundSync(jobId) {
  // This would be implemented based on your sync requirements
  // For now, return a mock result
  return {
    id: jobId,
    status: 'success',
    recordsSynced: 10
  };
}
`;