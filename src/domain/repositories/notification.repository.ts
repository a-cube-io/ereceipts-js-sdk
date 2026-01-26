import { Notification, NotificationListParams } from '@/domain/entities/notification.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface INotificationRepository {
  fetchNotifications(params?: NotificationListParams): Promise<Page<Notification>>;
}
