export type UserRole = 'ADMIN' | 'ORGANIZER' | 'CUSTOMER' | 'USER';

export interface AuthTokenResponse {
  token: string;
  roles: string[];
  message: string;
}

export interface ConcertResponse {
  id: number;
  topic: string;
  date: string;
  description: string;
  organizerId: number | null;
  ticketIds: number[];
  artistIds: number[];
}

export interface TicketResponse {
  id: number;
  title: string;
  capacity: number;
  statut: string;
  concertId: number | null;
  customerIds: number[];
}

export interface UserResponse {
  id: number;
  lastName: string;
  firstName: string;
  birthdate: string;
  email: string;
  role: UserRole;
}
