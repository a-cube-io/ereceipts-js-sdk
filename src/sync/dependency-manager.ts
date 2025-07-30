/**
 * Cross-resource Dependency Manager - Intelligent resource relationship management
 * Handles dependencies between different resources and ensures proper sync ordering
 * Manages cascade operations and maintains referential integrity across resources
 */

import type { ResourceType } from '@/storage/queue/types';

import { EventEmitter } from 'eventemitter3';

export type DependencyType =
  | 'requires'      // Resource A requires Resource B to exist
  | 'references'    // Resource A references Resource B (foreign key)
  | 'owns'          // Resource A owns Resource B (parent-child)
  | 'shares'        // Resources share common data
  | 'conflicts'     // Resources conflict and cannot be synced simultaneously
  | 'triggers';     // Resource A triggers updates to Resource B

export type CascadeAction =
  | 'none'          // No cascade action
  | 'update'        // Update dependent resources
  | 'delete'        // Delete dependent resources
  | 'restrict'      // Prevent operation if dependencies exist
  | 'set_null'      // Set foreign key references to null
  | 'archive';      // Archive dependent resources

export interface DependencyRule {
  id: string;
  name: string;
  description: string;
  sourceResource: ResourceType;
  targetResource: ResourceType;
  dependencyType: DependencyType;
  cascadeAction: CascadeAction;
  priority: number; // Higher priority rules are processed first
  enabled: boolean;
  condition?: (sourceData: unknown, targetData: unknown) => boolean;
  metadata?: Record<string, unknown>;
}

export interface ResourceNode {
  resourceType: ResourceType;
  resourceId: string;
  dependencies: string[]; // IDs of dependent resource nodes
  dependents: string[]; // IDs of resources that depend on this one
  lastModified: number;
  syncPriority: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'blocked';
  metadata?: Record<string, unknown>;
}

export interface DependencyGraph {
  nodes: Map<string, ResourceNode>;
  edges: Map<string, DependencyRule[]>;
  lastUpdated: number;
}

export interface SyncPlan {
  id: string;
  phases: SyncPhase[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  conflicts: ConflictInfo[];
  metadata: {
    totalResources: number;
    parallelizable: number;
    sequential: number;
    createdAt: number;
  };
}

export interface SyncPhase {
  id: string;
  order: number;
  resources: ResourceSyncInfo[];
  canParallelize: boolean;
  estimatedDuration: number;
  dependencies: string[]; // Phase IDs this phase depends on
}

export interface ResourceSyncInfo {
  resourceType: ResourceType;
  resourceId: string;
  operation: 'create' | 'update' | 'delete' | 'read';
  priority: number;
  estimatedDuration: number;
  dependencies: string[]; // Resource IDs this sync depends on
  conflicts: string[]; // Resource IDs that conflict with this sync
}

export interface ConflictInfo {
  id: string;
  type: 'circular_dependency' | 'resource_conflict' | 'operation_conflict';
  severity: 'warning' | 'error' | 'critical';
  description: string;
  affectedResources: string[];
  suggestedResolution?: string;
}

export interface DependencyViolation {
  id: string;
  ruleId: string;
  sourceResource: ResourceType;
  sourceId: string;
  targetResource: ResourceType;
  targetId: string;
  violationType: 'missing_dependency' | 'circular_reference' | 'constraint_violation';
  severity: 'warning' | 'error';
  timestamp: number;
  resolution?: 'auto_resolved' | 'manual_required' | 'ignored';
}

export interface DependencyManagerConfig {
  enabled: boolean;
  enableAutoCascade: boolean;
  enableCircularDetection: boolean;
  enableConflictResolution: boolean;
  maxDependencyDepth: number;
  syncPlanOptimization: 'speed' | 'reliability' | 'balanced';
  violationHandling: 'strict' | 'lenient' | 'warn_only';
  cacheGraphs: boolean;
  graphTTL: number; // milliseconds
}

export interface DependencyManagerEvents {
  'rule:added': { rule: DependencyRule };
  'rule:removed': { ruleId: string };
  'rule:violated': { violation: DependencyViolation };
  'graph:built': { graph: DependencyGraph; duration: number };
  'plan:created': { plan: SyncPlan };
  'conflict:detected': { conflict: ConflictInfo };
  'cascade:triggered': { ruleId: string; affectedResources: string[] };
  'dependency:resolved': { violation: DependencyViolation };
}

/**
 * Cross-resource Dependency Manager
 * Manages complex relationships between different resource types in the A-Cube system
 */
export class DependencyManager extends EventEmitter<DependencyManagerEvents> {
  private config: DependencyManagerConfig;

