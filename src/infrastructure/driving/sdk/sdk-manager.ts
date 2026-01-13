import { Observable } from 'rxjs';

import { PlatformAdapters } from '@/application/ports/driven';
import { INetworkPort } from '@/application/ports/driven/network.port';
import { IStoragePort } from '@/application/ports/driven/storage.port';
import {
  AppMode,
  AppState,
  AppStateService,
  WarningState,
} from '@/application/services/app-state.service';
import { NotificationService } from '@/application/services/notification.service';
import { TelemetryService, TelemetryState } from '@/application/services/telemetry.service';
import { Telemetry } from '@/domain/entities/telemetry.entity';
import { ICashRegisterRepository } from '@/domain/repositories/cash-register.repository';
import { ICashierRepository } from '@/domain/repositories/cashier.repository';
import { IDailyReportRepository } from '@/domain/repositories/daily-report.repository';
import { IJournalRepository } from '@/domain/repositories/journal.repository';
import { IMerchantRepository } from '@/domain/repositories/merchant.repository';
import { IPemRepository } from '@/domain/repositories/pem.repository';
import { IPointOfSaleRepository } from '@/domain/repositories/point-of-sale.repository';
import { IReceiptRepository } from '@/domain/repositories/receipt.repository';
import { ISupplierRepository } from '@/domain/repositories/supplier.repository';
import { ACubeSDKError, AuthCredentials, SDKConfig, User } from '@/shared/types';

import { ACubeSDK, SDKEvents } from './acube-sdk';

/**
 * Configuration for SDKManager
 */
export interface SDKManagerConfig extends SDKConfig {
  /** Notification polling interval in milliseconds (default: 30000) */
  notificationPollIntervalMs?: number;
  /** Notification page size for fetching (default: 30) */
  notificationPageSize?: number;
  /** Telemetry cache TTL in milliseconds (default: 300000) */
  telemetryCacheTtlMs?: number;
}

/**
 * Simplified telemetry operations for product use
 */
export interface TelemetryOperations {
  /** Get telemetry data for a PEM, with cache fallback when offline */
  getTelemetry: (pemId: string) => Promise<TelemetryState>;
  /** Force refresh telemetry data from server */
  refreshTelemetry: (pemId: string) => Promise<TelemetryState>;
  /** Clear cached telemetry for a PEM */
  clearCache: (pemId: string) => Promise<void>;
}

/**
 * Simplified services interface for product use
 * Exposes only what product developers need
 */
export interface ManagedServices {
  // Business repositories
  receipts: IReceiptRepository;
  merchants: IMerchantRepository;
  cashiers: ICashierRepository;
  cashRegisters: ICashRegisterRepository;
  pointOfSales: IPointOfSaleRepository;
  suppliers: ISupplierRepository;
  pems: IPemRepository;
  dailyReports: IDailyReportRepository;
  journals: IJournalRepository;

  // Simplified telemetry operations
  telemetry: TelemetryOperations;

  // Auth operations
  login: (credentials: AuthCredentials) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isAuthenticated: () => Promise<boolean>;

  // Certificate operations
  storeCertificate: (
    certificate: string,
    privateKey: string,
    options?: { format?: 'pem' | 'p12' }
  ) => Promise<void>;
  hasCertificate: () => Promise<boolean>;
  clearCertificate: () => Promise<void>;

  // Network status
  isOnline: () => boolean;
}

/**
 * Events emitted by SDKManager
 */
export interface SDKManagerEvents extends SDKEvents {
  onAppStateChanged?: (state: AppState) => void;
  onTelemetryStateChanged?: (state: TelemetryState) => void;
}

