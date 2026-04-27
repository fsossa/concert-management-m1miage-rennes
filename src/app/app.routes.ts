import { Routes } from '@angular/router';

import { AuthComponent } from './auth-component/auth-component';
import { ConcertDetailComponent } from './concert-detail/concert-detail';
import { ConcertSearchComponent } from './concert-search/concert-search';
import { CustomerProfileComponent } from './customer-profile/customer-profile';
import { OrganizeArtistsComponent } from './organize-artists/organize-artists';
import { HomeLandingComponent } from './home-landing/home-landing';
import { OrganizeDashboardComponent } from './organize-dashboard/organize-dashboard';
import { OrganizeConcertDetailComponent } from './organize-concert-detail/organize-concert-detail';
import { OrganizeEventsComponent } from './organize-events/organize-events';
import { OrganizeLayoutComponent } from './organize-layout/organize-layout';
import { OrganizePlaceholderComponent } from './organize-placeholder/organize-placeholder';
import { OrganizeTicketsComponent } from './organize-tickets/organize-tickets';
import { PublicLayoutComponent } from './public-layout/public-layout';
import { authGuard, organizerGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        component: HomeLandingComponent
      },
      {
        path: 'search',
        component: ConcertSearchComponent
      },
      {
        path: 'concert/:id',
        component: ConcertDetailComponent
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        component: CustomerProfileComponent
      }
    ]
  },
  {
    path: 'auth',
    component: AuthComponent
  },
  {
    path: 'organize',
    canActivate: [organizerGuard],
    component: OrganizeLayoutComponent,
    children: [
      {
        path: '',
        component: OrganizeDashboardComponent
      },
      {
        path: 'events',
        component: OrganizeEventsComponent
      },
      {
        path: 'concert/:id',
        component: OrganizeConcertDetailComponent
      },
      {
        path: 'tickets',
        component: OrganizeTicketsComponent
      },
      {
        path: 'artists',
        component: OrganizeArtistsComponent
      },
      {
        path: 'reports',
        component: OrganizePlaceholderComponent,
        data: { title: 'Rapports & Statistiques' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
