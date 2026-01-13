import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

import { INetworkPort } from '@/application/ports/driven/network.port';
import { Notification } from '@/domain/entities/notification.entity';

export type AppMode = 'NORMAL' | 'WARNING' | 'BLOCKED' | 'OFFLINE';

export interface WarningState {
  active: boolean;
  blockAt: Date | null;
  remainingMs: number;
}

export interface AppState {
  mode: AppMode;
  isOnline: boolean;
  warning: WarningState;
  lastNotification: Notification | null;
}

const INITIAL_STATE: AppState = {
  mode: 'NORMAL',
  isOnline: true,
  warning: {
    active: false,
    blockAt: null,
    remainingMs: 0,
  },
  lastNotification: null,
};

export class AppStateService {
  private readonly stateSubject = new BehaviorSubject<AppState>(INITIAL_STATE);
  private readonly destroy$ = new Subject<void>();
  private warningTimerId: ReturnType<typeof setInterval> | null = null;

  get state$(): Observable<AppState> {
    return this.stateSubject.asObservable();
  }

  get mode$(): Observable<AppMode> {
    return this.state$.pipe(
      map((s) => s.mode),
      distinctUntilChanged()
    );
  }

  get isBlocked$(): Observable<boolean> {
    return this.mode$.pipe(map((m) => m === 'BLOCKED'));
  }

  get warning$(): Observable<WarningState> {
    return this.state$.pipe(
      map((s) => s.warning),
      distinctUntilChanged((a, b) => a.active === b.active && a.remainingMs === b.remainingMs)
    );
  }

  constructor(
    private readonly notifications$: Observable<Notification[]>,
    private readonly networkPort: INetworkPort
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    combineLatest([this.notifications$, this.networkPort.online$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([notifications, isOnline]) => {
        this.processState(notifications, isOnline);
      });
  }

  private processState(notifications: Notification[], isOnline: boolean): void {
    if (!isOnline) {
      this.updateState({
        mode: 'OFFLINE',
        isOnline: false,
        warning: { active: false, blockAt: null, remainingMs: 0 },
        lastNotification: null,
      });
      this.stopWarningTimer();
      return;
    }

    const latestByCode = this.getLatestNotificationByCode(notifications);

    const sysCritical = latestByCode.get('SYS-C-01');
    const sysInfo = latestByCode.get('SYS-I-01');
    const sysWarning = latestByCode.get('SYS-W-01');

    let newMode: AppMode = 'NORMAL';
    let warningState: WarningState = { active: false, blockAt: null, remainingMs: 0 };

    if (sysCritical && sysInfo) {
      const criticalTime = new Date(sysCritical.createdAt).getTime();
      const infoTime = new Date(sysInfo.createdAt).getTime();
      newMode = criticalTime > infoTime ? 'BLOCKED' : 'NORMAL';
    } else if (sysCritical) {
      newMode = 'BLOCKED';
    }

    if (newMode !== 'BLOCKED' && sysWarning && sysWarning.code === 'SYS-W-01') {
      const blockAtStr = sysWarning.data.block_at;
      const blockAt = new Date(blockAtStr);
      const now = Date.now();
      const remainingMs = blockAt.getTime() - now;

      if (remainingMs > 0) {
        newMode = 'WARNING';
        warningState = {
          active: true,
          blockAt,
          remainingMs,
        };
        this.startWarningTimer(blockAt);
      }
    } else {
      this.stopWarningTimer();
    }

    const lastNotification = this.getMostRecentNotification(notifications);

    this.updateState({
      mode: newMode,
      isOnline: true,
      warning: warningState,
      lastNotification,
    });
  }

  private getLatestNotificationByCode(notifications: Notification[]): Map<string, Notification> {
    const map = new Map<string, Notification>();

    const sorted = [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const notif of sorted) {
      if (!map.has(notif.code)) {
        map.set(notif.code, notif);
      }
    }

    return map;
  }

  private getMostRecentNotification(notifications: Notification[]): Notification | null {
    if (notifications.length === 0) return null;

    return (
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0] ?? null
    );
  }

  private startWarningTimer(blockAt: Date): void {
    this.stopWarningTimer();

    this.warningTimerId = setInterval(() => {
      const remainingMs = blockAt.getTime() - Date.now();

      if (remainingMs <= 0) {
        this.stopWarningTimer();
        return;
      }

      const current = this.stateSubject.value;
      if (current.warning.active) {
        this.updateState({
          ...current,
          warning: {
            ...current.warning,
            remainingMs,
          },
        });
      }
    }, 1000);
  }

  private stopWarningTimer(): void {
    if (this.warningTimerId) {
      clearInterval(this.warningTimerId);
      this.warningTimerId = null;
    }
  }

  private updateState(newState: AppState): void {
    this.stateSubject.next(newState);
  }

  destroy(): void {
    this.stopWarningTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
