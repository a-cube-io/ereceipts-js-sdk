import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

import { INetworkPort, NetworkInfo, NetworkStatus } from '@/application/ports/driven';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('NETWORK-BASE');

export abstract class NetworkBase implements INetworkPort {
  protected readonly statusSubject: BehaviorSubject<NetworkStatus>;
  protected readonly destroy$ = new Subject<void>();
  protected readonly debounceMs: number;

  constructor(initialOnline: boolean = true, debounceMs: number = 300) {
    this.debounceMs = debounceMs;
    this.statusSubject = new BehaviorSubject<NetworkStatus>({
      online: initialOnline,
      timestamp: Date.now(),
    });
  }

  get status$(): Observable<NetworkStatus> {
    return this.statusSubject.asObservable().pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged((prev, curr) => prev.online === curr.online),
      takeUntil(this.destroy$)
    );
  }

  get online$(): Observable<boolean> {
    return this.status$.pipe(
      map((status) => status.online),
      distinctUntilChanged()
    );
  }

  abstract getNetworkInfo(): Promise<NetworkInfo | null>;

  protected updateStatus(online: boolean): void {
    const current = this.statusSubject.getValue();
    if (current.online !== online) {
      this.statusSubject.next({ online, timestamp: Date.now() });
      log.debug(`Network status changed: ${online ? 'online' : 'offline'}`);
    }
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.statusSubject.complete();
    log.debug('Network monitor destroyed');
  }
}
