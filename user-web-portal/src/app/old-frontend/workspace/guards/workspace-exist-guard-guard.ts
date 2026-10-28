import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WorkspaceService } from '../services/workspace-service';
import { firstValueFrom } from 'rxjs';
import { WorkspaceStateService } from '../services/workspace-state-service';

export const workspaceExistGuardGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const workspaceService = inject(WorkspaceService);
  const workspaceState = inject(WorkspaceStateService);

  const workspaceCode = route.params['code'];

  if (workspaceCode === '') {
    router.navigate(['/workspace']);
    return false;
  }

  let workspace = null;
  try {
    workspace = await firstValueFrom(workspaceService.getAWorkspace(workspaceCode));
    if (!workspace) {
      router.navigate(['/workspace']);
      return false;
    }
    workspaceState.setActiveWorkspace(workspace);
    return true;
  } catch (error) {
    router.navigate(['/workspace']);
    return false;
  }
};
