import { Routes } from '@angular/router';
import { WorkspacePage } from './pages/workspace-page/workspace-page';
import { WorkspaceDetailLayout } from './layout/workspace-detail-layout/workspace-detail-layout';
import { WorkspaceBoardPage } from './pages/workspace-board-page/workspace-board-page';
import { WorkspaceMembersPage } from './pages/workspace-members-page/workspace-members-page';
import { WorkspaceLabelsPage } from './pages/workspace-labels-page/workspace-labels-page';
import { WorkspaceSettingsPage } from './pages/workspace-settings-page/workspace-settings-page';
import { WorkspaceDetailStore } from './state/workspace-detail.store';

export const workspaceRoutes: Routes = [
  {
    path: '',
    component: WorkspacePage,
  },
  {
    path: ':workspaceCode',
    component: WorkspaceDetailLayout,
    providers: [WorkspaceDetailStore],
    children: [
      { path: '', redirectTo: 'board', pathMatch: 'full' },
      { path: 'board', component: WorkspaceBoardPage },
      { path: 'board/:boardCode', component: WorkspaceBoardPage },
      { path: 'members', component: WorkspaceMembersPage },
      { path: 'labels', component: WorkspaceLabelsPage },
      { path: 'settings', component: WorkspaceSettingsPage },
    ],
  },
];

export default workspaceRoutes;
