import { Routes } from '@angular/router';
import { NotFound } from './shared/pages/not-found/not-found';
import { authGuard } from './shared/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },

  {
    path: 'auth',
    loadChildren: () => import('./authentication/authentication.routes'),
  },
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadChildren: () => import('./workspace/workspace.routes'),
  },
  {
    path: '**',
    component: NotFound,
  },
];
