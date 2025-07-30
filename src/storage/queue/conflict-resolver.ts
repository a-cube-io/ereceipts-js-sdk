/**
 * Conflict Resolution System
 * Enterprise-grade conflict resolution for offline-first operations
 */

import type {
  QueueItem,
  ResourceType,
  ConflictResolver,
  QueueOperationType,
  ConflictResolutionStrategy,
} from './types';

export interface ConflictContext {
  resource: ResourceType;
  operation: QueueOperationType;
  localTimestamp: number;
  serverTimestamp: number;
  clientId: string;
  conflictType: ConflictType;
}

export type ConflictType =
  | 'version-mismatch'      // Local and server versions differ
  | 'concurrent-modification' // Multiple clients modified same resource
  | 'stale-data'           // Local data is outdated
  | 'missing-dependency'   // Required dependency not found
  | 'validation-error'     // Data doesn't pass server validation
  | 'permission-denied'    // Insufficient permissions
  | 'resource-locked'      // Resource is locked by another operation
  | 'schema-incompatible'; // Data schema incompatible with server

export interface ConflictResolution<T = any> {
  strategy: ConflictResolutionStrategy;
  resolvedData: T;
  requiresUserInput: boolean;
  metadata: {
    conflictType: ConflictType;
    resolutionReason: string;
    dataSource: 'client' | 'server' | 'merged' | 'manual';
    confidence: number; // 0-1, how confident we are in the resolution
    preservedFields?: string[];
    discardedFields?: string[];
  };
}

export interface MergeRule {
  field: string;
  strategy: 'client' | 'server' | 'latest' | 'merge-array' | 'custom';
  customResolver?: (clientValue: any, serverValue: any, context: ConflictContext) => any;
}

export interface ConflictResolverConfig {
  defaultStrategy: ConflictResolutionStrategy;
  mergeRules: Record<ResourceType, MergeRule[]>;
  userInputTimeout: number;
  maxResolutionAttempts: number;
  enableAutoResolution: boolean;
  confidenceThreshold: number;
}

export class ConflictResolverManager {
  private config: ConflictResolverConfig;

  private customResolvers: Map<string, ConflictResolver> = new Map();

  private pendingUserInputs: Map<string, ConflictResolution> = new Map();

  private resolutionHistory: ConflictResolution[] = [];

  constructor(config: Partial<ConflictResolverConfig> = {}) {
    this.config = {
      defaultStrategy: 'server-wins',
      mergeRules: this.getDefaultMergeRules(),
      userInputTimeout: 300000, // 5 minutes
      maxResolutionAttempts: 3,
      enableAutoResolution: true,
      confidenceThreshold: 0.8,
      ...config,
    };
  }

  /**
   * Resolve conflict between local and server data
   */
  async resolveConflict<T = any>(
    localItem: QueueItem,
    serverData: T,
    context: ConflictContext,
  ): Promise<ConflictResolution<T>> {
    // Check if we have a custom resolver for this resource/operation
    const resolverKey = `${context.resource}:${context.operation}`;
    const customResolver = this.customResolvers.get(resolverKey);

    if (customResolver) {
      try {
        const resolved = await customResolver(localItem, serverData, context);
        return this.createResolution('manual', resolved as T, context, 'Custom resolver applied', 1.0);
      } catch (error) {
        console.warn(`Custom resolver failed for ${resolverKey}:`, error);
        // Fall back to default strategy
      }
    }

    // Use configured strategy for this item
    const strategy = localItem.conflictResolution || this.config.defaultStrategy;

    switch (strategy) {
      case 'client-wins':
        return this.resolveClientWins(localItem, serverData, context);

      case 'server-wins':
        return this.resolveServerWins(localItem, serverData, context);

      case 'merge':
        return this.resolveMerge(localItem, serverData, context);

      case 'manual':
        return this.resolveManual(localItem, serverData, context);

      default:
        return this.resolveServerWins(localItem, serverData, context);
    }
  }

  /**
   * Register custom conflict resolver
   */
  registerResolver(
    resource: ResourceType,
    operation: QueueOperationType,
    resolver: ConflictResolver,
  ): void {
    const key = `${resource}:${operation}`;
    this.customResolvers.set(key, resolver);
  }

