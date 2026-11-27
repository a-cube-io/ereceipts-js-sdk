import { IHttpPort } from '@/application/ports/driven/http.port';

import { DeviceEventRepositoryImpl } from '../device-event.repository.impl';

function createHttpMock(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}

const eventApiOutput = {
  uuid: 'event-uuid',
  code: 'EVT01',
  datetime: '2026-11-20T10:00:00+01:00',
  occurrences: 2,
  started_at: null,
  restored_at: null,
  operations: null,
  version: null,
  serial_number: 'E001-000001',
  status: 'ok',
  transmission_uuid: 'transmission-uuid',
};

const transmissionApiOutput = {
  uuid: 'transmission-uuid',
  serial_number: null,
  scheduled_at: '2026-11-20T00:00:00+01:00',
  hash: 'abc',
  status: null,
  completed_at: null,
};

const inactivityPeriodApiOutput = {
  uuid: 'period-uuid',
  starts_at: '2026-11-01',
  ends_at: '2026-11-05',
  serial_number: 'E001-000001',
  status: 'warning',
  transmission_uuid: null,
};

describe('DeviceEventRepositoryImpl', () => {
  describe('findAllEvents', () => {
    it('should send filters and map an ld+json collection to a Page', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({
        data: { member: [eventApiOutput], totalItems: 45 },
        status: 200,
        headers: {},
      });
      const repository = new DeviceEventRepositoryImpl(http);

      const result = await repository.findAllEvents({
        page: 2,
        itemsPerPage: 20,
        pem: ['E001-000001', 'E001-000002'],
        pemExists: true,
        code: 'EVT01',
        occurredAt: { after: '2026-11-01', strictlyBefore: '2026-11-30' },
      });

      const [url, config] = http.get.mock.calls[0]!;
      expect(url.startsWith('/mf2/device-events?')).toBe(true);
      const query = new URLSearchParams(url.split('?')[1]);
      expect(query.get('page')).toBe('2');
      expect(query.get('itemsPerPage')).toBe('20');
      expect(query.getAll('pem[]')).toEqual(['E001-000001', 'E001-000002']);
      expect(query.get('exists[pem]')).toBe('true');
      expect(query.get('code')).toBe('EVT01');
      expect(query.get('occurred_at[after]')).toBe('2026-11-01');
      expect(query.get('occurred_at[strictly_before]')).toBe('2026-11-30');
      expect(config).toEqual({ headers: { Accept: 'application/ld+json' } });

      expect(result).toEqual({
        members: [
          {
            uuid: 'event-uuid',
            code: 'EVT01',
            datetime: '2026-11-20T10:00:00+01:00',
            occurrences: 2,
            startedAt: null,
            restoredAt: null,
            operations: null,
            version: null,
            serialNumber: 'E001-000001',
            status: 'ok',
            transmissionUuid: 'transmission-uuid',
          },
        ],
        total: 45,
        page: 2,
        size: 20,
        pages: 3,
      });
    });

    it('should call the bare path without params and accept a plain array', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({ data: [eventApiOutput], status: 200, headers: {} });
      const repository = new DeviceEventRepositoryImpl(http);

      const result = await repository.findAllEvents();

      expect(http.get.mock.calls[0]![0]).toBe('/mf2/device-events');
      expect(result.members).toHaveLength(1);
      expect(result.total).toBeUndefined();
      expect(result.pages).toBeUndefined();
    });
  });

  it('findEventById should GET the event', async () => {
    const http = createHttpMock();
    http.get.mockResolvedValue({ data: eventApiOutput, status: 200, headers: {} });
    const repository = new DeviceEventRepositoryImpl(http);

    const result = await repository.findEventById('event-uuid');

    expect(http.get).toHaveBeenCalledWith('/mf2/device-events/event-uuid', {
      headers: { Accept: 'application/json' },
    });
    expect(result.uuid).toBe('event-uuid');
  });

  it('findAllTransmissions should send status and scheduled_at filters', async () => {
    const http = createHttpMock();
    http.get.mockResolvedValue({
      data: { member: [transmissionApiOutput], totalItems: 1 },
      status: 200,
      headers: {},
    });
    const repository = new DeviceEventRepositoryImpl(http);

    const result = await repository.findAllTransmissions({
      pemExists: false,
      status: ['error', 'warning'],
      scheduledAt: { before: '2026-11-25' },
    });

    const query = new URLSearchParams(http.get.mock.calls[0]![0].split('?')[1]);
    expect(http.get.mock.calls[0]![0].startsWith('/mf2/device-event-transmissions?')).toBe(true);
    expect(query.get('exists[pem]')).toBe('false');
    expect(query.getAll('status[]')).toEqual(['error', 'warning']);
    expect(query.get('scheduled_at[before]')).toBe('2026-11-25');
    expect(result.members[0]).toEqual({
      uuid: 'transmission-uuid',
      serialNumber: null,
      scheduledAt: '2026-11-20T00:00:00+01:00',
      hash: 'abc',
      status: null,
      completedAt: null,
    });
  });

  it('findTransmissionById should GET the transmission', async () => {
    const http = createHttpMock();
    http.get.mockResolvedValue({ data: transmissionApiOutput, status: 200, headers: {} });
    const repository = new DeviceEventRepositoryImpl(http);

    await repository.findTransmissionById('transmission-uuid');

    expect(http.get).toHaveBeenCalledWith('/mf2/device-event-transmissions/transmission-uuid', {
      headers: { Accept: 'application/json' },
    });
  });

  it.each([
    ['downloadTransmission', 'download'],
    ['downloadTransmissionResult', 'result'],
  ] as const)('%s should GET the XML as text', async (method, suffix) => {
    const http = createHttpMock();
    http.get.mockResolvedValue({ data: '<xml/>', status: 200, headers: {} });
    const repository = new DeviceEventRepositoryImpl(http);

    const result = await repository[method]('transmission-uuid');

    expect(http.get).toHaveBeenCalledWith(
      `/mf2/device-event-transmissions/transmission-uuid/${suffix}`,
      { headers: { Accept: 'application/xml' }, responseType: 'text' }
    );
    expect(result).toBe('<xml/>');
  });

  it('findAllInactivityPeriods should send starts_at filters', async () => {
    const http = createHttpMock();
    http.get.mockResolvedValue({
      data: { member: [inactivityPeriodApiOutput], totalItems: 1 },
      status: 200,
      headers: {},
    });
    const repository = new DeviceEventRepositoryImpl(http);

    const result = await repository.findAllInactivityPeriods({
      pem: 'E001-000001',
      startsAt: { strictlyAfter: '2026-10-31' },
    });

    const query = new URLSearchParams(http.get.mock.calls[0]![0].split('?')[1]);
    expect(http.get.mock.calls[0]![0].startsWith('/mf2/inactivity-periods?')).toBe(true);
    expect(query.get('pem')).toBe('E001-000001');
    expect(query.get('starts_at[strictly_after]')).toBe('2026-10-31');
    expect(result.members[0]).toEqual({
      uuid: 'period-uuid',
      startsAt: '2026-11-01',
      endsAt: '2026-11-05',
      serialNumber: 'E001-000001',
      status: 'warning',
      transmissionUuid: null,
    });
    expect(result.pages).toBe(1);
  });

  it('findInactivityPeriodById should GET the inactivity period', async () => {
    const http = createHttpMock();
    http.get.mockResolvedValue({ data: inactivityPeriodApiOutput, status: 200, headers: {} });
    const repository = new DeviceEventRepositoryImpl(http);

    await repository.findInactivityPeriodById('period-uuid');

    expect(http.get).toHaveBeenCalledWith('/mf2/inactivity-periods/period-uuid', {
      headers: { Accept: 'application/json' },
    });
  });
});
