/**
 * Enhanced React Hooks for A-Cube SDK
 * Enterprise-grade data fetching, mutations, offline support, and authentication
 */

// Re-export common types for convenience
export type {
  ACubeSDK,
} from '@/core/sdk';

// Re-export branded types commonly used in React components
export type {
  CashierId,
  MerchantId,
  PointOfSaleId,
} from '@/types/branded';
export { useACubeCache, type CacheResult, type CacheOptions } from './useACubeCache';
export { useACubeOffline, type OfflineResult, type OfflineOptions } from './useACubeOffline';
// Data Management Hooks
export { queryUtils, useACubeQuery, type QueryResult, type QueryOptions } from './useACubeQuery';
export { useACubeMutation, type MutationResult, type MutationOptions } from './useACubeMutation';

export { useACubeSubscription, type SubscriptionResult, type SubscriptionOptions } from './useACubeSubscription';

// Authentication System
export {
  // Core Provider and Context
  AuthProvider,
  useAuthContext,
  useAuthAvailable,
  type AuthContextValue,
  type AuthProviderProps,
} from './auth-provider';

export {
  // Authentication Hooks
  useAuth,
  useUser,
  useLogin,
  useRoles,
  useLogout,
  useSession,
  usePermissions,
  useRequireAuth,
  useRequireRole,
} from './use-auth';

// Re-export auth types for convenience
export type {
  AuthUser,
  UserRole,
  AuthState,
  AuthError,
  SessionInfo,
  LogoutOptions,
  SimpleUserRole,
  StoredAuthData,
  PermissionCheck,
  LoginCredentials,
  PermissionResult,
  OAuth2TokenResponse,
} from '@/auth/types';

// Core Provider System
export {
  useACube,
  useACubeSDK,
  ACubeProvider,
  useACubeStorage,
  useACubeSyncEngine,
  useACubeQueueManager,
  useACubeNetworkStatus,
  useACubeNetworkManager,
  type ACubeContextValue,
  type ACubeProviderProps,
} from './ACubeProvider';

export {
  // Pre-built React Components
  LoginForm,
  AuthStatus,
  UserProfile,
  RoleSwitcher,
  ProtectedRoute,
  PermissionGate,
  type LoginFormProps,
  type AuthStatusProps,
  type UserProfileProps,
  type RoleSwitcherProps,
  type ProtectedRouteProps,
  type PermissionGateProps,
} from './auth-components';
