import { Routes } from '@angular/router';
import { NotFound } from './shared/pages/not-found/not-found';
import { WorkspacePage } from './workspace/workspace-page/workspace-page';

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
    path: "workspace",
    component: WorkspacePage
  },
  {
    path: '**',
    component: NotFound,
  },
];