/**
 * SDKManager - Singleton wrapper for ACubeSDK with simplified API
 *
 * Provides:
 * - Single initialization point
 * - Observable app state (NORMAL, WARNING, BLOCKED, OFFLINE)
 * - Observable telemetry state
 * - Simplified services for product use
 *
 * @example
 * ```typescript
 * // Configure once at app startup
 * SDKManager.configure({
 *   environment: 'sandbox',
 *   notificationPollIntervalMs: 30000,
 * });
 *
 * // Initialize
 * await SDKManager.getInstance().initialize();
 *
 * // Use in components
 * const manager = SDKManager.getInstance();
 * manager.appState$.subscribe(state => {
 *   console.log('App mode:', state.mode);
 * });
 *
 * // Cleanup
 * SDKManager.destroy();
 * ```
 */
export class SDKManager {
  private static instance: SDKManager | null = null;

  private sdk: ACubeSDK | null = null;
  private notificationService: NotificationService | null = null;
  private telemetryService: TelemetryService | null = null;
  private appStateService: AppStateService | null = null;
  private isInitialized = false;

  private constructor(
    private readonly config: SDKManagerConfig,
    private readonly adapters?: PlatformAdapters,
    private readonly events?: SDKManagerEvents
  ) {}

  /**
   * Configure the SDKManager singleton
   * Must be called before getInstance()
   */
  static configure(
    config: SDKManagerConfig,
    adapters?: PlatformAdapters,
    events?: SDKManagerEvents
  ): void {
    if (SDKManager.instance) {
      throw new ACubeSDKError(
        'SDK_ALREADY_CONFIGURED',
        'SDKManager already configured. Call destroy() first to reconfigure.'
      );
    }
    SDKManager.instance = new SDKManager(config, adapters, events);
  }

  /**
   * Get the SDKManager singleton instance
   * Throws if not configured
   */
  static getInstance(): SDKManager {
    if (!SDKManager.instance) {
      throw new ACubeSDKError(
        'SDK_NOT_CONFIGURED',
        'SDKManager not configured. Call SDKManager.configure(config) first.'
      );
    }
    return SDKManager.instance;
  }

  /**
   * Check if SDKManager is configured
   */
  static isConfigured(): boolean {
    return SDKManager.instance !== null;
  }

  /**
   * Destroy the singleton and cleanup resources
   */
  static destroy(): void {
    if (SDKManager.instance) {
      SDKManager.instance.cleanup();
      SDKManager.instance = null;
    }
  }

  /**
   * Initialize the SDK and all services
   * Must be called after configure()
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Create and initialize SDK
    this.sdk = new ACubeSDK(this.config, this.adapters, this.events);
    await this.sdk.initialize();

    // Get required adapters
    const adaptersRef = this.sdk.getAdapters();
    if (!adaptersRef) {
      throw new ACubeSDKError('ADAPTERS_NOT_AVAILABLE', 'Platform adapters not available');
    }

    const networkPort = adaptersRef.networkMonitor as INetworkPort;
    const storagePort = adaptersRef.storage as IStoragePort;

    // Get repositories from SDK
    const notificationRepo = this.sdk.notifications;
    const telemetryRepo = this.sdk.telemetry;

    // Create NotificationService
    this.notificationService = new NotificationService(notificationRepo, networkPort, {
      pollIntervalMs: this.config.notificationPollIntervalMs ?? 30000,
      defaultPageSize: this.config.notificationPageSize ?? 30,
    });

    // Create TelemetryService
    this.telemetryService = new TelemetryService(telemetryRepo, storagePort, networkPort, {
      cacheTtlMs: this.config.telemetryCacheTtlMs ?? 300000,
    });

    // Create AppStateService
    this.appStateService = new AppStateService(
      this.notificationService.notifications$,
      networkPort
    );

    // Subscribe to state changes for events
    if (this.events?.onAppStateChanged) {
      this.appStateService.state$.subscribe(this.events.onAppStateChanged);
    }
    if (this.events?.onTelemetryStateChanged) {
      this.telemetryService.state$.subscribe(this.events.onTelemetryStateChanged);
    }

    // Start notification polling
    this.notificationService.startPolling();

    this.isInitialized = true;
  }

  /**
   * Observable stream of app state
   * Emits AppState with mode (NORMAL, WARNING, BLOCKED, OFFLINE)
   */
  get appState$(): Observable<AppState> {
    this.ensureInitialized();
    return this.appStateService!.state$;
  }

