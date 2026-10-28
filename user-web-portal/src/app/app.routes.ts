import { Routes } from '@angular/router';
import { NotFound } from './shared/pages/not-found/not-found';
import { authGuard } from './shared/guards/auth-guard';
import { AppShellLayout } from './shared/layouts/app-shell-layout/app-shell-layout';
import { ProfileDemoPage } from './profile/pages/profile-demo-page/profile-demo-page';
import { SettingsDemoPage } from './settings/pages/settings-demo-page/settings-demo-page';

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
        component: ProfileDemoPage,
      },
      {
        path: 'settings',
        component: SettingsDemoPage,
      },
    ],
  },
  {
    path: '**',
    component: NotFound,
  },
];
