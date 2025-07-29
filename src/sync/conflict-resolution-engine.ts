/**
 * Conflict Resolution Engine - Version-based conflict detection and resolution
 * Handles data conflicts when syncing between offline and online systems
 * Provides intelligent strategies for resolving conflicts based on business rules
 */

import { EventEmitter } from 'events';
import type { ResourceType, ConflictResolutionStrategy } from '@/storage/queue/types';

export type ConflictType = 
  | 'version_mismatch'
  | 'concurrent_edit'
  | 'deleted_modified'
  | 'modified_deleted'
  | 'field_conflict'
  | 'schema_conflict'
  | 'business_rule_violation';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ConflictResolutionResult = 
  | 'client_wins'
  | 'server_wins'
  | 'merged'
  | 'manual_required'
  | 'rejected'
  | 'deferred';

export interface ConflictContext {
  readonly resourceType: ResourceType;
  readonly resourceId: string;
  readonly operation: 'create' | 'update' | 'delete';
  readonly timestamp: number;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly correlationId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface VersionInfo {
  readonly version: number;
  readonly timestamp: number;
  readonly etag?: string;
  readonly checksum?: string;
  readonly lastModifiedBy?: string;
  readonly lastModifiedAt?: number;
}

export interface ConflictData {
  readonly id: string;
  readonly type: ConflictType;
  readonly severity: ConflictSeverity;
  readonly context: ConflictContext;
  readonly clientData: {
    readonly value: unknown;
    readonly version: VersionInfo;
  };
  readonly serverData: {
    readonly value: unknown;
    readonly version: VersionInfo;
  };
  readonly commonAncestor: {
    readonly value: unknown;
    readonly version: VersionInfo;
  } | undefined;
  readonly conflictingFields: string[] | undefined;
  readonly businessRules: string[] | undefined;
  readonly detectedAt: number;
  readonly autoResolvable: boolean;
  readonly suggestedResolution: ConflictResolutionStrategy | undefined;
}

export interface ConflictResolution {
  readonly conflictId: string;
  readonly strategy: ConflictResolutionStrategy;
  readonly result: ConflictResolutionResult;
  readonly resolvedValue?: unknown;
  readonly resolvedVersion: VersionInfo;
  readonly appliedAt: number;
  readonly appliedBy?: string;
  readonly reasoning?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ConflictRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly resourceTypes: ResourceType[];
  readonly conflictTypes: ConflictType[];
  readonly priority: number;
  readonly condition: (conflict: ConflictData) => boolean;
  readonly resolver: (conflict: ConflictData) => Promise<ConflictResolution | null>;
  readonly enabled: boolean;
}

export interface ConflictStats {
  totalConflicts: number;
  resolvedConflicts: number;
  manualConflicts: number;
  autoResolutionRate: number;
  resolutionsByStrategy: Record<ConflictResolutionStrategy, number>;
  resolutionsByType: Record<ConflictType, number>;
  averageResolutionTime: number;
  oldestUnresolvedConflict: number | undefined;
}

export interface ConflictResolutionEngineConfig {
  readonly enabled: boolean;
  readonly maxConflictHistory: number;
  readonly autoResolveEnabled: boolean;
  readonly defaultStrategy: ConflictResolutionStrategy;
  readonly versioningEnabled: boolean;
  readonly checksumValidation: boolean;
  readonly businessRulesEnabled: boolean;
  readonly conflictTimeout: number; // Auto-resolve timeout in ms
  readonly retryAttempts: number;
  readonly notificationEnabled: boolean;
}

export interface ConflictEvents {
  'conflict:detected': { conflict: ConflictData };
  'conflict:resolved': { conflict: ConflictData; resolution: ConflictResolution };
  'conflict:failed': { conflict: ConflictData; error: Error };
  'conflict:manual-required': { conflict: ConflictData };
  'conflict:auto-resolved': { conflict: ConflictData; resolution: ConflictResolution };
  'rule:applied': { rule: ConflictRule; conflict: ConflictData };
  'rule:failed': { rule: ConflictRule; conflict: ConflictData; error: Error };
}

/**
 * ConflictResolutionEngine - Intelligent conflict detection and resolution system
 * Handles version-based conflicts with configurable business rules and strategies
 */
export class ConflictResolutionEngine extends EventEmitter {
  private conflicts = new Map<string, ConflictData>();
  private resolutions = new Map<string, ConflictResolution>();
  private rules = new Map<string, ConflictRule>();
  private stats: ConflictStats = {
    totalConflicts: 0,
    resolvedConflicts: 0,
    manualConflicts: 0,
    autoResolutionRate: 0,
    resolutionsByStrategy: {
      'client-wins': 0,
      'server-wins': 0,
      'merge': 0,
      'manual': 0,
    },
    resolutionsByType: {
      'version_mismatch': 0,
      'concurrent_edit': 0,
      'deleted_modified': 0,
      'modified_deleted': 0,
      'field_conflict': 0,
      'schema_conflict': 0,
      'business_rule_violation': 0,
    },
    averageResolutionTime: 0,
    oldestUnresolvedConflict: undefined,
  };

