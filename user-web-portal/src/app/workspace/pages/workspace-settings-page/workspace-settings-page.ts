import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { WorkspaceConfirmDialog } from '../../components/workspace-confirm-dialog/workspace-confirm-dialog';
import { WorkspaceSettingsApiService } from '../../data-access/workspace-settings-api.service';
import { WorkspaceDetailMapper } from '../../models/workspace-detail.mapper';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';
import { WorkspaceListStore } from '../../state/workspace-list.store';
import { WorkspaceRichTextEditor } from '../../components/workspace-rich-text-editor/workspace-rich-text-editor';
import { WorkspaceStatus } from '../../models/workspace-list.models';

const PRESET_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#c2410c', '#be185d', '#475569'];

@Component({
  selector: 'app-workspace-settings-page',
  imports: [FormsModule, TranslatePipe, WorkspaceConfirmDialog, WorkspaceRichTextEditor],
  templateUrl: './workspace-settings-page.html',
  styleUrl: './workspace-settings-page.css',
})
export class WorkspaceSettingsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceSettingsApiService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly listStore = inject(WorkspaceListStore);
  readonly store = inject(WorkspaceDetailStore);

  readonly colors = PRESET_COLORS;
  readonly statuses: Array<{ value: WorkspaceStatus; labelKey: string; descKey: string }> = [
    { value: 1, labelKey: 'workspace.status.active', descKey: 'workspace.settings.statusActiveDesc' },
    { value: 2, labelKey: 'workspace.status.closed', descKey: 'workspace.settings.statusClosedDesc' },
    { value: 3, labelKey: 'workspace.status.archived', descKey: 'workspace.settings.statusArchivedDesc' },
  ];
  readonly title = signal('');
  readonly description = signal('');
  readonly descriptionOverLimit = computed(() => this.plainTextLength(this.description()) > 500);
  readonly color = signal(PRESET_COLORS[0]);
  readonly status = signal<WorkspaceStatus>(1);
  readonly saving = signal(false);
  readonly saveError = signal(false);
  readonly confirmDeleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal(false);

  constructor() {
    effect(() => {
      const workspace = this.store.workspace();
      if (!workspace) return;
      this.title.set(workspace.name);
      this.description.set(workspace.description);
      this.color.set(workspace.color);
      this.status.set((workspace.status as WorkspaceStatus) || 1);
    });
  }

  save(): void {
    const workspace = this.store.workspace();
    const title = this.title().trim();
    if (!workspace || !this.store.isOwner() || title.length < 5 || this.descriptionOverLimit() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(false);
    this.api.updateWorkspace(workspace.code, {
      title,
      description: this.description().trim(),
      color: this.color(),
      status: this.status(),
    })
      .pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updated = WorkspaceDetailMapper.toWorkspaceDetail(response);
          this.store.setWorkspace(updated);
          this.listStore.upsertFromDetail(updated);
          this.notification.success('workspace.settings.saved');
        },
        error: () => this.saveError.set(true),
      });
  }

  private plainTextLength(html: string): number {
    const container = document.createElement('div');
    container.innerHTML = html;
    return (container.innerText || container.textContent || '').length;
  }

  deleteWorkspace(): void {
    const workspace = this.store.workspace();
    if (!workspace || !this.store.isOwner() || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(false);
    this.api.deleteWorkspace(workspace.code)
      .pipe(finalize(() => this.deleting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('notifications.workspaceDeleted');
          void this.router.navigateByUrl('/workspace');
        },
        error: () => this.deleteError.set(true),
      });
  }
}
