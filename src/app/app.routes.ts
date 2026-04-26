import { Routes } from '@angular/router';

import { AuthComponent } from './auth-component/auth-component';
import { ConcertDetailComponent } from './concert-detail/concert-detail';
import { ConcertSearchComponent } from './concert-search/concert-search';
import { CustomerProfileComponent } from './customer-profile/customer-profile';
import { HomeLandingComponent } from './home-landing/home-landing';
import { OrganizeDashboardComponent } from './organize-dashboard/organize-dashboard';
import { OrganizeLayoutComponent } from './organize-layout/organize-layout';
import { OrganizePlaceholderComponent } from './organize-placeholder/organize-placeholder';
import { PublicLayoutComponent } from './public-layout/public-layout';

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
    component: OrganizeLayoutComponent,
    children: [
      {
        path: '',
        component: OrganizeDashboardComponent
      },
      {
        path: 'events',
        component: OrganizePlaceholderComponent,
        data: { title: 'Gestion des Concerts' }
      },
      {
        path: 'tickets',
        component: OrganizePlaceholderComponent,
        data: { title: 'Gestion des Billets' }
      },
      {
        path: 'artists',
        component: OrganizePlaceholderComponent,
        data: { title: 'Gestion des Artistes' }
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
