import { Component, effect, inject, input, output, signal } from '@angular/core';
import { Workspace } from '../../models/workspace.models';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace-service';
import { CreateWorkspace } from '../../interfaces/create-workspace.interface';
import { UpdateWorkspace } from '../../interfaces/update-workspace.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './workspace-form.html',
  styleUrl: './workspace-form.css',
})
export class WorkspaceForm {
  public workspace = input.required<Workspace | null>();

  private readonly fb = inject(FormBuilder);

  private readonly workspaceService = inject(WorkspaceService);
  private readonly notification = inject(NotificationService);

  public formWorkspace = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    color: ['#0f172a', Validators.required],
  });

  public submitting = signal(false);

  public cancel = output<void>();

  public saved = output<void>();

  public presetColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#0F172A'];

  private mode = signal<'create' | 'update'>('create');
  constructor() {
    effect(() => {
      const ws = this.workspace();
      if (ws) {
        this.formWorkspace.patchValue({
          title: ws.name,
          description: ws.description,
          color: ws.color,
        });
        this.mode.set('update');
      } else {
        this.formWorkspace.reset({ title: '', description: '', color: '#0f172a' });
        this.mode.set('create');
      }
    });
  }

  public get canSubmit(): boolean {
    return this.formWorkspace.valid;
  }

  public selectColor(color: string) {
    this.formWorkspace.patchValue({ color });
  }

  public submit() {
    const payload = this.formWorkspace.getRawValue();

    if (this.mode() === 'create') {
      this.create(payload as CreateWorkspace);
    } else {
      this.update(payload as UpdateWorkspace);
    }

    this.formWorkspace.reset();
  }

  private create(newWorkspace: CreateWorkspace) {
    this.submitting.set(true);
    this.workspaceService.createWorkspace(newWorkspace).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.notification.error('Error creating workspace');
      },
    });
  }

  private update(updatedWorkspace: UpdateWorkspace) {
    this.submitting.set(true);
    this.workspaceService.updateWorkspace(this.workspace()!.id, updatedWorkspace).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.notification.error('Error updating workspace');
      },
    });
  }

  public cancelAction() {
    this.formWorkspace.reset();
    this.formWorkspace.patchValue({ color: '#0f172a' });
    this.cancel.emit();
  }
}
