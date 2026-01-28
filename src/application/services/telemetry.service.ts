import { BehaviorSubject, Observable, Subject, Subscription, interval } from 'rxjs';
import { filter, pairwise, startWith, switchMap, takeUntil } from 'rxjs/operators';

import { INetworkPort } from '@/application/ports/driven/network.port';
import { Telemetry } from '@/domain/entities/telemetry.entity';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';

export interface TelemetryState {
  data: Telemetry | null;
  isCached: boolean;
  isLoading: boolean;
  lastFetchedAt: number | null;
  error?: string;
}

export interface TelemetryServiceConfig {
  pollIntervalMs: number;
}

export interface TelemetryEvents {
  onTelemetryUpdate?: (telemetry: Telemetry) => void;
  onSyncError?: (error: Error) => void;
}

const DEFAULT_CONFIG: TelemetryServiceConfig = {
  pollIntervalMs: 60000, // 1 minute default for telemetry
};

export class TelemetryService {
  private readonly stateSubject = new BehaviorSubject<TelemetryState>({
    data: null,
    isCached: false,
    isLoading: false,
    lastFetchedAt: null,
  });
  private readonly destroy$ = new Subject<void>();
  private pollingSubscription?: Subscription;
  private networkSubscription?: Subscription;
  private readonly config: TelemetryServiceConfig;
  private currentPemId?: string;

  get state$(): Observable<TelemetryState> {
    return this.stateSubject.asObservable();
  }

  constructor(
    private readonly repository: ITelemetryRepository,
    private readonly networkPort: INetworkPort,
    config?: Partial<TelemetryServiceConfig>,
    private readonly events?: TelemetryEvents
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    this.networkSubscription = this.networkPort.online$
      .pipe(
        startWith(true),
        pairwise(),
        filter(([wasOnline, isNowOnline]) => !wasOnline && isNowOnline),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.triggerSync();
      });
  }

  startPolling(pemId: string): void {
    if (this.pollingSubscription) {
      // If already polling for same pemId, do nothing
      if (this.currentPemId === pemId) {
        return;
      }
      // If polling for different pemId, stop and restart
      this.stopPolling();
    }

    this.currentPemId = pemId;

    this.pollingSubscription = interval(this.config.pollIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchTelemetry()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
    this.currentPemId = undefined;
  }

  async triggerSync(): Promise<TelemetryState> {
    if (!this.currentPemId) {
      return this.stateSubject.value;
    }
    return this.fetchTelemetry();
  }

  async getTelemetry(pemId: string): Promise<TelemetryState> {
    // Start polling if not already polling for this pemId
    if (this.currentPemId !== pemId) {
      this.startPolling(pemId);
    }
    return this.stateSubject.value;
  }

  async refreshTelemetry(pemId: string): Promise<TelemetryState> {
    // Update pemId and fetch immediately
    if (this.currentPemId !== pemId) {
      this.startPolling(pemId);
    } else {
      return this.fetchTelemetry();
    }
    return this.stateSubject.value;
  }

  private async fetchTelemetry(): Promise<TelemetryState> {
    if (!this.currentPemId) {
      return this.stateSubject.value;
    }

    this.stateSubject.next({
      ...this.stateSubject.value,
      isLoading: true,
      error: undefined,
    });

    try {
      const data = await this.repository.getTelemetry(this.currentPemId);

      const newState: TelemetryState = {
        data,
        isCached: false,
        isLoading: false,
        lastFetchedAt: Date.now(),
      };

      this.stateSubject.next(newState);
      this.events?.onTelemetryUpdate?.(data);
      return newState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newState: TelemetryState = {
        ...this.stateSubject.value,
        isLoading: false,
        error: errorMessage,
      };

      this.stateSubject.next(newState);

      if (error instanceof Error) {
        this.events?.onSyncError?.(error);
      }

      return newState;
    }
  }

  clearTelemetry(): void {
    this.stateSubject.next({
      data: null,
      isCached: false,
      isLoading: false,
      lastFetchedAt: null,
    });
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pollingSubscription?.unsubscribe();
    this.networkSubscription?.unsubscribe();
  }
}
