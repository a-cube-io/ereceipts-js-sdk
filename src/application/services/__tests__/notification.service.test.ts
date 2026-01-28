import { BehaviorSubject, firstValueFrom, take, toArray } from 'rxjs';

import { INetworkPort } from '@/application/ports/driven/network.port';
import { Notification } from '@/domain/entities/notification.entity';
import { INotificationRepository } from '@/domain/repositories/notification.repository';
import { Page } from '@/domain/value-objects/page.vo';

import { NotificationService } from '../notification.service';

// Mock notification data
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'warning',
    title: 'Low battery',
    message: 'Battery level is below 20%',
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: 'notif-2',
    type: 'info',
    title: 'Update available',
    message: 'A new firmware update is available',
    createdAt: new Date().toISOString(),
    read: false,
  },
];

const mockPage: Page<Notification> = {
  members: mockNotifications,
  totalItems: 2,
  currentPage: 1,
  totalPages: 1,
  pageSize: 30,
};

// Mock repository
const createMockRepository = (): INotificationRepository => ({
  fetchNotifications: jest.fn().mockResolvedValue(mockPage),
});

// Mock network port
const createMockNetworkPort = (
  initialOnline = true
): INetworkPort & { setOnline: (v: boolean) => void } => {
  const onlineSubject = new BehaviorSubject(initialOnline);
  return {
    online$: onlineSubject.asObservable(),
    status$: onlineSubject.asObservable(),
    getNetworkInfo: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: initialOnline }),
    destroy: jest.fn(),
    setOnline: (value: boolean) => onlineSubject.next(value),
  };
};

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepo: INotificationRepository;
  let mockNetwork: ReturnType<typeof createMockNetworkPort>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRepo = createMockRepository();
    mockNetwork = createMockNetworkPort();
    service = new NotificationService(mockRepo, mockNetwork, {
      pollIntervalMs: 1000,
      defaultPageSize: 30,
    });
  });

  afterEach(() => {
    service.destroy();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should have empty notifications initially', async () => {
      const notifications = await firstValueFrom(service.notifications$);
      expect(notifications).toEqual([]);
    });

    it('should have idle sync state initially', async () => {
      const state = await firstValueFrom(service.syncState$);
      expect(state.status).toBe('idle');
      expect(state.lastSyncAt).toBeNull();
      expect(state.error).toBeUndefined();
    });
  });

  describe('startPolling', () => {
    it('should fetch notifications immediately when polling starts', async () => {
      service.startPolling();

      await jest.advanceTimersByTimeAsync(0);

      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);
    });

    it('should fetch notifications at regular intervals', async () => {
      service.startPolling();

      await jest.advanceTimersByTimeAsync(0);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1000);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(3);
    });

    it('should update notifications$ with fetched data', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      const notifications = await firstValueFrom(service.notifications$);
      expect(notifications).toEqual(mockNotifications);
    });

    it('should update syncState$ during fetch', async () => {
      const states: Array<{ status: string }> = [];
      service.syncState$.pipe(take(3), toArray()).subscribe((s) => {
        states.push(...s);
      });

      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      expect(states.some((s) => s.status === 'syncing')).toBe(true);
      expect(states.some((s) => s.status === 'idle')).toBe(true);
    });

    it('should not restart polling if already polling', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopPolling', () => {
    it('should stop fetching notifications', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);

      service.stopPolling();

      await jest.advanceTimersByTimeAsync(5000);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerSync', () => {
    it('should fetch notifications manually', async () => {
      const result = await service.triggerSync();
      expect(result).toEqual(mockPage);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchNotifications', () => {
    it('should use default page size', async () => {
      await service.fetchNotifications();

      expect(mockRepo.fetchNotifications).toHaveBeenCalledWith({
        page: 1,
        size: 30,
      });
    });

    it('should use custom params when provided', async () => {
      await service.fetchNotifications({ page: 2, size: 50 });

      expect(mockRepo.fetchNotifications).toHaveBeenCalledWith({
        page: 2,
        size: 50,
      });
    });
  });

  describe('clearNotifications', () => {
    it('should set notifications to empty array', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      let notifications = await firstValueFrom(service.notifications$);
      expect(notifications.length).toBe(2);

      service.clearNotifications();

      notifications = await firstValueFrom(service.notifications$);
      expect(notifications).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should set error state on fetch failure', async () => {
      const error = new Error('Network error');
      (mockRepo.fetchNotifications as jest.Mock).mockRejectedValueOnce(error);

      await service.triggerSync();

      const state = await firstValueFrom(service.syncState$);
      expect(state.status).toBe('error');
      expect(state.error).toBe('Network error');
    });

    it('should call onSyncError callback on failure', async () => {
      const onSyncError = jest.fn();
      service.destroy();

      service = new NotificationService(
        mockRepo,
        mockNetwork,
        { pollIntervalMs: 1000, defaultPageSize: 30 },
        { onSyncError }
      );

      const error = new Error('Network error');
      (mockRepo.fetchNotifications as jest.Mock).mockRejectedValueOnce(error);

      await service.triggerSync();

      expect(onSyncError).toHaveBeenCalledWith(error);
    });

    it('should return empty members array on error', async () => {
      const error = new Error('Network error');
      (mockRepo.fetchNotifications as jest.Mock).mockRejectedValueOnce(error);

      const result = await service.triggerSync();
      expect(result.members).toEqual([]);
    });
  });

  describe('events', () => {
    it('should call onNewNotifications when notifications are fetched', async () => {
      const onNewNotifications = jest.fn();
      service.destroy();

      service = new NotificationService(
        mockRepo,
        mockNetwork,
        { pollIntervalMs: 1000, defaultPageSize: 30 },
        { onNewNotifications }
      );

      await service.triggerSync();

      expect(onNewNotifications).toHaveBeenCalledWith(mockNotifications);
    });

    it('should not call onNewNotifications when no notifications', async () => {
      const onNewNotifications = jest.fn();
      service.destroy();

      (mockRepo.fetchNotifications as jest.Mock).mockResolvedValue({ members: [] });
      service = new NotificationService(
        mockRepo,
        mockNetwork,
        { pollIntervalMs: 1000, defaultPageSize: 30 },
        { onNewNotifications }
      );

      await service.triggerSync();

      expect(onNewNotifications).not.toHaveBeenCalled();
    });
  });

  describe('network reconnection', () => {
    it('should trigger sync when coming back online', async () => {
      mockNetwork.setOnline(false);
      await jest.advanceTimersByTimeAsync(0);

      const initialCalls = (mockRepo.fetchNotifications as jest.Mock).mock.calls.length;

      mockNetwork.setOnline(true);
      await jest.advanceTimersByTimeAsync(0);

      expect((mockRepo.fetchNotifications as jest.Mock).mock.calls.length).toBeGreaterThan(
        initialCalls
      );
    });
  });

  describe('destroy', () => {
    it('should stop polling on destroy', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      service.destroy();

      await jest.advanceTimersByTimeAsync(5000);
      expect(mockRepo.fetchNotifications).toHaveBeenCalledTimes(1);
    });
  });
});
