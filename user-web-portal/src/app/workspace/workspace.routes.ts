import { Routes } from '@angular/router';
import { WorkspaceLayout } from './layout/workspace-layout/workspace-layout';
import { WorkspacePage } from './pages/workspace-page/workspace-page';
import { WorkspaceDetailPage } from './pages/workspace-detail-page/workspace-detail-page';

export const workspaceRoutes: Routes = [
  {
    path: '',
    component: WorkspaceLayout,
    children: [
      {
        path: '',
        component: WorkspacePage,
      },
      {
        path: ':workspaceCode',
        component: WorkspaceDetailPage,
      },
    ],
  },
];

export default workspaceRoutes;
