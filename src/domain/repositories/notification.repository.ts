import { Notification, NotificationListParams } from '@/domain/entities/notification.entity';

export interface INotificationRepository {
  fetchNotifications(params?: NotificationListParams): Promise<Notification[]>;
}
