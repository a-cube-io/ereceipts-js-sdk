import { Observable } from 'rxjs';

import { PlatformAdapters } from '@/application/ports/driven';
import { INetworkPort } from '@/application/ports/driven/network.port';
import {
  AppMode,
  AppState,
  AppStateService,
  WarningState,
} from '@/application/services/app-state.service';
import { NotificationService } from '@/application/services/notification.service';
import { TelemetryService, TelemetryState } from '@/application/services/telemetry.service';
import { ICashRegisterRepository } from '@/domain/repositories/cash-register.repository';
import { ICashierRepository } from '@/domain/repositories/cashier.repository';
import { IDailyReportRepository } from '@/domain/repositories/daily-report.repository';
import { IJournalRepository } from '@/domain/repositories/journal.repository';
import { IMerchantRepository } from '@/domain/repositories/merchant.repository';
import { IPemRepository } from '@/domain/repositories/pem.repository';
import { IPointOfSaleRepository } from '@/domain/repositories/point-of-sale.repository';
import { IReceiptRepository } from '@/domain/repositories/receipt.repository';
import { ISupplierRepository } from '@/domain/repositories/supplier.repository';
import { hasAnyRole } from '@/domain/value-objects/role.vo';
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
  /** Telemetry polling interval in milliseconds (default: 60000) */
  telemetryPollIntervalMs?: number;
}

/**
 * Simplified telemetry operations for product use
 */
export interface TelemetryOperations {
  /** Start polling telemetry using pemId from installed certificate */
  startPollingAuto: () => Promise<string | null>;
  /** Start polling telemetry for a specific PEM */
  startPolling: (pemId: string) => void;
  /** Stop polling telemetry */
  stopPolling: () => void;
  /** Get telemetry state for a specific PEM (starts polling if not already) */
  getTelemetry: (pemId: string) => Promise<TelemetryState>;
  /** Refresh telemetry for a specific PEM */
  refreshTelemetry: (pemId: string) => Promise<TelemetryState>;
  /** Manually trigger a telemetry sync */
  triggerSync: () => Promise<TelemetryState>;
  /** Clear current telemetry data */
  clearTelemetry: () => void;
  /** Get the pemId from the installed certificate */
  getPemId: () => Promise<string | null>;
}

/**
 * Simplified services interface for product use
 * Exposes only what product developers need
 */
