import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { WorkspaceDetailApiService } from '../data-access/workspace-detail-api.service';
import { WorkspaceDetail } from '../models/workspace-detail.models';

@Injectable()
export class WorkspaceDetailStore {
  private readonly api = inject(WorkspaceDetailApiService);

  readonly workspace = signal<WorkspaceDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly isOwner = computed(() => this.workspace()?.roleMember === 'owner');

  load(code: string): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.getWorkspace(code)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (workspace) => this.workspace.set(workspace),
        error: () => {
          this.workspace.set(null);
          this.loadError.set(true);
        },
      });
  }

  refresh(): void {
    const code = this.workspace()?.code;
    if (code) this.load(code);
  }

  setWorkspace(workspace: WorkspaceDetail): void {
    this.workspace.set(workspace);
  }
}
