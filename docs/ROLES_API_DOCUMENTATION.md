# Role Management System - API Documentation

## Overview

The ACube E-Receipt SDK includes a comprehensive role management system that provides type-safe, hierarchical permission management with context-based authorization. This system enables fine-grained access control for different user roles within the e-receipt ecosystem.

## Table of Contents

1. [Role System Architecture](#role-system-architecture)
2. [Core Types and Interfaces](#core-types-and-interfaces)
3. [Role Hierarchy](#role-hierarchy)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Integration Patterns](#integration-patterns)
7. [Best Practices](#best-practices)
8. [Migration Guide](#migration-guide)

## Role System Architecture

### Core Concepts

- **Roles**: Defined permissions that users can have (ROLE_SUPPLIER, ROLE_CACHIER, ROLE_MERCHANT)
- **Contexts**: Different environments or systems where roles apply (e.g., 'ereceipts-it.acubeapi.com')
- **Inheritance**: Higher-level roles automatically inherit permissions from lower-level roles
- **Type Safety**: Full TypeScript support for compile-time role validation

### System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ROLE_SUPPLIER │    │   ROLE_CACHIER  │    │  ROLE_MERCHANT  │
│   (Level 1)     │    │   (Level 2)     │    │   (Level 3)     │
│                 │    │                 │    │        │        │
│   - Basic ops   │    │   - Cash ops    │    │   - Management  │
│   - View data   │    │   - Receipts    │    │   - All cash    │
│                 │    │                 │    │   - Void/refund │
└─────────────────┘    └─────────────────┘    └─────┬───────────┘
                                                     │
                                           ┌─────────▼───────────┐
                                           │    Inherits from    │
                                           │   ROLE_CACHIER      │
                                           └─────────────────────┘
```

## Core Types and Interfaces

### BaseRole

Defines the available roles in the system:

```typescript
export type BaseRole = 
  | 'ROLE_SUPPLIER'
  | 'ROLE_CACHIER'
  | 'ROLE_MERCHANT';
```

### RoleContext

Represents different contexts where roles can be applied:

```typescript
export type RoleContext = string;

// Default context for e-receipt operations
export const DEFAULT_CONTEXT: RoleContext = 'ereceipts-it.acubeapi.com';
```

### UserRoles

Main interface for user role assignments:

```typescript
export type UserRoles = Record<RoleContext, BaseRole[]>;

// Example:
const userRoles: UserRoles = {
  'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT', 'ROLE_SUPPLIER'],
  'another-system.com': ['ROLE_CACHIER']
};
```

### RoleLevel

Enumeration defining permission levels:

```typescript
export enum RoleLevel {
  SUPPLIER = 1,
  CACHIER = 2,
  MERCHANT = 3,
}
```

## Role Hierarchy

### Inheritance Rules

The role system follows a hierarchical structure where higher roles inherit permissions from lower roles:

```typescript
export const ROLE_HIERARCHY: RoleHierarchy = {
  ROLE_SUPPLIER: [],                    // No inheritance
  ROLE_CACHIER: [],                     // No inheritance
  ROLE_MERCHANT: ['ROLE_CACHIER'],      // Inherits ROLE_CACHIER
};
```

### Permission Levels

| Role | Level | Permissions | Inherits From |
|------|-------|-------------|---------------|
| ROLE_SUPPLIER | 1 | Basic operations, view data | None |
| ROLE_CACHIER | 2 | Cash operations, receipt management | None |
| ROLE_MERCHANT | 3 | Store management, all cash operations | ROLE_CACHIER |

## API Reference

### Core Functions

#### hasRole(userRoles, role, context?)

Checks if a user has a specific role in a given context.

```typescript
function hasRole(
  userRoles: UserRoles,
  role: BaseRole,
  context?: RoleContext
): boolean
```

**Parameters:**
- `userRoles`: User's role assignments
- `role`: Role to check for
- `context`: Context to check in (defaults to DEFAULT_CONTEXT)

**Returns:** `true` if user has the role (direct or inherited)

**Example:**
```typescript
const userRoles: UserRoles = {
  'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT']
};

hasRole(userRoles, 'ROLE_MERCHANT'); // true
hasRole(userRoles, 'ROLE_CACHIER');  // true (inherited)
hasRole(userRoles, 'ROLE_SUPPLIER'); // false
```

#### hasAnyRole(userRoles, roles, context?)

Checks if a user has any of the specified roles.

```typescript
function hasAnyRole(
  userRoles: UserRoles,
  roles: BaseRole[],
  context?: RoleContext
): boolean
```

**Example:**
```typescript
hasAnyRole(userRoles, ['ROLE_SUPPLIER', 'ROLE_MERCHANT']); // true
hasAnyRole(userRoles, ['ROLE_SUPPLIER']); // false
```

#### hasAllRoles(userRoles, roles, context?)

Checks if a user has all of the specified roles.

```typescript
function hasAllRoles(
  userRoles: UserRoles,
  roles: BaseRole[],
  context?: RoleContext
): boolean
```

**Example:**
```typescript
const multiRoleUser: UserRoles = {
  'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT', 'ROLE_SUPPLIER']
};

hasAllRoles(multiRoleUser, ['ROLE_MERCHANT', 'ROLE_SUPPLIER']); // true
hasAllRoles(multiRoleUser, ['ROLE_MERCHANT', 'ROLE_CACHIER']);  // true (inherited)
```

#### hasContext(userRoles, context)

Checks if a user has access to a specific context.

```typescript
function hasContext(
  userRoles: UserRoles,
  context: RoleContext
): boolean
```

#### getUserContexts(userRoles)

Gets all contexts that a user has access to.

```typescript
function getUserContexts(userRoles: UserRoles): RoleContext[]
```

#### hasMinimumRoleLevel(userRoles, minimumLevel, context?)

Checks if a user has at least the minimum role level.

```typescript
function hasMinimumRoleLevel(
  userRoles: UserRoles,
  minimumLevel: RoleLevel,
  context?: RoleContext
): boolean
```

**Example:**
```typescript
hasMinimumRoleLevel(userRoles, RoleLevel.CACHIER); // true (merchant >= cashier)
hasMinimumRoleLevel(userRoles, RoleLevel.SUPPLIER); // true
```

#### getHighestRoleLevel(userRoles, context?)

Gets the highest role level for a user in a context.

```typescript
function getHighestRoleLevel(
  userRoles: UserRoles,
  context?: RoleContext
): RoleLevel | null
```

### Utility Functions

#### getEffectiveRoles(userRoles, context?)

Gets all roles that a user has, including inherited roles.

```typescript
function getEffectiveRoles(
  userRoles: UserRoles,
  context?: RoleContext
): BaseRole[]
```

#### getInheritedRoles(role)

Gets all roles inherited from a specific role.

```typescript
function getInheritedRoles(role: BaseRole): BaseRole[]
```

#### canPerformAction(userRoles, requiredRoles, context?, requireAll?)

Checks if a user can perform an action that requires specific roles.

```typescript
function canPerformAction(
  userRoles: UserRoles,
  requiredRoles: BaseRole[],
  context?: RoleContext,
  requireAll?: boolean
): boolean
```

### Context-Specific Role Checker

#### createContextRoleChecker(context)

Creates a role checker function for a specific context.

```typescript
function createContextRoleChecker(context: RoleContext): {
  hasRole: (userRoles: UserRoles, role: BaseRole) => boolean;
  hasAnyRole: (userRoles: UserRoles, roles: BaseRole[]) => boolean;
  hasAllRoles: (userRoles: UserRoles, roles: BaseRole[]) => boolean;
  hasMinimumLevel: (userRoles: UserRoles, level: RoleLevel) => boolean;
  canPerformAction: (userRoles: UserRoles, requiredRoles: BaseRole[], requireAll?: boolean) => boolean;
}
```

#### ERoleChecker

Default role checker for the e-receipts context.

```typescript
export const ERoleChecker = createContextRoleChecker(DEFAULT_CONTEXT);

// Usage
ERoleChecker.hasRole(userRoles, 'ROLE_MERCHANT'); // true
ERoleChecker.hasAnyRole(userRoles, ['ROLE_CACHIER', 'ROLE_MERCHANT']); // true
```

### Role Groups

Pre-defined role combinations for common use cases:

```typescript
export const RoleGroups = {
  CASHIER_ROLES: ['ROLE_CACHIER', 'ROLE_MERCHANT'] as BaseRole[],
  ALL_ROLES: Object.keys(ROLE_HIERARCHY) as BaseRole[],
} as const;
```

**Usage:**
```typescript
hasAnyRole(userRoles, RoleGroups.CASHIER_ROLES); // Check for any cashier-level role
```

### Legacy Role Conversion

#### parseLegacyRoles(legacyRoles)

Converts roles from legacy format to the new structured format.

```typescript
function parseLegacyRoles(legacyRoles: Record<string, string[]>): UserRoles
```

#### toLegacyRoles(userRoles)

Converts UserRoles back to legacy format for API compatibility.

```typescript
function toLegacyRoles(userRoles: UserRoles): Record<string, string[]>
```

### Decorator

#### @requiresRole(roles, context?)

Method decorator for role-based authorization.

```typescript
function requiresRole(roles: BaseRole[], context?: RoleContext): MethodDecorator
```

**Example:**
```typescript
class ReceiptService {
  @requiresRole(['ROLE_CACHIER'])
  createReceipt(user: User, data: any) {
    // Method implementation
  }
  
  @requiresRole(['ROLE_MERCHANT'])
  voidReceipt(user: User, receiptId: string) {
    // Method implementation
  }
}
```

## Usage Examples

### Basic Role Checking

```typescript
import { hasRole, hasAnyRole, UserRoles } from '@a-cube-io/ereceipts-js-sdk';

const userRoles: UserRoles = {
  'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT']
};

// Check specific role
if (hasRole(userRoles, 'ROLE_MERCHANT')) {
  console.log('User can manage store');
}

// Check inherited role
if (hasRole(userRoles, 'ROLE_CACHIER')) {
  console.log('User can operate cash register');
}

// Check multiple roles
if (hasAnyRole(userRoles, ['ROLE_CACHIER', 'ROLE_MERCHANT'])) {
  console.log('User can handle receipts');
}
```

### Service Authorization

```typescript
import { hasRole, RoleGroups } from '@a-cube-io/ereceipts-js-sdk';

class ReceiptService {
  static createReceipt(user: User, receiptData: any) {
    if (!hasAnyRole(user.roles, RoleGroups.CASHIER_ROLES)) {
      throw new Error('Access denied: Cashier role required');
    }
    
    // Create receipt logic
    console.log(`Creating receipt for user: ${user.email}`);
  }
  
  static voidReceipt(user: User, receiptId: string) {
    if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
      throw new Error('Access denied: Merchant role required');
    }
    
    // Void receipt logic
    console.log(`Voiding receipt ${receiptId}`);
  }
}
```

### UI Component Authorization

```typescript
import { ERoleChecker, RoleGroups, hasMinimumRoleLevel, RoleLevel } from '@a-cube-io/ereceipts-js-sdk';

