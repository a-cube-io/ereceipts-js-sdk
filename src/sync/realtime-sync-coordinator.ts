/**
 * Real-time Sync Coordinator - Multi-client synchronization orchestrator
 * Coordinates real-time updates across multiple clients using webhooks and conflict resolution
 * Manages sync sessions, client states, and ensures eventual consistency
 */

import { EventEmitter } from 'events';
import type { WebhookManager, WebhookPayload, WebhookEventType } from './webhook-manager';
import type { ConflictResolutionEngine, ConflictData, ConflictResolution } from './conflict-resolution-engine';
import type { ResourceType } from '@/storage/queue/types';

export type SyncSessionState = 
  | 'initializing'
  | 'syncing'
  | 'idle'
  | 'conflicted'
  | 'error'
  | 'disconnected';

export type ClientStatus = 
  | 'online'
  | 'offline'
  | 'syncing'
  | 'conflicted'
  | 'error';

export type SyncStrategy = 
  | 'optimistic'     // Apply changes immediately, resolve conflicts later
  | 'pessimistic'    // Wait for server confirmation before applying
  | 'collaborative'  // Real-time collaboration with operational transforms
  | 'eventual';      // Eventual consistency with conflict resolution

export interface ClientInfo {
  readonly id: string;
  readonly sessionId: string;
  readonly userId?: string;
  readonly userAgent: string;
  readonly ipAddress?: string;
  readonly lastSeen: number;
  readonly status: ClientStatus;
  readonly capabilities: {
    readonly realtimeUpdates: boolean;
    readonly conflictResolution: boolean;
    readonly operationalTransforms: boolean;
    readonly offlineSupport: boolean;
  };
  readonly syncState: {
    readonly lastSyncTimestamp: number;
    readonly pendingOperations: number;
    readonly conflictCount: number;
    readonly version: number;
  };
}

export interface SyncSession {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly resourceId: string;
  readonly state: SyncSessionState;
  readonly strategy: SyncStrategy;
  readonly participants: ClientInfo[];
  readonly createdAt: number;
  readonly lastActivity: number;
  readonly version: number;
  readonly pendingOperations: SyncOperation[];
  readonly conflicts: ConflictData[];
  readonly metadata?: Record<string, unknown>;
}

export interface SyncOperation {
  readonly id: string;
  readonly sessionId: string;
  readonly clientId: string;
  readonly type: 'create' | 'update' | 'delete' | 'patch';
  readonly resourceType: ResourceType;
  readonly resourceId: string;
  readonly data: unknown;
  readonly version: number;
  readonly timestamp: number;
  readonly dependencies?: string[];
  readonly transforms?: OperationalTransform[];
  readonly metadata?: Record<string, unknown>;
}

export interface OperationalTransform {
  readonly type: 'insert' | 'delete' | 'retain' | 'replace';
  readonly position: number;
  readonly length?: number;
  readonly content?: unknown;
  readonly attributes?: Record<string, unknown>;
}

export interface SyncEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly type: WebhookEventType;
  readonly operation: SyncOperation;
  readonly timestamp: number;
  readonly acknowledged: boolean;
  readonly clients: string[];
}

export interface SyncCoordinatorStats {
  readonly activeSessions: number;
  readonly totalClients: number;
  readonly onlineClients: number;
  readonly operationsPerSecond: number;
  readonly averageLatency: number;
  readonly conflictRate: number;
  readonly syncSuccessRate: number;
  readonly bandwidthUsage: number;
  readonly sessionsByResource: Record<ResourceType, number>;
  readonly clientsByStatus: Record<ClientStatus, number>;
}

