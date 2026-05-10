export interface CreateNotificationPayload {
  userId: number;
  message: string;
}

export interface NotificationResponse {
  id: number;
  userId: number;
  organizerId?: number | string | null;
  organizerID?: number | string | null;
  organizer_id?: number | string | null;
  organizerid?: number | string | null;
  concertOrganizerId?: number | string | null;
  organizer?: { id?: number | string | null } | null;
  message: string;
  read?: boolean | string | number;
  isRead?: boolean | string | number;
  createdAt: string;
}
