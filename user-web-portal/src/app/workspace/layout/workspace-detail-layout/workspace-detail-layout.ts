import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceSidebar } from '../../components/workspace-sidebar/workspace-sidebar';
import { WorkspaceTopbar } from '../../components/workspace-topbar/workspace-topbar';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';

@Component({
  selector: 'app-workspace-detail-layout',
  imports: [RouterOutlet, TranslatePipe, WorkspaceSidebar, WorkspaceTopbar],
  templateUrl: './workspace-detail-layout.html',
  styleUrl: './workspace-detail-layout.css',
})
export class WorkspaceDetailLayout {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(WorkspaceDetailStore);
  readonly collapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('workspaceCode')),
        filter((code): code is string => Boolean(code)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((code) => this.store.load(code));

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.mobileSidebarOpen.set(false));
  }

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }
}