export interface SyncCoordinatorConfig {
  readonly enabled: boolean;
  readonly defaultStrategy: SyncStrategy;
  readonly maxSessionsPerResource: number;
  readonly maxClientsPerSession: number;
  readonly sessionTimeout: number;
  readonly operationTimeout: number;
  readonly conflictResolutionTimeout: number;
  readonly heartbeatInterval: number;
  readonly batchSize: number;
  readonly compressionEnabled: boolean;
  readonly operationalTransformsEnabled: boolean;
  readonly collaborativeEditingEnabled: boolean;
  readonly metricsEnabled: boolean;
}

export interface SyncCoordinatorEvents {
  'session:created': { session: SyncSession };
  'session:joined': { session: SyncSession; client: ClientInfo };
  'session:left': { session: SyncSession; clientId: string };
  'session:ended': { session: SyncSession };
  'operation:received': { operation: SyncOperation };
  'operation:applied': { operation: SyncOperation; clients: string[] };
  'operation:conflicted': { operation: SyncOperation; conflict: ConflictData };
  'conflict:resolved': { sessionId: string; resolution: ConflictResolution };
  'client:connected': { client: ClientInfo };
  'client:disconnected': { clientId: string };
  'client:status-changed': { clientId: string; status: ClientStatus };
  'sync:completed': { sessionId: string; operations: number };
  'sync:failed': { sessionId: string; error: Error };
}

/**
 * RealtimeSyncCoordinator - Enterprise multi-client synchronization system
 * Orchestrates real-time collaboration with conflict resolution and operational transforms
 */
export class RealtimeSyncCoordinator extends EventEmitter {
  private sessions = new Map<string, SyncSession>();
  private clients = new Map<string, ClientInfo>();
  private operations = new Map<string, SyncOperation>();
  private events = new Map<string, SyncEvent>();
  
