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
import { IMf2EmergencyReportRepository } from '@/domain/repositories/mf2-emergency-report';
import { INotificationRepository } from '@/domain/repositories/notification.repository';
import { IPemRepository } from '@/domain/repositories/pem.repository';
import { IPointOfSaleRepository } from '@/domain/repositories/point-of-sale.repository';
import { IReceiptRepository } from '@/domain/repositories/receipt.repository';
import { ISupplierRepository } from '@/domain/repositories/supplier.repository';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';
import { AuthStrategy, IUserProvider } from '@/infrastructure/driven/http/auth-strategy';
import { JwtAuthHandler } from '@/infrastructure/driven/http/jwt-auth.handler';
import { MtlsAuthHandler } from '@/infrastructure/driven/http/mtls-auth.handler';
import { createACubeMTLSConfig, loadPlatformAdapters } from '@/infrastructure/loaders';
import { ConfigManager } from '@/shared/config';
import { ACubeSDKError, AuthCredentials, SDKConfig, User } from '@/shared/types';
import { createPrefixedLogger, logger } from '@/shared/utils';

import { DIContainer, DI_TOKENS } from './di-container';
import { SDKFactory, SDKFactoryConfig } from './sdk-factory';

const log = createPrefixedLogger('SDK');

export interface SDKEvents {
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
}

