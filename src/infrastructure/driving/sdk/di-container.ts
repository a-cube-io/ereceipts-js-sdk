export const DI_TOKENS = {
  HTTP_PORT: Symbol('HTTP_PORT'),
  BASE_HTTP_PORT: Symbol('BASE_HTTP_PORT'),
  STORAGE_PORT: Symbol('STORAGE_PORT'),
  SECURE_STORAGE_PORT: Symbol('SECURE_STORAGE_PORT'),
  NETWORK_PORT: Symbol('NETWORK_PORT'),
  CACHE_PORT: Symbol('CACHE_PORT'),
  CACHE_KEY_GENERATOR: Symbol('CACHE_KEY_GENERATOR'),
  MTLS_PORT: Symbol('MTLS_PORT'),
  TOKEN_STORAGE_PORT: Symbol('TOKEN_STORAGE_PORT'),

  RECEIPT_REPOSITORY: Symbol('RECEIPT_REPOSITORY'),
  MERCHANT_REPOSITORY: Symbol('MERCHANT_REPOSITORY'),
  CASHIER_REPOSITORY: Symbol('CASHIER_REPOSITORY'),
  CASH_REGISTER_REPOSITORY: Symbol('CASH_REGISTER_REPOSITORY'),
  POINT_OF_SALE_REPOSITORY: Symbol('POINT_OF_SALE_REPOSITORY'),
  SUPPLIER_REPOSITORY: Symbol('SUPPLIER_REPOSITORY'),
  PEM_REPOSITORY: Symbol('PEM_REPOSITORY'),
  DAILY_REPORT_REPOSITORY: Symbol('DAILY_REPORT_REPOSITORY'),
  JOURNAL_REPOSITORY: Symbol('JOURNAL_REPOSITORY'),
  NOTIFICATION_REPOSITORY: Symbol('NOTIFICATION_REPOSITORY'),
  TELEMETRY_REPOSITORY: Symbol('TELEMETRY_REPOSITORY'),

  RECEIPT_SERVICE: Symbol('RECEIPT_SERVICE'),
  AUTH_SERVICE: Symbol('AUTH_SERVICE'),
  AUTHENTICATION_SERVICE: Symbol('AUTHENTICATION_SERVICE'),
  CERTIFICATE_SERVICE: Symbol('CERTIFICATE_SERVICE'),
  OFFLINE_SERVICE: Symbol('OFFLINE_SERVICE'),
  NOTIFICATION_SERVICE: Symbol('NOTIFICATION_SERVICE'),
  TELEMETRY_SERVICE: Symbol('TELEMETRY_SERVICE'),
} as const;

export class DIContainer {
  private services = new Map<symbol, unknown>();
  private factories = new Map<symbol, () => unknown>();

  register<T>(token: symbol, instance: T): void {
    this.services.set(token, instance);
  }

  registerFactory<T>(token: symbol, factory: () => T): void {
    this.factories.set(token, factory);
  }

  get<T>(token: symbol): T {
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory() as T;
      this.services.set(token, instance);
      return instance;
    }

    throw new Error(`Service not registered: ${token.toString()}`);
  }

  has(token: symbol): boolean {
    return this.services.has(token) || this.factories.has(token);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}
