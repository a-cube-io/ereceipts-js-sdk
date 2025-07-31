/**
 * Enhanced Sync Manager - Central orchestrator for all synchronization systems
 * Integrates traditional sync engine with real-time components for comprehensive sync management
 */

import type { ResourceType } from '@/storage/queue/types';

import { EventEmitter } from 'eventemitter3';

import { ProgressiveSyncEngine, type SyncEngineConfig } from './sync-engine';
import { createWebhookManager, type WebhookManagerConfig      } from './webhook-manager';
import { BackgroundSyncService, type BackgroundSyncServiceConfig } from './background-sync';
import { type SyncCoordinatorConfig, createRealtimeSyncCoordinator   } from './realtime-sync-coordinator';
import { createConflictResolutionEngine, type ConflictResolutionEngineConfig   } from './conflict-resolution-engine';

import type { WebhookManager } from './webhook-manager';
import type { RealtimeSyncCoordinator } from './realtime-sync-coordinator';
import type { ConflictResolutionEngine } from './conflict-resolution-engine';
import type {
  SyncResult,
  SyncStatus,
  SyncOptions,
  SyncEventTypeMap,
} from './types';

export interface EnhancedSyncManagerConfig {
  // Core sync engine configuration
  syncEngine: Partial<SyncEngineConfig>;

  // Background sync configuration
  backgroundSync: Partial<BackgroundSyncServiceConfig>;

  // Real-time components configuration
  webhooks: Partial<WebhookManagerConfig>;
  conflictResolution: Partial<ConflictResolutionEngineConfig>;
  realtimeSync: Partial<SyncCoordinatorConfig>;

  // Enhanced sync manager specific settings
  enableRealtimeSync: boolean;
  enableConflictResolution: boolean;
  enableWebhooks: boolean;
  enableBackgroundSync: boolean;

  // Integration settings
  autoResolveConflicts: boolean;
  realtimePriority: 'high' | 'normal' | 'low';
  syncCoordination: 'sequential' | 'parallel' | 'adaptive';

  // Performance settings
  maxConcurrentSessions: number;
  sessionTimeout: number;
  metricsEnabled: boolean;
}

export interface SyncManagerMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncDuration: number;
  activeRealtimeSessions: number;
  pendingConflicts: number;
  webhookDeliveries: number;
  backgroundJobs: number;
  lastSyncTimestamp: number | undefined;
  systemLoad: number; // 0-100%
}

export interface SyncSessionInfo {
  id: string;
  type: 'traditional' | 'realtime' | 'background';
  resourceType: ResourceType;
  resourceId: string;
  startTime: number;
  status: SyncStatus;
  participants?: number;
  conflictsCount?: number;
}

export interface EnhancedSyncManagerEvents extends SyncEventTypeMap {
  'manager:initialized': { config: EnhancedSyncManagerConfig };
  'manager:destroyed': { reason: string };
  'session:created': { session: SyncSessionInfo };
  'session:updated': { session: SyncSessionInfo };
  'session:ended': { session: SyncSessionInfo; reason: string };
  'conflict:auto-resolved': { conflictId: string; strategy: string };
  'webhook:subscribed': { eventTypes: string[]; url: string };
  'realtime:connected': { sessionId: string; clientCount: number };
  'metrics:updated': { metrics: SyncManagerMetrics };
  'system:overload': { load: number; recommendedAction: string };
}

/**
 * Enhanced Sync Manager - Central orchestrator for all synchronization systems
 * Provides unified interface for traditional sync, real-time sync, and conflict resolution
 */
export class EnhancedSyncManager extends EventEmitter<EnhancedSyncManagerEvents> {
  private config: EnhancedSyncManagerConfig;

  private isInitialized = false;

  // Core components
  private syncEngine: ProgressiveSyncEngine;

  private backgroundSync: BackgroundSyncService;

  private webhookManager?: WebhookManager;

  private conflictEngine?: ConflictResolutionEngine;

  private realtimeCoordinator?: RealtimeSyncCoordinator;