  private isInitialized = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private config: ConflictResolutionEngineConfig) {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Initialize the conflict resolution engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    // Register default conflict resolution rules
    await this.registerDefaultRules();

    // Start cleanup process
    this.startCleanupProcess();

    this.isInitialized = true;
    console.log('ConflictResolutionEngine initialized');
  }

  /**
   * Destroy the engine and cleanup resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.conflicts.clear();
    this.resolutions.clear();
    this.rules.clear();

    this.isInitialized = false;
    console.log('ConflictResolutionEngine destroyed');
  }

  /**
   * Detect conflicts between client and server data
   */
  async detectConflict(
    context: ConflictContext,
    clientData: { value: unknown; version: VersionInfo },
    serverData: { value: unknown; version: VersionInfo },
    commonAncestor?: { value: unknown; version: VersionInfo }
  ): Promise<ConflictData | null> {
    try {
      // Check if versions actually conflict
      if (!this.hasVersionConflict(clientData.version, serverData.version)) {
        return null; // No conflict
      }

      // Determine conflict type and severity
      const conflictType = this.determineConflictType(context, clientData, serverData, commonAncestor);
      const severity = this.assessConflictSeverity(conflictType, context, clientData, serverData);
      
      // Check for field-level conflicts
      const conflictingFields = this.identifyConflictingFields(clientData.value, serverData.value);
      
      // Validate business rules
      const businessRules = this.validateBusinessRules(context, clientData.value, serverData.value);
      
      // Determine if auto-resolvable
      const autoResolvable = this.isAutoResolvable(conflictType, severity, conflictingFields);
      
      // Suggest resolution strategy
      const suggestedResolution = this.suggestResolutionStrategy(
        conflictType,
        severity,
        context,
        conflictingFields
      );

      const conflict: ConflictData = {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        type: conflictType,
        severity,
        context,
        clientData,
        serverData,
        commonAncestor,
        conflictingFields: conflictingFields.length > 0 ? conflictingFields : undefined,
        businessRules: businessRules.length > 0 ? businessRules : undefined,
        detectedAt: Date.now(),
        autoResolvable,
        suggestedResolution,
      };

      this.conflicts.set(conflict.id, conflict);
      this.stats.totalConflicts++;
      this.emit('conflict:detected', { conflict });

      // Attempt auto-resolution if enabled
      if (this.config.autoResolveEnabled && autoResolvable) {
        try {
          const resolution = await this.resolveConflict(conflict.id, suggestedResolution);
          if (resolution) {
            this.emit('conflict:auto-resolved', { conflict, resolution });
          }
        } catch (error) {
          console.warn(`Auto-resolution failed for conflict ${conflict.id}:`, error);
        }
      }

      return conflict;

    } catch (error) {
      console.error('Conflict detection failed:', error);
      throw error;
    }
  }

