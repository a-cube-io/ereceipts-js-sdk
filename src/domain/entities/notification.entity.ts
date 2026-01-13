export type NotificationType = 'INTERNAL_COMMUNICATION_FAILURE' | 'PEM_STATUS_CHANGED';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'critical';

export type NotificationSource = 'system' | 'Italian Tax Authority';

export type NotificationCode = 'SYS-W-01' | 'SYS-C-01' | 'SYS-I-01';

export type NotificationPemStatus = 'ONLINE' | 'OFFLINE';

export interface NotificationScope {
  type: 'global';
}

export interface NotificationDataBlockAt {
  block_at: string;
}

export interface NotificationDataPemStatus {
  from: NotificationPemStatus;
  to: NotificationPemStatus;
}

interface NotificationBase {
  uuid: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  createdAt: string;
}

export interface NotificationMf2Unreachable extends NotificationBase {
  type: 'INTERNAL_COMMUNICATION_FAILURE';
  code: 'SYS-W-01';
  data: NotificationDataBlockAt;
}

export interface NotificationPemsBlocked extends NotificationBase {
  type: 'PEM_STATUS_CHANGED';
  code: 'SYS-C-01';
  data: NotificationDataPemStatus;
}

export interface NotificationPemBackOnline extends NotificationBase {
  type: 'PEM_STATUS_CHANGED';
  code: 'SYS-I-01';
  data: NotificationDataPemStatus;
}

export type Notification =
  | NotificationMf2Unreachable
  | NotificationPemsBlocked
  | NotificationPemBackOnline;

export interface NotificationListParams {
  page?: number;
  size?: number;
}
