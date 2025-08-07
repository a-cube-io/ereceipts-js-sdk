/**
 * Tests for role management system
 */

import {
  BaseRole,
  UserRoles,
  RoleLevel,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasContext,
  getUserContexts,
  getEffectiveRoles,
  getInheritedRoles,
  hasMinimumRoleLevel,
  getHighestRoleLevel,
  canPerformAction,
  createContextRoleChecker,
  parseLegacyRoles,
  toLegacyRoles,
  ERoleChecker,
  RoleGroups,
  DEFAULT_CONTEXT,
} from '../roles';

describe('Role Management System', () => {
  // Test data
  const testContext = 'ereceipts-it.acubeapi.com';
  const testContext2 = 'another-context.com';

  const supplierUser: UserRoles = {
    [testContext]: ['ROLE_SUPPLIER'],
  };

  const cashierUser: UserRoles = {
    [testContext]: ['ROLE_CACHIER'],
  };

  const merchantUser: UserRoles = {
    [testContext]: ['ROLE_MERCHANT'],
  };

  const multiContextUser: UserRoles = {
    [testContext]: ['ROLE_MERCHANT', 'ROLE_SUPPLIER'],
  };

  describe('Role Inheritance', () => {
    it('should get inherited roles correctly', () => {
      const merchantInherited = getInheritedRoles('ROLE_MERCHANT');
      expect(merchantInherited).toContain('ROLE_CACHIER');

      const supplierInherited = getInheritedRoles('ROLE_SUPPLIER');
      expect(supplierInherited).toHaveLength(0);

      const cashierInherited = getInheritedRoles('ROLE_CACHIER');
      expect(cashierInherited).toHaveLength(0);
    });

    it('should get effective roles including inheritance', () => {
      const merchantEffective = getEffectiveRoles(merchantUser, testContext);
      expect(merchantEffective).toContain('ROLE_MERCHANT');
      expect(merchantEffective).toContain('ROLE_CACHIER');

      const cashierEffective = getEffectiveRoles(cashierUser, testContext);
      expect(cashierEffective).toContain('ROLE_CACHIER');
      expect(cashierEffective).toHaveLength(1);
    });
  });

  describe('Role Checking Functions', () => {
    it('should check direct roles correctly', () => {
      expect(hasRole(merchantUser, 'ROLE_MERCHANT', testContext)).toBe(true);
      expect(hasRole(merchantUser, 'ROLE_SUPPLIER', testContext)).toBe(false);
      expect(hasRole(cashierUser, 'ROLE_CACHIER', testContext)).toBe(true);
    });

    it('should check inherited roles correctly', () => {
      expect(hasRole(merchantUser, 'ROLE_CACHIER', testContext)).toBe(true);
      expect(hasRole(cashierUser, 'ROLE_MERCHANT', testContext)).toBe(false);
      expect(hasRole(supplierUser, 'ROLE_CACHIER', testContext)).toBe(false);
    });

    it('should check hasAnyRole correctly', () => {
      expect(hasAnyRole(merchantUser, ['ROLE_SUPPLIER', 'ROLE_MERCHANT'], testContext)).toBe(true);
      expect(hasAnyRole(merchantUser, ['ROLE_SUPPLIER'], testContext)).toBe(false);
      expect(hasAnyRole(merchantUser, ['ROLE_CACHIER'], testContext)).toBe(true); // Inherited
    });

    it('should check hasAllRoles correctly', () => {
      expect(hasAllRoles(multiContextUser, ['ROLE_MERCHANT', 'ROLE_SUPPLIER'], testContext)).toBe(true);
      expect(hasAllRoles(multiContextUser, ['ROLE_MERCHANT', 'ROLE_CACHIER'], testContext)).toBe(true); // Inherited
      expect(hasAllRoles(merchantUser, ['ROLE_MERCHANT', 'ROLE_SUPPLIER'], testContext)).toBe(false);
    });
  });

  describe('Context Management', () => {
    it('should check context access correctly', () => {
      expect(hasContext(multiContextUser, testContext)).toBe(true);
      expect(hasContext(multiContextUser, 'nonexistent-context')).toBe(false);
    });

    it('should get user contexts correctly', () => {
      const contexts = getUserContexts(multiContextUser);
      expect(contexts).toContain(testContext);
      expect(contexts).toHaveLength(1);
    });

    it('should use default context when not specified', () => {
      const defaultContextUser: UserRoles = {
        [DEFAULT_CONTEXT]: ['ROLE_MERCHANT'],
      };

      expect(hasRole(defaultContextUser, 'ROLE_MERCHANT')).toBe(true);
      expect(hasRole(defaultContextUser, 'ROLE_CACHIER')).toBe(true); // Inherited
    });
  });

  describe('Role Levels', () => {
    it('should check minimum role level correctly', () => {
      expect(hasMinimumRoleLevel(merchantUser, RoleLevel.CACHIER, testContext)).toBe(true);
      expect(hasMinimumRoleLevel(merchantUser, RoleLevel.SUPPLIER, testContext)).toBe(true);
      expect(hasMinimumRoleLevel(cashierUser, RoleLevel.MERCHANT, testContext)).toBe(false);
      expect(hasMinimumRoleLevel(cashierUser, RoleLevel.CACHIER, testContext)).toBe(true);
    });

    it('should get highest role level correctly', () => {
      expect(getHighestRoleLevel(merchantUser, testContext)).toBe(RoleLevel.MERCHANT);
      expect(getHighestRoleLevel(cashierUser, testContext)).toBe(RoleLevel.CACHIER);
      expect(getHighestRoleLevel(supplierUser, testContext)).toBe(RoleLevel.SUPPLIER);

      const emptyUser: UserRoles = {};
      expect(getHighestRoleLevel(emptyUser, testContext)).toBeNull();
    });
  });

  describe('Action Authorization', () => {
    it('should check canPerformAction correctly', () => {
      // Any role required (default)
      expect(canPerformAction(merchantUser, ['ROLE_MERCHANT', 'ROLE_SUPPLIER'], testContext)).toBe(true);
      expect(canPerformAction(merchantUser, ['ROLE_SUPPLIER'], testContext)).toBe(false);

      // All roles required
      expect(canPerformAction(merchantUser, ['ROLE_MERCHANT', 'ROLE_CACHIER'], testContext, true)).toBe(true);
      expect(canPerformAction(merchantUser, ['ROLE_MERCHANT', 'ROLE_SUPPLIER'], testContext, true)).toBe(false);
    });
  });

  describe('Context Role Checker', () => {
    it('should create context-specific role checker', () => {
      const checker = createContextRoleChecker(testContext);

      expect(checker.hasRole(merchantUser, 'ROLE_MERCHANT')).toBe(true);
      expect(checker.hasRole(merchantUser, 'ROLE_CACHIER')).toBe(true); // Inherited
      expect(checker.hasAnyRole(merchantUser, ['ROLE_SUPPLIER', 'ROLE_MERCHANT'])).toBe(true);
      expect(checker.hasMinimumLevel(merchantUser, RoleLevel.CACHIER)).toBe(true);
    });

    it('should use default ERoleChecker', () => {
      const defaultUser: UserRoles = {
        [DEFAULT_CONTEXT]: ['ROLE_MERCHANT'],
      };

      expect(ERoleChecker.hasRole(defaultUser, 'ROLE_MERCHANT')).toBe(true);
      expect(ERoleChecker.hasRole(defaultUser, 'ROLE_CACHIER')).toBe(true); // Inherited
    });
  });

  describe('Legacy Role Conversion', () => {
    it('should parse legacy roles correctly', () => {
      const legacyRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT', 'ROLE_SUPPLIER'],
        'another-context.com': ['ROLE_CACHIER'], // This will be ignored
      };

      const userRoles = parseLegacyRoles(legacyRoles);
      expect(userRoles['ereceipts-it.acubeapi.com']).toContain('ROLE_MERCHANT');
      expect(userRoles['ereceipts-it.acubeapi.com']).toContain('ROLE_SUPPLIER');
      // Only the default context is processed
      expect(userRoles['another-context.com']).toBeUndefined();
    });

    it('should convert to legacy roles correctly', () => {
      const legacyRoles = toLegacyRoles(multiContextUser);
      expect(legacyRoles[testContext]).toContain('ROLE_MERCHANT');
      expect(legacyRoles[testContext]).toContain('ROLE_SUPPLIER');
    });

    it('should filter invalid roles during legacy parsing', () => {
      const legacyRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT', 'INVALID_ROLE', 'ROLE_SUPPLIER'],
      };

      const userRoles = parseLegacyRoles(legacyRoles);
      expect(userRoles['ereceipts-it.acubeapi.com']).toContain('ROLE_MERCHANT');
      expect(userRoles['ereceipts-it.acubeapi.com']).toContain('ROLE_SUPPLIER');
      expect(userRoles['ereceipts-it.acubeapi.com']).not.toContain('INVALID_ROLE');
    });
  });

  describe('Role Groups', () => {
    it('should check role groups correctly', () => {
      expect(hasAnyRole(merchantUser, RoleGroups.CASHIER_ROLES, testContext)).toBe(true);
      expect(hasAnyRole(cashierUser, RoleGroups.CASHIER_ROLES, testContext)).toBe(true);
      expect(hasAnyRole(supplierUser, RoleGroups.CASHIER_ROLES, testContext)).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple roles and contexts correctly', () => {
      const complexUser: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_MERCHANT', 'ROLE_SUPPLIER'],
      };

      // Check inheritance in the default context
      expect(hasRole(complexUser, 'ROLE_CACHIER', 'ereceipts-it.acubeapi.com')).toBe(true);
      expect(hasRole(complexUser, 'ROLE_SUPPLIER', 'ereceipts-it.acubeapi.com')).toBe(true);
      expect(hasRole(complexUser, 'ROLE_MERCHANT', 'ereceipts-it.acubeapi.com')).toBe(true);

      // Check levels in the default context
      expect(getHighestRoleLevel(complexUser, 'ereceipts-it.acubeapi.com')).toBe(RoleLevel.MERCHANT);
    });

    it('should handle empty and undefined roles gracefully', () => {
      const emptyUser: UserRoles = {};
      const undefinedContextUser: UserRoles = {
        'some-context': [],
      };

      expect(hasRole(emptyUser, 'ROLE_MERCHANT', testContext)).toBe(false);
      expect(hasRole(undefinedContextUser, 'ROLE_MERCHANT', 'some-context')).toBe(false);
      expect(getEffectiveRoles(emptyUser, testContext)).toHaveLength(0);
      expect(getHighestRoleLevel(emptyUser, testContext)).toBeNull();
    });

    it('should handle role checking with case sensitivity', () => {
      const user: UserRoles = {
        [testContext]: ['ROLE_MERCHANT'],
      };

      expect(hasRole(user, 'ROLE_MERCHANT', testContext)).toBe(true);
      // TypeScript should prevent this, but testing runtime behavior
      expect(hasRole(user, 'role_merchant' as BaseRole, testContext)).toBe(false);
    });
  });
});