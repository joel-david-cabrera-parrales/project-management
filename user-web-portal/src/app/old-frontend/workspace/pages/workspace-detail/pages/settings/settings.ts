import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceStateService } from '../../../../services/workspace-state-service';
import { WorkspaceService } from '../../../../services/workspace-service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

const PRESET_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

@Component({
  selector: 'app-settings',
  imports: [FormsModule, ModalComponent, TranslatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly presetColors = PRESET_COLORS;

  protected workspace = toSignal(this.workspaceState.workspace$);

  protected formTitle = signal('');
  protected formDescription = signal('');
  protected formColor = signal(PRESET_COLORS[0]);
  protected saving = signal(false);
  protected showDeleteConfirm = signal(false);
  protected deleting = signal(false);

  constructor() {
    const ws = this.workspaceState.workspaceValue;
    if (ws) {
      this.formTitle.set(ws.name);
      this.formDescription.set(ws.description);
      this.formColor.set(ws.color);
    }
  }

  protected onSave(): void {
    const ws = this.workspaceState.workspaceValue;
    if (!ws) return;

    this.saving.set(true);
    this.workspaceService.updateWorkspace(ws.id, {
      title: this.formTitle(),
      description: this.formDescription(),
      color: this.formColor(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.workspaceState.refreshWorkspace();
      },
      error: () => this.saving.set(false),
    });
  }

  protected openDeleteConfirm(): void {
    this.showDeleteConfirm.set(true);
  }

  protected closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
  }

  protected onDelete(): void {
    const ws = this.workspaceState.workspaceValue;
    if (!ws) return;

    this.deleting.set(true);
    this.workspaceService.deleteWorkspace(ws.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notification.success('Workspace deleted');
        this.router.navigate(['/workspace']);
      },
      error: () => this.deleting.set(false),
    });
  }

  protected get isOwner(): boolean {
    return this.workspace()?.userRelation?.roleMember === 'owner';
  }
}
