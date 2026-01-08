/**
 * Role and Permission Management System
 *
 * This module provides type-safe role management with hierarchical permissions
 * and context-based authorization for the ACube E-Receipt system.
 */

// Base role definitions
export type BaseRole = 'ROLE_SUPPLIER' | 'ROLE_CASHIER' | 'ROLE_MERCHANT';

// Context definitions
export type RoleContext = 'ereceipts-it.acubeapi.com';

// Role hierarchy mapping
export type RoleHierarchy = Record<BaseRole, BaseRole[]>;

// User roles structure
export type UserRoles = Partial<Record<RoleContext, BaseRole[]>>;

/**
 * Role hierarchy definition based on your system
 * Each role inherits permissions from roles listed in its array
 */
export const ROLE_HIERARCHY: RoleHierarchy = {
  ROLE_SUPPLIER: [],
  ROLE_CASHIER: [],
  ROLE_MERCHANT: ['ROLE_CASHIER'],
};

/**
 * Default context for e-receipt operations
 */
export const DEFAULT_CONTEXT: RoleContext = 'ereceipts-it.acubeapi.com';

/**
 * Role permission levels (ascending order)
 */
export enum RoleLevel {
  SUPPLIER = 1,
  CASHIER = 2,
  MERCHANT = 3,
}

/**
 * Map roles to their permission levels
 */
export const ROLE_LEVELS: Record<BaseRole, RoleLevel> = {
  ROLE_SUPPLIER: RoleLevel.SUPPLIER,
  ROLE_CASHIER: RoleLevel.CASHIER,
  ROLE_MERCHANT: RoleLevel.MERCHANT,
};

/**
 * Get all roles that a user has (including inherited roles)
 * @param userRoles - User's role assignments by context
 * @param context - Context to check roles for
 * @returns Array of all effective roles (direct + inherited)
 */
export function getEffectiveRoles(
  userRoles: UserRoles,
  context: RoleContext = DEFAULT_CONTEXT
): BaseRole[] {
  const directRoles = userRoles[context] || [];
  const effectiveRoles = new Set<BaseRole>();

  // Add direct roles
  directRoles.forEach((role) => effectiveRoles.add(role));

  // Add inherited roles
  directRoles.forEach((role) => {
    const inheritedRoles = getInheritedRoles(role);
    inheritedRoles.forEach((inheritedRole) => effectiveRoles.add(inheritedRole));
  });

  return Array.from(effectiveRoles);
}

/**
 * Get all roles inherited from a specific role
 * @param role - Role to get inheritance for
 * @returns Array of inherited roles
 */
export function getInheritedRoles(role: BaseRole): BaseRole[] {
  const inherited = new Set<BaseRole>();
  const toProcess = [role];

  while (toProcess.length > 0) {
    const currentRole = toProcess.pop()!;
    const childRoles = ROLE_HIERARCHY[currentRole] || [];

    childRoles.forEach((childRole) => {
      if (!inherited.has(childRole)) {
        inherited.add(childRole);
        toProcess.push(childRole);
      }
    });
  }

  return Array.from(inherited);
}

/**
 * Check if user has a specific role in a context
 * @param userRoles - User's role assignments
 * @param role - Role to check for
 * @param context - Context to check in
 * @returns True if user has the role (direct or inherited)
 */
export function hasRole(
  userRoles: UserRoles,
  role: BaseRole,
  context: RoleContext = DEFAULT_CONTEXT
): boolean {
  const effectiveRoles = getEffectiveRoles(userRoles, context);
  return effectiveRoles.includes(role);
}

/**
 * Check if user has any of the specified roles
 * @param userRoles - User's role assignments
 * @param roles - Array of roles to check for
 * @param context - Context to check in
 * @returns True if user has any of the roles
 */
export function hasAnyRole(
  userRoles: UserRoles,
  roles: BaseRole[],
  context: RoleContext = DEFAULT_CONTEXT
): boolean {
  return roles.some((role) => hasRole(userRoles, role, context));
}

/**
 * Check if user has all of the specified roles
 * @param userRoles - User's role assignments
 * @param roles - Array of roles to check for
 * @param context - Context to check in
 * @returns True if user has all of the roles
 */
export function hasAllRoles(
  userRoles: UserRoles,
  roles: BaseRole[],
  context: RoleContext = DEFAULT_CONTEXT
): boolean {
  return roles.every((role) => hasRole(userRoles, role, context));
}

/**
 * Check if user has access to a specific context
 * @param userRoles - User's role assignments
 * @param context - Context to check
 * @returns True if user has any roles in the context
 */
export function hasContext(userRoles: UserRoles, context: RoleContext): boolean {
  return context in userRoles && !!userRoles[context] && userRoles[context].length > 0;
}

/**
 * Get all contexts that a user has access to
 * @param userRoles - User's role assignments
 * @returns Array of contexts the user has access to
 */
export function getUserContexts(userRoles: UserRoles): RoleContext[] {
  const contexts: RoleContext[] = [];
  if (
    DEFAULT_CONTEXT in userRoles &&
    userRoles[DEFAULT_CONTEXT] &&
    userRoles[DEFAULT_CONTEXT]!.length > 0
  ) {
    contexts.push(DEFAULT_CONTEXT);
  }
  return contexts;
}

