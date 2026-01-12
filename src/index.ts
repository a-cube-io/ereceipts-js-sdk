export { ACubeSDK, createACubeSDK } from './infrastructure/driving/sdk/acube-sdk';
export type { SDKEvents } from './infrastructure/driving/sdk/acube-sdk';
export { DIContainer, DI_TOKENS } from './infrastructure/driving/sdk/di-container';
export { SDKFactory } from './infrastructure/driving/sdk/sdk-factory';
export type { SDKFactoryConfig, SDKServices } from './infrastructure/driving/sdk/sdk-factory';

export * from './domain/entities';
export * from './domain/value-objects';
export * from './domain/repositories';

export * from './application/ports/driven/http.port';
export * from './application/dto';

export * from './infrastructure/driven/http';
export * from './infrastructure/driven/api';

export { ACubeSDKError, ConfigManager } from './shared';
export { AuthenticationService } from './application/services/authentication.service';
export { CertificateService } from './application/services/certificate.service';
export { createACubeMTLSConfig, loadPlatformAdapters } from './infrastructure/loaders';
export type { SDKConfig, Environment, User, AuthCredentials, JWTPayload } from './shared/types';
export type { Domain, UserRole, UserRoles } from './domain/value-objects';

export * from './application/ports/driven';
export { MTLSError, MTLSErrorType } from './domain/errors';
export { CertificateValidator, parseJwt, isTokenExpired, extractRoles } from './domain/services';
export * from './infrastructure/driven/offline';
export * from './shared/validation';
export * from './shared/utils';

export { createACubeSDK as default } from './infrastructure/driving/sdk/acube-sdk';
