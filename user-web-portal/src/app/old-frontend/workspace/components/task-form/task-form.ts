import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task } from '../../models/workspace.models';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { TaskService } from '../../services/task-service';
import { CreateTask } from '../../interfaces/create-task.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { dateRangeValidator } from '../../../shared/validators/date-range.validator';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-task-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm {
  private readonly fb = inject(FormBuilder);

  task = input<Task | null>();
  taskListId = input<number>();
  position = input<number>();

  private readonly taskService = inject(TaskService);

  private readonly notification = inject(NotificationService);

  private readonly workspaceState = inject(WorkspaceStateService);

  submitting = signal(false);

  taskForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    dateInit: [''],
    dateEnd: [''],
  }, { validators: dateRangeValidator('dateInit', 'dateEnd') });

  // public presetColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#0F172A'];

  saved = output<Task>();
  canceled = output<void>();

  constructor() {
    effect(() => {
      const task = this.task();
      if (task) {
        this.taskForm.patchValue({
          title: task.title,
          description: task.description,
          dateInit: task.dateInit ? task.dateInit.substring(0, 10) : '',
          dateEnd: task.dateEnd ? task.dateEnd.substring(0, 10) : '',
        });
      } else {
        this.taskForm.reset();
      }
    });
  }

  submit() {
    if (this.taskForm.valid) {
      this.createTask();
    } else {
      this.taskForm.markAllAsTouched();
      this.notification.info('Please fill in all the required fields');
    }
  }

  private createTask() {
    const listId = this.taskListId() ?? this.workspaceState.workspaceValue?.boards[0]?.lists[0]?.id!;
    const taskPosition = this.position() ?? (this.workspaceState.workspaceValue?.boards[0]?.lists[0]?.tasks.length ?? 0) + 1;

    const newTaks: CreateTask = {
      title: this.taskForm.value.title!,
      description: this.taskForm.value.description!,
      dateInit: this.taskForm.value.dateInit || undefined,
      dateEnd: this.taskForm.value.dateEnd || undefined,
      position: taskPosition,
      taskListId: listId,
      workspaceCode: this.workspaceState.workspaceValue?.id!,
      boardCode: this.workspaceState.workspaceValue?.boards[0]?.code!,
    };

    this.submitting.set(true);
    this.taskService.create(newTaks).subscribe({
      next: (task) => {
        this.submitting.set(false);
        this.taskForm.reset();
        if (task) {
          this.saved.emit(task);
        }
      },
      error: () => this.submitting.set(false),
    });
  }

  cancelAction() {
    this.canceled.emit();
    this.taskForm.reset();
  }

  canSubmit() {
    return this.taskForm.valid;
  }
}
