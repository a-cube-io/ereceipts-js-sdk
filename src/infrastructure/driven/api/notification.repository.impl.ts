import { NotificationMapper, NotificationPageApiOutput } from '@/application/dto/notification.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { Notification, NotificationListParams } from '@/domain/entities/notification.entity';
import { INotificationRepository } from '@/domain/repositories/notification.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class NotificationRepositoryImpl implements INotificationRepository {
  constructor(private readonly http: IHttpPort) {}

  async fetchNotifications(_params?: NotificationListParams): Promise<Page<Notification>> {
    const queryParams = new URLSearchParams();
    if (_params?.page !== undefined) queryParams.set('page', String(_params.page));
    if (_params?.size !== undefined) queryParams.set('size', String(_params.size));
    const queryString = queryParams.toString();
    const url = queryString ? `/mf1/notifications?${queryString}` : '/mf1/notifications';
    const response = await this.http.get<NotificationPageApiOutput>(url);
    return NotificationMapper.pageFromApiResponse(response.data);
  }
}
