import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Task as TaskModel } from '../../models/workspace.models';
import { DatePipe } from '@angular/common';
import { TaskService } from '../../services/task-service';
import { NotificationService } from '../../../shared/services/notification.service';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-task',
  imports: [DatePipe, ModalComponent, TranslatePipe],
  templateUrl: './task.html',
  styleUrl: './task.css',
})
export class Task {
  private readonly workspaceState = inject(WorkspaceStateService);

  protected workspace = toSignal(this.workspaceState.workspace$);

  private readonly notificationService = inject(NotificationService);

  task = input.required<TaskModel>();

  private readonly taskService = inject(TaskService);

  protected menuOpen = signal(false);
  protected showDeleteConfirm = signal(false);
  protected deleting = signal(false);

  protected visibleLabels = computed(() => (this.task().labels ?? []).slice(0, 3));

  protected remainingLabels = computed(() => {
    const labels = this.task().labels ?? [];
    return labels.length > 3 ? labels.length - 3 : 0;
  });

  protected accentColor = computed(() => {
    const labels = this.task().labels ?? [];
    return labels.length > 0 ? labels[0].color : '#ef4444';
  });

  protected dateStatus = computed<'overdue' | 'expiring' | null>(() => {
    const task = this.task();
    if (!task.dateEnd || task.completed) return null;
    const now = new Date();
    const end = new Date(task.dateEnd);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'expiring';
    return null;
  });

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onToggleComplete(): void {
    this.menuOpen.set(false);
    this.taskService.updateTask(this.task().id, { completed: !this.task().completed }).subscribe();
  }

  onViewDetail(): void {
    this.menuOpen.set(false);

    this.taskService.getTaskById(this.task().id).subscribe({
      next: (task) => {
        if (!task) {
          this.notificationService.error('Task not found');
          return;
        }
        this.workspaceState.openTaskDetailModal(task);
      },
      error: () => {
        this.notificationService.error('Error getting task details');
        this.workspaceState.closeTaskDetailModal();
      },
    });
  }

  openDeleteConfirm(): void {
    this.menuOpen.set(false);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
  }

  onConfirmDelete(): void {
    this.deleting.set(true);
    this.taskService.deleteTask(this.task().id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
      },
      error: () => this.deleting.set(false),
    });
  }
}
