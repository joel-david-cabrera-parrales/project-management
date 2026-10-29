import { Routes } from '@angular/router';
import { NotFound } from './shared/pages/not-found/not-found';
import { authGuard } from './shared/guards/auth-guard';
import { AppShellLayout } from './shared/layouts/app-shell-layout/app-shell-layout';

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
    path: '',
    component: AppShellLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'workspace',
        loadChildren: () => import('./workspace/workspace.routes'),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/pages/profile-page/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/pages/settings-page/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: 'invite/:code',
    loadComponent: () => import('./shared/pages/invite/invite').then((m) => m.Invite),
  },
  {
    path: '**',
    component: NotFound,
  },
];
