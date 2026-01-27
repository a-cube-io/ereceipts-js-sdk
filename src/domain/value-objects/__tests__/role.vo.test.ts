import { UserRoles, hasAnyRole, hasRole } from '../role.vo';

describe('role.vo', () => {
  describe('hasRole', () => {
    it('should return true when user has the required role', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER'],
      };

      expect(hasRole(userRoles, 'ROLE_SUPPLIER')).toBe(true);
    });

    it('should return false when user does not have the required role', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER'],
      };

      expect(hasRole(userRoles, 'ROLE_MERCHANT')).toBe(false);
    });

    it('should return true when user has the required role among multiple roles', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER', 'ROLE_CASHIER', 'ROLE_MERCHANT'],
      };

      expect(hasRole(userRoles, 'ROLE_CASHIER')).toBe(true);
    });

    it('should return false when roles array is empty', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': [],
      };

      expect(hasRole(userRoles, 'ROLE_SUPPLIER')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the required roles', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER'],
      };

      expect(hasAnyRole(userRoles, ['ROLE_SUPPLIER', 'ROLE_MERCHANT'])).toBe(true);
    });

    it('should return false when user has none of the required roles', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER'],
      };

      expect(hasAnyRole(userRoles, ['ROLE_MERCHANT', 'ROLE_CASHIER'])).toBe(false);
    });

    it('should return true when user has all of the required roles', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER', 'ROLE_MERCHANT', 'ROLE_CASHIER'],
      };

      expect(hasAnyRole(userRoles, ['ROLE_SUPPLIER', 'ROLE_MERCHANT'])).toBe(true);
    });

    it('should return false when required roles array is empty', () => {
      const userRoles: UserRoles = {
        'ereceipts-it.acubeapi.com': ['ROLE_SUPPLIER', 'ROLE_MERCHANT'],
      };

      expect(hasAnyRole(userRoles, [])).toBe(false);
    });
  });
});
