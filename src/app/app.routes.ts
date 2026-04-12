import { Routes } from '@angular/router';

import { AuthComponent } from './auth-component/auth-component';
import { ManagementDashboardComponent } from './management-dashboard/management-dashboard';
import { ManagementLayoutComponent } from './management-layout/management-layout';
import { ManagementPlaceholderComponent } from './management-placeholder/management-placeholder';

export const routes: Routes = [
  {
    path: '',
    component: AuthComponent
  },
  {
    path: 'management',
    component: ManagementLayoutComponent,
    children: [
      {
        path: '',
        component: ManagementDashboardComponent
      },
      {
        path: 'events',
        component: ManagementPlaceholderComponent,
        data: { title: 'Gestion des Concerts' }
      },
      {
        path: 'tickets',
        component: ManagementPlaceholderComponent,
        data: { title: 'Gestion des Billets' }
      },
      {
        path: 'artists',
        component: ManagementPlaceholderComponent,
        data: { title: 'Gestion des Artistes' }
      },
      {
        path: 'reports',
        component: ManagementPlaceholderComponent,
        data: { title: 'Rapports & Statistiques' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
