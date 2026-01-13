import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { INetworkPort } from '@/application/ports/driven/network.port';
import { IStoragePort } from '@/application/ports/driven/storage.port';
import { Telemetry } from '@/domain/entities/telemetry.entity';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';

export interface TelemetryState {
  data: Telemetry | null;
  isCached: boolean;
  isLoading: boolean;
  error?: string;
}

export interface TelemetryServiceConfig {
  cacheKeyPrefix: string;
  cacheTtlMs: number;
}

const DEFAULT_CONFIG: TelemetryServiceConfig = {
  cacheKeyPrefix: 'acube_telemetry_',
  cacheTtlMs: 300000,
};

interface CachedTelemetry {
  data: Telemetry;
  timestamp: number;
}

export class TelemetryService {
  private readonly stateSubject = new BehaviorSubject<TelemetryState>({
    data: null,
    isCached: false,
    isLoading: false,
  });
  private readonly destroy$ = new Subject<void>();
  private readonly config: TelemetryServiceConfig;
  private isOnline = true;

  get state$(): Observable<TelemetryState> {
    return this.stateSubject.asObservable();
  }

  constructor(
    private readonly repository: ITelemetryRepository,
    private readonly storagePort: IStoragePort,
    private readonly networkPort: INetworkPort,
    config?: Partial<TelemetryServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    this.networkPort.online$.pipe(takeUntil(this.destroy$)).subscribe((online) => {
      this.isOnline = online;
    });
  }

  async getTelemetry(pemId: string): Promise<TelemetryState> {
    return this.fetchWithFallback(pemId);
  }

  async refreshTelemetry(pemId: string): Promise<TelemetryState> {
    if (!this.isOnline) {
      return this.stateSubject.value;
    }

    this.stateSubject.next({
      ...this.stateSubject.value,
      isLoading: true,
    });

    try {
      const data = await this.repository.getTelemetry(pemId);
      await this.cacheData(pemId, data);

      const newState: TelemetryState = {
        data,
        isCached: false,
        isLoading: false,
      };

      this.stateSubject.next(newState);
      return newState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newState: TelemetryState = {
        ...this.stateSubject.value,
        isLoading: false,
        error: errorMessage,
      };

      this.stateSubject.next(newState);
      return newState;
    }
  }

  private async fetchWithFallback(pemId: string): Promise<TelemetryState> {
    this.stateSubject.next({
      ...this.stateSubject.value,
      isLoading: true,
    });

    if (this.isOnline) {
      try {
        const data = await this.repository.getTelemetry(pemId);
        await this.cacheData(pemId, data);

        const newState: TelemetryState = {
          data,
          isCached: false,
          isLoading: false,
        };

        this.stateSubject.next(newState);
        return newState;
      } catch (error) {
        return this.loadFromCache(pemId, error);
      }
    }

    return this.loadFromCache(pemId);
  }

  private async loadFromCache(pemId: string, originalError?: unknown): Promise<TelemetryState> {
    const cached = await this.getCachedData(pemId);

    if (cached && this.isCacheValid(cached.timestamp)) {
      const newState: TelemetryState = {
        data: cached.data,
        isCached: true,
        isLoading: false,
      };

      this.stateSubject.next(newState);
      return newState;
    }

    const errorMessage =
      originalError instanceof Error ? originalError.message : 'No cached data available';
    const newState: TelemetryState = {
      data: null,
      isCached: false,
      isLoading: false,
      error: errorMessage,
    };

    this.stateSubject.next(newState);
    return newState;
  }

  private async cacheData(pemId: string, data: Telemetry): Promise<void> {
    const cacheKey = this.getCacheKey(pemId);
    const cached: CachedTelemetry = {
      data,
      timestamp: Date.now(),
    };
    await this.storagePort.set(cacheKey, JSON.stringify(cached));
  }

  private async getCachedData(pemId: string): Promise<CachedTelemetry | null> {
    const cacheKey = this.getCacheKey(pemId);
    const stored = await this.storagePort.get(cacheKey);

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as CachedTelemetry;
    } catch {
      return null;
    }
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.cacheTtlMs;
  }

  private getCacheKey(pemId: string): string {
    return `${this.config.cacheKeyPrefix}${pemId}`;
  }

  clearCache(pemId: string): Promise<void> {
    return this.storagePort.remove(this.getCacheKey(pemId));
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