  private stats: SyncCoordinatorStats = {
    activeSessions: 0,
    totalClients: 0,
    onlineClients: 0,
    operationsPerSecond: 0,
    averageLatency: 0,
    conflictRate: 0,
    syncSuccessRate: 0,
    bandwidthUsage: 0,
    sessionsByResource: {
      'receipts': 0,
      'cashiers': 0,
      'merchants': 0,
      'cash-registers': 0,
      'point-of-sales': 0,
      'pems': 0,
    },
    clientsByStatus: {
      'online': 0,
      'offline': 0,
      'syncing': 0,
      'conflicted': 0,
      'error': 0,
    },
  };

  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    private config: SyncCoordinatorConfig,
    private webhookManager?: WebhookManager,
    private conflictEngine?: ConflictResolutionEngine
  ) {
    super();
    this.setMaxListeners(1000); // Support many clients
  }

  /**
   * Initialize the sync coordinator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    // Set up webhook listeners
    if (this.webhookManager) {
      this.setupWebhookListeners();
    }

    // Set up conflict resolution listeners
    if (this.conflictEngine) {
      this.setupConflictListeners();
    }

    // Start background processes
    this.startHeartbeat();
    this.startMetricsCollection();

    this.isInitialized = true;
    console.log('RealtimeSyncCoordinator initialized');
  }

  /**
   * Destroy the coordinator and cleanup resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Stop background processes
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // End all sessions
    for (const session of this.sessions.values()) {
      await this.endSession(session.id, 'coordinator shutdown');
    }

    // Clear all data
    this.sessions.clear();
    this.clients.clear();
    this.operations.clear();
    this.events.clear();

    this.isInitialized = false;
    console.log('RealtimeSyncCoordinator destroyed');
  }

  /**
   * Register a client for synchronization
   */
  async registerClient(clientInfo: Omit<ClientInfo, 'id' | 'lastSeen' | 'status' | 'syncState'>): Promise<ClientInfo> {
    const client: ClientInfo = {
      ...clientInfo,
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      lastSeen: Date.now(),
      status: 'online',
      syncState: {
        lastSyncTimestamp: Date.now(),
        pendingOperations: 0,
        conflictCount: 0,
        version: 1,
      },
    };

    this.clients.set(client.id, client);
    this.stats = {
      ...this.stats,
      totalClients: this.stats.totalClients + 1,
      onlineClients: this.stats.onlineClients + 1,
    };
    this.updateClientStats();

    this.emit('client:connected', { client });
    return client;
  }

  /**
   * Unregister a client
   */
  async unregisterClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Remove client from all sessions
    for (const session of this.sessions.values()) {
      if (session.participants.some(p => p.id === clientId)) {
        await this.leaveSession(session.id, clientId);
      }
    }

    this.clients.delete(clientId);
    this.stats = {
      ...this.stats,
      onlineClients: Math.max(0, this.stats.onlineClients - 1),
    };
    this.updateClientStats();

    this.emit('client:disconnected', { clientId });
  }

  /**
   * Create a new sync session
   */
  async createSession(
    resourceType: ResourceType,
    resourceId: string,
    strategy: SyncStrategy = this.config.defaultStrategy,
    metadata?: Record<string, unknown>
  ): Promise<SyncSession> {
    // Check session limits
    const existingSessions = Array.from(this.sessions.values())
      .filter(s => s.resourceType === resourceType && s.resourceId === resourceId);
    
    if (existingSessions.length >= this.config.maxSessionsPerResource) {
      throw new Error(`Maximum sessions reached for ${resourceType}:${resourceId}`);
    }

    const session: SyncSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      resourceType,
      resourceId,
      state: 'initializing',
      strategy,
      participants: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      version: 1,
      pendingOperations: [],
      conflicts: [],
      metadata: metadata || {},
    };

    this.sessions.set(session.id, session);
    this.stats = {
      ...this.stats,
      activeSessions: this.stats.activeSessions + 1,
      sessionsByResource: {
        ...this.stats.sessionsByResource,
        [resourceType]: this.stats.sessionsByResource[resourceType] + 1,
      },
    };

    this.emit('session:created', { session });
    return session;
  }

  /**
   * Join a sync session
   */
  async joinSession(sessionId: string, clientId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    const client = this.clients.get(clientId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Check client limits
    if (session.participants.length >= this.config.maxClientsPerSession) {
      throw new Error(`Maximum clients reached for session ${sessionId}`);
    }

    // Check if client already in session
    if (session.participants.some(p => p.id === clientId)) {
      return; // Already joined
    }

    // Add client to session
    const updatedSession: SyncSession = {
      ...session,
      participants: [...session.participants, client],
      lastActivity: Date.now(),
      state: 'syncing',
    };

    this.sessions.set(sessionId, updatedSession);
    this.emit('session:joined', { session: updatedSession, client });

    // Send current state to new client
    await this.sendSessionState(updatedSession, clientId);
  }

  /**
   * Leave a sync session
   */
  async leaveSession(sessionId: string, clientId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Remove client from session
    const updatedSession: SyncSession = {
      ...session,
      participants: session.participants.filter(p => p.id !== clientId),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, updatedSession);
    this.emit('session:left', { session: updatedSession, clientId });

    // End session if no participants left
    if (updatedSession.participants.length === 0) {
      await this.endSession(sessionId, 'no participants');
    }
  }

  /**
   * End a sync session
   */
  async endSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Process any pending operations
    await this.processPendingOperations(session);

    this.sessions.delete(sessionId);
    this.stats = {
      ...this.stats,
      activeSessions: Math.max(0, this.stats.activeSessions - 1),
      sessionsByResource: {
        ...this.stats.sessionsByResource,
        [session.resourceType]: Math.max(0, this.stats.sessionsByResource[session.resourceType] - 1),
      },
    };

    this.emit('session:ended', { session });
    console.log(`Session ${sessionId} ended: ${reason || 'normal'}`);
  }

  /**
   * Submit a sync operation
   */
  async submitOperation(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<SyncOperation> {
    const session = this.sessions.get(operation.sessionId);
    if (!session) {
      throw new Error(`Session ${operation.sessionId} not found`);
    }

    const client = this.clients.get(operation.clientId);
    if (!client) {
      throw new Error(`Client ${operation.clientId} not found`);
    }

    // Create full operation
    const fullOperation: SyncOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: Date.now(),
    };

    this.operations.set(fullOperation.id, fullOperation);
    this.emit('operation:received', { operation: fullOperation });

    // Process operation based on strategy
    switch (session.strategy) {
      case 'optimistic':
        await this.processOptimisticOperation(session, fullOperation);
        break;
      case 'pessimistic':
        await this.processPessimisticOperation(session, fullOperation);
        break;
      case 'collaborative':
        await this.processCollaborativeOperation(session, fullOperation);
        break;
      case 'eventual':
        await this.processEventualOperation(session, fullOperation);
        break;
    }

    return fullOperation;
  }

  /**
   * Get active sync sessions
   */
  getActiveSessions(): SyncSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get connected clients
   */
  getConnectedClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get coordinator statistics
   */
  getStats(): SyncCoordinatorStats {
    return { ...this.stats };
  }

  /**
   * Get session by resource
   */
  getSessionByResource(resourceType: ResourceType, resourceId: string): SyncSession | undefined {
    return Array.from(this.sessions.values())
      .find(s => s.resourceType === resourceType && s.resourceId === resourceId);
  }

  /**
   * Set up webhook event listeners
   */
  private setupWebhookListeners(): void {
    if (!this.webhookManager) return;

    this.webhookManager.onEvent('receipt.created', this.handleResourceWebhook.bind(this));
    this.webhookManager.onEvent('receipt.updated', this.handleResourceWebhook.bind(this));
    this.webhookManager.onEvent('receipt.deleted', this.handleResourceWebhook.bind(this));
    this.webhookManager.onEvent('cashier.created', this.handleResourceWebhook.bind(this));
    this.webhookManager.onEvent('cashier.updated', this.handleResourceWebhook.bind(this));
    this.webhookManager.onEvent('cashier.deleted', this.handleResourceWebhook.bind(this));
    // Add more webhook handlers as needed
  }

  /**
   * Set up conflict resolution listeners
   */
  private setupConflictListeners(): void {
    if (!this.conflictEngine) return;

    this.conflictEngine.on('conflict:detected', this.handleConflictDetected.bind(this));
    this.conflictEngine.on('conflict:resolved', this.handleConflictResolved.bind(this));
  }

  /**
   * Handle webhook events for resource changes
   */
  private async handleResourceWebhook(payload: WebhookPayload): Promise<void> {
    try {
      // Find sessions for this resource
      const resourceType = this.extractResourceType(payload.type);
      const resourceId = this.extractResourceId(payload);
      
      if (!resourceType || !resourceId) {
        return;
      }

      const sessions = Array.from(this.sessions.values())
        .filter(s => s.resourceType === resourceType && s.resourceId === resourceId);

      // Broadcast to all relevant sessions
      for (const session of sessions) {
        await this.broadcastWebhookToSession(session, payload);
      }

    } catch (error) {
      console.error('Webhook handling failed:', error);
    }
  }

  /**
   * Handle conflict detection
   */
  private async handleConflictDetected(event: { conflict: ConflictData }): Promise<void> {
    const { conflict } = event;
    
    // Find session for this conflict
    const session = this.getSessionByResource(conflict.context.resourceType, conflict.context.resourceId);
    if (!session) {
      return;
    }

    // Update session state
    const updatedSession: SyncSession = {
      ...session,
      state: 'conflicted',
      conflicts: [...session.conflicts, conflict],
      lastActivity: Date.now(),
    };

    this.sessions.set(session.id, updatedSession);

    // Find the operation that caused the conflict
    const operation = Array.from(this.operations.values())
      .find(op => op.resourceId === conflict.context.resourceId);

    if (operation) {
      this.emit('operation:conflicted', { operation, conflict });
    }
  }

  /**
   * Handle conflict resolution
   */
  private async handleConflictResolved(event: { conflict: ConflictData; resolution: ConflictResolution }): Promise<void> {
    const { conflict, resolution } = event;
    
    // Find session for this conflict
    const session = this.getSessionByResource(conflict.context.resourceType, conflict.context.resourceId);
    if (!session) {
      return;
    }

    // Update session state
    const updatedSession: SyncSession = {
      ...session,
      state: session.conflicts.length <= 1 ? 'syncing' : 'conflicted',
      conflicts: session.conflicts.filter(c => c.id !== conflict.id),
      lastActivity: Date.now(),
      version: session.version + 1,
    };

    this.sessions.set(session.id, updatedSession);
    this.emit('conflict:resolved', { sessionId: session.id, resolution });

    // Broadcast resolution to all clients
    await this.broadcastResolution(updatedSession, resolution);
  }

  /**
   * Process optimistic operation (apply immediately, resolve conflicts later)
   */
  private async processOptimisticOperation(session: SyncSession, operation: SyncOperation): Promise<void> {
    // Apply operation immediately to all clients
    const targetClients = session.participants
      .filter(p => p.id !== operation.clientId)
      .map(p => p.id);

    await this.broadcastOperation(session, operation, targetClients);
    this.emit('operation:applied', { operation, clients: targetClients });

    // Update session
    const updatedSession: SyncSession = {
      ...session,
      lastActivity: Date.now(),
      version: session.version + 1,
    };

    this.sessions.set(session.id, updatedSession);
  }

  /**
   * Process pessimistic operation (wait for server confirmation)
   */
  private async processPessimisticOperation(session: SyncSession, operation: SyncOperation): Promise<void> {
    // Add to pending operations
    const updatedSession: SyncSession = {
      ...session,
      pendingOperations: [...session.pendingOperations, operation],
      lastActivity: Date.now(),
    };

    this.sessions.set(session.id, updatedSession);

    // Process after server confirmation (simulated)
    setTimeout(async () => {
      await this.confirmPendingOperation(session.id, operation.id);
    }, 100) as unknown as NodeJS.Timeout;
  }

  /**
   * Process collaborative operation (with operational transforms)
   */
  private async processCollaborativeOperation(session: SyncSession, operation: SyncOperation): Promise<void> {
    if (!this.config.operationalTransformsEnabled) {
      // Fallback to optimistic
      return this.processOptimisticOperation(session, operation);
    }

    // Apply operational transforms
    const transformedOperation = await this.applyOperationalTransforms(session, operation);
    
    // Broadcast transformed operation
    const targetClients = session.participants
      .filter(p => p.id !== operation.clientId)
      .map(p => p.id);

    await this.broadcastOperation(session, transformedOperation, targetClients);
    this.emit('operation:applied', { operation: transformedOperation, clients: targetClients });
  }

  /**
   * Process eventual operation (queue for eventual consistency)
   */
  private async processEventualOperation(session: SyncSession, operation: SyncOperation): Promise<void> {
    // Add to pending for eventual processing
    const updatedSession: SyncSession = {
      ...session,
      pendingOperations: [...session.pendingOperations, operation],
      lastActivity: Date.now(),
    };

    this.sessions.set(session.id, updatedSession);

    // Process in batches
    if (updatedSession.pendingOperations.length >= this.config.batchSize) {
      await this.processPendingOperations(updatedSession);
    }
  }

  /**
   * Apply operational transforms to maintain consistency
   */
  private async applyOperationalTransforms(session: SyncSession, operation: SyncOperation): Promise<SyncOperation> {
    // Simplified operational transform implementation
    // In a real system, this would be much more sophisticated
    
    if (!operation.transforms || operation.transforms.length === 0) {
      return operation;
    }

    // Apply transforms to resolve conflicts
    const transformedData = await this.transformData(operation.data, operation.transforms);
    
    return {
      ...operation,
      data: transformedData,
      version: session.version,
    };
  }

  /**
   * Transform data using operational transforms
   */
  private async transformData(data: unknown, transforms: OperationalTransform[]): Promise<unknown> {
    // Simplified transform application
    // Real implementation would handle complex text/data transformations
    
    let result = data;
    
    for (const transform of transforms) {
      switch (transform.type) {
        case 'replace':
          result = transform.content;
          break;
        case 'insert':
          // Handle insertion logic
          break;
        case 'delete':
          // Handle deletion logic
          break;
        case 'retain':
          // Handle retention logic
          break;
      }
    }
    
    return result;
  }

  /**
   * Broadcast operation to specified clients
   */
  private async broadcastOperation(session: SyncSession, operation: SyncOperation, clientIds: string[]): Promise<void> {
    // In a real implementation, this would use WebSocket or similar real-time transport
    console.log(`Broadcasting operation ${operation.id} to ${clientIds.length} clients in session ${session.id}`);
    
    // Create sync event
    const event: SyncEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      sessionId: session.id,
      type: this.operationToWebhookType(operation),
      operation,
      timestamp: Date.now(),
      acknowledged: false,
      clients: clientIds,
    };

    this.events.set(event.id, event);
  }

  /**
   * Broadcast webhook to session participants
   */
  private async broadcastWebhookToSession(session: SyncSession, webhook: WebhookPayload): Promise<void> {
    const clientIds = session.participants.map(p => p.id);
    console.log(`Broadcasting webhook ${webhook.id} to ${clientIds.length} clients in session ${session.id}`);
  }

  /**
   * Broadcast conflict resolution to session participants
   */
  private async broadcastResolution(session: SyncSession, resolution: ConflictResolution): Promise<void> {
    const clientIds = session.participants.map(p => p.id);
    console.log(`Broadcasting resolution ${resolution.conflictId} to ${clientIds.length} clients in session ${session.id}`);
  }

  /**
   * Send current session state to a client
   */
  private async sendSessionState(session: SyncSession, clientId: string): Promise<void> {
    console.log(`Sending session state to client ${clientId} for session ${session.id}`);
    // In real implementation, would send complete session state
  }

  /**
   * Confirm a pending operation
   */
  private async confirmPendingOperation(sessionId: string, operationId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const operation = session.pendingOperations.find(op => op.id === operationId);
    if (!operation) {
      return;
    }

    // Remove from pending and apply
    const updatedSession: SyncSession = {
      ...session,
      pendingOperations: session.pendingOperations.filter(op => op.id !== operationId),
      lastActivity: Date.now(),
      version: session.version + 1,
    };

    this.sessions.set(sessionId, updatedSession);

    // Broadcast to other clients
    const targetClients = session.participants
      .filter(p => p.id !== operation.clientId)
      .map(p => p.id);

    await this.broadcastOperation(updatedSession, operation, targetClients);
    this.emit('operation:applied', { operation, clients: targetClients });
  }

  /**
   * Process all pending operations for a session
   */
  private async processPendingOperations(session: SyncSession): Promise<void> {
    if (session.pendingOperations.length === 0) {
      return;
    }

    // Sort operations by timestamp
    const sortedOperations = [...session.pendingOperations].sort((a, b) => a.timestamp - b.timestamp);

    // Process each operation
    for (const operation of sortedOperations) {
      await this.confirmPendingOperation(session.id, operation.id);
    }

    this.emit('sync:completed', { sessionId: session.id, operations: sortedOperations.length });
  }

  /**
   * Start heartbeat to monitor client connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval * 3; // 3x heartbeat interval

      // Check for disconnected clients
      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastSeen > timeout) {
          this.unregisterClient(clientId);
        }
      }

      // Check for idle sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > this.config.sessionTimeout) {
          this.endSession(sessionId, 'timeout');
        }
      }
    }, this.config.heartbeatInterval) as unknown as NodeJS.Timeout;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (!this.config.metricsEnabled) {
      return;
    }

    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000) as unknown as NodeJS.Timeout; // Every 10 seconds
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    this.stats = {
      ...this.stats,
      activeSessions: this.sessions.size,
      totalClients: this.clients.size,
    };
    this.updateClientStats();
    
    // Calculate operations per second
    const recentOperations = Array.from(this.operations.values())
      .filter(op => Date.now() - op.timestamp < 60000); // Last minute
    this.stats = {
      ...this.stats,
      operationsPerSecond: recentOperations.length / 60,
    };

    // Calculate conflict rate
    const totalOperations = this.operations.size;
    const conflictedSessions = Array.from(this.sessions.values())
      .filter(s => s.conflicts.length > 0).length;
    this.stats = {
      ...this.stats,
      conflictRate: totalOperations > 0 ? (conflictedSessions / totalOperations) * 100 : 0,
    };
  }

  /**
   * Update client statistics
   */
  private updateClientStats(): void {
    const newClientsByStatus = {
      'online': 0,
      'offline': 0,
      'syncing': 0,
      'conflicted': 0,
      'error': 0,
    };

    for (const client of this.clients.values()) {
      newClientsByStatus[client.status]++;
    }

    this.stats = {
      ...this.stats,
      clientsByStatus: newClientsByStatus,
      onlineClients: newClientsByStatus.online,
    };
  }

  /**
   * Extract resource type from webhook event type
   */
  private extractResourceType(eventType: WebhookEventType): ResourceType | null {
    const mapping: Record<string, ResourceType> = {
      'receipt': 'receipts',
      'cashier': 'cashiers',
      'merchant': 'merchants',
      'cash-register': 'cash-registers',
      'point-of-sale': 'point-of-sales',
      'pem': 'pems',
    };

    const prefix = eventType.split('.')[0];
    return prefix ? mapping[prefix] || null : null;
  }

  /**
   * Extract resource ID from webhook payload
   */
  private extractResourceId(payload: WebhookPayload): string | null {
    // Extract ID from payload data
    if (typeof payload.data === 'object' && payload.data !== null) {
      const data = payload.data as Record<string, unknown>;
      return data.id as string || null;
    }
    return null;
  }

  /**
   * Convert operation to webhook event type
   */
  private operationToWebhookType(operation: SyncOperation): WebhookEventType {
    const resourceMap: Record<ResourceType, string> = {
      'receipts': 'receipt',
      'cashiers': 'cashier',
      'merchants': 'merchant',
      'cash-registers': 'cash-register',
      'point-of-sales': 'point-of-sale',
      'pems': 'pem',
    };

    const resource = resourceMap[operation.resourceType];
    const action = operation.type === 'create' ? 'created' : 
                   operation.type === 'update' ? 'updated' : 
                   operation.type === 'delete' ? 'deleted' : 'updated';

    return `${resource}.${action}` as WebhookEventType;
  }
}

/**
 * Create real-time sync coordinator with default configuration
 */
export function createRealtimeSyncCoordinator(
  config: Partial<SyncCoordinatorConfig> = {},
  webhookManager?: WebhookManager,
  conflictEngine?: ConflictResolutionEngine
): RealtimeSyncCoordinator {
  const defaultConfig: SyncCoordinatorConfig = {
    enabled: true,
    defaultStrategy: 'optimistic',
    maxSessionsPerResource: 10,
    maxClientsPerSession: 50,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    operationTimeout: 10000, // 10 seconds
    conflictResolutionTimeout: 60000, // 1 minute
    heartbeatInterval: 30000, // 30 seconds
    batchSize: 10,
    compressionEnabled: true,
    operationalTransformsEnabled: true,
    collaborativeEditingEnabled: true,
    metricsEnabled: true,
  };

  return new RealtimeSyncCoordinator(
    { ...defaultConfig, ...config },
    webhookManager,
    conflictEngine
  );
}