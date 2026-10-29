import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkspaceDetailApiService } from '../data-access/workspace-detail-api.service';
import { WorkspaceDetailStore } from '../state/workspace-detail.store';

export const workspaceExistGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const workspaceApi = inject(WorkspaceDetailApiService);
  const workspaceStore = inject(WorkspaceDetailStore);

  const workspaceCode = route.params['workspaceCode'];

  if (workspaceCode === '') {
    router.navigate(['/workspace']);
    return false;
  }

  let workspace = null;
  try {
    workspace = await firstValueFrom(workspaceApi.getWorkspace(workspaceCode));
    if (!workspace) {
      router.navigate(['/workspace']);
      return false;
    }
    workspaceStore.setWorkspace(workspace);
    return true;
  } catch (error) {
    router.navigate(['/workspace']);
    return false;
  }
};
