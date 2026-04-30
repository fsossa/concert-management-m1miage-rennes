import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ArtistResponse,
  AuthTokenResponse,
  ConcertResponse,
  OrganizerDashboardResponse,
  OrganizerDashboardStatsResponse,
  OrganizerTicketSalesResponse,
  TicketSaleHistoryItemResponse,
  TicketResponse,
  CustomerTicketPurchaseResponse,
  UserResponse
} from './api.types';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  lastname: string;
  firstname: string;
  dateOfBirth: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'ORGANIZER';
}

interface SearchPayload {
  topic?: string;
  date?: string;
  description?: string;
  artistName?: string;
  organizerName?: string;
  priceMin?: number;
  priceMax?: number;
}

interface CreateConcertPayload {
  topic: string;
  date: string;
  description: string;
}

interface UpdateConcertPayload {
  topic?: string;
  date?: string;
  description?: string;
}

interface CreateTicketPayload {
  title: string;
  capacity: number;
  price: number;
  statut: string;
  concertId: number;
}

interface UpdateTicketPayload {
  title?: string;
  capacity?: number;
  price?: number;
  statut?: string;
}

interface CreateArtistPayload {
  name: string;
}

interface UpdateArtistPayload {
  name?: string;
}

interface BuyTicketPayload {
  ticketId: number;
  quantity: number;

}

