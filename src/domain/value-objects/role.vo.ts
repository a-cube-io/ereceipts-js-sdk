export type Domain = 'ereceipts-it.acubeapi.com';

export type UserRole = 'ROLE_SUPPLIER' | 'ROLE_CASHIER' | 'ROLE_MERCHANT';

export type UserRoles = Record<Domain, UserRole[]>;

export function hasRole(userRoles: UserRoles, required: UserRole): boolean {
  return Object.values(userRoles).some((roles) => roles.includes(required));
}

export function hasAnyRole(userRoles: UserRoles, required: UserRole[]): boolean {
  return Object.values(userRoles).some((roles) => required.some((role) => roles.includes(role)));
}