function getUserPermissions(user: User) {
  return {
    canCreateReceipts: ERoleChecker.hasAnyRole(user.roles, RoleGroups.CASHIER_ROLES),
    canVoidReceipts: ERoleChecker.hasRole(user.roles, 'ROLE_MERCHANT'),
    canViewReports: hasMinimumRoleLevel(user.roles, RoleLevel.MERCHANT),
    canManageUsers: ERoleChecker.hasRole(user.roles, 'ROLE_MERCHANT'),
  };
}

// React component example
function ReceiptActions({ user }: { user: User }) {
  const permissions = getUserPermissions(user);
  
  return (
    <div>
      {permissions.canCreateReceipts && (
        <button>Create Receipt</button>
      )}
      {permissions.canVoidReceipts && (
        <button>Void Receipt</button>
      )}
      {permissions.canViewReports && (
        <button>View Reports</button>
      )}
    </div>
  );
}
```

### API Endpoint Protection

```typescript
import { hasAnyRole, BaseRole } from '@a-cube-io/ereceipts-js-sdk';

function authorizeAPIEndpoint(
  user: User,
  endpoint: string,
  method: string
): boolean {
  const endpointPermissions: Record<string, Record<string, BaseRole[]>> = {
    '/api/receipts': {
      'GET': ['ROLE_CACHIER'],
      'POST': ['ROLE_CACHIER'],
      'PUT': ['ROLE_MERCHANT'],
      'DELETE': ['ROLE_MERCHANT'],
    },
    '/api/reports': {
      'GET': ['ROLE_MERCHANT'],
    },
  };
  
  const permission = endpointPermissions[endpoint];
  if (!permission) return false;
  
  const requiredRoles = permission[method.toUpperCase()];
  if (!requiredRoles) return false;
  
  return hasAnyRole(user.roles, requiredRoles);
}

