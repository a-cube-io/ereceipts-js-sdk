/**
 * Status of the AdE result for an event (segnalazione), an event file or an
 * inactivity period. `null` until the result is available.
 */
export type DeviceEventAdeStatus = 'ok' | 'error' | 'warning';

/**
 * An event (segnalazione) of the PEL or of one of its PEMs.
 * `serialNumber` is null for PEL events.
 */
export interface DeviceEvent {
  uuid: string;
  code: string;
  datetime: string;
  occurrences: number | null;
  startedAt: string | null;
  restoredAt: string | null;
  operations: number | null;
  version: string | null;
  serialNumber: string | null;
  status: DeviceEventAdeStatus | null;
  /** Null until the event is batched in a transmission */
  transmissionUuid: string | null;
}

/**
 * An event (segnalazioni) file transmitted to AdE for the PEL or one of its PEMs.
 * `serialNumber` is null for PEL transmissions.
 */
export interface DeviceEventTransmission {
  uuid: string;
  serialNumber: string | null;
  scheduledAt: string;
  hash: string;
  status: DeviceEventAdeStatus | null;
  completedAt: string | null;
}

/**
 * An inactivity period of a PEM.
 */
export interface InactivityPeriod {
  uuid: string;
  startsAt: string;
  endsAt: string;
  serialNumber: string;
  status: DeviceEventAdeStatus | null;
  /** Null until the period is batched in a transmission */
  transmissionUuid: string | null;
}

/**
 * Date filter (YYYY-MM-DD) applied to a date field of the collection.
 */
export interface DateRangeFilter {
  after?: string;
  before?: string;
  strictlyAfter?: string;
  strictlyBefore?: string;
}

interface DeviceEventCollectionBaseParams {
  page?: number;
  /** Items per page, max 100 (default 30) */
  itemsPerPage?: number;
  /** One or more PEM serial numbers */
  pem?: string | string[];
}

export interface DeviceEventsParams extends DeviceEventCollectionBaseParams {
  /** false for the PEL events only, true for the PEM events only */
  pemExists?: boolean;
  /** One or more event codes (<Codice>) */
  code?: string | string[];
  occurredAt?: DateRangeFilter;
}

export interface DeviceEventTransmissionsParams extends DeviceEventCollectionBaseParams {
  /** false for the PEL transmissions only, true for the PEM transmissions only */
  pemExists?: boolean;
  status?: DeviceEventAdeStatus | DeviceEventAdeStatus[];
  scheduledAt?: DateRangeFilter;
}

export interface InactivityPeriodsParams extends DeviceEventCollectionBaseParams {
  startsAt?: DateRangeFilter;
}
