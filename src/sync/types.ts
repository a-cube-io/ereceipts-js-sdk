/**
 * Core types for the sync and background processing system
 * Comprehensive type definitions for progressive sync, conflict resolution, and real-time updates
 */

// Core event base interface (matching existing event system)
interface BaseEvent {
  timestamp: Date;
  requestId: string;
}

// ============================================================================
// Core Sync Types
// ============================================================================

export type SyncOperation = 'full' | 'delta' | 'realtime' | 'background';
export type SyncPhase = 'validate' | 'prepare' | 'execute' | 'verify' | 'cleanup';
export type SyncStatus = 'idle' | 'syncing' | 'paused' | 'error' | 'completed';
export type SyncDirection = 'upload' | 'download' | 'bidirectional';
export type SyncStrategy = 'immediate' | 'batched' | 'scheduled' | 'adaptive';

export interface SyncOptions {
  operation?: SyncOperation;
  direction?: SyncDirection;
  strategy?: SyncStrategy;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  maxRetries?: number;
  timeoutMs?: number;
  batchSize?: number;
  resources?: string[]; // Specific resources to sync
  since?: Date; // For delta sync
  force?: boolean; // Force sync even if no changes detected
}

export interface SyncResult {
  id: string;
  operation: SyncOperation;
  status: 'success' | 'partial' | 'failed';
  startTime: Date;
  endTime: Date;
  duration: number;
  statistics: SyncStatistics;
  errors: SyncError[];
  conflicts: SyncConflict[];
  metadata: Record<string, unknown>;
}

export interface SyncStatistics {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  bytesTransferred: number;
  recordsSynced: number;
  conflictsDetected: number;
  conflictsResolved: number;
  networkRequests: number;
  cacheHits: number;
}

export interface SyncError {
  id: string;
  phase: SyncPhase;
  operation: string;
  error: Error;
  retryable: boolean;
  timestamp: Date;
  context: Record<string, unknown>;
}

// ============================================================================
// Delta Sync Types
// ============================================================================

export interface DataDelta {
  resource: string;
  operation: 'create' | 'update' | 'delete';
  id: string;
  data?: any;
  previousData?: any;
  timestamp: Date;
  checksum: string;
  dependencies?: string[]; // IDs of related records
}

export interface DeltaCalculationResult {
  deltas: DataDelta[];
  lastSyncTimestamp: Date;
  totalChanges: number;
  estimatedSyncTime: number;
  estimatedBandwidth: number;
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export type ConflictType = 'version' | 'concurrent' | 'dependency' | 'schema';
export type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'merge' | 'user-choice' | 'latest-wins';

export interface SyncConflict {
  id: string;
  type: ConflictType;
  resource: string;
  recordId: string;
  clientData: any;
  serverData: any;
  clientVersion: string;
  serverVersion: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoResolvable: boolean;
  suggestedResolution?: ConflictResolutionStrategy;
  metadata: Record<string, unknown>;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  timestamp: Date;
  automatic: boolean;
  rationale?: string;
}

// ============================================================================
// Network and Connection Types
// ============================================================================

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'none';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface ConnectionInfo {
  type: ConnectionType;
  quality: ConnectionQuality;
  bandwidth: number; // Mbps
  latency: number; // ms
  isMetered: boolean;
  isOnline: boolean;
  lastChanged: Date;
}

export interface NetworkOptimization {
  enableCompression: boolean;
  batchSize: number;
  maxConcurrentRequests: number;
  timeoutMs: number;
  retryStrategy: 'linear' | 'exponential' | 'adaptive';
  prioritizeOperations: boolean;
}

// ============================================================================
// Background Sync Types
// ============================================================================

export type BackgroundSyncTrigger = 'periodic' | 'connectivity' | 'data-change' | 'user-action';

export interface BackgroundSyncConfig {
  enabled: boolean;
  triggers: BackgroundSyncTrigger[];
  periodicInterval: number; // ms
  maxBackgroundTime: number; // ms
  batteryOptimization: boolean;
  wifiOnly: boolean;
  requiresCharging: boolean;
}

export interface BackgroundSyncJob {
  id: string;
  trigger: BackgroundSyncTrigger;
  scheduledTime: Date;
  options: SyncOptions;
  priority: number;
  estimatedDuration: number;
  maxRetries: number;
  currentRetries: number;
}

// ============================================================================
// Real-time Sync Types
// ============================================================================

export type RealTimeConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
export type RealTimeEventType = 'data-change' | 'conflict' | 'sync-request' | 'heartbeat';

export interface RealTimeSyncConfig {
  enabled: boolean;
  url: string;
  protocol: 'websocket' | 'sse';
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptions: string[]; // Resources to subscribe to
}

export interface RealTimeEvent {
  id: string;
  type: RealTimeEventType;
  resource: string;
  data: any;
  timestamp: Date;
  source: 'server' | 'client';
}

export interface WebhookPayload {
  eventId: string;
  eventType: string;
  resource: string;
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: string;
  signature: string;
}

// ============================================================================
// Sync Events (extending existing event system)
// ============================================================================

export interface SyncStartedEvent extends BaseEvent {
  type: 'sync.started';
  data: {
    syncId: string;
    operation: SyncOperation;
    estimatedDuration?: number;
    dataTypes: string[];
    options: SyncOptions;
  };
}

export interface SyncProgressEvent extends BaseEvent {
  type: 'sync.progress';
  data: {
    syncId: string;
    progress: number; // 0-100
    phase: SyncPhase;
    operations: {
      completed: number;
      total: number;
      errors: number;
    };
    estimatedTimeRemaining?: number;
  };
}

export interface SyncCompletedEvent extends BaseEvent {
  type: 'sync.completed';
  data: {
    syncId: string;
    result: SyncResult;
    summary: {
      recordsSynced: number;
      conflictsResolved: number;
      errors: number;
      duration: number;
    };
  };
}

export interface SyncFailedEvent extends BaseEvent {
  type: 'sync.failed';
  data: {
    syncId: string;
    error: SyncError;
    phase: SyncPhase;
    retryable: boolean;
    nextRetryTime?: Date;
  };
}

export interface SyncConflictEvent extends BaseEvent {
  type: 'sync.conflict';
  data: {
    syncId: string;
    conflicts: SyncConflict[];
    autoResolved: number;
    requiresUserInput: number;
  };
}

export interface SyncPausedEvent extends BaseEvent {
  type: 'sync.paused';
  data: {
    syncId: string;
    reason: 'user-request' | 'network-issue' | 'battery-low' | 'error';
    canResume: boolean;
  };
}

export interface SyncResumedEvent extends BaseEvent {
  type: 'sync.resumed';
  data: {
    syncId: string;
    previousPause: Date;
    resumeReason: string;
  };
}

// ============================================================================
// Analytics and Monitoring Types
// ============================================================================

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  averageBandwidthUsage: number;
  conflictRate: number;
  autoResolutionRate: number;
  backgroundSyncCount: number;
  realtimeEventsProcessed: number;
  lastSyncTime: Date | null;
  healthScore: number; // 0-100
}