export interface ManagedServices {
  receipts: IReceiptRepository;
  merchants: IMerchantRepository;
  cashiers: ICashierRepository;
  cashRegisters: ICashRegisterRepository;
  pointOfSales: IPointOfSaleRepository;
  suppliers: ISupplierRepository;
  pems: IPemRepository;
  dailyReports: IDailyReportRepository;
  journals: IJournalRepository;
  telemetry: TelemetryOperations;
  login: (credentials: AuthCredentials) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isAuthenticated: () => Promise<boolean>;
  storeCertificate: (
    certificate: string,
    privateKey: string,
    options?: { format?: 'pem' | 'p12' }
  ) => Promise<void>;
  hasCertificate: () => Promise<boolean>;
  clearCertificate: () => Promise<void>;
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
 * - Observable telemetry state with polling
 * - Simplified services for product use
 *
 * @example
 * ```typescript
 * // Configure once at app startup
 * SDKManager.configure({
 *   environment: 'sandbox',
 *   notificationPollIntervalMs: 30000,
 *   telemetryPollIntervalMs: 60000,
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
 * // Start telemetry polling for a specific PEM
 * manager.startTelemetryPolling('PEM-123');
 *
 * // Subscribe to telemetry updates
 * manager.telemetry$.subscribe(telemetry => {
 *   console.log('Telemetry:', telemetry);
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
  private isPollingActive = false;

  private constructor(
    private readonly config: SDKManagerConfig,
    private readonly adapters?: PlatformAdapters,
    private readonly events?: SDKManagerEvents
  ) {}

  /**
   * Handle user state changes (login/logout/token expiration)
   * Manages polling lifecycle based on user role
   */
  private handleUserChanged = async (user: User | null): Promise<void> => {
    // Always call user's event handler first
    this.events?.onUserChanged?.(user);

    if (!this.isInitialized) return;

    if (user) {
      // User logged in - check role and start polling if allowed
      const canPoll = hasAnyRole(user.roles, ['ROLE_MERCHANT', 'ROLE_CASHIER']);
      if (canPoll && !this.isPollingActive) {
        this.notificationService?.startPolling();
        await this.startTelemetryPollingAuto();
        this.isPollingActive = true;
      }
    } else {
      // User logged out or token expired - stop polling
      if (this.isPollingActive) {
        this.notificationService?.stopPolling();
        this.telemetryService?.stopPolling();
        this.telemetryService?.clearTelemetry();
        this.isPollingActive = false;
      }
    }
  };

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
    if (this.isInitialized) return;

    // Wrap events to intercept onUserChanged for polling lifecycle management
    const wrappedEvents: SDKManagerEvents = {
      ...this.events,
      onUserChanged: this.handleUserChanged,
    };

    this.sdk = new ACubeSDK(this.config, this.adapters, wrappedEvents);
    await this.sdk.initialize();

    const adaptersRef = this.sdk.getAdapters();
    if (!adaptersRef) {
      throw new ACubeSDKError('ADAPTERS_NOT_AVAILABLE', 'Platform adapters not available');
    }

    const networkPort = adaptersRef.networkMonitor as INetworkPort;
    const notificationRepo = this.sdk.notifications;
    const telemetryRepo = this.sdk.telemetry;

    this.notificationService = new NotificationService(notificationRepo, networkPort, {
      pollIntervalMs: this.config.notificationPollIntervalMs ?? 30000,
      defaultPageSize: this.config.notificationPageSize ?? 30,
    });

    this.telemetryService = new TelemetryService(telemetryRepo, networkPort, {
      pollIntervalMs: this.config.telemetryPollIntervalMs ?? 60000,
    });

    this.appStateService = new AppStateService(
      this.notificationService.notifications$,
      networkPort
    );

    if (this.events?.onAppStateChanged) {
      this.appStateService.state$.subscribe(this.events.onAppStateChanged);
    }
    if (this.events?.onTelemetryStateChanged) {
      this.telemetryService.state$.subscribe(this.events.onTelemetryStateChanged);
    }

    this.isInitialized = true;

    // Only start polling for MERCHANT/CASHIER users (SUPPLIER gets 401 on these endpoints)
    const user = await this.sdk.getCurrentUser();
    const canPoll = user && hasAnyRole(user.roles, ['ROLE_MERCHANT', 'ROLE_CASHIER']);

    if (canPoll) {
      this.notificationService.startPolling();
      await this.startTelemetryPollingAuto();
      this.isPollingActive = true;
    }
    // AppStateService remains active for all users (handles OFFLINE network state)
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
   * Observable stream of telemetry state (data, isLoading, isCached, error)
   */
  get telemetryState$(): Observable<TelemetryState> {
    this.ensureInitialized();
    return this.telemetryService!.state$;
  }

  /**
   * Get the pemId from the installed certificate
   */
  async getPemId(): Promise<string | null> {
    this.ensureInitialized();
    try {
      const certInfo = await this.sdk!.getCertificatesInfo();
      return certInfo?.pemId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Start polling telemetry using the pemId from installed certificate
   * Returns the pemId if successful, null if no certificate is installed
   */
  async startTelemetryPollingAuto(): Promise<string | null> {
    this.ensureInitialized();
    const pemId = await this.getPemId();
    if (pemId) {
      this.telemetryService!.startPolling(pemId);
    }
    return pemId;
  }

  /**
   * Start polling telemetry for a specific PEM
   */
  startTelemetryPolling(pemId: string): void {
    this.ensureInitialized();
    this.telemetryService!.startPolling(pemId);
  }

  /**
   * Stop telemetry polling
   */
  stopTelemetryPolling(): void {
    this.ensureInitialized();
    this.telemetryService!.stopPolling();
  }

  /**
   * Get simplified services for product use
   */
  getServices(): ManagedServices {
    this.ensureInitialized();

    const sdk = this.sdk!;
    const telemetryService = this.telemetryService!;

    return {
      receipts: sdk.receipts,
      merchants: sdk.merchants,
      cashiers: sdk.cashiers,
      cashRegisters: sdk.cashRegisters,
      pointOfSales: sdk.pointOfSales,
      suppliers: sdk.suppliers,
      pems: sdk.pems,
      dailyReports: sdk.dailyReports,
      journals: sdk.journals,
      telemetry: {
        startPollingAuto: (): Promise<string | null> => this.startTelemetryPollingAuto(),
        startPolling: (pemId: string): void => telemetryService.startPolling(pemId),
        stopPolling: (): void => telemetryService.stopPolling(),
        getTelemetry: (pemId: string): Promise<TelemetryState> =>
          telemetryService.getTelemetry(pemId),
        refreshTelemetry: (pemId: string): Promise<TelemetryState> =>
          telemetryService.refreshTelemetry(pemId),
        triggerSync: (): Promise<TelemetryState> => telemetryService.triggerSync(),
        clearTelemetry: (): void => telemetryService.clearTelemetry(),
        getPemId: (): Promise<string | null> => this.getPemId(),
      },
      login: (credentials: AuthCredentials): Promise<User> => sdk.login(credentials),
      logout: (): Promise<void> => sdk.logout(),
      getCurrentUser: (): Promise<User | null> => sdk.getCurrentUser(),
      isAuthenticated: (): Promise<boolean> => sdk.isAuthenticated(),
      storeCertificate: (
        certificate: string,
        privateKey: string,
        options?: { format?: 'pem' | 'p12' }
      ): Promise<void> => sdk.storeCertificate(certificate, privateKey, options),
      hasCertificate: (): Promise<boolean> => sdk.hasCertificate(),
      clearCertificate: (): Promise<void> => sdk.clearCertificate(),
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
   * Manually trigger a telemetry sync
   */
  async syncTelemetry(): Promise<TelemetryState> {
    this.ensureInitialized();
    return this.telemetryService!.triggerSync();
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
    this.isPollingActive = false;
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
