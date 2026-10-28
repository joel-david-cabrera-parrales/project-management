import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkspaceStateService } from '../../../../services/workspace-state-service';
import { LabelService } from '../../../../services/label-service';
import { Label } from '../../../../models/workspace.models';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

const PRESET_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

@Component({
  selector: 'app-labels',
  imports: [FormsModule, ModalComponent, TranslatePipe],
  templateUrl: './labels.html',
  styleUrl: './labels.css',
})
export class Labels {
  protected readonly presetColors = PRESET_COLORS;
  private readonly workspaceState = inject(WorkspaceStateService);
  protected workspace = toSignal(this.workspaceState.workspace$);
  private readonly labelService = inject(LabelService);

  protected labels = signal<Label[]>([]);
  protected slideOverOpen = signal(false);
  protected editingLabel = signal<Label | null>(null);

  protected formName = signal('');
  protected formColor = signal(PRESET_COLORS[0]);
  protected formSubmitting = signal(false);

  protected labelToDelete = signal<Label | null>(null);
  protected deleting = signal(false);

  constructor() {
    effect(() => {
      const ws = this.workspaceState.workspaceValue;
      if (ws?.id) {
        this.loadLabels(ws.id);
      } else {
        this.labels.set([]);
      }
    });
  }

  private loadLabels(workspaceCode: string): void {
    this.labelService.getWorkspaceLabels(workspaceCode).subscribe((labels) => {
      this.labels.set(labels);
    });
  }

  protected get workspaceId(): string | undefined {
    return this.workspaceState.workspaceValue?.id;
  }

  protected openCreate(): void {
    this.editingLabel.set(null);
    this.formName.set('');
    this.formColor.set(PRESET_COLORS[0]);
    this.slideOverOpen.set(true);
  }

  protected openEdit(label: Label): void {
    this.editingLabel.set(label);
    this.formName.set(label.name);
    this.formColor.set(label.color);
    this.slideOverOpen.set(true);
  }

  protected closeSlideOver(): void {
    this.slideOverOpen.set(false);
  }

  protected onSubmit(): void {
    const name = this.formName().trim();
    if (!name || this.formSubmitting()) return;

    this.formSubmitting.set(true);
    const wsId = this.workspaceId;
    if (!wsId) return;

    const edit = this.editingLabel();
    if (edit) {
      this.labelService.updateLabel(edit.id, { name, color: this.formColor() }).subscribe(() => {
        this.formSubmitting.set(false);
        this.closeSlideOver();
        this.loadLabels(wsId);
      });
    } else {
      this.labelService.create({ name, color: this.formColor(), workspaceCode: wsId }).subscribe(() => {
        this.formSubmitting.set(false);
        this.closeSlideOver();
        this.loadLabels(wsId);
      });
    }
  }

  protected openDeleteConfirm(label: Label): void {
    this.labelToDelete.set(label);
  }

  protected closeDeleteConfirm(): void {
    this.labelToDelete.set(null);
  }

  protected onConfirmDelete(): void {
    const label = this.labelToDelete();
    if (!label) return;
    const wsId = this.workspaceId;
    if (!wsId) return;
    this.deleting.set(true);
    this.labelService.deleteLabel(label.id).subscribe(() => {
      this.deleting.set(false);
      this.labelToDelete.set(null);
      this.loadLabels(wsId);
    });
  }

  protected selectColor(color: string): void {
    this.formColor.set(color);
  }

  protected get hasLabels(): boolean {
    return this.labels().length > 0;
  }
}
