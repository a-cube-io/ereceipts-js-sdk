import { BehaviorSubject, firstValueFrom, take, toArray } from 'rxjs';

import { INetworkPort } from '@/application/ports/driven/network.port';
import { Telemetry } from '@/domain/entities/telemetry.entity';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';

import { TelemetryService, TelemetryState } from '../telemetry.service';

const mockTelemetry: Telemetry = {
  pemId: 'DEVE-00000J',
  pemStatus: 'active',
  pemStatusChangedAt: new Date().toISOString(),
  merchant: { id: '123', name: 'Test' },
  pointOfSale: { id: '456', name: 'POS1' },
  cashRegister: { id: '789', serialNumber: 'SN123' },
  lastTransmission: new Date().toISOString(),
  dailyReportStatus: 'completed',
  lastDailyReport: new Date().toISOString(),
  memoryUsage: 50,
  certificateExpiry: new Date().toISOString(),
  firmwareVersion: '1.2.3',
};

const createMockRepository = (): ITelemetryRepository => ({
  getTelemetry: jest.fn().mockResolvedValue(mockTelemetry),
});

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

describe('TelemetryService', () => {
  let service: TelemetryService;
  let mockRepo: ITelemetryRepository;
  let mockNetwork: ReturnType<typeof createMockNetworkPort>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRepo = createMockRepository();
    mockNetwork = createMockNetworkPort();
    service = new TelemetryService(mockRepo, mockNetwork, { pollIntervalMs: 1000 });
  });

  afterEach(() => {
    service.destroy();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should have null data initially', async () => {
      const state = await firstValueFrom(service.state$);
      expect(state.data).toBeNull();
    });

    it('should not be loading initially', async () => {
      const state = await firstValueFrom(service.state$);
      expect(state.isLoading).toBe(false);
    });

    it('should have null lastFetchedAt initially', async () => {
      const state = await firstValueFrom(service.state$);
      expect(state.lastFetchedAt).toBeNull();
    });
  });

  describe('startPolling', () => {
    it('should fetch telemetry immediately when polling starts', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      expect(mockRepo.getTelemetry).toHaveBeenCalledWith();
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);
    });

    it('should fetch telemetry at regular intervals', async () => {
      service.startPolling();

      await jest.advanceTimersByTimeAsync(0);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1000);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(3);
    });

    it('should update state$ with fetched data', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      const state = await firstValueFrom(service.state$);
      expect(state.data).toEqual(mockTelemetry);
      expect(state.isLoading).toBe(false);
      expect(state.lastFetchedAt).not.toBeNull();
    });

    it('should set isLoading during fetch', async () => {
      const states: TelemetryState[] = [];
      service.state$.pipe(take(3), toArray()).subscribe((s) => {
        states.push(...s);
      });

      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      expect(states.some((s) => s.isLoading === true)).toBe(true);
      expect(states.some((s) => s.isLoading === false)).toBe(true);
    });

    it('should not restart polling if already polling', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopPolling', () => {
    it('should stop fetching telemetry', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);

      service.stopPolling();

      await jest.advanceTimersByTimeAsync(5000);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerSync', () => {
    it('should return current state when polling is not active', async () => {
      const result = await service.triggerSync();
      expect(result.data).toBeNull();
    });

    it('should fetch telemetry when polling is active', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      (mockRepo.getTelemetry as jest.Mock).mockClear();

      const result = await service.triggerSync();
      expect(result.data).toEqual(mockTelemetry);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTelemetry', () => {
    it('should start polling if not already polling', async () => {
      const state = await service.getTelemetry();
      expect(state).toBeDefined();
      expect(mockRepo.getTelemetry).toHaveBeenCalled();
    });

    it('should return current state if already polling', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      const state = await service.getTelemetry();
      expect(state.data).toEqual(mockTelemetry);
    });
  });

  describe('refreshTelemetry', () => {
    it('should fetch fresh telemetry', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      (mockRepo.getTelemetry as jest.Mock).mockClear();

      const state = await service.refreshTelemetry();
      expect(state.data).toEqual(mockTelemetry);
    });
  });

  describe('clearTelemetry', () => {
    it('should set telemetry data to null', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      service.clearTelemetry();

      const state = await firstValueFrom(service.state$);
      expect(state.data).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error in state when fetch fails', async () => {
      const error = new Error('Network error');
      (mockRepo.getTelemetry as jest.Mock).mockRejectedValueOnce(error);

      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      const state = await firstValueFrom(service.state$);
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('network recovery', () => {
    it('should trigger sync when network comes back online', async () => {
      mockNetwork.setOnline(false);
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      const initialCalls = (mockRepo.getTelemetry as jest.Mock).mock.calls.length;

      mockNetwork.setOnline(true);
      await jest.advanceTimersByTimeAsync(0);

      expect((mockRepo.getTelemetry as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  describe('destroy', () => {
    it('should stop polling on destroy', async () => {
      service.startPolling();
      await jest.advanceTimersByTimeAsync(0);

      service.destroy();

      await jest.advanceTimersByTimeAsync(5000);
      expect(mockRepo.getTelemetry).toHaveBeenCalledTimes(1);
    });
  });
});