  /**
   * Get conflict resolution suggestions based on context
   */
  getResolutionSuggestions(context: ConflictContext): ConflictResolutionStrategy[] {
    const suggestions: ConflictResolutionStrategy[] = [];

    switch (context.conflictType) {
      case 'version-mismatch':
        if (Math.abs(context.localTimestamp - context.serverTimestamp) < 60000) {
          suggestions.push('merge', 'client-wins', 'server-wins');
        } else {
          suggestions.push('server-wins', 'merge');
        }
        break;

      case 'concurrent-modification':
        suggestions.push('merge', 'manual', 'server-wins');
        break;

      case 'stale-data':
        suggestions.push('server-wins', 'merge');
        break;

      case 'validation-error':
        suggestions.push('server-wins', 'manual');
        break;

      case 'permission-denied':
        suggestions.push('server-wins');
        break;

      default:
        suggestions.push('server-wins', 'merge', 'client-wins');
    }

    return suggestions;
  }

  /**
   * Analyze conflict to determine type and severity
   */
  analyzeConflict(localItem: QueueItem, serverData: any): ConflictContext {
    const now = Date.now();

    // Determine conflict type based on available information
    let conflictType: ConflictType = 'version-mismatch';

    // Check for timestamp differences
    const timeDiff = Math.abs(localItem.updatedAt - now);
    if (timeDiff > 300000) { // 5 minutes
      conflictType = 'stale-data';
    }

    // Check for validation-related errors
    if (this.hasValidationIssues(localItem.data, serverData)) {
      conflictType = 'validation-error';
    }

    // Check for schema compatibility
    if (this.hasSchemaIssues(localItem.data, serverData)) {
      conflictType = 'schema-incompatible';
    }

    return {
      resource: localItem.resource,
      operation: localItem.operation,
      localTimestamp: localItem.updatedAt,
      serverTimestamp: now,
      clientId: this.getClientId(),
      conflictType,
    };
  }

  /**
   * Get resolution history for analytics
   */
  getResolutionHistory(): ConflictResolution[] {
    return [...this.resolutionHistory];
  }

  /**
   * Clear resolution history
   */
  clearHistory(): void {
    this.resolutionHistory = [];
  }

  // Private resolution methods

  private async resolveClientWins<T>(
    localItem: QueueItem,
    _serverData: T,
    context: ConflictContext,
  ): Promise<ConflictResolution<T>> {
    return this.createResolution(
      'client-wins',
      localItem.data as T,
      context,
      'Client data takes precedence',
      0.7,
    );
  }

  private async resolveServerWins<T>(
    _localItem: QueueItem,
    serverData: T,
    context: ConflictContext,
  ): Promise<ConflictResolution<T>> {
    return this.createResolution(
      'server-wins',
      serverData,
      context,
      'Server data takes precedence',
      0.9,
    );
  }

  private async resolveMerge<T>(
    localItem: QueueItem,
    serverData: T,
    context: ConflictContext,
  ): Promise<ConflictResolution<T>> {
    const mergeRules = this.config.mergeRules[context.resource] || [];
    const merged = await this.performMerge(
      localItem.data,
      serverData,
      mergeRules,
      context,
    );

    const confidence = this.calculateMergeConfidence(mergeRules, context);

    return this.createResolution(
      'merge',
      merged as T,
      context,
      'Data merged using configured rules',
      confidence,
    );
  }

