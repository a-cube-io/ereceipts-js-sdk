import { BehaviorSubject, Observable, Subject, Subscription, interval } from 'rxjs';
import { filter, pairwise, startWith, switchMap, takeUntil } from 'rxjs/operators';

import { INetworkPort } from '@/application/ports/driven/network.port';
import { Notification, NotificationListParams } from '@/domain/entities/notification.entity';
import { INotificationRepository } from '@/domain/repositories/notification.repository';
import { Page } from '@/domain/value-objects/page.vo';

export interface NotificationServiceConfig {
  pollIntervalMs: number;
  defaultPageSize: number;
}

export interface NotificationSyncState {
  status: 'idle' | 'syncing' | 'error';
  lastSyncAt: number | null;
  error?: string;
}

export interface NotificationEvents {
  onNewNotifications?: (notifications: Notification[]) => void;
  onSyncError?: (error: Error) => void;
}

const DEFAULT_CONFIG: NotificationServiceConfig = {
  pollIntervalMs: 30000,
  defaultPageSize: 30,
};

export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly syncStateSubject = new BehaviorSubject<NotificationSyncState>({
    status: 'idle',
    lastSyncAt: null,
  });
  private readonly destroy$ = new Subject<void>();
  private pollingSubscription?: Subscription;
  private networkSubscription?: Subscription;
  private readonly config: NotificationServiceConfig;

  get notifications$(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  get syncState$(): Observable<NotificationSyncState> {
    return this.syncStateSubject.asObservable();
  }

  constructor(
    private readonly repository: INotificationRepository,
    private readonly networkPort: INetworkPort,
    config?: Partial<NotificationServiceConfig>,
    private readonly events?: NotificationEvents
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

  startPolling(): void {
    if (this.pollingSubscription) {
      return;
    }

    this.pollingSubscription = interval(this.config.pollIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchNotifications()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  async triggerSync(): Promise<Page<Notification>> {
    return this.fetchNotifications();
  }

  async fetchNotifications(params?: NotificationListParams): Promise<Page<Notification>> {
    this.syncStateSubject.next({
      ...this.syncStateSubject.value,
      status: 'syncing',
    });

    try {
      const fetchParams: NotificationListParams = {
        page: params?.page ?? 1,
        size: params?.size ?? this.config.defaultPageSize,
      };

      const page = await this.repository.fetchNotifications(fetchParams);

      this.notificationsSubject.next(page.members);

      if (page.members.length > 0) {
        this.events?.onNewNotifications?.(page.members);
      }

      this.syncStateSubject.next({
        status: 'idle',
        lastSyncAt: Date.now(),
      });

      return page;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.syncStateSubject.next({
        status: 'error',
        lastSyncAt: this.syncStateSubject.value.lastSyncAt,
        error: errorMessage,
      });

      if (error instanceof Error) {
        this.events?.onSyncError?.(error);
      }

      return { members: [] };
    }
  }

  clearNotifications(): void {
    this.notificationsSubject.next([]);
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pollingSubscription?.unsubscribe();
    this.networkSubscription?.unsubscribe();
  }
}