  private isInitialized = false;

  // Dependency rules and graphs
  private rules = new Map<string, DependencyRule>();

  private graphs = new Map<string, DependencyGraph>(); // Cached dependency graphs

  private violations = new Map<string, DependencyViolation>();

  // Resource relationship tracking
  private resourceRegistry = new Map<string, Set<string>>(); // resourceType -> Set of resourceIds

  private relationshipCache = new Map<string, Map<string, DependencyRule[]>>();

  // Sync planning cache
  private syncPlanCache = new Map<string, SyncPlan>();

  constructor(config: Partial<DependencyManagerConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      enableAutoCascade: true,
      enableCircularDetection: true,
      enableConflictResolution: true,
      maxDependencyDepth: 10,
      syncPlanOptimization: 'balanced',
      violationHandling: 'strict',
      cacheGraphs: true,
      graphTTL: 300000, // 5 minutes
      ...config,
    };

    this.setupDefaultRules();
  }

  /**
   * Initialize the dependency manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Validate existing rules for circular dependencies
      if (this.config.enableCircularDetection) {
        await this.validateRulesForCircularDependencies();
      }

      this.isInitialized = true;
      console.log('Dependency Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Dependency Manager:', error);
      throw error;
    }
  }

  /**
   * Destroy the dependency manager and cleanup resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Clear all caches
    this.graphs.clear();
    this.relationshipCache.clear();
    this.syncPlanCache.clear();
    this.violations.clear();

    this.isInitialized = false;
    console.log('Dependency Manager destroyed');
  }

  /**
   * Add a dependency rule
   */
  addRule(rule: Omit<DependencyRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const dependencyRule: DependencyRule = { ...rule, id };

    this.rules.set(id, dependencyRule);
    this.invalidateCache();

    this.emit('rule:added', { rule: dependencyRule });
    return id;
  }

  /**
   * Remove a dependency rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.invalidateCache();
      this.emit('rule:removed', { ruleId });
    }
    return removed;
  }

  /**
   * Register a resource instance
   */
  registerResource(resourceType: ResourceType, resourceId: string, _metadata?: Record<string, unknown>): void {
    if (!this.resourceRegistry.has(resourceType)) {
      this.resourceRegistry.set(resourceType, new Set());
    }

    this.resourceRegistry.get(resourceType)!.add(resourceId);

    // Invalidate relevant caches
    this.invalidateCacheForResource(resourceType, resourceId);
  }

  /**
   * Unregister a resource instance
   */
  unregisterResource(resourceType: ResourceType, resourceId: string): void {
    const resourceSet = this.resourceRegistry.get(resourceType);
    if (resourceSet) {
      resourceSet.delete(resourceId);
      this.invalidateCacheForResource(resourceType, resourceId);
    }
  }

  /**
   * Build a dependency graph for given resources
   */
  async buildDependencyGraph(
    resources: Array<{ type: ResourceType; id: string; operation?: 'create' | 'update' | 'delete' }>,
  ): Promise<DependencyGraph> {
    const startTime = Date.now();
    const cacheKey = this.generateGraphCacheKey(resources);

    // Check cache first
    if (this.config.cacheGraphs) {
      const cached = this.graphs.get(cacheKey);
      if (cached && (Date.now() - cached.lastUpdated) < this.config.graphTTL) {
        return cached;
      }
    }

    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      lastUpdated: Date.now(),
    };