@Injectable({ providedIn: 'root' })
export class BackendApiService {
  private readonly baseUrl = 'http://localhost:8080';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.baseUrl}/api/auth/login`, payload);
  }

  register(payload: RegisterPayload): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.baseUrl}/api/auth/register`, payload);
  }

  incomingConcerts(): Observable<ConcertResponse[]> {
    return this.http.get<ConcertResponse[]>(`${this.baseUrl}/api/incomingConcerts`);
  }

  latestConcerts(): Observable<ConcertResponse[]> {
    return this.http.get<ConcertResponse[]>(`${this.baseUrl}/api/latestConcerts`);
  }

  searchConcerts(payload: SearchPayload): Observable<ConcertResponse[]> {
    let params = new HttpParams();

    if (payload.topic) {
      params = params.set('topic', payload.topic);
    }
    if (payload.date) {
      params = params.set('date', payload.date);
    }
    if (payload.description) {
      params = params.set('description', payload.description);
    }
    if (payload.artistName) {
      params = params.set('artistName', payload.artistName);
    }
    if (payload.organizerName) {
      params = params.set('organizerName', payload.organizerName);
    }
    if (payload.priceMin !== undefined && payload.priceMin !== null) {
      params = params.set('priceMin', payload.priceMin.toString());
    }
    if (payload.priceMax !== undefined && payload.priceMax !== null) {
      params = params.set('priceMax', payload.priceMax.toString());
    }

    return this.http.get<ConcertResponse[]>(`${this.baseUrl}/api/search`, { params });
  }

  concertById(id: number): Observable<ConcertResponse> {
    return this.http.get<ConcertResponse>(`${this.baseUrl}/api/${id}`);
  }

  ticketById(id: number): Observable<TicketResponse> {
    return this.http.get<TicketResponse>(`${this.baseUrl}/api/tickets/${id}`);
  }

  artistById(id: number): Observable<ArtistResponse> {
    return this.http.get<ArtistResponse>(`${this.baseUrl}/api/artists/${id}`);
  }

  customerProfile(token: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/api/custom/profile`, {
      headers: this.authHeaders(token)
    });
  }
  customerPurchases(token: string): Observable<CustomerTicketPurchaseResponse[]> {
    return this.http.get<CustomerTicketPurchaseResponse[]>(`${this.baseUrl}/api/custom/my-purchases`, {
      headers: this.authHeaders(token)
    });
  }

  customerTickets(token: string): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(`${this.baseUrl}/api/custom/mytickets`, {
      headers: this.authHeaders(token)
    });
  }

  buyTicket(token: string, payload: BuyTicketPayload): Observable<CustomerTicketPurchaseResponse> {
    return this.http.post<CustomerTicketPurchaseResponse>(`${this.baseUrl}/api/custom/buyticket`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerDashboard(token: string): Observable<OrganizerDashboardResponse> {
    return this.http.get<OrganizerDashboardResponse>(`${this.baseUrl}/organise/dashboard`, {
      headers: this.authHeaders(token)
    });
  }

  organizerConcerts(token: string): Observable<ConcertResponse[]> {
    return this.http.get<ConcertResponse[]>(`${this.baseUrl}/organise/concerts/`, {
      headers: this.authHeaders(token)
    });
  }

  organizerConcertById(token: string, concertId: number): Observable<ConcertResponse> {
    return this.http.get<ConcertResponse>(`${this.baseUrl}/organise/concerts/${concertId}`, {
      headers: this.authHeaders(token)
    });
  }

  organizerCustomersByConcert(token: string, concertId: number): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/organise/concerts/${concertId}/customers`, {
      headers: this.authHeaders(token)
    });
  }

  organizerCreateConcert(token: string, payload: CreateConcertPayload): Observable<ConcertResponse> {
    return this.http.post<ConcertResponse>(`${this.baseUrl}/organise/concerts`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerUpdateConcert(token: string, concertId: number, payload: UpdateConcertPayload): Observable<ConcertResponse> {
    return this.http.put<ConcertResponse>(`${this.baseUrl}/organise/concerts/${concertId}`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerDeleteConcert(token: string, concertId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/organise/concerts/${concertId}`, {
      headers: this.authHeaders(token)
    });
  }

  organizerTickets(token: string): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(`${this.baseUrl}/organise/tickets/`, {
      headers: this.authHeaders(token)
    });
  }

  organizerTicketsByConcert(token: string, concertId: number): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(`${this.baseUrl}/organise/tickets/concert/${concertId}`, {
      headers: this.authHeaders(token)
    });
  }

  organizerCreateTicket(token: string, payload: CreateTicketPayload): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(`${this.baseUrl}/organise/tickets`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerUpdateTicket(token: string, ticketId: number, payload: UpdateTicketPayload): Observable<TicketResponse> {
    return this.http.put<TicketResponse>(`${this.baseUrl}/organise/tickets/${ticketId}`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerDeleteTicket(token: string, ticketId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/organise/tickets/${ticketId}`, {
      headers: this.authHeaders(token)
    });
  }

  organizerArtists(token: string): Observable<ArtistResponse[]> {
    return this.http.get<ArtistResponse[]>(`${this.baseUrl}/organise/artists/`, {
      headers: this.authHeaders(token)
    });
  }

  organizerArtistsByConcert(token: string, concertId: number): Observable<ArtistResponse[]> {
    return this.http.get<ArtistResponse[]>(`${this.baseUrl}/organise/artists/concert/${concertId}`, {
      headers: this.authHeaders(token)
    });
  }

  organizerCreateArtistForConcert(token: string, concertId: number, payload: CreateArtistPayload): Observable<ArtistResponse> {
    return this.http.post<ArtistResponse>(`${this.baseUrl}/organise/artists/concert/${concertId}`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerUpdateArtist(token: string, artistId: number, payload: UpdateArtistPayload): Observable<ArtistResponse> {
    return this.http.put<ArtistResponse>(`${this.baseUrl}/organise/artists/${artistId}`, payload, {
      headers: this.authHeaders(token)
    });
  }

  organizerUnlinkArtistFromConcert(token: string, artistId: number, concertId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/organise/artists/${artistId}/concert/${concertId}`, {
      headers: this.authHeaders(token)
    });
  }

  organizerSalesStats(token: string): Observable<OrganizerDashboardStatsResponse> {
    return this.http.get<OrganizerDashboardStatsResponse>(`${this.baseUrl}/organise/tickets/stats/sales`, {
      headers: this.authHeaders(token)
    });
  }

  organizerConcertSalesMe(token: string): Observable<OrganizerTicketSalesResponse> {
    return this.http.get<OrganizerTicketSalesResponse>(`${this.baseUrl}/organise/concerts/sales/me`, {
      headers: this.authHeaders(token)
    });
  }

  organizerLatestSalesHistory(token: string, limit = 50): Observable<TicketSaleHistoryItemResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<TicketSaleHistoryItemResponse[]>(`${this.baseUrl}/organise/concerts/sales/me/history`, {
      headers: this.authHeaders(token),
      params
    });
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