  /**
   * Observable stream of app mode only
   * Emits AppMode with distinctUntilChanged
   */
  get mode$(): Observable<AppMode> {
    this.ensureInitialized();
    return this.appStateService!.mode$;
  }

  /**
   * Observable stream indicating if app is blocked
   */
  get isBlocked$(): Observable<boolean> {
    this.ensureInitialized();
    return this.appStateService!.isBlocked$;
  }

  /**
   * Observable stream of warning state with countdown
   */
  get warning$(): Observable<WarningState> {
    this.ensureInitialized();
    return this.appStateService!.warning$;
  }

  /**
   * Observable stream of telemetry state
   */
  get telemetryState$(): Observable<TelemetryState> {
    this.ensureInitialized();
    return this.telemetryService!.state$;
  }

  /**
   * Get simplified services for product use
   */
  getServices(): ManagedServices {
    this.ensureInitialized();

    const sdk = this.sdk!;
    const telemetryService = this.telemetryService!;

    return {
      // Business repositories
      receipts: sdk.receipts,
      merchants: sdk.merchants,
      cashiers: sdk.cashiers,
      cashRegisters: sdk.cashRegisters,
      pointOfSales: sdk.pointOfSales,
      suppliers: sdk.suppliers,
      pems: sdk.pems,
      dailyReports: sdk.dailyReports,
      journals: sdk.journals,

      // Simplified telemetry operations
      telemetry: {
        getTelemetry: (pemId: string): Promise<TelemetryState> =>
          telemetryService.getTelemetry(pemId),
        refreshTelemetry: (pemId: string): Promise<TelemetryState> =>
          telemetryService.refreshTelemetry(pemId),
        clearCache: (pemId: string): Promise<void> => telemetryService.clearCache(pemId),
      },

      // Auth operations
      login: (credentials: AuthCredentials): Promise<User> => sdk.login(credentials),
      logout: (): Promise<void> => sdk.logout(),
      getCurrentUser: (): Promise<User | null> => sdk.getCurrentUser(),
      isAuthenticated: (): Promise<boolean> => sdk.isAuthenticated(),

      // Certificate operations
      storeCertificate: (
        certificate: string,
        privateKey: string,
        options?: { format?: 'pem' | 'p12' }
      ): Promise<void> => sdk.storeCertificate(certificate, privateKey, options),
      hasCertificate: (): Promise<boolean> => sdk.hasCertificate(),
      clearCertificate: (): Promise<void> => sdk.clearCertificate(),

      // Network status
      isOnline: (): boolean => sdk.isOnline(),
    };
  }

  /**
   * Manually trigger a notification sync
   */
  async syncNotifications(): Promise<void> {
    this.ensureInitialized();
    await this.notificationService!.triggerSync();
  }

  /**
   * Get telemetry for a specific PEM
   */
  async getTelemetry(pemId: string): Promise<Telemetry | null> {
    this.ensureInitialized();
    const state = await this.telemetryService!.getTelemetry(pemId);
    return state.data;
  }

  /**
   * Check if the manager is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the underlying SDK instance (for advanced use cases)
   */
  getSDK(): ACubeSDK {
    this.ensureInitialized();
    return this.sdk!;
  }

  private cleanup(): void {
    this.notificationService?.destroy();
    this.telemetryService?.destroy();
    this.appStateService?.destroy();
    this.sdk?.destroy();

    this.notificationService = null;
    this.telemetryService = null;
    this.appStateService = null;
    this.sdk = null;
    this.isInitialized = false;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ACubeSDKError(
        'SDK_NOT_INITIALIZED',
        'SDKManager not initialized. Call initialize() first.'
      );
    }
  }
}