export class ACubeSDK {
  private config: ConfigManager;
  private adapters?: PlatformAdapters;
  private authService?: AuthenticationService;
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
      log.debug('SDK already initialized, skipping');
      return;
    }

    log.info('Initializing SDK', {
      apiUrl: this.config.getApiUrl(),
      authUrl: this.config.getAuthUrl(),
      debugEnabled: this.config.isDebugEnabled(),
    });

    try {
      if (!this.adapters) {
        log.debug('Loading platform adapters');
        const mtlsConfig = createACubeMTLSConfig(
          this.config.getApiUrl(),
          this.config.getTimeout(),
          true
        );

        this.adapters = loadPlatformAdapters({
          mtlsConfig,
        });
        log.info('Platform adapters loaded', {
          hasNetworkMonitor: !!this.adapters.networkMonitor,
          hasMtls: !!this.adapters.mtls,
          hasSecureStorage: !!this.adapters.secureStorage,
        });
      }

      const factoryConfig: SDKFactoryConfig = {
        baseUrl: this.config.getApiUrl(),
        authUrl: this.config.getAuthUrl(),
        timeout: this.config.getTimeout(),
        debugEnabled: this.config.isDebugEnabled(),
      };

      log.debug('Creating DI container');
      this.container = SDKFactory.createContainer(factoryConfig);

      log.debug('Registering auth services');
      SDKFactory.registerAuthServices(this.container, this.adapters.secureStorage, factoryConfig);

      log.debug('Initializing certificate service');
      this.certificateService = new CertificateService(this.adapters.secureStorage);

      const tokenStorage = this.container.get<ITokenStoragePort>(DI_TOKENS.TOKEN_STORAGE_PORT);
      const httpPort = this.container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);

      log.debug('Initializing authentication service');
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

      this.networkSubscription = this.adapters.networkMonitor.online$.subscribe((online) => {
        this.currentOnlineState = online;
        this.events.onNetworkStatusChanged?.(online);
      });

      const isAuth = await this.authService.isAuthenticated();
      log.debug('Checking authentication status during init', { isAuthenticated: isAuth });

      if (isAuth) {
        const token = await this.authService.getAccessToken();
        log.debug('Token retrieved during init', {
          hasToken: !!token,
          tokenPrefix: token?.substring(0, 20),
        });
        if (token) {
          httpPort.setAuthToken(token);
          log.info('Auth token set on HTTP port during initialization');
        }
      } else {
        log.warn('User not authenticated during SDK init - token will be set after login');
      }

      if (this.adapters?.mtls && 'setMTLSAdapter' in httpPort) {
        log.debug('Connecting mTLS adapter to HTTP port');
        const httpWithMtls = httpPort as { setMTLSAdapter: (adapter: IMTLSPort) => void };
        httpWithMtls.setMTLSAdapter(this.adapters.mtls);
      }

      if ('setAuthStrategy' in httpPort) {
        log.debug('Configuring auth strategy');
        const jwtHandler = new JwtAuthHandler(tokenStorage);
        const certificatePort: ICertificatePort | null = this.certificateService
          ? {
              storeCertificate: this.certificateService.storeCertificate.bind(
                this.certificateService
              ),
              storeBrowserManagedCertificate:
                this.certificateService.storeBrowserManagedCertificate.bind(
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

        const authStrategy = new AuthStrategy(jwtHandler, mtlsHandler, userProvider);

        const httpWithStrategy = httpPort as {
          setAuthStrategy: (strategy: AuthStrategy) => void;
        };
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
                browserManaged: storedCert.browserManaged,
              });
            }
          }
        } catch (certError) {
          log.warn('Certificate auto-configuration failed, will retry on demand', {
            error: certError instanceof Error ? certError.message : certError,
          });
        }
      }

      this.isInitialized = true;
      log.info('SDK initialized successfully', {
        hasMtls: !!this.adapters.mtls,
      });
    } catch (error) {
      log.error('SDK initialization failed', {
        error: error instanceof Error ? error.message : error,
      });
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

  get mf2EmergencyReports(): IMf2EmergencyReportRepository {
    this.ensureInitialized();
    return this.container!.get<IMf2EmergencyReportRepository>(
      DI_TOKENS.MF2_EMERGENCY_REPORT_REPOSITORY
    );
  }

  async login(credentials: AuthCredentials): Promise<User> {
    this.ensureInitialized();
    log.info('Login attempt', { email: credentials.email });

    const user = await this.authService!.login(credentials);
    log.info('Login successful', { roles: user.roles });

    const token = await this.authService!.getAccessToken();
    if (token) {
      this.httpPort.setAuthToken(token);
      log.debug('Auth token set on HTTP port');
    }

    return user as User;
  }

  async logout(): Promise<void> {
    this.ensureInitialized();
    log.info('Logout');

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
      browserManaged?: boolean;
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

    if (options.browserManaged) {
      await this.certificateService.storeBrowserManagedCertificate(format);
    } else {
      await this.certificateService.storeCertificate(certificate, privateKey, format);
    }

    if (this.adapters?.mtls) {
      await this.adapters.mtls.configureCertificate({
        certificate: options.browserManaged ? '' : certificate,
        privateKey: options.browserManaged ? '' : privateKey,
        format: format.toUpperCase() as 'PEM' | 'P12',
        password: options.password,
        browserManaged: options.browserManaged,
      });
    }
  }

  /**
   * Register a client certificate that was imported manually into the browser keystore (P12).
   * Call this after the user imports the certificate via browser settings.
   *
   * @param options.verify - If true, calls testMTLSConnection(). On web this only checks local
   *   registration (no remote probe).
   */
  async registerBrowserCertificate(
    options: {
      format?: 'p12';
      verify?: boolean;
    } = {}
  ): Promise<void> {
    this.ensureInitialized();

    const format = options.format || 'p12';
    await this.storeCertificate('', '', {
      format,
      browserManaged: true,
    });

    if (options.verify) {
      const connectionOk = await this.testMTLSConnection();
      if (!connectionOk) {
        await this.clearCertificate();
        throw new ACubeSDKError(
          'STORAGE_CERTIFICATE_ERROR',
          'Browser mTLS connection test failed. Ensure the P12 certificate is imported in your browser and try again.'
        );
      }
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
    const adapterHasCertificate = await this.adapters.mtls.hasCertificate();
    const certificateInfo = (await this.certificateService?.getCertificateInfo()) || null;
    const mtlsSupported = await this.adapters.mtls.isMTLSSupported();

    return {
      adapterAvailable: true,
      isReady: hasCertificate && adapterHasCertificate && mtlsSupported,
      hasCertificate: hasCertificate && adapterHasCertificate,
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
      await this.adapters.mtls.removeCertificate().catch(() => {});
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
        browserManaged: storedCert.browserManaged,
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