  private async resolveManual<T>(
    _localItem: QueueItem,
    serverData: T,
    context: ConflictContext,
  ): Promise<ConflictResolution<T>> {
    // For now, default to server wins but mark as requiring user input
    const resolution = this.createResolution(
      'manual',
      serverData,
      context,
      'Manual resolution required - defaulting to server data',
      0.3,
    );

    resolution.requiresUserInput = true;

    // Store for user input handling
    const resolutionId = `manual_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    this.pendingUserInputs.set(resolutionId, resolution);

    // Set timeout for user input
    setTimeout(() => {
      if (this.pendingUserInputs.has(resolutionId)) {
        console.warn(`Manual conflict resolution timed out for ${context.resource}:${context.operation}`);
        this.pendingUserInputs.delete(resolutionId);
      }
    }, this.config.userInputTimeout);

    return resolution;
  }

  private async performMerge(
    clientData: any,
    serverData: any,
    mergeRules: MergeRule[],
    context: ConflictContext,
  ): Promise<any> {
    const result = { ...serverData }; // Start with server data as base
    const preservedFields: string[] = [];
    const discardedFields: string[] = [];

    for (const rule of mergeRules) {
      try {
        const clientValue = this.getNestedProperty(clientData, rule.field);
        const serverValue = this.getNestedProperty(serverData, rule.field);

        let resolvedValue;

        switch (rule.strategy) {
          case 'client':
            resolvedValue = clientValue;
            preservedFields.push(rule.field);
            break;

          case 'server':
            resolvedValue = serverValue;
            break;

          case 'latest':
            resolvedValue = context.localTimestamp > context.serverTimestamp
              ? clientValue
              : serverValue;
            break;

          case 'merge-array':
            if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
              resolvedValue = this.mergeArrays(clientValue, serverValue);
              preservedFields.push(rule.field);
            } else {
              resolvedValue = serverValue;
            }
            break;

          case 'custom':
            if (rule.customResolver) {
              resolvedValue = rule.customResolver(clientValue, serverValue, context);
              preservedFields.push(rule.field);
            } else {
              resolvedValue = serverValue;
            }
            break;

          default:
            resolvedValue = serverValue;
        }

        this.setNestedProperty(result, rule.field, resolvedValue);

      } catch (error) {
        console.warn(`Failed to apply merge rule for field ${rule.field}:`, error);
        discardedFields.push(rule.field);
      }
    }

    // Store merge metadata
    result._mergeMetadata = {
      preservedFields,
      discardedFields,
      mergedAt: Date.now(),
    };

    return result;
  }

  private createResolution<T>(
    strategy: ConflictResolutionStrategy,
    data: T,
    context: ConflictContext,
    reason: string,
    confidence: number,
  ): ConflictResolution<T> {
    const resolution: ConflictResolution<T> = {
      strategy,
      resolvedData: data,
      requiresUserInput: false,
      metadata: {
        conflictType: context.conflictType,
        resolutionReason: reason,
        dataSource: this.getDataSource(strategy),
        confidence,
      },
    };

    // Store in history
    this.resolutionHistory.push(resolution);

    // Keep history size manageable
    if (this.resolutionHistory.length > 1000) {
      this.resolutionHistory = this.resolutionHistory.slice(-500);
    }

    return resolution;
  }

  private getDataSource(strategy: ConflictResolutionStrategy): 'client' | 'server' | 'merged' | 'manual' {
    switch (strategy) {
      case 'client-wins': return 'client';
      case 'server-wins': return 'server';
      case 'merge': return 'merged';
      case 'manual': return 'manual';
      default: return 'server';
    }
  }

  private calculateMergeConfidence(mergeRules: MergeRule[], context: ConflictContext): number {
    if (mergeRules.length === 0) {return 0.3;}

    let confidence = 0.8;

    // Reduce confidence for complex conflicts
    if (context.conflictType === 'concurrent-modification') {
      confidence -= 0.2;
    }

    // Reduce confidence for old data
    const timeDiff = Math.abs(context.localTimestamp - context.serverTimestamp);
    if (timeDiff > 600000) { // 10 minutes
      confidence -= 0.3;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private getDefaultMergeRules(): Record<ResourceType, MergeRule[]> {
    return {
      receipts: [
        { field: 'items', strategy: 'merge-array' },
        { field: 'notes', strategy: 'client' },
        { field: 'status', strategy: 'server' },
        { field: 'updatedAt', strategy: 'latest' },
      ],
      cashiers: [
        { field: 'name', strategy: 'client' },
        { field: 'email', strategy: 'client' },
        { field: 'role', strategy: 'server' },
        { field: 'permissions', strategy: 'server' },
      ],
      merchants: [
        { field: 'businessInfo', strategy: 'client' },
        { field: 'taxInfo', strategy: 'server' },
        { field: 'settings', strategy: 'merge-array' },
      ],
      'cash-registers': [
        { field: 'configuration', strategy: 'client' },
        { field: 'status', strategy: 'server' },
        { field: 'lastSync', strategy: 'latest' },
      ],
      'point-of-sales': [
        { field: 'configuration', strategy: 'client' },
        { field: 'status', strategy: 'server' },
      ],
      pems: [
        { field: 'configuration', strategy: 'server' },
        { field: 'status', strategy: 'server' },
      ],
    };
  }

  private hasValidationIssues(_localData: any, _serverData: any): boolean {
    // Simple heuristic - more sophisticated validation would be implemented
    // based on specific business rules
    return false;
  }

  private hasSchemaIssues(localData: any, serverData: any): boolean {
    // Check if data structures are fundamentally incompatible
    return typeof localData !== typeof serverData;
  }

  private getClientId(): string {
    // Generate or retrieve client ID
    return `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {current[key] = {};}
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private mergeArrays(clientArray: any[], serverArray: any[]): any[] {
    // Simple merge strategy - remove duplicates and combine
    const merged = [...serverArray];

    for (const item of clientArray) {
      const exists = merged.some(existing =>
        JSON.stringify(existing) === JSON.stringify(item),
      );
      if (!exists) {
        merged.push(item);
      }
    }

    return merged;
  }
}
