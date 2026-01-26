import {
  CertificateInfo,
  ICertificatePort,
  IMTLSPort,
  PlatformAdapters,
} from '@/application/ports/driven';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { ITokenStoragePort } from '@/application/ports/driven/token-storage.port';
import { AuthenticationService } from '@/application/services/authentication.service';
import { CertificateService } from '@/application/services/certificate.service';
import { ICashRegisterRepository } from '@/domain/repositories/cash-register.repository';
import { ICashierRepository } from '@/domain/repositories/cashier.repository';
import { IDailyReportRepository } from '@/domain/repositories/daily-report.repository';
import { IJournalRepository } from '@/domain/repositories/journal.repository';
import { IMerchantRepository } from '@/domain/repositories/merchant.repository';
import { INotificationRepository } from '@/domain/repositories/notification.repository';
import { IPemRepository } from '@/domain/repositories/pem.repository';
import { IPointOfSaleRepository } from '@/domain/repositories/point-of-sale.repository';
import { IReceiptRepository } from '@/domain/repositories/receipt.repository';
import { ISupplierRepository } from '@/domain/repositories/supplier.repository';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';
import { AuthStrategy, IUserProvider } from '@/infrastructure/driven/http/auth-strategy';
import { JwtAuthHandler } from '@/infrastructure/driven/http/jwt-auth.handler';
import { MtlsAuthHandler } from '@/infrastructure/driven/http/mtls-auth.handler';
import { OfflineManager, QueueEvents } from '@/infrastructure/driven/offline';
import { createACubeMTLSConfig, loadPlatformAdapters } from '@/infrastructure/loaders';
import { ConfigManager } from '@/shared/config';
import { ACubeSDKError, AuthCredentials, SDKConfig, User } from '@/shared/types';
import { logger } from '@/shared/utils';

import { DIContainer, DI_TOKENS } from './di-container';
import { SDKFactory, SDKFactoryConfig } from './sdk-factory';

export interface SDKEvents {
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
  onOfflineOperationAdded?: (operationId: string) => void;
  onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
}

export class ACubeSDK {
  private config: ConfigManager;
  private adapters?: PlatformAdapters;
  private authService?: AuthenticationService;
  private offlineManager?: OfflineManager;
  private certificateService?: CertificateService;
  private container?: DIContainer;
  private isInitialized = false;
  private currentOnlineState = true;
  private networkSubscription?: { unsubscribe: () => void };

