import {
  DeviceEventApiOutput,
  DeviceEventMapper,
  DeviceEventTransmissionApiOutput,
  InactivityPeriodApiOutput,
  Mf2CollectionApiResponse,
} from '@/application/dto/device-event.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  DeviceEvent,
  DeviceEventTransmission,
  DeviceEventTransmissionsParams,
  DeviceEventsParams,
  InactivityPeriod,
  InactivityPeriodsParams,
} from '@/domain/entities/device-event.entity';
import { IDeviceEventRepository } from '@/domain/repositories/device-event.repository';
import { Page } from '@/domain/value-objects/page.vo';

// ld+json collections carry totalItems, which plain JSON arrays do not
const COLLECTION_HEADERS = { Accept: 'application/ld+json' };
const ITEM_HEADERS = { Accept: 'application/json' };
const XML_CONFIG = {
  headers: { Accept: 'application/xml' },
  responseType: 'text' as const,
};

function withQuery(path: string, searchParams: URLSearchParams): string {
  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export class DeviceEventRepositoryImpl implements IDeviceEventRepository {
  constructor(private readonly http: IHttpPort) {}

  async findAllEvents(params?: DeviceEventsParams): Promise<Page<DeviceEvent>> {
    const url = withQuery('/mf2/device-events', DeviceEventMapper.toEventsSearchParams(params));
    const response = await this.http.get<Mf2CollectionApiResponse<DeviceEventApiOutput>>(url, {
      headers: COLLECTION_HEADERS,
    });
    return DeviceEventMapper.pageFromApi(
      response.data,
      DeviceEventMapper.eventFromApiOutput,
      params
    );
  }

  async findEventById(uuid: string): Promise<DeviceEvent> {
    const response = await this.http.get<DeviceEventApiOutput>(`/mf2/device-events/${uuid}`, {
      headers: ITEM_HEADERS,
    });
    return DeviceEventMapper.eventFromApiOutput(response.data);
  }

  async findAllTransmissions(
    params?: DeviceEventTransmissionsParams
  ): Promise<Page<DeviceEventTransmission>> {
    const url = withQuery(
      '/mf2/device-event-transmissions',
      DeviceEventMapper.toTransmissionsSearchParams(params)
    );
    const response = await this.http.get<
      Mf2CollectionApiResponse<DeviceEventTransmissionApiOutput>
    >(url, { headers: COLLECTION_HEADERS });
    return DeviceEventMapper.pageFromApi(
      response.data,
      DeviceEventMapper.transmissionFromApiOutput,
      params
    );
  }

  async findTransmissionById(uuid: string): Promise<DeviceEventTransmission> {
    const response = await this.http.get<DeviceEventTransmissionApiOutput>(
      `/mf2/device-event-transmissions/${uuid}`,
      { headers: ITEM_HEADERS }
    );
    return DeviceEventMapper.transmissionFromApiOutput(response.data);
  }

  async downloadTransmission(uuid: string): Promise<string> {
    const response = await this.http.get<string>(
      `/mf2/device-event-transmissions/${uuid}/download`,
      XML_CONFIG
    );
    return response.data;
  }

  async downloadTransmissionResult(uuid: string): Promise<string> {
    const response = await this.http.get<string>(
      `/mf2/device-event-transmissions/${uuid}/result`,
      XML_CONFIG
    );
    return response.data;
  }

  async findAllInactivityPeriods(
    params?: InactivityPeriodsParams
  ): Promise<Page<InactivityPeriod>> {
    const url = withQuery(
      '/mf2/inactivity-periods',
      DeviceEventMapper.toInactivityPeriodsSearchParams(params)
    );
    const response = await this.http.get<Mf2CollectionApiResponse<InactivityPeriodApiOutput>>(url, {
      headers: COLLECTION_HEADERS,
    });
    return DeviceEventMapper.pageFromApi(
      response.data,
      DeviceEventMapper.inactivityPeriodFromApiOutput,
      params
    );
  }

  async findInactivityPeriodById(uuid: string): Promise<InactivityPeriod> {
    const response = await this.http.get<InactivityPeriodApiOutput>(
      `/mf2/inactivity-periods/${uuid}`,
      { headers: ITEM_HEADERS }
    );
    return DeviceEventMapper.inactivityPeriodFromApiOutput(response.data);
  }
}
