import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { WorkspaceConfirmDialog } from '../../components/workspace-confirm-dialog/workspace-confirm-dialog';
import { WorkspaceDrawer } from '../../components/workspace-drawer/workspace-drawer';
import { WorkspaceLabelsApiService } from '../../data-access/workspace-labels-api.service';
import { WorkspaceLabel } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';
import { WorkspaceFilterInput } from '../../components/workspace-filter-input/workspace-filter-input';

const PRESET_COLORS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#4f46e5', '#0f766e'];

@Component({
  selector: 'app-workspace-labels-page',
  imports: [TranslatePipe, WorkspaceConfirmDialog, WorkspaceDrawer, WorkspaceFilterInput],
  templateUrl: './workspace-labels-page.html',
  styleUrl: './workspace-labels-page.css',
})
export class WorkspaceLabelsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceLabelsApiService);
  private readonly notification = inject(NotificationService);
  readonly store = inject(WorkspaceDetailStore);

  readonly colors = PRESET_COLORS;
  readonly labels = signal<WorkspaceLabel[]>([]);
  readonly searchQuery = signal('');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly filteredLabels = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) return this.labels();
    return this.labels().filter((label) => label.name.toLocaleLowerCase().includes(query));
  });
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly canEdit = computed(() => this.store.isActive() && (this.store.workspace()?.roleMember === 'owner' || this.store.workspace()?.roleMember === 'member'));
  readonly canDelete = computed(() => this.store.isActive() && this.store.isOwner());
  readonly dialogOpen = signal(false);
  readonly editingLabel = signal<WorkspaceLabel | null>(null);
  readonly labelName = signal('');
  readonly labelColor = signal(PRESET_COLORS[0]);
  readonly saving = signal(false);
  readonly saveError = signal(false);
  readonly deletingLabel = signal<WorkspaceLabel | null>(null);
  readonly deleting = signal(false);

  ngOnInit(): void {
    this.loadLabels();
  }

  loadLabels(): void {
    const code = this.store.workspace()?.code;
    if (!code) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.api.getLabels(code).pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (labels) => this.labels.set(labels),
      error: () => this.loadError.set(true),
    });
  }

  openCreate(): void {
    this.editingLabel.set(null);
    this.labelName.set('');
    this.labelColor.set(PRESET_COLORS[0]);
    this.saveError.set(false);
    this.dialogOpen.set(true);
  }

  openEdit(label: WorkspaceLabel): void {
    this.editingLabel.set(label);
    this.labelName.set(label.name);
    this.labelColor.set(label.color);
    this.saveError.set(false);
    this.dialogOpen.set(true);
  }

  saveLabel(): void {
    const workspaceCode = this.store.workspace()?.code;
    const name = this.labelName().trim();
    if (!workspaceCode || !name || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(false);
    const editing = this.editingLabel();
    const request = editing
      ? this.api.updateLabel(workspaceCode, editing.id, { name, color: this.labelColor() })
      : this.api.createLabel(workspaceCode, { name, color: this.labelColor() });
    request.pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.dialogOpen.set(false);
        this.loadLabels();
        this.notification.success(editing ? 'workspace.labels.labelUpdated' : 'workspace.labels.labelCreated');
      },
      error: () => this.saveError.set(true),
    });
  }

  confirmDelete(label: WorkspaceLabel): void {
    this.deletingLabel.set(label);
  }

  deleteLabel(): void {
    const workspaceCode = this.store.workspace()?.code;
    const label = this.deletingLabel();
    if (!workspaceCode || !label || this.deleting()) return;
    this.deleting.set(true);
    this.api.deleteLabel(workspaceCode, label.id)
      .pipe(finalize(() => this.deleting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingLabel.set(null);
          this.loadLabels();
          this.notification.success('workspace.labels.labelDeleted');
        },
        error: () => this.notification.error('workspace.labels.actionError'),
      });
  }
}