  constructor(
    config: SDKConfig,
    customAdapters?: PlatformAdapters,
    private events: SDKEvents = {}
  ) {
    this.config = new ConfigManager(config);
    logger.setEnabled(this.config.isDebugEnabled());

    if (customAdapters) {
      this.adapters = customAdapters;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (!this.adapters) {
        const mtlsConfig = createACubeMTLSConfig(
          this.config.getApiUrl(),
          this.config.getTimeout(),
          true
        );

        this.adapters = loadPlatformAdapters({
          mtlsConfig,
        });
      }

      const factoryConfig: SDKFactoryConfig = {
        baseUrl: this.config.getApiUrl(),
        authUrl: this.config.getAuthUrl(),
        timeout: this.config.getTimeout(),
        debugEnabled: this.config.isDebugEnabled(),
      };
      this.container = SDKFactory.createContainer(factoryConfig);

      SDKFactory.registerAuthServices(this.container, this.adapters.secureStorage, factoryConfig);

      this.certificateService = new CertificateService(this.adapters.secureStorage);

      const tokenStorage = this.container.get<ITokenStoragePort>(DI_TOKENS.TOKEN_STORAGE_PORT);
      const httpPort = this.container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);

      this.authService = new AuthenticationService(
        httpPort,
        tokenStorage,
        {
          authUrl: this.config.getAuthUrl(),
          timeout: this.config.getTimeout(),
        },
        {
          onUserChanged: this.events.onUserChanged,
          onAuthError: (error) => {
            this.events.onAuthError?.(new ACubeSDKError('AUTH_ERROR', error.message, error));
          },
        }
      );

      const queueEvents: QueueEvents = {
        onOperationAdded: (operation) => {
          this.events.onOfflineOperationAdded?.(operation.id);
        },
        onOperationCompleted: (result) => {
          this.events.onOfflineOperationCompleted?.(result.operation.id, result.success);
        },
        onOperationFailed: (result) => {
          this.events.onOfflineOperationCompleted?.(result.operation.id, false);
        },
      };

      this.offlineManager = new OfflineManager(
        this.adapters.storage,
        httpPort,
        this.adapters.networkMonitor,
        {
          syncInterval: 30000,
        },
        queueEvents
      );

      this.networkSubscription = this.adapters.networkMonitor.online$.subscribe((online) => {
        this.currentOnlineState = online;
        this.events.onNetworkStatusChanged?.(online);

        if (online && this.offlineManager) {
          this.offlineManager.sync().catch(() => {
            // Sync errors are handled internally by OfflineManager
          });
        }
      });

      if (await this.authService.isAuthenticated()) {
        const token = await this.authService.getAccessToken();
        if (token) {
          httpPort.setAuthToken(token);
        }
      }

      // Connect mTLS adapter to HTTP port for /mf1 and /mf2 requests
      if (this.adapters?.mtls && 'setMTLSAdapter' in httpPort) {
        const httpWithMtls = httpPort as { setMTLSAdapter: (adapter: IMTLSPort) => void };
        httpWithMtls.setMTLSAdapter(this.adapters.mtls);
      }

      // Create and connect AuthStrategy
      if ('setAuthStrategy' in httpPort) {
        const jwtHandler = new JwtAuthHandler(tokenStorage);
        const certificatePort: ICertificatePort | null = this.certificateService
          ? {
              storeCertificate: this.certificateService.storeCertificate.bind(
                this.certificateService
              ),
              getCertificate: this.certificateService.getCertificate.bind(this.certificateService),
              getCertificateInfo: this.certificateService.getCertificateInfo.bind(
                this.certificateService
              ),
              hasCertificate: this.certificateService.hasCertificate.bind(this.certificateService),
              clearCertificate: this.certificateService.clearCertificate.bind(
                this.certificateService
              ),
            }
          : null;
        const mtlsHandler = new MtlsAuthHandler(this.adapters?.mtls || null, certificatePort);

        const userProvider: IUserProvider = {
          getCurrentUser: async () => {
            try {
              return await this.authService!.getCurrentUser();
            } catch {
              return null;
            }
          },
          getAccessToken: async () => {
            try {
              return await this.authService!.getAccessToken();
            } catch {
              return null;
            }
          },
        };

        const authStrategy = new AuthStrategy(
          jwtHandler,
          mtlsHandler,
          userProvider,
          this.adapters?.mtls || null
        );

        const httpWithStrategy = httpPort as { setAuthStrategy: (strategy: AuthStrategy) => void };
        httpWithStrategy.setAuthStrategy(authStrategy);
      }

      if (this.adapters?.mtls && this.certificateService) {
        try {
          const hasCert = await this.certificateService.hasCertificate();

          if (hasCert) {
            const storedCert = await this.certificateService.getCertificate();

            if (storedCert) {
              await this.adapters.mtls.configureCertificate({
                certificate: storedCert.certificate,
                privateKey: storedCert.privateKey,
                format: storedCert.format.toUpperCase() as 'PEM' | 'P12',
              });
            }
          }
        } catch {
          // Certificate auto-configuration failed, will retry on demand
        }
      }

      this.isInitialized = true;
    } catch (error) {
      throw new ACubeSDKError(
        'SDK_INITIALIZATION_ERROR',
        `Failed to initialize SDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  get httpPort(): IHttpPort {
    this.ensureInitialized();
    return this.container!.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
  }

  get receipts(): IReceiptRepository {
    this.ensureInitialized();
    return this.container!.get<IReceiptRepository>(DI_TOKENS.RECEIPT_REPOSITORY);
  }

  get merchants(): IMerchantRepository {
    this.ensureInitialized();
    return this.container!.get<IMerchantRepository>(DI_TOKENS.MERCHANT_REPOSITORY);
  }

  get cashiers(): ICashierRepository {
    this.ensureInitialized();
    return this.container!.get<ICashierRepository>(DI_TOKENS.CASHIER_REPOSITORY);
  }

  get cashRegisters(): ICashRegisterRepository {
    this.ensureInitialized();
    return this.container!.get<ICashRegisterRepository>(DI_TOKENS.CASH_REGISTER_REPOSITORY);
  }

  get pointOfSales(): IPointOfSaleRepository {
    this.ensureInitialized();
    return this.container!.get<IPointOfSaleRepository>(DI_TOKENS.POINT_OF_SALE_REPOSITORY);
  }

  get suppliers(): ISupplierRepository {
    this.ensureInitialized();
    return this.container!.get<ISupplierRepository>(DI_TOKENS.SUPPLIER_REPOSITORY);
  }

  get pems(): IPemRepository {
    this.ensureInitialized();
    return this.container!.get<IPemRepository>(DI_TOKENS.PEM_REPOSITORY);
  }

  get dailyReports(): IDailyReportRepository {
    this.ensureInitialized();
    return this.container!.get<IDailyReportRepository>(DI_TOKENS.DAILY_REPORT_REPOSITORY);
  }

  get journals(): IJournalRepository {
    this.ensureInitialized();
    return this.container!.get<IJournalRepository>(DI_TOKENS.JOURNAL_REPOSITORY);
  }

  get notifications(): INotificationRepository {
    this.ensureInitialized();
    return this.container!.get<INotificationRepository>(DI_TOKENS.NOTIFICATION_REPOSITORY);
  }

  get telemetry(): ITelemetryRepository {
    this.ensureInitialized();
    return this.container!.get<ITelemetryRepository>(DI_TOKENS.TELEMETRY_REPOSITORY);
  }

  async login(credentials: AuthCredentials): Promise<User> {
    this.ensureInitialized();

    const user = await this.authService!.login(credentials);

    const token = await this.authService!.getAccessToken();
    if (token) {
      this.httpPort.setAuthToken(token);
    }

    return user as User;
  }

  async logout(): Promise<void> {
    this.ensureInitialized();

    await this.authService!.logout();
    this.httpPort.setAuthToken(null);
  }

  async getCurrentUser(): Promise<User | null> {
    this.ensureInitialized();

    try {
      const user = await this.authService!.getCurrentUser();
      return user as User | null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    this.ensureInitialized();
    return await this.authService!.isAuthenticated();
  }

  getOfflineManager(): OfflineManager {
    this.ensureInitialized();
    return this.offlineManager!;
  }

  isOnline(): boolean {
    this.ensureInitialized();
    return this.currentOnlineState;
  }

  getConfig(): SDKConfig {
    return this.config.getConfig();
  }

  updateConfig(updates: Partial<SDKConfig>): void {
    this.config.updateConfig(updates);
  }

  getAdapters(): PlatformAdapters | undefined {
    return this.adapters;
  }

  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: {
      name?: string;
      format?: 'pem' | 'p12' | 'pkcs12';
      password?: string;
    } = {}
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.certificateService) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate service not initialized'
      );
    }

    const format = (options.format || 'pem') as 'pem' | 'p12';
    await this.certificateService.storeCertificate(certificate, privateKey, format);

    if (this.adapters?.mtls) {
      await this.adapters.mtls.configureCertificate({
        certificate,
        privateKey,
        format: format.toUpperCase() as 'PEM' | 'P12',
      });
    }
  }

  async getMTLSStatus() {
    this.ensureInitialized();

    if (!this.adapters?.mtls) {
      return {
        adapterAvailable: false,
        isReady: false,
        hasCertificate: false,
        certificateInfo: null,
        platformInfo: null,
      };
    }

    const hasCertificate = (await this.certificateService?.hasCertificate()) || false;
    const certificateInfo = (await this.certificateService?.getCertificateInfo()) || null;

    return {
      adapterAvailable: true,
      isReady: hasCertificate,
      hasCertificate,
      certificateInfo,
      platformInfo: this.adapters.mtls.getPlatformInfo(),
    };
  }

  async testMTLSConnection(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.adapters?.mtls) {
      return false;
    }

    return this.adapters.mtls.testConnection();
  }

  async clearCertificate(): Promise<void> {
    this.ensureInitialized();

    if (this.adapters?.mtls) {
      try {
        await this.adapters.mtls.removeCertificate();
      } catch {
        // No certificate to remove
      }
    }

    if (this.certificateService) {
      await this.certificateService.clearCertificate();
    }
  }

  getCertificateManager() {
    this.ensureInitialized();
    return this.certificateService;
  }

  async getCertificate() {
    this.ensureInitialized();

    if (!this.certificateService) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate service not initialized'
      );
    }

    return await this.certificateService.getCertificate();
  }

  async getCertificateInfo() {
    this.ensureInitialized();

    if (!this.certificateService) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate service not initialized'
      );
    }

    return await this.certificateService.getCertificateInfo();
  }

  async hasCertificate() {
    this.ensureInitialized();

    if (!this.certificateService) {
      throw new ACubeSDKError(
        'CERTIFICATE_MANAGER_NOT_INITIALIZED',
        'Certificate service not initialized'
      );
    }

    return await this.certificateService.hasCertificate();
  }

  async getCertificatesInfo(isRetryAttempt: boolean = false): Promise<CertificateInfo | null> {
    this.ensureInitialized();

    if (!this.adapters?.mtls) {
      throw new ACubeSDKError('MTLS_ADAPTER_NOT_AVAILABLE', 'mTLS adapter not available');
    }

    try {
      const hasCert = await this.adapters.mtls.hasCertificate();
      if (!hasCert) {
        return null;
      }

      const certInfo = await this.adapters.mtls.getCertificateInfo();

      if (certInfo) {
        return certInfo;
      }

      if (isRetryAttempt) {
        return null;
      }

      if (!this.certificateService) {
        return null;
      }

      const storedCert = await this.certificateService.getCertificate();
      if (!storedCert) {
        return null;
      }

      await this.adapters.mtls.configureCertificate({
        certificate: storedCert.certificate,
        privateKey: storedCert.privateKey,
        format: storedCert.format.toUpperCase() as 'PEM' | 'P12',
      });

      return await this.getCertificatesInfo(true);
    } catch (error) {
      throw new ACubeSDKError(
        'CERTIFICATE_INFO_ERROR',
        `Failed to retrieve certificate information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  destroy(): void {
    this.networkSubscription?.unsubscribe();
    this.offlineManager?.destroy();
    this.container?.clear();
    this.isInitialized = false;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ACubeSDKError(
        'SDK_NOT_INITIALIZED',
        'SDK not initialized. Call initialize() first.'
      );
    }
  }
}

export async function createACubeSDK(
  config: SDKConfig,
  customAdapters?: PlatformAdapters,
  events?: SDKEvents
): Promise<ACubeSDK> {
  const sdk = new ACubeSDK(config, customAdapters, events);
  await sdk.initialize();
  return sdk;
}
