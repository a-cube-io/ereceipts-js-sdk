import { NotificationListApiOutput, NotificationMapper } from '@/application/dto/notification.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { Notification, NotificationListParams } from '@/domain/entities/notification.entity';
import { INotificationRepository } from '@/domain/repositories/notification.repository';

export class NotificationRepositoryImpl implements INotificationRepository {
  constructor(private readonly http: IHttpPort) {}

  async fetchNotifications(params?: NotificationListParams): Promise<Notification[]> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.set('page', String(params.page));
    if (params?.size !== undefined) queryParams.set('size', String(params.size));
    const queryString = queryParams.toString();
    const url = queryString ? `/mf1/notifications?${queryString}` : '/mf1/notifications';
    const response = await this.http.get<NotificationListApiOutput>(url);
    return NotificationMapper.listFromApiResponse(response.data);
  }
}
