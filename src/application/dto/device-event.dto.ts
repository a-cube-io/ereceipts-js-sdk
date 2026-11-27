import {
  DateRangeFilter,
  DeviceEvent,
  DeviceEventAdeStatus,
  DeviceEventTransmission,
  DeviceEventTransmissionsParams,
  DeviceEventsParams,
  InactivityPeriod,
  InactivityPeriodsParams,
} from '@/domain/entities/device-event.entity';
import { LdJsonPage, Page } from '@/domain/value-objects/page.vo';

export interface DeviceEventApiOutput {
  uuid: string;
  code: string;
  datetime: string;
  occurrences?: number | null;
  started_at?: string | null;
  restored_at?: string | null;
  operations?: number | null;
  version?: string | null;
  serial_number?: string | null;
  status?: DeviceEventAdeStatus | null;
  transmission_uuid?: string | null;
}

export interface DeviceEventTransmissionApiOutput {
  uuid: string;
  serial_number?: string | null;
  scheduled_at: string;
  hash: string;
  status?: DeviceEventAdeStatus | null;
  completed_at?: string | null;
}

export interface InactivityPeriodApiOutput {
  uuid: string;
  starts_at: string;
  ends_at: string;
  serial_number: string;
  status?: DeviceEventAdeStatus | null;
  transmission_uuid?: string | null;
}

export type Mf2CollectionApiResponse<T> = T[] | LdJsonPage<T>;

const DEFAULT_ITEMS_PER_PAGE = 30;

export class DeviceEventMapper {
  static eventFromApiOutput(output: DeviceEventApiOutput): DeviceEvent {
    return {
      uuid: output.uuid,
      code: output.code,
      datetime: output.datetime,
      occurrences: output.occurrences ?? null,
      startedAt: output.started_at ?? null,
      restoredAt: output.restored_at ?? null,
      operations: output.operations ?? null,
      version: output.version ?? null,
      serialNumber: output.serial_number ?? null,
      status: output.status ?? null,
      transmissionUuid: output.transmission_uuid ?? null,
    };
  }

  static transmissionFromApiOutput(
    output: DeviceEventTransmissionApiOutput
  ): DeviceEventTransmission {
    return {
      uuid: output.uuid,
      serialNumber: output.serial_number ?? null,
      scheduledAt: output.scheduled_at,
      hash: output.hash,
      status: output.status ?? null,
      completedAt: output.completed_at ?? null,
    };
  }

  static inactivityPeriodFromApiOutput(output: InactivityPeriodApiOutput): InactivityPeriod {
    return {
      uuid: output.uuid,
      startsAt: output.starts_at,
      endsAt: output.ends_at,
      serialNumber: output.serial_number,
      status: output.status ?? null,
      transmissionUuid: output.transmission_uuid ?? null,
    };
  }

  static toEventsSearchParams(params?: DeviceEventsParams): URLSearchParams {
    const searchParams = DeviceEventMapper.baseSearchParams(params);
    if (!params) return searchParams;

    if (params.pemExists !== undefined) {
      searchParams.set('exists[pem]', String(params.pemExists));
    }
    DeviceEventMapper.appendMulti(searchParams, 'code', params.code);
    DeviceEventMapper.appendDateRange(searchParams, 'occurred_at', params.occurredAt);
    return searchParams;
  }

  static toTransmissionsSearchParams(params?: DeviceEventTransmissionsParams): URLSearchParams {
    const searchParams = DeviceEventMapper.baseSearchParams(params);
    if (!params) return searchParams;

    if (params.pemExists !== undefined) {
      searchParams.set('exists[pem]', String(params.pemExists));
    }
    DeviceEventMapper.appendMulti(searchParams, 'status', params.status);
    DeviceEventMapper.appendDateRange(searchParams, 'scheduled_at', params.scheduledAt);
    return searchParams;
  }

  static toInactivityPeriodsSearchParams(params?: InactivityPeriodsParams): URLSearchParams {
    const searchParams = DeviceEventMapper.baseSearchParams(params);
    if (!params) return searchParams;

    DeviceEventMapper.appendDateRange(searchParams, 'starts_at', params.startsAt);
    return searchParams;
  }

  /**
   * Builds a Page from an API Platform collection. With `application/ld+json`
   * the total is read from `totalItems`; a plain JSON array carries no total.
   */
  static pageFromApi<TApi, T>(
    data: Mf2CollectionApiResponse<TApi>,
    map: (item: TApi) => T,
    params?: { page?: number; itemsPerPage?: number }
  ): Page<T> {
    const items = Array.isArray(data) ? data : (data.member ?? []);
    const total = Array.isArray(data) ? undefined : data.totalItems;
    const size = params?.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;

    return {
      members: items.map(map),
      total,
      page: params?.page ?? 1,
      size,
      pages: total !== undefined && size > 0 ? Math.ceil(total / size) : undefined,
    };
  }

  private static baseSearchParams(params?: {
    page?: number;
    itemsPerPage?: number;
    pem?: string | string[];
  }): URLSearchParams {
    const searchParams = new URLSearchParams();
    if (!params) return searchParams;

    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.itemsPerPage !== undefined) {
      searchParams.set('itemsPerPage', String(params.itemsPerPage));
    }
    DeviceEventMapper.appendMulti(searchParams, 'pem', params.pem);
    return searchParams;
  }

  private static appendMulti(
    searchParams: URLSearchParams,
    name: string,
    value?: string | string[]
  ): void {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(`${name}[]`, v));
    } else {
      searchParams.set(name, value);
    }
  }

  private static appendDateRange(
    searchParams: URLSearchParams,
    name: string,
    range?: DateRangeFilter
  ): void {
    if (!range) return;
    if (range.after !== undefined) searchParams.set(`${name}[after]`, range.after);
    if (range.before !== undefined) searchParams.set(`${name}[before]`, range.before);
    if (range.strictlyAfter !== undefined) {
      searchParams.set(`${name}[strictly_after]`, range.strictlyAfter);
    }
    if (range.strictlyBefore !== undefined) {
      searchParams.set(`${name}[strictly_before]`, range.strictlyBefore);
    }
  }
}
