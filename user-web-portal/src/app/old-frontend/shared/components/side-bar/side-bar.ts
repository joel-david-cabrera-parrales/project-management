import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WorkspaceService } from '../../../workspace/services/workspace-service';
import { WorkspaceStateService } from '../../../workspace/services/workspace-state-service';
import { AuthService } from '../../../auth/services/auth.service';

interface WorkspaceOption {
  id: string;
  name: string;
}

@Component({
  selector: 'shared-side-bar',
  imports: [RouterLink, RouterLinkActive, AsyncPipe, TranslatePipe],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.css',
})
export class SideBar {
  private readonly router = inject(Router);

  protected readonly isDetailView = signal(false);
  protected readonly switcherOpen = signal(false);

  private readonly workspaceService = inject(WorkspaceService);
  private readonly workspaceState = inject(WorkspaceStateService);
  protected readonly authService = inject(AuthService);

  public workspace$ = this.workspaceState.workspace$;

  protected readonly currentWorkspaceName = signal('My Workspace');

  protected readonly workspaces = this.workspaceService.listWorkspaces;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith({} as NavigationEnd),
        map(() => {
          const segments = this.router.url.split('/').filter(Boolean);
          return segments[0] === 'workspace' && segments.length >= 2;
        }),
        takeUntilDestroyed(),
      )
      .subscribe((isDetail) => {
        this.isDetailView.set(isDetail);

        if (isDetail) {
          const id = this.router.url.split('/')[2];
          const ws = this.workspaces()?.find((w) => w.id === id);
          if (ws) this.currentWorkspaceName.set(ws.name);
        }
      });
  }

  selectWorkspace(id: string): void {
    this.switcherOpen.set(false);
    this.router.navigate(['/workspace', id, 'board']);
  }

  toggleSwitcher(): void {
    this.switcherOpen.update((v) => !v);
  }

}