  // State tracking
  private activeSessions = new Map<string, SyncSessionInfo>();

  private metrics: SyncManagerMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncDuration: 0,
    activeRealtimeSessions: 0,
    pendingConflicts: 0,
    webhookDeliveries: 0,
    backgroundJobs: 0,
    lastSyncTimestamp: undefined,
    systemLoad: 0,
  };

  // Performance monitoring
  private metricsInterval: NodeJS.Timeout | null = null;

  private performanceMonitor: NodeJS.Timeout | null = null;

  constructor(config: Partial<EnhancedSyncManagerConfig> = {}) {
    super();

    this.config = {
      syncEngine: {},
      backgroundSync: {},
      webhooks: {},
      conflictResolution: {},
      realtimeSync: {},
      enableRealtimeSync: true,
      enableConflictResolution: true,
      enableWebhooks: true,
      enableBackgroundSync: true,
      autoResolveConflicts: true,
      realtimePriority: 'normal',
      syncCoordination: 'adaptive',
      maxConcurrentSessions: 10,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      metricsEnabled: true,
      ...config,
    };

    // Initialize core components
    this.syncEngine = new ProgressiveSyncEngine(this.config.syncEngine);
    this.backgroundSync = new BackgroundSyncService(this.config.backgroundSync);

    // Note: setMaxListeners is not available on EventEmitter3
    // this.setMaxListeners(100); // Support many event handlers
  }

  /**
   * Initialize the enhanced sync manager and all components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize core sync engine
      await this.syncEngine.initialize();
      this.setupSyncEngineListeners();

      // Initialize background sync if enabled
      if (this.config.enableBackgroundSync) {
        await this.backgroundSync.initialize();
        this.setupBackgroundSyncListeners();
      }

      // Initialize webhook manager if enabled
      if (this.config.enableWebhooks) {
        this.webhookManager = createWebhookManager(this.config.webhooks);
        await this.webhookManager.initialize();
        this.setupWebhookListeners();
      }

      // Initialize conflict resolution if enabled
      if (this.config.enableConflictResolution) {
        this.conflictEngine = createConflictResolutionEngine(this.config.conflictResolution);
        await this.conflictEngine.initialize();
        this.setupConflictResolutionListeners();
      }

      // Initialize realtime coordinator if enabled
      if (this.config.enableRealtimeSync) {
        this.realtimeCoordinator = createRealtimeSyncCoordinator(
          this.config.realtimeSync,
          this.webhookManager,
          this.conflictEngine,
        );
        await this.realtimeCoordinator.initialize();
        this.setupRealtimeCoordinatorListeners();
      }

      // Start monitoring and metrics
      this.startPerformanceMonitoring();
      this.startMetricsCollection();

      this.isInitialized = true;
      this.emit('manager:initialized', { config: this.config });

      console.log('Enhanced Sync Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Sync Manager:', error);
      throw error;
    }
  }

  /**
   * Destroy the sync manager and cleanup all resources
   */
  async destroy(reason = 'manual shutdown'): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Stop monitoring
      this.stopPerformanceMonitoring();
      this.stopMetricsCollection();

      // Destroy real-time components
      if (this.realtimeCoordinator) {
        await this.realtimeCoordinator.destroy();
      }

      if (this.conflictEngine) {
        await this.conflictEngine.destroy();
      }

      if (this.webhookManager) {
        await this.webhookManager.destroy();
      }

      // Destroy background sync
      if (this.config.enableBackgroundSync) {
        this.backgroundSync.destroy();
      }

      // Clear active sessions
      this.activeSessions.clear();

      this.isInitialized = false;
      this.emit('manager:destroyed', { reason });

      console.log(`Enhanced Sync Manager destroyed: ${reason}`);
    } catch (error) {
      console.error('Error during Enhanced Sync Manager destruction:', error);
      throw error;
    }
  }

  /**
   * Execute a comprehensive sync operation with all available features
   */
  async executeSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (!this.isInitialized) {
      throw new Error('Sync manager not initialized');
    }

    const sessionId = this.generateSessionId();
    const session: SyncSessionInfo = {
      id: sessionId,
      type: 'traditional',
      resourceType: (options.resources?.[0] as ResourceType) || 'receipts',
      resourceId: 'unknown', // Will be determined from resources
      startTime: Date.now(),
      status: 'syncing',
    };

    this.activeSessions.set(sessionId, session);
    this.emit('session:created', { session });

    try {
      // Check for conflicts before sync if conflict resolution is enabled
      if (this.config.enableConflictResolution && this.conflictEngine) {
        await this.preProcessConflicts(options);
      }

      // Execute the sync using the progressive sync engine
      const result = await this.syncEngine.executeSync(options);

      // Post-process with real-time coordination if enabled
      if (this.config.enableRealtimeSync && this.realtimeCoordinator) {
        await this.coordinateRealtimeSync(result, options);
      }

      // Update metrics
      this.updateSyncMetrics(result);

      // Update session status
      session.status = result.status === 'success' ? 'idle' : 'error';
      this.activeSessions.set(sessionId, session);
      this.emit('session:updated', { session });

      return result;
    } catch (error) {
      session.status = 'error';
      this.activeSessions.set(sessionId, session);
      this.emit('session:updated', { session });

      this.metrics.failedSyncs++;
      throw error;
    } finally {
      this.activeSessions.delete(sessionId);
      this.emit('session:ended', { session, reason: 'completed' });
    }
  }

  /**
   * Create a real-time sync session for collaborative editing
   */
  async createRealtimeSession(
    resourceType: ResourceType,
    resourceId: string,
    strategy: 'optimistic' | 'pessimistic' | 'collaborative' = 'collaborative',
  ): Promise<string> {
    if (!this.isInitialized || !this.realtimeCoordinator) {
      throw new Error('Realtime sync not available');
    }

    const realtimeSession = await this.realtimeCoordinator.createSession(
      resourceType,
      resourceId,
      strategy,
    );

    const session: SyncSessionInfo = {
      id: realtimeSession.id,
      type: 'realtime',
      resourceType,
      resourceId,
      startTime: Date.now(),
      status: 'syncing',
      participants: 0,
      conflictsCount: 0,
    };

    this.activeSessions.set(realtimeSession.id, session);
    this.emit('session:created', { session });

    return realtimeSession.id;
  }

  /**
   * Schedule a background sync operation
   */
  async scheduleBackgroundSync(
    options: SyncOptions,
    trigger: 'periodic' | 'connectivity' | 'data-change' | 'user-action' = 'user-action',
  ): Promise<string> {
    if (!this.isInitialized || !this.config.enableBackgroundSync) {
      throw new Error('Background sync not available');
    }

    return this.backgroundSync.scheduleSync(options, trigger);
  }

  /**
   * Subscribe to webhook events for real-time updates
   */
  async subscribeToWebhooks(
    eventTypes: string[],
    url: string,
    options: { headers?: Record<string, string>; secret?: string } = {},
  ): Promise<string> {
    if (!this.isInitialized || !this.webhookManager) {
      throw new Error('Webhook manager not available');
    }

    const subscription = await this.webhookManager.createSubscription(
      eventTypes as any,
      url,
      options,
    );

    this.emit('webhook:subscribed', { eventTypes, url });
    return subscription.id;
  }

  /**
   * Get comprehensive sync manager status and metrics
   */
  getStatus(): {
    status: SyncStatus;
    isInitialized: boolean;
    activeSessions: SyncSessionInfo[];
    metrics: SyncManagerMetrics;
    components: {
      syncEngine: boolean;
      backgroundSync: boolean;
      webhookManager: boolean;
      conflictEngine: boolean;
      realtimeCoordinator: boolean;
    };
  } {
    return {
      status: this.activeSessions.size > 0 ? 'syncing' : 'idle',
      isInitialized: this.isInitialized,
      activeSessions: Array.from(this.activeSessions.values()),
      metrics: { ...this.metrics },
      components: {
        syncEngine: true,
        backgroundSync: this.config.enableBackgroundSync,
        webhookManager: Boolean(this.webhookManager),
        conflictEngine: Boolean(this.conflictEngine),
        realtimeCoordinator: Boolean(this.realtimeCoordinator),
      },
    };
  }

  /**
   * Force manual conflict resolution for pending conflicts
   */
  async resolveConflicts(strategy: 'client-wins' | 'server-wins' | 'merge' = 'merge'): Promise<number> {
    if (!this.conflictEngine) {
      return 0;
    }

    const conflicts = this.conflictEngine.getActiveConflicts();
    let resolvedCount = 0;

    for (const conflict of conflicts) {
      try {
        await this.conflictEngine.resolveConflict(conflict.id, strategy);
        resolvedCount++;
      } catch (error) {
        console.warn(`Failed to resolve conflict ${conflict.id}:`, error);
      }
    }

    return resolvedCount;
  }

  /**
   * Get real-time sync statistics
   */
  getRealtimeStats(): {
    activeSessions: number;
    totalClients: number;
    onlineClients: number;
    operationsPerSecond: number;
    conflictRate: number;
  } | null {
    if (!this.realtimeCoordinator) {
      return null;
    }

    return this.realtimeCoordinator.getStats();
  }

  // Private methods for component integration

  private async preProcessConflicts(options: SyncOptions): Promise<void> {
    if (!this.conflictEngine) {return;}

    // Check for existing conflicts that might affect this sync
    const activeConflicts = this.conflictEngine.getActiveConflicts();
    const relevantConflicts = activeConflicts.filter(conflict =>
      options.resources?.includes(conflict.context.resourceType as string),
    );

    if (relevantConflicts.length > 0 && this.config.autoResolveConflicts) {
      console.log(`Auto-resolving ${relevantConflicts.length} conflicts before sync`);

      for (const conflict of relevantConflicts) {
        try {
          const resolution = await this.conflictEngine.resolveConflict(
            conflict.id,
            conflict.suggestedResolution || 'server-wins',
          );

          if (resolution) {
            this.emit('conflict:auto-resolved', {
              conflictId: conflict.id,
              strategy: resolution.strategy,
            });
          }
        } catch (error) {
          console.warn(`Failed to auto-resolve conflict ${conflict.id}:`, error);
        }
      }
    }
  }

  private async coordinateRealtimeSync(_result: SyncResult, options: SyncOptions): Promise<void> {
    if (!this.realtimeCoordinator) {return;}

    // Find relevant real-time sessions
    const activeSessions = this.realtimeCoordinator.getActiveSessions();
    const relevantSessions = activeSessions.filter(session =>
      options.resources?.includes(session.resourceType as string),
    );

    // Broadcast sync results to relevant sessions
    for (const session of relevantSessions) {
      try {
        // This would trigger real-time updates to connected clients
        // Implementation depends on how you want to broadcast changes
        console.log(`Broadcasting sync result to realtime session ${session.id}`);
      } catch (error) {
        console.warn(`Failed to coordinate with realtime session ${session.id}:`, error);
      }
    }
  }

  private updateSyncMetrics(result: SyncResult): void {
    this.metrics.totalSyncs++;

    if (result.status === 'success') {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }

    // Update average duration
    const totalDuration = this.metrics.averageSyncDuration * (this.metrics.totalSyncs - 1) + result.duration;
    this.metrics.averageSyncDuration = totalDuration / this.metrics.totalSyncs;

    this.metrics.lastSyncTimestamp = Date.now();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Event listener setup methods

  private setupSyncEngineListeners(): void {
    this.syncEngine.on('sync.started', (data) => {
      this.emit('sync.started', data);
    });

    this.syncEngine.on('sync.progress', (data) => {
      this.emit('sync.progress', data);
    });

    this.syncEngine.on('sync.completed', (data) => {
      this.emit('sync.completed', data);
    });

    this.syncEngine.on('sync.failed', (data) => {
      this.emit('sync.failed', data);
    });
  }

  private setupBackgroundSyncListeners(): void {
    this.backgroundSync.on('job-completed', (_data) => {
      this.metrics.backgroundJobs++;
      console.log('Background sync job completed');
    });

    this.backgroundSync.on('job-failed', (_data) => {
      console.warn('Background sync job failed');
    });
  }

  private setupWebhookListeners(): void {
    if (!this.webhookManager) {return;}

    this.webhookManager.on('delivery:success', (_data) => {
      this.metrics.webhookDeliveries++;
    });

    this.webhookManager.on('webhook:processed', (data) => {
      console.log(`Webhook processed: ${data.payload.type}`);
    });
  }

  private setupConflictResolutionListeners(): void {
    if (!this.conflictEngine) {return;}

    this.conflictEngine.on('conflict:detected', (data) => {
      this.metrics.pendingConflicts++;
      console.log(`Conflict detected: ${data.conflict.type}`);
    });

    this.conflictEngine.on('conflict:resolved', (data) => {
      this.metrics.pendingConflicts = Math.max(0, this.metrics.pendingConflicts - 1);
      console.log(`Conflict resolved: ${data.resolution.strategy}`);
    });
  }

  private setupRealtimeCoordinatorListeners(): void {
    if (!this.realtimeCoordinator) {return;}

    this.realtimeCoordinator.on('session:created', (data) => {
      this.metrics.activeRealtimeSessions++;
      this.emit('realtime:connected', {
        sessionId: data.session.id,
        clientCount: data.session.participants.length,
      });
    });

    this.realtimeCoordinator.on('session:ended', (_data) => {
      this.metrics.activeRealtimeSessions = Math.max(0, this.metrics.activeRealtimeSessions - 1);
    });
  }

  // Performance monitoring

  private startPerformanceMonitoring(): void {
    if (!this.config.metricsEnabled) {return;}

    this.performanceMonitor = setInterval(() => {
      this.updateSystemLoad();
      this.checkSystemOverload();
    }, 10000) as unknown as NodeJS.Timeout; // Every 10 seconds
  }

  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
    }
  }

  private startMetricsCollection(): void {
    if (!this.config.metricsEnabled) {return;}

    this.metricsInterval = setInterval(() => {
      this.updateRealtimeMetrics();
      this.emit('metrics:updated', { metrics: this.metrics });
    }, 30000) as unknown as NodeJS.Timeout; // Every 30 seconds
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  private updateSystemLoad(): void {
    // Calculate system load based on active sessions and pending operations
    const sessionLoad = (this.activeSessions.size / this.config.maxConcurrentSessions) * 100;
    const conflictLoad = this.conflictEngine ?
      (this.conflictEngine.getActiveConflicts().length / 10) * 100 : 0;

    this.metrics.systemLoad = Math.min(100, Math.max(sessionLoad, conflictLoad));
  }

  private updateRealtimeMetrics(): void {
    if (this.realtimeCoordinator) {
      const stats = this.realtimeCoordinator.getStats();
      this.metrics.activeRealtimeSessions = stats.activeSessions;
    }

    if (this.conflictEngine) {
      this.metrics.pendingConflicts = this.conflictEngine.getActiveConflicts().length;
    }

    if (this.webhookManager) {
      const stats = this.webhookManager.getStats();
      this.metrics.webhookDeliveries = stats.totalDeliveries;
    }
  }

  private checkSystemOverload(): void {
    if (this.metrics.systemLoad > 90) {
      const recommendedAction = this.activeSessions.size > 5
        ? 'Reduce concurrent sessions'
        : 'Increase resource allocation';

      this.emit('system:overload', {
        load: this.metrics.systemLoad,
        recommendedAction,
      });
    }
  }
}

/**
 * Create enhanced sync manager with default configuration
 */
export function createEnhancedSyncManager(
  config: Partial<EnhancedSyncManagerConfig> = {},
): EnhancedSyncManager {
  return new EnhancedSyncManager(config);
}
