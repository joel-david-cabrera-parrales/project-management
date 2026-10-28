import { Route } from '@angular/router';
import { WorkspaceLayout } from './layout/workspace-layout';
import { WorkspaceList } from './pages/workspace-list/workspace-list';
import { WorkspaceDetail } from './pages/workspace-detail/workspace-detail';
import { Board } from './pages/workspace-detail/pages/board/board';
import { Members } from './pages/workspace-detail/pages/members/members';
import { Settings } from './pages/workspace-detail/pages/settings/settings';
import { Labels } from './pages/workspace-detail/pages/labels/labels';
import { workspaceExistGuardGuard } from './guards/workspace-exist-guard-guard';

const workspaceRoutes: Route[] = [
  {
    path: '',
    component: WorkspaceLayout,
    children: [
      {
        path: '',
        component: WorkspaceList,
      },
      {
        path: ':code',
        component: WorkspaceDetail,
        canActivate: [workspaceExistGuardGuard],
        children: [
          { path: '', redirectTo: 'board', pathMatch: 'full' },
          { path: 'board', component: Board },
          { path: 'members', component: Members },
          { path: 'labels', component: Labels },
          { path: 'settings', component: Settings },
        ],
      },
    ],
  },
];

export default workspaceRoutes;
