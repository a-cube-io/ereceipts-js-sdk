/**
 * Access Control Manager for A-Cube SDK
 * Provides comprehensive role-based access control (RBAC) and attribute-based access control (ABAC)
 */

export interface AccessControlConfig {
  enabled: boolean;
  model: 'RBAC' | 'ABAC' | 'HYBRID';
  session: {
    timeout: number; // milliseconds
    maxConcurrentSessions: number;
    requireReauth: boolean;
  };
  audit: {
    logAllAccess: boolean;
    logFailedAttempts: boolean;
    retentionPeriod: number;
  };
  enforcement: {
    strictMode: boolean;
    allowEscalation: boolean;
    requireApproval: string[]; // Actions requiring approval
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Role IDs to inherit from
  conditions?: AccessCondition[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    isSystem: boolean;
  };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions?: AccessCondition[];
  scope?: {
    global?: boolean;
    organizations?: string[];
    locations?: string[];
    resources?: string[];
  };
}

export interface AccessCondition {
  type: 'time' | 'location' | 'device' | 'attribute' | 'context';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  attribute: string;
  value: any;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[]; // Role IDs
  attributes: Record<string, any>;
  status: 'active' | 'inactive' | 'suspended' | 'locked';
  lastLogin?: number;
  failedAttempts: number;
  lockoutUntil?: number;
  sessions: UserSession[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    department?: string;
    location?: string;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  startedAt: number;
  lastActivity: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  location?: string;
  status: 'active' | 'expired' | 'terminated';
  permissions: Permission[]; // Cached permissions for this session
}

export interface AccessRequest {
  id: string;
  userId: string;
  sessionId: string;
  resource: string;
  action: string;
  context: AccessContext;
  timestamp: number;
  result: 'granted' | 'denied' | 'pending';
  reason?: string;
  approvalRequired?: boolean;
  approvedBy?: string;
  approvedAt?: number;
}

export interface AccessContext {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  location?: string;
  timestamp: number;
  requestId?: string;
  attributes?: Record<string, any>;
}

export interface AccessAuditEntry {
  id: string;
  userId: string;
  sessionId?: string;
  action: 'login' | 'logout' | 'access_granted' | 'access_denied' | 'permission_changed' | 'role_assigned' | 'role_revoked';
  resource?: string;
  timestamp: number;
  context: AccessContext;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class AccessControlManager {
  private config: AccessControlConfig;
  private users = new Map<string, User>();
  private roles = new Map<string, Role>();
  private sessions = new Map<string, UserSession>();
  private accessRequests = new Map<string, AccessRequest>();
  private auditLog: AccessAuditEntry[] = [];
  private permissionCache = new Map<string, { permissions: Permission[]; expiresAt: number }>();

  constructor(config?: Partial<AccessControlConfig>) {
    this.config = {
      enabled: true,
      model: 'HYBRID',
      session: {
        timeout: 8 * 60 * 60 * 1000, // 8 hours
        maxConcurrentSessions: 3,
        requireReauth: false,
      },
      audit: {
        logAllAccess: true,
        logFailedAttempts: true,
        retentionPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
      },
      enforcement: {
        strictMode: true,
        allowEscalation: false,
        requireApproval: ['delete_user', 'modify_permissions', 'export_data'],
      },
      ...config,
    };

    if (this.config.enabled) {
      this.initializeDefaultRoles();
      this.startSessionCleanup();
    }
  }

  /**
   * Create a new user
   */
  async createUser(
    userData: Omit<User, 'id' | 'sessions' | 'failedAttempts' | 'metadata'>,
    createdBy: string
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Access control is disabled');
    }

    const userId = this.generateUserId();
    const now = Date.now();

    const user: User = {
      id: userId,
      sessions: [],
      failedAttempts: 0,
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy,
      },
      ...userData,
    };

    this.users.set(userId, user);

    this.auditAccess({
      userId: createdBy,
      action: 'permission_changed',
      details: {
        targetUserId: userId,
        operation: 'create_user',
        roles: userData.roles,
      },
      context: { timestamp: now },
      timestamp: now,
      riskLevel: 'medium',
    });

