export enum UserRole {
  PROVIDER = 'provider',
  MERCHANT = 'merchant',
  CASHIER = 'cashier',
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.PROVIDER]: [
    'create_merchant',
    'manage_merchants',
    'view_all_data',
  ],
  [UserRole.MERCHANT]: [
    'create_cashier',
    'manage_pos',
    'create_cash_register',
    'view_receipts',
    'manage_business_data',
  ],
  [UserRole.CASHIER]: [
    'create_receipt',
    'void_receipt',
    'return_items',
    'view_own_receipts',
  ],
};

export const hasPermission = (
  userRole: UserRole,
  permission: string
): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes(permission);
};

export const isProvider = (role: UserRole): boolean => 
  role === UserRole.PROVIDER;

export const isMerchant = (role: UserRole): boolean => 
  role === UserRole.MERCHANT;

export const isCashier = (role: UserRole): boolean => 
  role === UserRole.CASHIER;