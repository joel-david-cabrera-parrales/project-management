import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceListStore } from '../../state/workspace-list.store';

@Component({
  selector: 'app-workspace-create-modal',
  imports: [ModalComponent, ReactiveFormsModule, TranslatePipe],
  templateUrl: './workspace-create-modal.html',
  styleUrl: './workspace-create-modal.css',
})
export class WorkspaceCreateModal {
  readonly open = input(false);
  readonly close = output<void>();
  readonly created = output<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(WorkspaceListStore);

  readonly saving = signal(false);
  readonly error = signal(false);
  readonly colors = ['#2563eb', '#0f766e', '#7c3aed', '#c2410c', '#be185d', '#475569'];

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    color: ['#2563eb', Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.error.set(false);
        this.form.reset({ title: '', description: '', color: '#2563eb' });
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.error.set(false);
    this.saving.set(true);
    this.store
      .create({ title: value.title.trim(), description: value.description.trim(), color: value.color })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.created.emit(),
        error: () => this.error.set(true),
      });
  }

  selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }
}
