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

export interface ConcertTicketSalesSummaryResponse {
  concertId: number;
  topic: string;
  date: string;
  ticketsSold: number;
  uniqueCustomers: number;
  revenue: number;
}

export interface OrganizerTicketSalesResponse {
  organizerId: number;
  totalConcerts: number;
  totalTicketsSold: number;
  totalRevenue: number;
  averageTicketPrice: number;
  concerts: ConcertTicketSalesSummaryResponse[];
}

export interface TicketSaleHistoryItemResponse {
  saleId: number;
  purchaseDate: string;
  price: number;
  customerId: number | null;
  customerName: string | null;
  customerEmail: string | null;
  concertId: number | null;
  concertTopic: string | null;
  ticketId: number | null;
  ticketTitle: string | null;
}
