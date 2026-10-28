import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';
import { WorkspaceListApiService } from '../data-access/workspace-list-api.service';
import { CreateWorkspacePayload, WorkspaceListItem } from '../models/workspace-list.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceListStore {
  private readonly api = inject(WorkspaceListApiService);

  readonly workspaces = signal<WorkspaceListItem[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly searchQuery = signal('');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly showClosed = signal(false);
  readonly showArchived = signal(false);
  readonly createModalOpen = signal(false);

  readonly activeWorkspaces = computed(() => this.workspaces().filter((workspace) => workspace.status === 1));
  readonly closedWorkspaces = computed(() => this.workspaces().filter((workspace) => workspace.status === 2));
  readonly archivedWorkspaces = computed(() => this.workspaces().filter((workspace) => workspace.status === 3));
  readonly filteredActiveWorkspaces = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) return this.activeWorkspaces();
    return this.activeWorkspaces().filter((workspace) =>
      `${workspace.name} ${workspace.description}`.toLocaleLowerCase().includes(query),
    );
  });

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api
      .getWorkspaces()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (workspaces) => this.workspaces.set(workspaces),
        error: () => this.loadError.set(true),
      });
  }

  create(payload: CreateWorkspacePayload): Observable<WorkspaceListItem> {
    return this.api.createWorkspace(payload).pipe(
      tap((workspace) => {
        this.workspaces.update((workspaces) => [workspace, ...workspaces.filter((item) => item.code !== workspace.code)]);
        this.createModalOpen.set(false);
      }),
    );
  }
}
