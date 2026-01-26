import {
  NOTIFICATION_CODES,
  NOTIFICATION_TYPES,
  Notification,
  NotificationCommunicationRestored,
  NotificationLevel,
  NotificationMf2Unreachable,
  NotificationPayloadBlockAt,
  NotificationScope,
  NotificationSource,
  NotificationStatusOffline,
  NotificationStatusOnline,
} from '@/domain/entities/notification.entity';
import { Page } from '@/domain/value-objects/page.vo';

interface NotificationApiOutputBase {
  uuid: string;
  message: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  created_at: string;
}

export interface NotificationMf2UnreachableApiOutput extends NotificationApiOutputBase {
  type: typeof NOTIFICATION_TYPES.MF2_UNREACHABLE;
  code: typeof NOTIFICATION_CODES.MF2_UNREACHABLE;
  payload: NotificationPayloadBlockAt;
}

export interface NotificationStatusOfflineApiOutput extends NotificationApiOutputBase {
  type: typeof NOTIFICATION_TYPES.STATUS_OFFLINE;
  code: typeof NOTIFICATION_CODES.STATUS_OFFLINE;
  payload?: null;
}

export interface NotificationStatusOnlineApiOutput extends NotificationApiOutputBase {
  type: typeof NOTIFICATION_TYPES.STATUS_ONLINE;
  code: typeof NOTIFICATION_CODES.STATUS_ONLINE;
  payload?: null;
}

export interface NotificationCommunicationRestoredApiOutput extends NotificationApiOutputBase {
  type: typeof NOTIFICATION_TYPES.COMMUNICATION_RESTORED;
  code: typeof NOTIFICATION_CODES.COMMUNICATION_RESTORED;
  payload?: null;
}

export type NotificationApiOutput =
  | NotificationMf2UnreachableApiOutput
  | NotificationStatusOfflineApiOutput
  | NotificationStatusOnlineApiOutput
  | NotificationCommunicationRestoredApiOutput;

export interface NotificationPageApiOutput {
  members: NotificationApiOutput[];
  total?: number;
  page?: number;
  size?: number;
  pages?: number;
}

export class NotificationMapper {
  static fromApiOutput(output: NotificationApiOutput): Notification {
    const base = {
      uuid: output.uuid,
      message: output.message,
      scope: output.scope,
      source: output.source,
      level: output.level,
      createdAt: output.created_at,
    };

    switch (output.code) {
      case NOTIFICATION_CODES.MF2_UNREACHABLE:
        return {
          ...base,
          type: output.type,
          code: output.code,
          payload: output.payload,
        } as NotificationMf2Unreachable;
      case NOTIFICATION_CODES.STATUS_OFFLINE:
        return {
          ...base,
          type: output.type,
          code: output.code,
          payload: null,
        } as NotificationStatusOffline;
      case NOTIFICATION_CODES.STATUS_ONLINE:
        return {
          ...base,
          type: output.type,
          code: output.code,
          payload: null,
        } as NotificationStatusOnline;
      case NOTIFICATION_CODES.COMMUNICATION_RESTORED:
        return {
          ...base,
          type: output.type,
          code: output.code,
          payload: null,
        } as NotificationCommunicationRestored;
    }
  }

  static listFromApi(outputs: NotificationApiOutput[]): Notification[] {
    return outputs.map((o) => this.fromApiOutput(o));
  }

  static pageFromApiResponse(response: NotificationPageApiOutput): Page<Notification> {
    return {
      members: this.listFromApi(response.members),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
}
