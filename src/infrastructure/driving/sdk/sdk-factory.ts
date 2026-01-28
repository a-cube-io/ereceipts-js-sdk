import { ICachePort, INetworkPort } from '@/application/ports/driven';
import { ICacheKeyGenerator } from '@/application/ports/driven/cache-key.port';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { ISecureStoragePort } from '@/application/ports/driven/storage.port';
import { ITokenStoragePort } from '@/application/ports/driven/token-storage.port';
import { AuthenticationService } from '@/application/services/authentication.service';
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
import {
  CashRegisterRepositoryImpl,
  CashierRepositoryImpl,
  DailyReportRepositoryImpl,
  JournalRepositoryImpl,
  MerchantRepositoryImpl,
  NotificationRepositoryImpl,
  PemRepositoryImpl,
  PointOfSaleRepositoryImpl,
  ReceiptRepositoryImpl,
  SupplierRepositoryImpl,
  TelemetryRepositoryImpl,
} from '@/infrastructure/driven/api';
import { CacheKeyGenerator } from '@/infrastructure/driven/cache/cache-key-generator';
import { CachingHttpDecorator } from '@/infrastructure/driven/cache/caching-http-decorator';
import { AxiosHttpAdapter } from '@/infrastructure/driven/http/axios-http.adapter';
import { TokenStorageAdapter } from '@/infrastructure/driven/storage/token-storage.adapter';

import { DIContainer, DI_TOKENS } from './di-container';

export interface SDKFactoryConfig {
  baseUrl: string;
  authUrl?: string;
  timeout?: number;
  debugEnabled?: boolean;
}

export interface SDKServices {
  http: IHttpPort;
  tokenStorage?: ITokenStoragePort;
  authService?: AuthenticationService;
  receipts: IReceiptRepository;
  merchants: IMerchantRepository;
  cashiers: ICashierRepository;
  cashRegisters: ICashRegisterRepository;
  pointOfSales: IPointOfSaleRepository;
  suppliers: ISupplierRepository;
  pems: IPemRepository;
  dailyReports: IDailyReportRepository;
  journals: IJournalRepository;
  notifications: INotificationRepository;
  telemetry: ITelemetryRepository;
}

export class SDKFactory {
  static createContainer(config: SDKFactoryConfig): DIContainer {
    const container = new DIContainer();

    const httpAdapter = new AxiosHttpAdapter({
      baseUrl: config.baseUrl,
      timeout: config.timeout,
    });

    container.register(DI_TOKENS.BASE_HTTP_PORT, httpAdapter);
    container.register(DI_TOKENS.HTTP_PORT, httpAdapter);

    container.registerFactory(DI_TOKENS.RECEIPT_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new ReceiptRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.MERCHANT_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new MerchantRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.CASHIER_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new CashierRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.CASH_REGISTER_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new CashRegisterRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.POINT_OF_SALE_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new PointOfSaleRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.SUPPLIER_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new SupplierRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.PEM_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new PemRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.DAILY_REPORT_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new DailyReportRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.JOURNAL_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new JournalRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.NOTIFICATION_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new NotificationRepositoryImpl(http);
    });

    container.registerFactory(DI_TOKENS.TELEMETRY_REPOSITORY, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      return new TelemetryRepositoryImpl(http);
    });

    return container;
  }

  static registerCacheServices(
    container: DIContainer,
    cache: ICachePort,
    network?: INetworkPort
  ): void {
    container.register(DI_TOKENS.CACHE_PORT, cache);

    if (network) {
      container.register(DI_TOKENS.NETWORK_PORT, network);
    }

    const keyGenerator = new CacheKeyGenerator();
    container.register(DI_TOKENS.CACHE_KEY_GENERATOR, keyGenerator);

    const baseHttp = container.get<IHttpPort>(DI_TOKENS.BASE_HTTP_PORT);
    const cachingHttp = new CachingHttpDecorator(baseHttp, cache, keyGenerator, network);

    container.register(DI_TOKENS.HTTP_PORT, cachingHttp);
  }

  static getCacheKeyGenerator(container: DIContainer): ICacheKeyGenerator | undefined {
    if (container.has(DI_TOKENS.CACHE_KEY_GENERATOR)) {
      return container.get<ICacheKeyGenerator>(DI_TOKENS.CACHE_KEY_GENERATOR);
    }
    return undefined;
  }

  static registerAuthServices(
    container: DIContainer,
    secureStorage: ISecureStoragePort,
    config: SDKFactoryConfig
  ): void {
    const tokenStorage = new TokenStorageAdapter(secureStorage);
    container.register(DI_TOKENS.TOKEN_STORAGE_PORT, tokenStorage);

    container.registerFactory(DI_TOKENS.AUTHENTICATION_SERVICE, () => {
      const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
      const storage = container.get<ITokenStoragePort>(DI_TOKENS.TOKEN_STORAGE_PORT);
      return new AuthenticationService(http, storage, {
        authUrl: config.authUrl || config.baseUrl,
        timeout: config.timeout,
      });
    });
  }

  static getServices(container: DIContainer): SDKServices {
    const services: SDKServices = {
      http: container.get<IHttpPort>(DI_TOKENS.HTTP_PORT),
      receipts: container.get<IReceiptRepository>(DI_TOKENS.RECEIPT_REPOSITORY),
      merchants: container.get<IMerchantRepository>(DI_TOKENS.MERCHANT_REPOSITORY),
      cashiers: container.get<ICashierRepository>(DI_TOKENS.CASHIER_REPOSITORY),
      cashRegisters: container.get<ICashRegisterRepository>(DI_TOKENS.CASH_REGISTER_REPOSITORY),
      pointOfSales: container.get<IPointOfSaleRepository>(DI_TOKENS.POINT_OF_SALE_REPOSITORY),
      suppliers: container.get<ISupplierRepository>(DI_TOKENS.SUPPLIER_REPOSITORY),
      pems: container.get<IPemRepository>(DI_TOKENS.PEM_REPOSITORY),
      dailyReports: container.get<IDailyReportRepository>(DI_TOKENS.DAILY_REPORT_REPOSITORY),
      journals: container.get<IJournalRepository>(DI_TOKENS.JOURNAL_REPOSITORY),
      notifications: container.get<INotificationRepository>(DI_TOKENS.NOTIFICATION_REPOSITORY),
      telemetry: container.get<ITelemetryRepository>(DI_TOKENS.TELEMETRY_REPOSITORY),
    };

    if (container.has(DI_TOKENS.TOKEN_STORAGE_PORT)) {
      services.tokenStorage = container.get<ITokenStoragePort>(DI_TOKENS.TOKEN_STORAGE_PORT);
    }

    if (container.has(DI_TOKENS.AUTHENTICATION_SERVICE)) {
      services.authService = container.get<AuthenticationService>(DI_TOKENS.AUTHENTICATION_SERVICE);
    }

    return services;
  }
}
