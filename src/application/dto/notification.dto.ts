import {
  Notification,
  NotificationDataBlockAt,
  NotificationDataPemStatus,
  NotificationLevel,
  NotificationMf2Unreachable,
  NotificationPemBackOnline,
  NotificationPemsBlocked,
  NotificationScope,
  NotificationSource,
} from '@/domain/entities/notification.entity';

interface NotificationApiOutputBase {
  uuid: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  created_at: string;
}

export interface NotificationMf2UnreachableApiOutput extends NotificationApiOutputBase {
  type: 'INTERNAL_COMMUNICATION_FAILURE';
  code: 'SYS-W-01';
  data: NotificationDataBlockAt;
}

export interface NotificationPemsBlockedApiOutput extends NotificationApiOutputBase {
  type: 'PEM_STATUS_CHANGED';
  code: 'SYS-C-01';
  data: NotificationDataPemStatus;
}

export interface NotificationPemBackOnlineApiOutput extends NotificationApiOutputBase {
  type: 'PEM_STATUS_CHANGED';
  code: 'SYS-I-01';
  data: NotificationDataPemStatus;
}

export type NotificationApiOutput =
  | NotificationMf2UnreachableApiOutput
  | NotificationPemsBlockedApiOutput
  | NotificationPemBackOnlineApiOutput;

export interface NotificationListApiOutput {
  members: NotificationApiOutput[];
}

export class NotificationMapper {
  static fromApiOutput(output: NotificationApiOutput): Notification {
    const base = {
      uuid: output.uuid,
      scope: output.scope,
      source: output.source,
      level: output.level,
      createdAt: output.created_at,
    };

    switch (output.code) {
      case 'SYS-W-01':
        return {
          ...base,
          type: output.type,
          code: output.code,
          data: output.data,
        } as NotificationMf2Unreachable;
      case 'SYS-C-01':
        return {
          ...base,
          type: output.type,
          code: output.code,
          data: output.data,
        } as NotificationPemsBlocked;
      case 'SYS-I-01':
        return {
          ...base,
          type: output.type,
          code: output.code,
          data: output.data,
        } as NotificationPemBackOnline;
    }
  }

  static listFromApi(outputs: NotificationApiOutput[]): Notification[] {
    return outputs.map((o) => this.fromApiOutput(o));
  }

  static listFromApiResponse(response: NotificationListApiOutput): Notification[] {
    return this.listFromApi(response.members);
  }
}