/**
 * Check if user has minimum role level in a context
 * @param userRoles - User's role assignments
 * @param minimumLevel - Minimum role level required
 * @param context - Context to check in
 * @returns True if user has at least the minimum role level
 */
export function hasMinimumRoleLevel(
  userRoles: UserRoles,
  minimumLevel: RoleLevel,
  context: RoleContext = DEFAULT_CONTEXT
): boolean {
  const effectiveRoles = getEffectiveRoles(userRoles, context);
  const userLevels = effectiveRoles.map((role) => ROLE_LEVELS[role]);
  const maxUserLevel = Math.max(...userLevels, 0);

  return maxUserLevel >= minimumLevel;
}

/**
 * Get the highest role level for a user in a context
 * @param userRoles - User's role assignments
 * @param context - Context to check in
 * @returns Highest role level or null if no roles
 */
export function getHighestRoleLevel(
  userRoles: UserRoles,
  context: RoleContext = DEFAULT_CONTEXT
): RoleLevel | null {
  const effectiveRoles = getEffectiveRoles(userRoles, context);

  if (effectiveRoles.length === 0) {
    return null;
  }

  const userLevels = effectiveRoles.map((role) => ROLE_LEVELS[role]);
  return Math.max(...userLevels) as RoleLevel;
}

/**
 * Check if user can perform an action that requires specific roles
 * @param userRoles - User's role assignments
 * @param requiredRoles - Roles required for the action
 * @param context - Context for the action
 * @param requireAll - Whether all roles are required (default: false - any role)
 * @returns True if user can perform the action
 */
export function canPerformAction(
  userRoles: UserRoles,
  requiredRoles: BaseRole[],
  context: RoleContext = DEFAULT_CONTEXT,
  requireAll: boolean = false
): boolean {
  if (requireAll) {
    return hasAllRoles(userRoles, requiredRoles, context);
  }
  return hasAnyRole(userRoles, requiredRoles, context);
}

/**
 * Create a role checker function for a specific context
 * @param context - Context to create checker for
 * @returns Function that checks roles in the specified context
 */
export function createContextRoleChecker(context: RoleContext) {
  return {
    hasRole: (userRoles: UserRoles, role: BaseRole) => hasRole(userRoles, role, context),

    hasAnyRole: (userRoles: UserRoles, roles: BaseRole[]) => hasAnyRole(userRoles, roles, context),

    hasAllRoles: (userRoles: UserRoles, roles: BaseRole[]) =>
      hasAllRoles(userRoles, roles, context),

    hasMinimumLevel: (userRoles: UserRoles, level: RoleLevel) =>
      hasMinimumRoleLevel(userRoles, level, context),

    canPerformAction: (userRoles: UserRoles, requiredRoles: BaseRole[], requireAll?: boolean) =>
      canPerformAction(userRoles, requiredRoles, context, requireAll),
  };
}

/**
 * Role-based authorization decorator for methods
 */
export function requiresRole(roles: BaseRole[], context: RoleContext = DEFAULT_CONTEXT) {
  return function (_target: object, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      // Assume first parameter contains user roles or user object
      const firstArg = args[0] as { roles?: UserRoles } | UserRoles | undefined;
      const userRoles = (firstArg && 'roles' in firstArg ? firstArg.roles : firstArg) as
        | UserRoles
        | undefined;

      if (!userRoles || !hasAnyRole(userRoles, roles, context)) {
        throw new Error(
          `Access denied. Required roles: ${roles.join(', ')} in context: ${context}`
        );
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Utility type for components that need role checking
 */
export interface RoleAware {
  roles: UserRoles;
}

/**
 * Type guard to check if an object has role information
 */
export function hasRoleInformation(obj: unknown): obj is RoleAware {
  return Boolean(obj && typeof obj === 'object' && 'roles' in obj);
}

/**
 * Parse roles from the legacy format to the new structured format
 * @param legacyRoles - Roles in Record<string, string[]> format
 * @returns Roles in UserRoles format
 */
export function parseLegacyRoles(legacyRoles: Record<string, string[]>): UserRoles {
  const userRoles: UserRoles = {};

  // Only process the default context
  if (DEFAULT_CONTEXT in legacyRoles) {
    userRoles[DEFAULT_CONTEXT] = legacyRoles[DEFAULT_CONTEXT].filter((role): role is BaseRole =>
      Object.keys(ROLE_HIERARCHY).includes(role)
    );
  }

  return userRoles;
}

/**
 * Convert UserRoles back to legacy format for API compatibility
 * @param userRoles - Roles in UserRoles format
 * @returns Roles in Record<string, string[]> format
 */
export function toLegacyRoles(userRoles: UserRoles): Record<string, string[]> {
  const legacyRoles: Record<string, string[]> = {};

  Object.entries(userRoles).forEach(([context, roles]) => {
    legacyRoles[context] = roles;
  });

  return legacyRoles;
}

/**
 * Default role checker for the e-receipts context
 */
export const ERoleChecker = createContextRoleChecker(DEFAULT_CONTEXT);

/**
 * Common role combinations for quick checking
 */
export const RoleGroups = {
  CASHIER_ROLES: ['ROLE_CASHIER', 'ROLE_MERCHANT'] as BaseRole[],
  ALL_ROLES: Object.keys(ROLE_HIERARCHY) as BaseRole[],
} as const;