    return userId;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (!user.roles.includes(roleId)) {
      user.roles.push(roleId);
      user.metadata.updatedAt = Date.now();

      // Clear permission cache for this user
      this.clearUserPermissionCache(userId);

      this.auditAccess({
        userId: assignedBy,
        action: 'role_assigned',
        details: {
          targetUserId: userId,
          roleId,
          roleName: role.name,
        },
        context: { timestamp: Date.now() },
        timestamp: Date.now(),
        riskLevel: 'medium',
      });
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string, revokedBy: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const roleIndex = user.roles.indexOf(roleId);
    if (roleIndex > -1) {
      user.roles.splice(roleIndex, 1);
      user.metadata.updatedAt = Date.now();

      // Clear permission cache for this user
      this.clearUserPermissionCache(userId);

      const role = this.roles.get(roleId);
      this.auditAccess({
        userId: revokedBy,
        action: 'role_revoked',
        details: {
          targetUserId: userId,
          roleId,
          roleName: role?.name || 'Unknown',
        },
        context: { timestamp: Date.now() },
        timestamp: Date.now(),
        riskLevel: 'medium',
      });
    }
  }

  /**
   * Create a new role
   */
  async createRole(
    roleData: Omit<Role, 'id' | 'metadata'>,
    createdBy: string
  ): Promise<string> {
    const roleId = this.generateRoleId();
    const now = Date.now();

    const role: Role = {
      id: roleId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy,
        isSystem: false,
      },
      ...roleData,
    };

    this.roles.set(roleId, role);

    this.auditAccess({
      userId: createdBy,
      action: 'permission_changed',
      details: {
        operation: 'create_role',
        roleId,
        roleName: role.name,
        permissions: role.permissions.length,
      },
      context: { timestamp: now },
      timestamp: now,
      riskLevel: 'high',
    });

    return roleId;
  }

  /**
   * Authenticate user and create session
   */
  async authenticate(
    userId: string,
    context: AccessContext
  ): Promise<{ sessionId: string; permissions: Permission[] }> {
    const user = this.users.get(userId);
    if (!user) {
      this.auditAccess({
        userId,
        action: 'access_denied',
        details: { reason: 'user_not_found' },
        context,
        timestamp: Date.now(),
        riskLevel: 'high',
      });
      throw new Error('Authentication failed');
    }

    if (user.status !== 'active') {
      this.auditAccess({
        userId,
        action: 'access_denied',
        details: { reason: 'user_inactive', status: user.status },
        context,
        timestamp: Date.now(),
        riskLevel: 'high',
      });
      throw new Error(`User account is ${user.status}`);
    }

    // Check for account lockout
    if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
      this.auditAccess({
        userId,
        action: 'access_denied',
        details: { reason: 'account_locked', lockoutUntil: user.lockoutUntil },
        context,
        timestamp: Date.now(),
        riskLevel: 'high',
      });
      throw new Error('Account is locked');
    }

    // Check concurrent session limit
    const activeSessions = user.sessions.filter(s => s.status === 'active');
    if (activeSessions.length >= this.config.session.maxConcurrentSessions) {
      // Terminate oldest session
      const oldestSession = activeSessions.sort((a, b) => a.startedAt - b.startedAt)[0];
      if (oldestSession) {
        await this.terminateSession(oldestSession.id);
      }
    }

    // Create new session
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const permissions = await this.getUserPermissions(userId);

    const session: UserSession = {
      id: sessionId,
      userId,
      startedAt: now,
      lastActivity: now,
      expiresAt: now + this.config.session.timeout,
      ...(context.ipAddress && { ipAddress: context.ipAddress }),
      ...(context.userAgent && { userAgent: context.userAgent }),
      ...(context.deviceId && { deviceId: context.deviceId }),
      ...(context.location && { location: context.location }),
      status: 'active',
      permissions,
    };

    user.sessions.push(session);
    user.lastLogin = now;
    user.failedAttempts = 0; // Reset failed attempts on successful login
    this.sessions.set(sessionId, session);

    this.auditAccess({
      userId,
      sessionId,
      action: 'login',
      details: {
        sessionId,
        permissions: permissions.length,
        concurrentSessions: user.sessions.filter(s => s.status === 'active').length,
      },
      context,
      timestamp: now,
      riskLevel: 'low',
    });

    return { sessionId, permissions };
  }

