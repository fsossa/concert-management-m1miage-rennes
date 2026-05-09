export interface CreateNotificationPayload {
  userId: number;
  message: string;
}

export interface NotificationResponse {
  id: number;
  userId: number;
  message: string;
  read?: boolean | string | number;
  isRead?: boolean | string | number;
  createdAt: string;
}