  /**
   * Resolve a conflict using specified strategy
   */
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    customResolver?: (conflict: ConflictData) => Promise<unknown>
  ): Promise<ConflictResolution | null> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    try {
      const startTime = Date.now();
      let resolvedValue: unknown;
      let result: ConflictResolutionResult;
      let reasoning: string | undefined;

      // Apply resolution strategy
      switch (strategy) {
        case 'client-wins':
          resolvedValue = conflict.clientData.value;
          result = 'client_wins';
          reasoning = 'Client data takes precedence';
          break;

        case 'server-wins':
          resolvedValue = conflict.serverData.value;
          result = 'server_wins';
          reasoning = 'Server data takes precedence';
          break;

        case 'merge':
          const mergeResult = await this.mergeData(conflict);
          resolvedValue = mergeResult.value;
          result = mergeResult.success ? 'merged' : 'manual_required';
          reasoning = mergeResult.reasoning;
          break;

        case 'manual':
          result = 'manual_required';
          reasoning = 'Manual intervention required';
          this.emit('conflict:manual-required', { conflict });
          break;

        default:
          // Try custom resolver or apply rules
          if (customResolver) {
            resolvedValue = await customResolver(conflict);
            result = 'merged';
            reasoning = 'Custom resolver applied';
          } else {
            const ruleResult = await this.applyResolutionRules(conflict);
            if (ruleResult) {
              return ruleResult; // Rule handled the resolution
            }
            result = 'manual_required';
            reasoning = 'No applicable resolution rule found';
          }
          break;
      }

      // Create resolution
      const resolution: ConflictResolution = {
        conflictId,
        strategy,
        result,
        resolvedValue,
        resolvedVersion: this.generateNewVersion(conflict, resolvedValue),
        appliedAt: Date.now(),
        reasoning,
      };

      this.resolutions.set(conflictId, resolution);
      this.conflicts.delete(conflictId); // Remove resolved conflict

      // Update statistics
      this.stats.resolvedConflicts++;
      this.stats.resolutionsByStrategy[strategy]++;
      this.stats.resolutionsByType[conflict.type]++;
      
      const resolutionTime = Date.now() - startTime;
      this.stats.averageResolutionTime = 
        (this.stats.averageResolutionTime * (this.stats.resolvedConflicts - 1) + resolutionTime) / 
        this.stats.resolvedConflicts;

      this.stats.autoResolutionRate = 
        (this.stats.resolvedConflicts / this.stats.totalConflicts) * 100;

      if (result === 'manual_required') {
        this.stats.manualConflicts++;
      }

      this.emit('conflict:resolved', { conflict, resolution });
      return resolution;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('conflict:failed', { conflict, error: err });
      throw err;
    }
  }

  /**
   * Register a custom conflict resolution rule
   */
  registerRule(rule: ConflictRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Unregister a conflict resolution rule
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all active conflicts
   */
  getActiveConflicts(): ConflictData[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflict resolution history
   */
  getResolutionHistory(limit = 100): ConflictResolution[] {
    return Array.from(this.resolutions.values())
      .sort((a, b) => b.appliedAt - a.appliedAt)
      .slice(0, limit);
  }

  /**
   * Get conflict statistics
   */
  getStats(): ConflictStats {
    const oldestConflict = Math.min(...Array.from(this.conflicts.values()).map(c => c.detectedAt));
    return {
      ...this.stats,
      oldestUnresolvedConflict: this.conflicts.size > 0 ? oldestConflict : undefined,
    };
  }

  /**
   * Check if there's a version conflict
   */
  private hasVersionConflict(clientVersion: VersionInfo, serverVersion: VersionInfo): boolean {
    // Version number mismatch
    if (clientVersion.version !== serverVersion.version) {
      return true;
    }

    // ETag mismatch
    if (clientVersion.etag && serverVersion.etag && clientVersion.etag !== serverVersion.etag) {
      return true;
    }

    // Checksum mismatch
    if (this.config.checksumValidation && 
        clientVersion.checksum && 
        serverVersion.checksum && 
        clientVersion.checksum !== serverVersion.checksum) {
      return true;
    }

    return false;
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(
    context: ConflictContext,
    clientData: { value: unknown; version: VersionInfo },
    serverData: { value: unknown; version: VersionInfo },
    _commonAncestor?: { value: unknown; version: VersionInfo }
  ): ConflictType {
    // Check for deletion conflicts
    if (context.operation === 'delete' && serverData.value !== null) {
      return 'deleted_modified';
    }
    
    if (context.operation === 'update' && serverData.value === null) {
      return 'modified_deleted';
    }

    // Check for version mismatch
    if (clientData.version.version !== serverData.version.version) {
      return 'version_mismatch';
    }

    // Check for concurrent edits (same version but different content)
    if (clientData.version.version === serverData.version.version &&
        JSON.stringify(clientData.value) !== JSON.stringify(serverData.value)) {
      return 'concurrent_edit';
    }

    // Check for field-level conflicts
    const conflictingFields = this.identifyConflictingFields(clientData.value, serverData.value);
    if (conflictingFields.length > 0) {
      return 'field_conflict';
    }

    // Check for schema conflicts
    if (this.hasSchemaConflict(clientData.value, serverData.value)) {
      return 'schema_conflict';
    }

    // Check for business rule violations
    const businessRules = this.validateBusinessRules(context, clientData.value, serverData.value);
    if (businessRules.length > 0) {
      return 'business_rule_violation';
    }

    return 'version_mismatch'; // Default fallback
  }

  /**
   * Assess conflict severity
   */
  private assessConflictSeverity(
    type: ConflictType,
    _context: ConflictContext,
    clientData: { value: unknown; version: VersionInfo },
    serverData: { value: unknown; version: VersionInfo }
  ): ConflictSeverity {
    // Critical conflicts
    if (type === 'business_rule_violation' || type === 'schema_conflict') {
      return 'critical';
    }

    // High severity for deletion conflicts
    if (type === 'deleted_modified' || type === 'modified_deleted') {
      return 'high';
    }

    // Check data impact
    const conflictingFields = this.identifyConflictingFields(clientData.value, serverData.value);
    if (conflictingFields.length > 5) {
      return 'high';
    } else if (conflictingFields.length > 2) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Identify fields that have conflicting values
   */
  private identifyConflictingFields(clientValue: unknown, serverValue: unknown): string[] {
    const conflicts: string[] = [];
    
    if (typeof clientValue !== 'object' || typeof serverValue !== 'object' ||
        clientValue === null || serverValue === null) {
      return [];
    }

    const clientObj = clientValue as Record<string, unknown>;
    const serverObj = serverValue as Record<string, unknown>;
    
    const allFields = new Set([...Object.keys(clientObj), ...Object.keys(serverObj)]);
    
    for (const field of allFields) {
      const clientVal = clientObj[field];
      const serverVal = serverObj[field];
      
      if (JSON.stringify(clientVal) !== JSON.stringify(serverVal)) {
        conflicts.push(field);
      }
    }
    
    return conflicts;
  }

  /**
   * Check for schema conflicts
   */
  private hasSchemaConflict(clientValue: unknown, serverValue: unknown): boolean {
    if (typeof clientValue !== typeof serverValue) {
      return true;
    }
    
    if (Array.isArray(clientValue) !== Array.isArray(serverValue)) {
      return true;
    }
    
    // Check for structural differences in objects
    if (typeof clientValue === 'object' && clientValue !== null && serverValue !== null) {
      const clientKeys = Object.keys(clientValue as object);
      const serverKeys = Object.keys(serverValue as object);
      
      // Check for significantly different key sets
      const keyDiff = Math.abs(clientKeys.length - serverKeys.length);
      if (keyDiff > clientKeys.length * 0.3) { // 30% difference threshold
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    context: ConflictContext,
    clientValue: unknown,
    serverValue: unknown
  ): string[] {
    const violations: string[] = [];
    
    if (!this.config.businessRulesEnabled) {
      return violations;
    }

    // Example business rules (would be configurable in real implementation)
    switch (context.resourceType) {
      case 'receipts':
        // Receipt amount cannot be negative
        const clientAmount = this.getFieldValue(clientValue, 'amount');
        const serverAmount = this.getFieldValue(serverValue, 'amount');
        if ((typeof clientAmount === 'number' && clientAmount < 0) || 
            (typeof serverAmount === 'number' && serverAmount < 0)) {
          violations.push('receipt_amount_negative');
        }
        break;
        
      case 'cashiers':
        // Cashier must have valid credentials
        const clientStatus = this.getFieldValue(clientValue, 'status');
        const serverStatus = this.getFieldValue(serverValue, 'status');
        if (clientStatus === 'inactive' && serverStatus === 'active') {
          violations.push('cashier_deactivation_conflict');
        }
        break;
        
      // Add more business rules as needed
    }
    
    return violations;
  }

  /**
   * Check if conflict can be auto-resolved
   */
  private isAutoResolvable(
    type: ConflictType,
    severity: ConflictSeverity,
    conflictingFields: string[]
  ): boolean {
    // Never auto-resolve critical conflicts
    if (severity === 'critical') {
      return false;
    }

    // Don't auto-resolve deletion conflicts
    if (type === 'deleted_modified' || type === 'modified_deleted') {
      return false;
    }

    // Don't auto-resolve if too many fields conflict
    if (conflictingFields.length > 3) {
      return false;
    }

    return true;
  }

  /**
   * Suggest resolution strategy based on conflict characteristics
   */
  private suggestResolutionStrategy(
    type: ConflictType,
    severity: ConflictSeverity,
    _context: ConflictContext,
    conflictingFields: string[]
  ): ConflictResolutionStrategy {
    // Always manual for critical conflicts
    if (severity === 'critical') {
      return 'manual';
    }

    // Strategy based on conflict type
    switch (type) {
      case 'version_mismatch':
        // Newer version wins for simple version conflicts
        return 'server-wins';
        
      case 'concurrent_edit':
        // Try merging for concurrent edits
        return conflictingFields.length <= 2 ? 'merge' : 'manual';
        
      case 'field_conflict':
        // Merge if only a few fields conflict
        return conflictingFields.length <= 1 ? 'merge' : 'manual';
        
      case 'deleted_modified':
      case 'modified_deleted':
        // Always manual for deletion conflicts
        return 'manual';
        
      default:
        return 'manual';
    }
  }

  /**
   * Merge conflicting data intelligently
   */
  private async mergeData(conflict: ConflictData): Promise<{
    value: unknown;
    success: boolean;
    reasoning: string;
  }> {
    try {
      const clientObj = conflict.clientData.value as Record<string, unknown>;
      const serverObj = conflict.serverData.value as Record<string, unknown>;
      
      if (typeof clientObj !== 'object' || typeof serverObj !== 'object' ||
          clientObj === null || serverObj === null) {
        return {
          value: conflict.serverData.value,
          success: false,
          reasoning: 'Cannot merge non-object values',
        };
      }

      const merged: Record<string, unknown> = { ...serverObj };
      const conflictingFields = conflict.conflictingFields || [];
      
      // Simple merge strategy: use client values for non-critical fields
      for (const field of conflictingFields) {
        if (this.isNonCriticalField(field, conflict.context.resourceType)) {
          merged[field] = clientObj[field];
        }
        // Keep server value for critical fields
      }

      return {
        value: merged,
        success: true,
        reasoning: 'Merged non-critical fields from client, kept server values for critical fields',
      };

    } catch (error) {
      return {
        value: conflict.serverData.value,
        success: false,
        reasoning: `Merge failed: ${error}`,
      };
    }
  }

  /**
   * Apply resolution rules to a conflict
   */
  private async applyResolutionRules(conflict: ConflictData): Promise<ConflictResolution | null> {
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => 
        rule.enabled &&
        rule.resourceTypes.includes(conflict.context.resourceType) &&
        rule.conflictTypes.includes(conflict.type) &&
        rule.condition(conflict)
      )
      .sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      try {
        const resolution = await rule.resolver(conflict);
        if (resolution) {
          this.emit('rule:applied', { rule, conflict });
          return resolution;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.emit('rule:failed', { rule, conflict, error: err });
        console.warn(`Rule ${rule.id} failed for conflict ${conflict.id}:`, error);
      }
    }

    return null;
  }

  /**
   * Generate new version info after conflict resolution
   */
  private generateNewVersion(conflict: ConflictData, resolvedValue: unknown): VersionInfo {
    const maxVersion = Math.max(
      conflict.clientData.version.version,
      conflict.serverData.version.version
    );

    return {
      version: maxVersion + 1,
      timestamp: Date.now(),
      etag: `"${Date.now()}-${Math.random().toString(36).substring(2)}"`,
      checksum: this.generateChecksum(resolvedValue),
      lastModifiedAt: Date.now(),
    };
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: unknown): string {
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Check if a field is considered non-critical for merging
   */
  private isNonCriticalField(field: string, resourceType: ResourceType): boolean {
    const nonCriticalFields: Record<ResourceType, string[]> = {
      'receipts': ['description', 'notes', 'tags'],
      'cashiers': ['displayName', 'preferences'],
      'merchants': ['description', 'notes'],
      'cash-registers': ['name', 'description'],
      'point-of-sales': ['name', 'description'],
      'pems': ['name', 'description'],
    };

    return nonCriticalFields[resourceType]?.includes(field) || false;
  }

  /**
   * Get field value from object safely
   */
  private getFieldValue(obj: unknown, field: string): unknown {
    if (typeof obj === 'object' && obj !== null) {
      return (obj as Record<string, unknown>)[field];
    }
    return undefined;
  }

  /**
   * Register default conflict resolution rules
   */
  private async registerDefaultRules(): Promise<void> {
    // Rule: Last writer wins for non-critical fields
    this.registerRule({
      id: 'last-writer-wins',
      name: 'Last Writer Wins',
      description: 'Resolve by using the most recently modified data',
      resourceTypes: ['receipts', 'cashiers', 'merchants', 'cash-registers', 'point-of-sales', 'pems'],
      conflictTypes: ['version_mismatch', 'concurrent_edit'],
      priority: 10,
      condition: (conflict) => conflict.severity === 'low',
      resolver: async (conflict) => {
        const clientTime = conflict.clientData.version.lastModifiedAt || 0;
        const serverTime = conflict.serverData.version.lastModifiedAt || 0;
        
        const useClient = clientTime > serverTime;
        
        return {
          conflictId: conflict.id,
          strategy: useClient ? 'client-wins' : 'server-wins',
          result: useClient ? 'client_wins' : 'server_wins',
          resolvedValue: useClient ? conflict.clientData.value : conflict.serverData.value,
          resolvedVersion: this.generateNewVersion(
            conflict,
            useClient ? conflict.clientData.value : conflict.serverData.value
          ),
          appliedAt: Date.now(),
          reasoning: `Last writer wins: ${useClient ? 'client' : 'server'} data is more recent`,
        };
      },
      enabled: true,
    });

    // Rule: Server wins for critical resources
    this.registerRule({
      id: 'server-wins-critical',
      name: 'Server Wins for Critical Data',
      description: 'Server data takes precedence for critical resources',
      resourceTypes: ['receipts', 'pems'],
      conflictTypes: ['version_mismatch', 'field_conflict'],
      priority: 20,
      condition: (conflict) => conflict.severity === 'high' || conflict.severity === 'critical',
      resolver: async (conflict) => ({
        conflictId: conflict.id,
        strategy: 'server-wins',
        result: 'server_wins',
        resolvedValue: conflict.serverData.value,
        resolvedVersion: this.generateNewVersion(conflict, conflict.serverData.value),
        appliedAt: Date.now(),
        reasoning: 'Server data takes precedence for critical resources',
      }),
      enabled: true,
    });
  }

  /**
   * Start cleanup process for old conflicts and resolutions
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      let cleanedCount = 0;

      // Clean up old resolutions
      for (const [id, resolution] of this.resolutions.entries()) {
        if (resolution.appliedAt < cutoff) {
          this.resolutions.delete(id);
          cleanedCount++;
        }
      }

      // Limit resolution history size
      if (this.resolutions.size > this.config.maxConflictHistory) {
        const sortedResolutions = Array.from(this.resolutions.entries())
          .sort(([, a], [, b]) => b.appliedAt - a.appliedAt);
        
        const toDelete = sortedResolutions.slice(this.config.maxConflictHistory);
        for (const [id] of toDelete) {
          this.resolutions.delete(id);
          cleanedCount++;
        }
      }

      // Auto-resolve timed-out conflicts
      const timedOutConflicts = Array.from(this.conflicts.values())
        .filter(conflict => 
          Date.now() - conflict.detectedAt > this.config.conflictTimeout &&
          conflict.autoResolvable
        );

      for (const conflict of timedOutConflicts) {
        this.resolveConflict(conflict.id, conflict.suggestedResolution || this.config.defaultStrategy)
          .catch(error => console.warn(`Auto-timeout resolution failed for ${conflict.id}:`, error));
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old conflict resolutions`);
      }
    }, 60 * 60 * 1000) as unknown as NodeJS.Timeout; // Run every hour
  }
}

/**
 * Create conflict resolution engine with default configuration
 */
export function createConflictResolutionEngine(
  config: Partial<ConflictResolutionEngineConfig> = {}
): ConflictResolutionEngine {
  const defaultConfig: ConflictResolutionEngineConfig = {
    enabled: true,
    maxConflictHistory: 10000,
    autoResolveEnabled: true,
    defaultStrategy: 'server-wins',
    versioningEnabled: true,
    checksumValidation: true,
    businessRulesEnabled: true,
    conflictTimeout: 24 * 60 * 60 * 1000, // 24 hours
    retryAttempts: 3,
    notificationEnabled: true,
  };

  return new ConflictResolutionEngine({ ...defaultConfig, ...config });
}