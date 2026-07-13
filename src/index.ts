// Core SDK
export { ACubeSDK, createACubeSDK } from './infrastructure/driving/sdk/acube-sdk';
export type { SDKEvents } from './infrastructure/driving/sdk/acube-sdk';

// SDKManager - Simplified API for production use
export { SDKManager } from './infrastructure/driving/sdk/sdk-manager';
export type {
  SDKManagerConfig,
  SDKManagerEvents,
  ManagedServices,
  TelemetryOperations,
} from './infrastructure/driving/sdk/sdk-manager';

// Application services
export { AppStateService } from './application/services/app-state.service';
export type { AppState, AppMode, WarningState } from './application/services/app-state.service';
export { NotificationService } from './application/services/notification.service';
export type {
  NotificationServiceConfig,
  NotificationSyncState,
  NotificationEvents,
} from './application/services/notification.service';
export { TelemetryService } from './application/services/telemetry.service';
export type {
  TelemetryState,
  TelemetryServiceConfig,
} from './application/services/telemetry.service';
export { AuthenticationService } from './application/services/authentication.service';
export { CertificateService } from './application/services/certificate.service';

// Domain layer
export * from './domain/entities';
export * from './domain/value-objects';
export * from './domain/repositories';
export { MTLSError, MTLSErrorType } from './domain/errors';
export { CertificateValidator, parseJwt, isTokenExpired, extractRoles } from './domain/services';

// DTOs
export * from './application/dto';

// Ports (public interfaces for custom adapters)
export type {
  IHttpPort,
  HttpRequestConfig,
  HttpResponse,
} from './application/ports/driven/http.port';
export type { IStoragePort, ISecureStoragePort } from './application/ports/driven/storage.port';
export type { INetworkPort } from './application/ports/driven/network.port';
export type { ITokenStoragePort } from './application/ports/driven/token-storage.port';
export type {
  ICertificatePort,
  StoredCertificate,
} from './application/ports/driven/certificate.port';
export type {
  IMTLSPort,
  IMTLSAdapter,
  IMTLSAdapterFactory,
  CertificateData,
  CertificateInfo,
  MTLSConnectionConfig,
  MTLSRequestConfig,
  MTLSResponse,
} from './application/ports/driven/mtls.port';
export type { IAuthHandler, AuthConfig } from './application/ports/driven/auth-handler.port';
export type { PlatformAdapters } from './application/ports/driven/platform-adapters.port';

// Shared
export { ACubeSDKError, ConfigManager } from './shared';
export type {
  SDKConfig,
  User,
  AuthCredentials,
  JWTPayload,
  APIError,
  APIViolation,
} from './shared/types';
export { transformError } from './infrastructure/driven/http/error-transformer';
export type { Domain, UserRole, UserRoles } from './domain/value-objects';
export { logger, createPrefixedLogger } from './shared/utils/logger';

// Platform helpers
export { createACubeMTLSConfig, loadPlatformAdapters } from './infrastructure/loaders';

// Validation schemas (optional - for consumer-side validation)
export * from './shared/validation';

export { createACubeSDK as default } from './infrastructure/driving/sdk/acube-sdk';
