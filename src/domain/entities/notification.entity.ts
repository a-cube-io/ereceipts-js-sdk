export const NOTIFICATION_CODES = {
  MF2_UNREACHABLE: 'SYS-W-01',
  STATUS_OFFLINE: 'SYS-C-01',
  STATUS_ONLINE: 'SYS-I-01',
  COMMUNICATION_RESTORED: 'SYS-I-02',
} as const;

export type NotificationCode = (typeof NOTIFICATION_CODES)[keyof typeof NOTIFICATION_CODES];

export const NOTIFICATION_SOURCES = {
  SYSTEM: 'system',
  ITALIAN_TAX_AUTHORITY: 'Italian Tax Authority',
} as const;

export type NotificationSource = (typeof NOTIFICATION_SOURCES)[keyof typeof NOTIFICATION_SOURCES];

export const NOTIFICATION_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[keyof typeof NOTIFICATION_LEVELS];

export const NOTIFICATION_TYPES = {
  MF2_UNREACHABLE: 'INTERNAL_COMMUNICATION_FAILURE',
  STATUS_OFFLINE: 'STATUS_OFFLINE',
  STATUS_ONLINE: 'STATUS_ONLINE',
  COMMUNICATION_RESTORED: 'INTERNAL_COMMUNICATION_RESTORED',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_SCOPES = {
  GLOBAL: 'global',
  MERCHANT: 'merchant',
  PEM: 'pem',
} as const;

export type NotificationScope = (typeof NOTIFICATION_SCOPES)[keyof typeof NOTIFICATION_SCOPES];

export interface NotificationPayloadBlockAt {
  block_at: string;
}

interface NotificationBase {
  uuid: string;
  message: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  createdAt: string;
}

export interface NotificationMf2Unreachable extends NotificationBase {
  type: typeof NOTIFICATION_TYPES.MF2_UNREACHABLE;
  code: typeof NOTIFICATION_CODES.MF2_UNREACHABLE;
  payload: NotificationPayloadBlockAt;
}

export interface NotificationStatusOffline extends NotificationBase {
  type: typeof NOTIFICATION_TYPES.STATUS_OFFLINE;
  code: typeof NOTIFICATION_CODES.STATUS_OFFLINE;
  payload: null;
}

export interface NotificationStatusOnline extends NotificationBase {
  type: typeof NOTIFICATION_TYPES.STATUS_ONLINE;
  code: typeof NOTIFICATION_CODES.STATUS_ONLINE;
  payload: null;
}

export interface NotificationCommunicationRestored extends NotificationBase {
  type: typeof NOTIFICATION_TYPES.COMMUNICATION_RESTORED;
  code: typeof NOTIFICATION_CODES.COMMUNICATION_RESTORED;
  payload: null;
}

export type Notification =
  | NotificationMf2Unreachable
  | NotificationStatusOffline
  | NotificationStatusOnline
  | NotificationCommunicationRestored;

export interface NotificationListParams {
  page?: number;
  size?: number;
}
