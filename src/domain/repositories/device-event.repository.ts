import {
  DeviceEvent,
  DeviceEventTransmission,
  DeviceEventTransmissionsParams,
  DeviceEventsParams,
  InactivityPeriod,
  InactivityPeriodsParams,
} from '@/domain/entities/device-event.entity';
import { Page } from '@/domain/value-objects/page.vo';

/**
 * MF2 (supplier) read endpoints for the events (segnalazioni) of the PEL and its PEMs,
 * the event files transmitted to AdE and the PEM inactivity periods.
 */
export interface IDeviceEventRepository {
  findAllEvents(params?: DeviceEventsParams): Promise<Page<DeviceEvent>>;
  findEventById(uuid: string): Promise<DeviceEvent>;

  findAllTransmissions(
    params?: DeviceEventTransmissionsParams
  ): Promise<Page<DeviceEventTransmission>>;
  findTransmissionById(uuid: string): Promise<DeviceEventTransmission>;
  /** Signed XML of the event file transmitted to AdE */
  downloadTransmission(uuid: string): Promise<string>;
  /** Signed XML of the AdE result (EsitoSegnalazioni) of the event file */
  downloadTransmissionResult(uuid: string): Promise<string>;

  findAllInactivityPeriods(params?: InactivityPeriodsParams): Promise<Page<InactivityPeriod>>;
  findInactivityPeriodById(uuid: string): Promise<InactivityPeriod>;
}
