import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ArtistResponse,
  AuthTokenResponse,
  ConcertResponse,
  OrganizerDashboardResponse,
  OrganizerDashboardStatsResponse,
  TicketResponse,
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

    return this.http.get<ConcertResponse[]>(`${this.baseUrl}/api/search`, { params });
  }

  concertById(id: number): Observable<ConcertResponse> {
    return this.http.get<ConcertResponse>(`${this.baseUrl}/api/${id}`);
  }

  customerProfile(token: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/api/custom/profile`, {
      headers: this.authHeaders(token)
    });
  }

  customerTickets(token: string): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(`${this.baseUrl}/api/custom/mytickets`, {
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

  organizerTickets(token: string): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(`${this.baseUrl}/organise/tickets/`, {
      headers: this.authHeaders(token)
    });
  }

  organizerArtists(token: string): Observable<ArtistResponse[]> {
    return this.http.get<ArtistResponse[]>(`${this.baseUrl}/organise/artists/`, {
      headers: this.authHeaders(token)
    });
  }

  organizerSalesStats(token: string): Observable<OrganizerDashboardStatsResponse> {
    return this.http.get<OrganizerDashboardStatsResponse>(`${this.baseUrl}/organise/tickets/stats/sales`, {
      headers: this.authHeaders(token)
    });
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