// Express.js middleware example
function roleMiddleware(endpoint: string, method: string) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    
    if (!authorizeAPIEndpoint(user, endpoint, method)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

### Multi-Context Role Management

```typescript
import { hasRole, getUserContexts } from '@a-cube-io/ereceipts-js-sdk';

const multiContextUser: UserRoles = {
  'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT'],
  'partner-system.com': ['ROLE_CACHIER'],
  'staging.acubeapi.com': ['ROLE_SUPPLIER'],
};

// Check role in specific context
const canManageInProduction = hasRole(
  multiContextUser, 
  'ROLE_MERCHANT', 
  'ereceipts-it.acubeapi.com'
); // true

const canManageInPartner = hasRole(
  multiContextUser, 
  'ROLE_MERCHANT', 
  'partner-system.com'
); // false

// Get all user contexts
const contexts = getUserContexts(multiContextUser);
console.log('User has access to:', contexts);
// ['ereceipts-it.acubeapi.com', 'partner-system.com', 'staging.acubeapi.com']
```

## Integration Patterns

### React Hook Integration

```typescript
import { useAuth } from '@a-cube-io/ereceipts-js-sdk/react';
import { hasRole, hasAnyRole, RoleGroups } from '@a-cube-io/ereceipts-js-sdk';

function useUserPermissions() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return {
    canCreateReceipts: hasAnyRole(user.roles, RoleGroups.CASHIER_ROLES),
    canVoidReceipts: hasRole(user.roles, 'ROLE_MERCHANT'),
    canManageStore: hasRole(user.roles, 'ROLE_MERCHANT'),
    isSupplier: hasRole(user.roles, 'ROLE_SUPPLIER'),
    isCashier: hasRole(user.roles, 'ROLE_CACHIER'),
    isMerchant: hasRole(user.roles, 'ROLE_MERCHANT'),
  };
}
```

### Express.js Integration

```typescript
import { hasRole, hasAnyRole } from '@a-cube-io/ereceipts-js-sdk';

// Middleware factory
function requireRole(roles: BaseRole | BaseRole[], requireAll = false) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const hasPermission = requireAll 
      ? hasAllRoles(user.roles, roleArray)
      : hasAnyRole(user.roles, roleArray);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roleArray,
        has: user.roles 
      });
    }
    
    next();
  };
}

// Usage
app.post('/api/receipts', requireRole('ROLE_CACHIER'), createReceipt);
app.delete('/api/receipts/:id', requireRole('ROLE_MERCHANT'), voidReceipt);
app.get('/api/reports', requireRole(['ROLE_MERCHANT']), generateReport);
```

### Vue.js Integration

```typescript
// Vue 3 Composition API
import { computed } from 'vue';
import { useAuth } from '@a-cube-io/ereceipts-js-sdk/vue';
import { hasRole, hasAnyRole, RoleGroups } from '@a-cube-io/ereceipts-js-sdk';

export function usePermissions() {
  const { user } = useAuth();
  
  const permissions = computed(() => {
    if (!user.value) return {};
    
    return {
      canCreateReceipts: hasAnyRole(user.value.roles, RoleGroups.CASHIER_ROLES),
      canVoidReceipts: hasRole(user.value.roles, 'ROLE_MERCHANT'),
      canViewReports: hasMinimumRoleLevel(user.value.roles, RoleLevel.MERCHANT),
    };
  });
  
  return { permissions };
}
```

## Best Practices

### 1. Use Type-Safe Role Checking

Always use the provided TypeScript types to ensure compile-time safety:

```typescript
// ✅ Good - Type-safe
hasRole(user.roles, 'ROLE_MERCHANT');

// ❌ Bad - String literals without type checking
hasRole(user.roles, 'merchant' as any);
```

### 2. Leverage Role Inheritance

Take advantage of role inheritance instead of checking multiple roles:

```typescript
// ✅ Good - Use inheritance
if (hasRole(user.roles, 'ROLE_MERCHANT')) {
  // This automatically includes ROLE_CACHIER permissions
}

// ❌ Less optimal - Manual checking
if (hasRole(user.roles, 'ROLE_MERCHANT') || hasRole(user.roles, 'ROLE_CACHIER')) {
  // Redundant check
}
```

### 3. Use Role Groups for Common Patterns

```typescript
// ✅ Good - Use predefined groups
hasAnyRole(user.roles, RoleGroups.CASHIER_ROLES);

// ❌ Less maintainable - Manual arrays
hasAnyRole(user.roles, ['ROLE_CACHIER', 'ROLE_MERCHANT']);
```

### 4. Context-Specific Checkers

For applications that primarily work with one context, use context-specific checkers:

```typescript
// ✅ Good - Context-specific checker
const canVoid = ERoleChecker.hasRole(user.roles, 'ROLE_MERCHANT');

// ❌ More verbose - Manual context specification
const canVoid = hasRole(user.roles, 'ROLE_MERCHANT', DEFAULT_CONTEXT);
```

### 5. Defensive Programming

Always check for authentication before authorization:

```typescript
// ✅ Good - Check authentication first
if (!user) {
  throw new Error('Not authenticated');
}

if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
  throw new Error('Insufficient permissions');
}

// ❌ Bad - Could throw if user is null
if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
  throw new Error('Insufficient permissions');
}
```

### 6. Error Messages

Provide clear, actionable error messages:

```typescript
// ✅ Good - Clear error message
if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
  throw new Error('Access denied: Merchant role required to void receipts');
}

// ❌ Bad - Vague error message
if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
  throw new Error('Access denied');
}
```

## Migration Guide

### From Legacy Role Format

If you're migrating from a legacy role system, use the conversion functions:

```typescript
// Legacy format
const legacyRoles = {
  'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT', 'ROLE_SUPPLIER']
};

// Convert to new format
const userRoles = parseLegacyRoles(legacyRoles);

// Convert back if needed for API compatibility
const backToLegacy = toLegacyRoles(userRoles);
```

### Integration with Existing AuthManager

The role system is already integrated with the AuthManager:

```typescript
// AuthManager automatically converts JWT roles
const user = await authManager.login(credentials);
console.log(user.roles); // Already in UserRoles format
```

### Testing Migration

Update your tests to use the new role format:

```typescript
// Old format
const user = { roles: { 'context': ['ROLE_MERCHANT'] } };

// New format (handled automatically by AuthManager)
const user: User = {
  id: '123',
  email: 'user@example.com',
  username: 'user@example.com',
  roles: { 'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT'] },
  fid: 'fid123',
  pid: null,
};
```

## Error Handling

### Common Error Scenarios

1. **User Not Authenticated**
```typescript
if (!user) {
  throw new ACubeSDKError('AUTH_ERROR', 'User not authenticated');
}
```

2. **Insufficient Permissions**
```typescript
if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
  throw new ACubeSDKError('FORBIDDEN_ERROR', 'Merchant role required');
}
```

3. **Invalid Context**
```typescript
if (!hasContext(user.roles, requiredContext)) {
  throw new ACubeSDKError('FORBIDDEN_ERROR', `Access denied for context: ${requiredContext}`);
}
```

### Error Response Format

When building APIs, use consistent error responses:

```typescript
// Standard error response
{
  "error": {
    "type": "FORBIDDEN_ERROR",
    "message": "Merchant role required to void receipts",
    "details": {
      "required_roles": ["ROLE_MERCHANT"],
      "user_roles": ["ROLE_CACHIER"],
      "context": "ereceipts-it.acubeapi.com"
    }
  }
}
```

## Security Considerations

### 1. Server-Side Validation

Always validate roles on the server side, even if client-side checks are in place:

```typescript
// ✅ Server-side validation
app.post('/api/receipts', (req, res) => {
  const user = getAuthenticatedUser(req);
  
  if (!hasRole(user.roles, 'ROLE_CACHIER')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Process request
});
```

### 2. Role Elevation

Never allow users to elevate their own roles through client-side manipulation:

```typescript
// ✅ Good - Roles come from authenticated source
const user = await authManager.getCurrentUser();

// ❌ Bad - Never trust client-provided roles
const userRoles = req.body.roles; // Could be manipulated
```

### 3. Context Isolation

Ensure proper context isolation to prevent cross-tenant access:

```typescript
// ✅ Good - Context-specific check
const userContext = getUserContext(req);
if (!hasRole(user.roles, 'ROLE_MERCHANT', userContext)) {
  // Denied
}

// ❌ Bad - Using default context might allow cross-tenant access
if (!hasRole(user.roles, 'ROLE_MERCHANT')) {
  // Could be checking wrong context
}
```

---

## Support and Resources

- **GitHub Repository**: [ACube E-Receipt SDK](https://github.com/a-cube-io/acube-ereceipt)
- **API Documentation**: [Full API Reference](./API_DOCUMENTATION.md)
- **Authentication Guide**: [Auth System Documentation](./AUTH_API_DOCUMENTATION.md)
- **Examples**: See `src/core/role-examples.ts` for practical implementation examples

For questions or support, please refer to the project repository or contact the development team.