export interface SyncHealthCheck {
  status: 'healthy' | 'degraded' | 'critical';
  issues: Array<{
    severity: 'warning' | 'error' | 'critical';
    message: string;
    suggestion?: string;
  }>;
  lastCheck: Date;
  metrics: SyncMetrics;
}

// ============================================================================
// Plugin and Extension Types
// ============================================================================

export interface SyncContext {
  syncId: string;
  operation: SyncOperation;
  options: SyncOptions;
  phase: SyncPhase;
  data?: any;
  metadata: Record<string, unknown>;
}

export interface SyncHooks {
  beforeSync?: (context: SyncContext) => Promise<void>;
  afterSync?: (result: SyncResult) => Promise<void>;
  beforePhase?: (phase: SyncPhase, context: SyncContext) => Promise<void>;
  afterPhase?: (phase: SyncPhase, result: any) => Promise<void>;
  onConflict?: (conflict: SyncConflict) => Promise<ConflictResolution | undefined>;
  onError?: (error: SyncError, context: SyncContext) => Promise<boolean>; // Return true to retry
  transformData?: (data: any, direction: SyncDirection) => Promise<any>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SyncManagerConfig {
  // Core sync settings
  defaultStrategy: SyncStrategy;
  maxConcurrentSyncs: number;
  defaultTimeout: number;
  defaultRetries: number;

  // Background sync
  backgroundSync: BackgroundSyncConfig;

  // Real-time sync
  realTimeSync: RealTimeSyncConfig;

  // Conflict resolution
  conflictResolution: {
    defaultStrategy: ConflictResolutionStrategy;
    autoResolveThreshold: number;
    maxConflictsPerSync: number;
  };

  // Network optimization
  networkOptimization: NetworkOptimization;

  // Analytics and monitoring
  analytics: {
    enabled: boolean;
    retentionDays: number;
    detailedLogging: boolean;
  };

  // Storage
  storage: {
    provider: 'memory' | 'localStorage' | 'indexedDB' | 'custom';
    maxStorageSize: number;
    encryptSensitiveData: boolean;
  };

  // Custom hooks
  hooks?: SyncHooks;
}

// ============================================================================
// Union Types for Events
// ============================================================================

export type SyncEvent =
  | SyncStartedEvent
  | SyncProgressEvent
  | SyncCompletedEvent
  | SyncFailedEvent
  | SyncConflictEvent
  | SyncPausedEvent
  | SyncResumedEvent;

// Event type map for type-safe event emission/listening
export type SyncEventTypeMap = {
  [K in SyncEvent['type']]: Extract<SyncEvent, { type: K }>['data'];
};