  /**
   * Check if user has permission to perform action on resource
   */
  async checkAccess(
    sessionId: string,
    resource: string,
    action: string,
    context: AccessContext
  ): Promise<{ granted: boolean; reason?: string; requiresApproval?: boolean }> {
    if (!this.config.enabled) {
      return { granted: true };
    }

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      this.auditAccess({
        userId: 'unknown',
        sessionId,
        action: 'access_denied',
        resource,
        details: { 
          reason: 'invalid_session',
          requestedAction: action,
        },
        context,
        timestamp: Date.now(),
        riskLevel: 'high',
      });
      return { granted: false, reason: 'Invalid or expired session' };
    }

    // Check session expiry
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      this.auditAccess({
        userId: session.userId,
        sessionId,
        action: 'access_denied',
        resource,
        details: { 
          reason: 'session_expired',
          requestedAction: action,
        },
        context,
        timestamp: Date.now(),
        riskLevel: 'medium',
      });
      return { granted: false, reason: 'Session expired' };
    }

    // Update last activity
    session.lastActivity = Date.now();

    const user = this.users.get(session.userId);
    if (!user) {
      return { granted: false, reason: 'User not found' };
    }

    // Check if action requires approval
    const requiresApproval = this.config.enforcement.requireApproval.includes(action);

    // Evaluate permissions
    const result = await this.evaluatePermissions(
      session.permissions,
      resource,
      action,
      user,
      context
    );

    // Create access request record
    const requestId = this.generateRequestId();
    const accessRequest: AccessRequest = {
      id: requestId,
      userId: session.userId,
      sessionId,
      resource,
      action,
      context,
      timestamp: Date.now(),
      result: result.granted ? 'granted' : 'denied',
      ...(result.reason && { reason: result.reason }),
      approvalRequired: requiresApproval && result.granted,
    };

    this.accessRequests.set(requestId, accessRequest);

    // Audit the access attempt
    this.auditAccess({
      userId: session.userId,
      sessionId,
      action: result.granted ? 'access_granted' : 'access_denied',
      resource,
      details: {
        requestedAction: action,
        reason: result.reason,
        requiresApproval,
        requestId,
      },
      context,
      timestamp: Date.now(),
      riskLevel: result.granted ? 'low' : 'medium',
    });

    return {
      granted: result.granted,
      ...(result.reason && { reason: result.reason }),
      ...(requiresApproval && result.granted && { requiresApproval: true }),
    };
  }

  /**
   * Approve pending access request
   */
  async approveAccess(
    requestId: string,
    approvedBy: string,
    context: AccessContext
  ): Promise<void> {
    const request = this.accessRequests.get(requestId);
    if (!request) {
      throw new Error(`Access request not found: ${requestId}`);
    }

    if (!request.approvalRequired) {
      throw new Error('Access request does not require approval');
    }

    request.result = 'granted';
    request.approvedBy = approvedBy;
    request.approvedAt = Date.now();

    this.auditAccess({
      userId: approvedBy,
      action: 'access_granted',
      resource: request.resource,
      details: {
        requestId,
        targetUserId: request.userId,
        approvedAction: request.action,
      },
      context,
      timestamp: Date.now(),
      riskLevel: 'medium',
    });
  }

  /**
   * Terminate user session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'terminated';
    this.sessions.delete(sessionId);

    // Update user's session list
    const user = this.users.get(session.userId);
    if (user) {
      const sessionIndex = user.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex > -1) {
        const userSession = user.sessions[sessionIndex];
        if (userSession) {
          userSession.status = 'terminated';
        }
      }
    }

    this.auditAccess({
      userId: session.userId,
      sessionId,
      action: 'logout',
      details: {
        sessionId,
        duration: Date.now() - session.startedAt,
      },
      context: { timestamp: Date.now() },
      timestamp: Date.now(),
      riskLevel: 'low',
    });
  }

  /**
   * Get user permissions (with caching)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const cacheKey = `user_${userId}`;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.permissions;
    }

    const user = this.users.get(userId);
    if (!user) return [];

    const permissions: Permission[] = [];
    const processedRoles = new Set<string>();

    // Recursively process roles and their inheritance
    const processRole = (roleId: string) => {
      if (processedRoles.has(roleId)) return;
      processedRoles.add(roleId);

      const role = this.roles.get(roleId);
      if (!role) return;

      // Add role permissions
      permissions.push(...role.permissions);

      // Process inherited roles
      if (role.inherits) {
        for (const inheritedRoleId of role.inherits) {
          processRole(inheritedRoleId);
        }
      }
    };

    // Process all user roles
    for (const roleId of user.roles) {
      processRole(roleId);
    }

    // Remove duplicates and sort by priority (deny effects first)
    const uniquePermissions = Array.from(
      new Map(permissions.map(p => [`${p.resource}:${p.action}`, p])).values()
    ).sort((a, b) => {
      if (a.effect === 'deny' && b.effect === 'allow') return -1;
      if (a.effect === 'allow' && b.effect === 'deny') return 1;
      return 0;
    });

    // Cache the result
    this.permissionCache.set(cacheKey, {
      permissions: uniquePermissions,
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
    });

    return uniquePermissions;
  }

  /**
   * Get access audit log
   */
  getAuditLog(filter?: {
    userId?: string;
    action?: string;
    resource?: string;
    timeRange?: { start: number; end: number };
    riskLevel?: AccessAuditEntry['riskLevel'];
  }): AccessAuditEntry[] {
    let filteredLog = [...this.auditLog];

    if (filter) {
      if (filter.userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === filter.userId);
      }
      
      if (filter.action) {
        filteredLog = filteredLog.filter(entry => entry.action === filter.action);
      }
      
      if (filter.resource) {
        filteredLog = filteredLog.filter(entry => entry.resource === filter.resource);
      }
      
      if (filter.timeRange) {
        filteredLog = filteredLog.filter(entry => 
          entry.timestamp >= filter.timeRange!.start && 
          entry.timestamp <= filter.timeRange!.end
        );
      }
      
      if (filter.riskLevel) {
        filteredLog = filteredLog.filter(entry => entry.riskLevel === filter.riskLevel);
      }
    }

    return filteredLog.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get access control statistics
   */
  getAccessControlStats(): {
    users: {
      total: number;
      active: number;
      suspended: number;
      locked: number;
    };
    sessions: {
      active: number;
      total: number;
      averageDuration: number;
    };
    permissions: {
      totalRoles: number;
      totalPermissions: number;
      averagePermissionsPerUser: number;
    };
    audit: {
      totalEntries: number;
      failedAttempts: number;
      highRiskEvents: number;
    };
  } {
    const users = Array.from(this.users.values());
    const sessions = Array.from(this.sessions.values());
    const roles = Array.from(this.roles.values());

    const activeUsers = users.filter(u => u.status === 'active').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    const lockedUsers = users.filter(u => u.lockoutUntil && Date.now() < u.lockoutUntil).length;

    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const averageSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (Date.now() - s.startedAt), 0) / sessions.length
      : 0;

    const totalPermissions = roles.reduce((sum, r) => sum + r.permissions.length, 0);
    const averagePermissionsPerUser = users.length > 0
      ? users.reduce((sum, u) => sum + u.roles.length, 0) / users.length
      : 0;

    const failedAttempts = this.auditLog.filter(e => e.action === 'access_denied').length;
    const highRiskEvents = this.auditLog.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical').length;

    return {
      users: {
        total: users.length,
        active: activeUsers,
        suspended: suspendedUsers,
        locked: lockedUsers,
      },
      sessions: {
        active: activeSessions,
        total: sessions.length,
        averageDuration: averageSessionDuration,
      },
      permissions: {
        totalRoles: roles.length,
        totalPermissions,
        averagePermissionsPerUser,
      },
      audit: {
        totalEntries: this.auditLog.length,
        failedAttempts,
        highRiskEvents,
      },
    };
  }

  private async evaluatePermissions(
    permissions: Permission[],
    resource: string,
    action: string,
    user: User,
    context: AccessContext
  ): Promise<{ granted: boolean; reason?: string }> {
    // Find applicable permissions
    const applicablePermissions = permissions.filter(p => 
      this.matchesResource(p.resource, resource) && 
      this.matchesAction(p.action, action)
    );

    if (applicablePermissions.length === 0) {
      return { granted: false, reason: 'No applicable permissions found' };
    }

    // Evaluate conditions for each permission
    for (const permission of applicablePermissions) {
      const conditionsMet = await this.evaluateConditions(
        permission.conditions || [],
        user,
        context
      );

      if (conditionsMet) {
        if (permission.effect === 'deny') {
          return { granted: false, reason: 'Explicitly denied by permission rule' };
        } else if (permission.effect === 'allow') {
          // Check scope if defined
          if (permission.scope && !this.checkScope(permission.scope, user, context)) {
            continue; // Skip this permission, check next
          }
          return { granted: true };
        }
      }
    }

    return { granted: false, reason: 'No matching allow permissions with satisfied conditions' };
  }

  private async evaluateConditions(
    conditions: AccessCondition[],
    user: User,
    context: AccessContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, user, context)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: AccessCondition,
    user: User,
    context: AccessContext
  ): Promise<boolean> {
    let actualValue: any;

    // Get the actual value based on condition type
    switch (condition.type) {
      case 'time':
        actualValue = new Date(context.timestamp).getHours();
        break;
      case 'location':
        actualValue = context.location || user.metadata.location;
        break;
      case 'device':
        actualValue = context.deviceId;
        break;
      case 'attribute':
        actualValue = user.attributes[condition.attribute];
        break;
      case 'context':
        actualValue = context.attributes?.[condition.attribute];
        break;
      default:
        return false;
    }

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;
      case 'not_equals':
        return actualValue !== condition.value;
      case 'contains':
        return String(actualValue).includes(String(condition.value));
      case 'not_contains':
        return !String(actualValue).includes(String(condition.value));
      case 'greater_than':
        return actualValue > condition.value;
      case 'less_than':
        return actualValue < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(actualValue);
      default:
        return false;
    }
  }

  private checkScope(
    scope: Permission['scope'],
    user: User,
    context: AccessContext
  ): boolean {
    if (!scope) return true;

    if (scope.global) return true;

    if (scope.organizations && user.metadata.department) {
      return scope.organizations.includes(user.metadata.department);
    }

    if (scope.locations && (context.location || user.metadata.location)) {
      const userLocation = context.location || user.metadata.location;
      return scope.locations.includes(userLocation!);
    }

    return true;
  }

  private matchesResource(permissionResource: string, requestedResource: string): boolean {
    // Support wildcards
    if (permissionResource === '*') return true;
    if (permissionResource.endsWith('*')) {
      const prefix = permissionResource.slice(0, -1);
      return requestedResource.startsWith(prefix);
    }
    return permissionResource === requestedResource;
  }

  private matchesAction(permissionAction: string, requestedAction: string): boolean {
    // Support wildcards
    if (permissionAction === '*') return true;
    if (permissionAction.endsWith('*')) {
      const prefix = permissionAction.slice(0, -1);
      return requestedAction.startsWith(prefix);
    }
    return permissionAction === requestedAction;
  }

  private initializeDefaultRoles(): void {
    // System Administrator
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        {
          id: 'admin_all',
          resource: '*',
          action: '*',
          effect: 'allow',
        },
      ],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        isSystem: true,
      },
    });

    // Merchant Role
    this.roles.set('merchant', {
      id: 'merchant',
      name: 'Merchant',
      description: 'Merchant operations access',
      permissions: [
        {
          id: 'merchant_receipts',
          resource: 'receipts',
          action: '*',
          effect: 'allow',
        },
        {
          id: 'merchant_reports',
          resource: 'reports',
          action: 'read',
          effect: 'allow',
        },
      ],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        isSystem: true,
      },
    });

    // Cashier Role
    this.roles.set('cashier', {
      id: 'cashier',
      name: 'Cashier',
      description: 'Point of sale operations',
      permissions: [
        {
          id: 'cashier_receipts',
          resource: 'receipts',
          action: 'create',
          effect: 'allow',
        },
        {
          id: 'cashier_receipts_read',
          resource: 'receipts',
          action: 'read',
          effect: 'allow',
          scope: {
            global: false,
          },
        },
      ],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        isSystem: true,
      },
    });
  }

  private clearUserPermissionCache(userId: string): void {
    const cacheKey = `user_${userId}`;
    this.permissionCache.delete(cacheKey);
  }

  private auditAccess(entry: Omit<AccessAuditEntry, 'id'>): void {
    const auditEntry: AccessAuditEntry = {
      id: this.generateAuditId(),
      ...entry,
    };

    this.auditLog.push(auditEntry);

    // Keep only recent entries
    const maxEntries = 10000;
    if (this.auditLog.length > maxEntries) {
      this.auditLog = this.auditLog.slice(-maxEntries);
    }
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up expired sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt <= now) {
          session.status = 'expired';
          this.sessions.delete(sessionId);
        }
      }

      // Clean up old audit entries
      const retentionCutoff = now - this.config.audit.retentionPeriod;
      this.auditLog = this.auditLog.filter(entry => entry.timestamp > retentionCutoff);
      
    }, 60 * 60 * 1000); // Every hour
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateRoleId(): string {
    return `role_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}