    // Create nodes for all resources
    for (const resource of resources) {
      const nodeId = `${resource.type}:${resource.id}`;
      const node: ResourceNode = {
        resourceType: resource.type,
        resourceId: resource.id,
        dependencies: [],
        dependents: [],
        lastModified: Date.now(),
        syncPriority: this.calculateSyncPriority(resource.type),
        status: 'pending',
      };

      graph.nodes.set(nodeId, node);
    }

    // Build edges based on dependency rules
    for (const [_nodeId, node] of graph.nodes.entries()) {
      const applicableRules = this.getApplicableRules(node.resourceType);

      for (const rule of applicableRules) {
        await this.buildEdgesForRule(graph, node, rule);
      }
    }

    // Detect circular dependencies
    if (this.config.enableCircularDetection) {
      const conflicts = this.detectCircularDependencies(graph);
      if (conflicts.length > 0) {
        for (const conflict of conflicts) {
          this.emit('conflict:detected', { conflict });
        }
      }
    }

    // Cache the graph
    if (this.config.cacheGraphs) {
      this.graphs.set(cacheKey, graph);
    }

    const duration = Date.now() - startTime;
    this.emit('graph:built', { graph, duration });

    return graph;
  }

  /**
   * Create an optimized sync plan based on dependencies
   */
  async createSyncPlan(
    resources: Array<{ type: ResourceType; id: string; operation: 'create' | 'update' | 'delete' }>,
  ): Promise<SyncPlan> {
    const cacheKey = this.generatePlanCacheKey(resources);

    // Check cache first
    const cached = this.syncPlanCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build dependency graph
    const graph = await this.buildDependencyGraph(resources);

    // Topological sort to determine sync order
    const sortedNodes = this.topologicalSort(graph);

    // Group nodes into phases
    const phases = this.createSyncPhases(sortedNodes, graph);

    // Calculate plan metrics
    const totalResources = resources.length;
    const parallelizable = phases.reduce((sum, phase) => sum + (phase.canParallelize ? phase.resources.length : 0), 0);
    const sequential = totalResources - parallelizable;
    const estimatedDuration = phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);

    // Assess risk level
    const riskLevel = this.assessSyncRisk(graph, phases);

    // Detect conflicts
    const conflicts = this.detectSyncConflicts(graph, resources);

    const plan: SyncPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      phases,
      estimatedDuration,
      riskLevel,
      conflicts,
      metadata: {
        totalResources,
        parallelizable,
        sequential,
        createdAt: Date.now(),
      },
    };

    // Cache the plan
    this.syncPlanCache.set(cacheKey, plan);

    this.emit('plan:created', { plan });
    return plan;
  }

  /**
   * Validate dependencies before a sync operation
   */
  async validateDependencies(
    resourceType: ResourceType,
    resourceId: string,
    operation: 'create' | 'update' | 'delete',
  ): Promise<DependencyViolation[]> {
    const violations: DependencyViolation[] = [];
    const applicableRules = this.getApplicableRules(resourceType);

    for (const rule of applicableRules) {
      const violation = await this.checkRuleViolation(rule, resourceType, resourceId, operation);
      if (violation) {
        violations.push(violation);
        this.violations.set(violation.id, violation);
        this.emit('rule:violated', { violation });
      }
    }

    return violations;
  }

  /**
   * Execute cascade operations based on dependency rules
   */
  async executeCascadeOperations(
    resourceType: ResourceType,
    resourceId: string,
    _operation: 'create' | 'update' | 'delete',
  ): Promise<Array<{ type: ResourceType; id: string; action: CascadeAction }>> {
    if (!this.config.enableAutoCascade) {
      return [];
    }

    const cascadeOperations: Array<{ type: ResourceType; id: string; action: CascadeAction }> = [];
    const applicableRules = this.getApplicableRules(resourceType);

    for (const rule of applicableRules) {
      if (rule.cascadeAction !== 'none') {
        const affectedResources = await this.findAffectedResources(rule, resourceType, resourceId);

        for (const affectedResource of affectedResources) {
          cascadeOperations.push({
            type: affectedResource.type,
            id: affectedResource.id,
            action: rule.cascadeAction,
          });
        }

        if (affectedResources.length > 0) {
          this.emit('cascade:triggered', {
            ruleId: rule.id,
            affectedResources: affectedResources.map(r => `${r.type}:${r.id}`),
          });
        }
      }
    }

    return cascadeOperations;
  }

  /**
   * Get dependency information for a specific resource
   */
  getDependencies(resourceType: ResourceType, _resourceId: string): {
    dependencies: Array<{ type: ResourceType; id: string; rule: DependencyRule }>;
    dependents: Array<{ type: ResourceType; id: string; rule: DependencyRule }>;
  } {
    const dependencies: Array<{ type: ResourceType; id: string; rule: DependencyRule }> = [];
    const dependents: Array<{ type: ResourceType; id: string; rule: DependencyRule }> = [];

    for (const rule of this.rules.values()) {
      if (rule.sourceResource === resourceType) {
        // This resource depends on others
        const targetResources = this.resourceRegistry.get(rule.targetResource) || new Set();
        for (const targetId of targetResources) {
          dependencies.push({
            type: rule.targetResource,
            id: targetId,
            rule,
          });
        }
      }

      if (rule.targetResource === resourceType) {
        // Other resources depend on this one
        const sourceResources = this.resourceRegistry.get(rule.sourceResource) || new Set();
        for (const sourceId of sourceResources) {
          dependents.push({
            type: rule.sourceResource,
            id: sourceId,
            rule,
          });
        }
      }
    }

    return { dependencies, dependents };
  }

  /**
   * Get current statistics
   */
  getStats(): {
    totalRules: number;
    activeViolations: number;
    cachedGraphs: number;
    cachedPlans: number;
    registeredResources: Record<ResourceType, number>;
  } {
    const registeredResources: Record<ResourceType, number> = {
      'receipts': this.resourceRegistry.get('receipts')?.size || 0,
      'cashiers': this.resourceRegistry.get('cashiers')?.size || 0,
      'merchants': this.resourceRegistry.get('merchants')?.size || 0,
      'cash-registers': this.resourceRegistry.get('cash-registers')?.size || 0,
      'point-of-sales': this.resourceRegistry.get('point-of-sales')?.size || 0,
      'pems': this.resourceRegistry.get('pems')?.size || 0,
    };

    return {
      totalRules: this.rules.size,
      activeViolations: this.violations.size,
      cachedGraphs: this.graphs.size,
      cachedPlans: this.syncPlanCache.size,
      registeredResources,
    };
  }

  // Private methods

  private setupDefaultRules(): void {
    // Default dependency rules for the A-Cube system
    const defaultRules: Omit<DependencyRule, 'id'>[] = [
      {
        name: 'Receipt requires Cashier',
        description: 'Receipts must have a valid cashier',
        sourceResource: 'receipts',
        targetResource: 'cashiers',
        dependencyType: 'requires',
        cascadeAction: 'restrict',
        priority: 100,
        enabled: true,
      },
      {
        name: 'Receipt requires Merchant',
        description: 'Receipts must belong to a merchant',
        sourceResource: 'receipts',
        targetResource: 'merchants',
        dependencyType: 'requires',
        cascadeAction: 'restrict',
        priority: 100,
        enabled: true,
      },
      {
        name: 'Cashier belongs to Merchant',
        description: 'Cashiers are associated with merchants',
        sourceResource: 'cashiers',
        targetResource: 'merchants',
        dependencyType: 'owns',
        cascadeAction: 'delete',
        priority: 90,
        enabled: true,
      },
      {
        name: 'Cash Register at Point of Sale',
        description: 'Cash registers are located at point of sale',
        sourceResource: 'cash-registers',
        targetResource: 'point-of-sales',
        dependencyType: 'references',
        cascadeAction: 'set_null',
        priority: 80,
        enabled: true,
      },
      {
        name: 'PEM in Cash Register',
        description: 'PEMs are installed in cash registers',
        sourceResource: 'pems',
        targetResource: 'cash-registers',
        dependencyType: 'references',
        cascadeAction: 'update',
        priority: 70,
        enabled: true,
      },
      {
        name: 'Point of Sale belongs to Merchant',
        description: 'Points of sale are owned by merchants',
        sourceResource: 'point-of-sales',
        targetResource: 'merchants',
        dependencyType: 'owns',
        cascadeAction: 'delete',
        priority: 85,
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      this.addRule(rule);
    }
  }

  private getApplicableRules(resourceType: ResourceType): DependencyRule[] {
    return Array.from(this.rules.values())
      .filter(rule =>
        rule.enabled &&
        (rule.sourceResource === resourceType || rule.targetResource === resourceType),
      )
      .sort((a, b) => b.priority - a.priority);
  }

  private async buildEdgesForRule(graph: DependencyGraph, node: ResourceNode, rule: DependencyRule): Promise<void> {
    const nodeId = `${node.resourceType}:${node.resourceId}`;

    if (rule.sourceResource === node.resourceType) {
      // This node depends on target resources
      const targetResources = this.resourceRegistry.get(rule.targetResource) || new Set();

      for (const targetId of targetResources) {
        const targetNodeId = `${rule.targetResource}:${targetId}`;
        const targetNode = graph.nodes.get(targetNodeId);

        if (targetNode) {
          node.dependencies.push(targetNodeId);
          targetNode.dependents.push(nodeId);

          // Store edge information
          if (!graph.edges.has(nodeId)) {
            graph.edges.set(nodeId, []);
          }
          graph.edges.get(nodeId)!.push(rule);
        }
      }
    }
  }

  private detectCircularDependencies(graph: DependencyGraph): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        cycle.push(nodeId);

        conflicts.push({
          id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          type: 'circular_dependency',
          severity: 'error',
          description: `Circular dependency detected: ${cycle.join(' -> ')}`,
          affectedResources: cycle,
          suggestedResolution: 'Remove one of the dependencies or restructure the relationship',
        });

        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = graph.nodes.get(nodeId);
      if (node) {
        for (const dependencyId of node.dependencies) {
          if (dfs(dependencyId, [...path, nodeId])) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return conflicts;
  }

  private topologicalSort(graph: DependencyGraph): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const temporaryMark = new Set<string>();

    const visit = (nodeId: string): void => {
      if (temporaryMark.has(nodeId)) {
        throw new Error(`Circular dependency detected involving ${nodeId}`);
      }

      if (!visited.has(nodeId)) {
        temporaryMark.add(nodeId);

        const node = graph.nodes.get(nodeId);
        if (node) {
          for (const dependencyId of node.dependencies) {
            visit(dependencyId);
          }
        }

        temporaryMark.delete(nodeId);
        visited.add(nodeId);
        sorted.unshift(nodeId); // Add to beginning for reverse topological order
      }
    };

    // Visit all nodes
    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return sorted;
  }

  private createSyncPhases(sortedNodes: string[], graph: DependencyGraph): SyncPhase[] {
    const phases: SyncPhase[] = [];
    const processedNodes = new Set<string>();
    let phaseOrder = 0;

    while (processedNodes.size < sortedNodes.length) {
      const currentPhase: SyncPhase = {
        id: `phase_${phaseOrder}`,
        order: phaseOrder,
        resources: [],
        canParallelize: true,
        estimatedDuration: 0,
        dependencies: phaseOrder > 0 ? [`phase_${phaseOrder - 1}`] : [],
      };

      // Find nodes that can be processed in this phase
      for (const nodeId of sortedNodes) {
        if (processedNodes.has(nodeId)) {continue;}

        const node = graph.nodes.get(nodeId);
        if (!node) {continue;}

        // Check if all dependencies are already processed
        const allDependenciesProcessed = node.dependencies.every(depId => processedNodes.has(depId));

        if (allDependenciesProcessed) {
          const resourceInfo: ResourceSyncInfo = {
            resourceType: node.resourceType,
            resourceId: node.resourceId,
            operation: 'update', // Default operation
            priority: node.syncPriority,
            estimatedDuration: this.estimateResourceSyncDuration(node.resourceType),
            dependencies: node.dependencies,
            conflicts: [],
          };

          currentPhase.resources.push(resourceInfo);
          currentPhase.estimatedDuration = Math.max(
            currentPhase.estimatedDuration,
            resourceInfo.estimatedDuration,
          );

          processedNodes.add(nodeId);
        }
      }

      if (currentPhase.resources.length > 0) {
        // Determine if phase can be parallelized
        currentPhase.canParallelize = this.canParallelizePhase(currentPhase, graph);
        phases.push(currentPhase);
        phaseOrder++;
      } else {
        // No more nodes can be processed - likely circular dependency
        break;
      }
    }

    return phases;
  }

  private canParallelizePhase(phase: SyncPhase, _graph: DependencyGraph): boolean {
    // Check if any resources in this phase have conflicts with each other
    for (let i = 0; i < phase.resources.length; i++) {
      for (let j = i + 1; j < phase.resources.length; j++) {
        const resource1 = phase.resources[i]!;
        const resource2 = phase.resources[j]!;

        if (this.hasResourceConflict(resource1, resource2)) {
          return false;
        }
      }
    }

    return true;
  }

  private hasResourceConflict(resource1: ResourceSyncInfo, resource2: ResourceSyncInfo): boolean {
    // Check for conflicting dependency rules
    for (const rule of this.rules.values()) {
      if (rule.dependencyType === 'conflicts') {
        if ((rule.sourceResource === resource1.resourceType && rule.targetResource === resource2.resourceType) ||
            (rule.sourceResource === resource2.resourceType && rule.targetResource === resource1.resourceType)) {
          return true;
        }
      }
    }

    return false;
  }

  private assessSyncRisk(graph: DependencyGraph, phases: SyncPhase[]): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Risk factors
    const totalNodes = graph.nodes.size;
    const totalPhases = phases.length;
    const sequentialPhases = phases.filter(p => !p.canParallelize).length;
    const avgDependencies = Array.from(graph.nodes.values())
      .reduce((sum, node) => sum + node.dependencies.length, 0) / totalNodes;

    // Calculate risk score
    if (totalNodes > 50) {riskScore += 2;}
    if (totalPhases > 10) {riskScore += 2;}
    if (sequentialPhases > 5) {riskScore += 2;}
    if (avgDependencies > 3) {riskScore += 1;}

    if (riskScore >= 5) {return 'high';}
    if (riskScore >= 3) {return 'medium';}
    return 'low';
  }

  private detectSyncConflicts(_graph: DependencyGraph, resources: Array<{ type: ResourceType; id: string; operation: 'create' | 'update' | 'delete' }>): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // Check for operation conflicts
    for (let i = 0; i < resources.length; i++) {
      for (let j = i + 1; j < resources.length; j++) {
        const resource1 = resources[i]!;
        const resource2 = resources[j]!;

        if (resource1.type === resource2.type && resource1.id === resource2.id && resource1.operation !== resource2.operation) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            type: 'operation_conflict',
            severity: 'error',
            description: `Conflicting operations on ${resource1.type}:${resource1.id}: ${resource1.operation} vs ${resource2.operation}`,
            affectedResources: [`${resource1.type}:${resource1.id}`],
            suggestedResolution: 'Resolve operation conflict or sync resources separately',
          });
        }
      }
    }

    return conflicts;
  }

  private async checkRuleViolation(
    rule: DependencyRule,
    resourceType: ResourceType,
    resourceId: string,
    _operation: 'create' | 'update' | 'delete',
  ): Promise<DependencyViolation | null> {
    // Check if the rule applies to this operation
    if (rule.sourceResource !== resourceType) {
      return null;
    }

    // For 'requires' dependency, check if target resource exists
    if (rule.dependencyType === 'requires') {
      const targetResources = this.resourceRegistry.get(rule.targetResource);
      if (!targetResources || targetResources.size === 0) {
        return {
          id: `violation_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          ruleId: rule.id,
          sourceResource: resourceType,
          sourceId: resourceId,
          targetResource: rule.targetResource,
          targetId: 'any',
          violationType: 'missing_dependency',
          severity: 'error',
          timestamp: Date.now(),
        };
      }
    }

    return null;
  }

  private async findAffectedResources(
    rule: DependencyRule,
    resourceType: ResourceType,
    _resourceId: string,
  ): Promise<Array<{ type: ResourceType; id: string }>> {
    const affected: Array<{ type: ResourceType; id: string }> = [];

    if (rule.sourceResource === resourceType) {
      // Find target resources that would be affected
      const targetResources = this.resourceRegistry.get(rule.targetResource);
      if (targetResources) {
        for (const targetId of targetResources) {
          affected.push({ type: rule.targetResource, id: targetId });
        }
      }
    }

    return affected;
  }

  private calculateSyncPriority(resourceType: ResourceType): number {
    // Priority mapping based on business importance
    const priorities: Record<ResourceType, number> = {
      'merchants': 100,     // Highest priority - core business entity
      'cashiers': 90,       // High priority - user management
      'point-of-sales': 80, // Important - physical locations
      'cash-registers': 70, // Medium priority - equipment
      'pems': 60,          // Lower priority - specialized equipment
      'receipts': 50,      // Lowest priority - transactional data
    };

    return priorities[resourceType] || 50;
  }

  private estimateResourceSyncDuration(resourceType: ResourceType): number {
    // Estimated sync duration in milliseconds based on resource complexity
    const durations: Record<ResourceType, number> = {
      'merchants': 2000,     // 2 seconds - complex business data
      'cashiers': 1500,      // 1.5 seconds - user data with permissions
      'point-of-sales': 1000, // 1 second - location and config data
      'cash-registers': 800,  // 0.8 seconds - equipment configuration
      'pems': 600,           // 0.6 seconds - device data
      'receipts': 400,       // 0.4 seconds - simple transactional data
    };

    return durations[resourceType] || 1000;
  }

  private async validateRulesForCircularDependencies(): Promise<void> {
    // Create a simple graph of rule relationships
    const ruleGraph = new Map<ResourceType, Set<ResourceType>>();

    for (const rule of this.rules.values()) {
      if (!ruleGraph.has(rule.sourceResource)) {
        ruleGraph.set(rule.sourceResource, new Set());
      }
      ruleGraph.get(rule.sourceResource)!.add(rule.targetResource);
    }

    // Check for cycles using DFS
    const visited = new Set<ResourceType>();
    const recursionStack = new Set<ResourceType>();

    const hasCycle = (node: ResourceType): boolean => {
      if (recursionStack.has(node)) {
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);

      const neighbors = ruleGraph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of ruleGraph.keys()) {
      if (!visited.has(node) && hasCycle(node)) {
        throw new Error(`Circular dependency detected in dependency rules involving ${node}`);
      }
    }
  }

  private generateGraphCacheKey(resources: Array<{ type: ResourceType; id: string }>): string {
    const sortedResources = resources
      .map(r => `${r.type}:${r.id}`)
      .sort()
      .join(',');
    return `graph_${sortedResources}`;
  }

  private generatePlanCacheKey(resources: Array<{ type: ResourceType; id: string; operation: string }>): string {
    const sortedResources = resources
      .map(r => `${r.type}:${r.id}:${r.operation}`)
      .sort()
      .join(',');
    return `plan_${sortedResources}`;
  }

  private invalidateCache(): void {
    this.graphs.clear();
    this.syncPlanCache.clear();
    this.relationshipCache.clear();
  }

  private invalidateCacheForResource(resourceType: ResourceType, resourceId: string): void {
    const resourceKey = `${resourceType}:${resourceId}`;

    // Remove cache entries that involve this resource
    for (const [key, _] of this.graphs.entries()) {
      if (key.includes(resourceKey)) {
        this.graphs.delete(key);
      }
    }

    for (const [key, _] of this.syncPlanCache.entries()) {
      if (key.includes(resourceKey)) {
        this.syncPlanCache.delete(key);
      }
    }
  }
}

/**
 * Create dependency manager with default configuration
 */
export function createDependencyManager(
  config: Partial<DependencyManagerConfig> = {},
): DependencyManager {
  return new DependencyManager(config);
}
