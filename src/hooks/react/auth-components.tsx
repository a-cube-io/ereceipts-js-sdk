/**
 * React Auth Components
 * Pre-built authentication components for common use cases
 *
 * This file now exports cross-platform components that work seamlessly
 * in both React web and React Native environments.
 */

// Export all cross-platform components
export * from './auth-components-cross-platform';

// Re-export types for backward compatibility
export type { UserRole, PermissionCheck, LoginCredentials } from '@/auth/types';

/*
 * NOTE: All component implementations have been moved to auth-components-cross-platform.tsx
 * This file now serves as the main entry point, exporting cross-platform components
 * that work seamlessly in both React web and React Native environments.
 *
 * The cross-platform components include:
 * - LoginForm: Cross-platform login form with platform-specific inputs
 * - UserProfile: User information display with cross-platform layout
 * - RoleSwitcher: Role selection with platform-appropriate picker
 * - AuthStatus: Authentication status indicator
 * - ProtectedRoute: Route protection with cross-platform navigation
 * - PermissionGate: Permission-based component rendering
 */
