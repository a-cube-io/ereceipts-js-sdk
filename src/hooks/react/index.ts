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

// Platform detection services (UI-free) - re-export directly from services
export {
  platformUtils,
  platformDetection,
  type PlatformInfo,
  type PlatformDetectionConfig,
} from '@/services/platform-detection';

export {
  useAuthStatus,
  authStatusUtils,
  type AuthStatusState,
  type AuthStatusConfig,
  type UseAuthStatusReturn,
} from './useAuthStatus';

// Platform diagnostics service (UI-free)
export { 
  diagnosticsUtils,
  platformDiagnostics,
  type PlatformDiagnosticsData,
  type DetailedPlatformDetection,
} from './platform-diagnostics';

// Network status hooks (best practices for React Native)
export { 
  useIsOnline, 
  useNetworkStatus, 
  type NetworkStatus,
  useIsExpensiveConnection,
  type UseNetworkStatusOptions 
} from './useNetworkStatus';

// UI-free Authentication Hooks (direct exports)
export {
  useAuthForm,
  authFormValidators,
  type AuthFormState,
  type AuthFormConfig,
  type AuthFormActions,
  type UseAuthFormReturn,
} from './useAuthForm';

// Platform services (framework-agnostic)
export { 
  readinessUtils, 
  platformReadiness,
  type PlatformReadinessInfo,
  type PlatformInfo as PlatformReadinessInfo_PlatformInfo,
} from './usePlatformReady';

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
  useRoleSwitch,
  roleSwitchUtils,
  type RoleSwitchState,
  type RoleSwitchConfig,
  type RoleSwitchActions,
  type UseRoleSwitchReturn,
} from './useRoleSwitch';

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

export {
  roleUtils,
  profileUtils,
  useUserProfile,
  type UserProfileData,
  type UserProfileConfig,
  type UserProfileActions,
  type UseUserProfileReturn,
} from './useUserProfile';
export {
  useProtectedRoute,
  protectedRouteUtils,
  type ProtectedRouteState,
  type ProtectedRouteConfig,
  type ProtectedRouteActions,
  type UseProtectedRouteReturn,
} from './useProtectedRoute';
export {
  usePermissionGate,
  permissionGateUtils,
  type PermissionGateState,
  type PermissionGateConfig,
  type PermissionGateActions,
  type UsePermissionGateReturn,
} from './usePermissionGate';
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

/*
 * UI COMPONENTS REMOVED - NOW UI-FREE
 * 
 * The following UI components have been replaced with UI-free hooks:
 * - LoginForm → useAuthForm (business logic only)
 * - AuthStatus → useAuthStatus (state only)
 * - UserProfile → useUserProfile (data only)
 * - RoleSwitcher → useRoleSwitch (logic only)
 * - ProtectedRoute → useProtectedRoute (routing logic only)
 * - PermissionGate → usePermissionGate (permission logic only)
 * 
 * To use these features:
 * 1. Import the corresponding UI-free hook
 * 2. Create your own UI components using the hook data/actions
 * 3. Customize styling and rendering as needed
 * 
 * Benefits:
 * - Framework agnostic (works in Web, React Native, Node.js, SSR)
 * - Smaller bundle size
 * - Better separation of concerns
 * - More flexible and customizable
 */
