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
  tickets?: TicketResponse[];
  minPrice?: number;
  minimumPrice?: number;
  ticketPrices?: number[];
}

export interface TicketResponse {
  id: number;
  title: string;
  capacity: number;
  price: number;
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

export interface ArtistResponse {
  id: number;
  name: string;
  concertIds: number[];
}

export interface OrganizerDashboardStatsResponse {
  totalConcerts: number;
  upcomingConcerts: number;
  soldOutConcerts: number;
  ticketsSold: number;
  uniqueCustomers: number;
  ticketRevenue: number;
  averageBasket: number;
  ticketsRemaining: number;
  sellThroughRate: number;
}

export interface OrganizerDashboardResponse {
  stats: OrganizerDashboardStatsResponse;
  upcomingConcerts: ConcertResponse[];
  quickActions: string[];
}
