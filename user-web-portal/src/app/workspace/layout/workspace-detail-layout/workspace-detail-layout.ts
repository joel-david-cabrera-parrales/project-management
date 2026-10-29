import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, finalize, map } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceSidebar } from '../../components/workspace-sidebar/workspace-sidebar';
import { WorkspaceTopbar } from '../../components/workspace-topbar/workspace-topbar';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-workspace-detail-layout',
  imports: [RouterOutlet, RouterLink, TranslatePipe, WorkspaceSidebar, WorkspaceTopbar],
  templateUrl: './workspace-detail-layout.html',
  styleUrl: './workspace-detail-layout.css',
})
export class WorkspaceDetailLayout {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(WorkspaceDetailStore);
  private readonly notification = inject(NotificationService);
  readonly creatingBoard = signal(false);
  readonly collapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly statusBannerKey = computed(() => {
    const status = this.store.workspace()?.status;
    if (status === 2) return 'workspace.status.closedReadOnlyBanner';
    if (status === 3) return 'workspace.status.archivedReadOnlyBanner';
    return null;
  });

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

  createBoard(title: string): void {
    const workspace = this.store.workspace();
    if (!workspace || this.creatingBoard()) return;

    this.creatingBoard.set(true);
    this.store.createBoard(title)
      .pipe(finalize(() => this.creatingBoard.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (board) => {
          this.mobileSidebarOpen.set(false);
          void this.router.navigate(['/workspace', workspace.code, 'board', board.code]);
        },
        error: () => this.notification.error('workspace.detail.createBoardError'),
      });
  }
}
