/**
 * Enhanced React Hooks for A-Cube SDK
 * Enterprise-grade data fetching, mutations, offline support, and authentication
 */

// Core Provider System
export {
  ACubeProvider,
  useACube,
  useACubeSDK,
  useACubeStorage,
  useACubeQueueManager,
  useACubeSyncEngine,
  useACubeNetworkManager,
  useACubeNetworkStatus,
  type ACubeContextValue,
  type ACubeProviderProps
} from './ACubeProvider';

// Data Management Hooks
export { useACubeQuery, type QueryOptions, type QueryResult, queryUtils } from './useACubeQuery';
export { useACubeMutation, type MutationOptions, type MutationResult } from './useACubeMutation';
export { useACubeSubscription, type SubscriptionOptions, type SubscriptionResult } from './useACubeSubscription';
export { useACubeCache, type CacheOptions, type CacheResult } from './useACubeCache';
export { useACubeOffline, type OfflineOptions, type OfflineResult } from './useACubeOffline';

// Authentication System
export {
  // Core Provider and Context
  AuthProvider,
  useAuthContext,
  useAuthAvailable,
  type AuthProviderProps,
  type AuthContextValue,
} from './auth-provider';

export {
  // Authentication Hooks
  useAuth,
  useLogin,
  useLogout,
  useUser,
  useRoles,
  usePermissions,
  useSession,
  useRequireAuth,
  useRequireRole,
} from './use-auth';

export {
  // Pre-built React Components
  LoginForm,
  UserProfile,
  RoleSwitcher,
  AuthStatus,
  ProtectedRoute,
  PermissionGate,
  type LoginFormProps,
  type UserProfileProps,
  type RoleSwitcherProps,
  type AuthStatusProps,
  type ProtectedRouteProps,
  type PermissionGateProps,
} from './auth-components';

// Re-export auth types for convenience
export type {
  AuthState,
  AuthUser,
  LoginCredentials,
  LogoutOptions,
  UserRole,
  SimpleUserRole,
  AuthError,
  PermissionCheck,
  PermissionResult,
  SessionInfo,
  OAuth2TokenResponse,
  StoredAuthData,
} from '@/auth/types';

// Re-export branded types commonly used in React components
export type {
  MerchantId,
  CashierId,
  PointOfSaleId,
} from '@/types/branded';

// Re-export common types for convenience
export type {
  ACubeSDK
} from '@/core/sdk';