import { Component, computed, inject, signal } from '@angular/core';
import { catchError, of, switchMap } from 'rxjs';
import { TaskList } from '../../../../components/task-list/task-list';
import { WorkspaceStateService } from '../../../../services/workspace-state-service';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { TaskForm } from '../../../../components/task-form/task-form';
import { Task, BoardList } from '../../../../models/workspace.models';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskDetail } from '../../../../components/task-detail/task-detail';
import { TaskListService } from '../../../../services/task-list-service';
import { TaskService } from '../../../../services/task-service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-board',
  imports: [TaskList, ModalComponent, TaskForm, TaskDetail, TranslatePipe],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class Board {
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly taskListService = inject(TaskListService);
  private readonly taskService = inject(TaskService);
  private readonly notification = inject(NotificationService);

  workspace = toSignal(this.workspaceState.workspace$);

  listToDelete = signal<BoardList | null>(null);
  deleting = signal(false);

  protected listIds = computed(() => {
    return (this.workspace()?.boards[0]?.lists ?? []).map((l) => `task-list-${l.id}`);
  });

  taskModalIsOpen = signal(false);

  task = signal<Task | null>(null);

  taskFormListId = signal<number | undefined>(undefined);
  taskFormPosition = signal<number | undefined>(undefined);

  openTaskFormModal(data?: { listId: number; position: number }) {
    this.taskFormListId.set(data?.listId);
    this.taskFormPosition.set(data?.position);
    this.taskModalIsOpen.set(true);
    this.task.set(null);
  }

  closeTaskFormModal() {
    this.taskModalIsOpen.set(false);
    this.taskFormListId.set(undefined);
    this.taskFormPosition.set(undefined);
  }

  updateLocalTasklist(task: Task) {
    this.closeTaskFormModal();
  }

  taskDetailModalOpen = toSignal(this.workspaceState.showTaskDetailModal$);

  closeTaskDetailModal() {
    this.workspaceState.closeTaskDetailModal();
  }

  onTaskMoved(data: { movedTaskId: number; movedTaskPosition: number; sourceListId: number; sourceTaskIds: number[]; targetListId: number; targetTaskIds: number[] }) {
    this.taskService.updateTask(data.movedTaskId, {
      taskListId: data.targetListId,
      position: data.movedTaskPosition,
    }).pipe(
      switchMap(() => this.taskService.reorderTasks(data.sourceListId, data.sourceTaskIds)),
      switchMap(() => this.taskService.reorderTasks(data.targetListId, data.targetTaskIds)),
      catchError(() => {
        this.workspaceState.refreshWorkspace();
        return of(null);
      }),
    ).subscribe();
  }

  onTaskReordered(data: { listId: number; taskIds: number[] }) {
    this.taskService.reorderTasks(data.listId, data.taskIds).subscribe();
  }

  onAddList() {
    const ws = this.workspace();
    if (!ws || !ws.boards[0]) return;
    const boardId = ws.boards[0].id;
    const position = ws.boards[0].lists.length + 1;
    this.taskListService.createList({ title: 'New Column', boardId, position }).subscribe();
  }

  openDeleteListConfirm(list: BoardList): void {
    this.listToDelete.set(list);
  }

  closeDeleteListConfirm(): void {
    this.listToDelete.set(null);
  }

  onConfirmDeleteList(): void {
    const list = this.listToDelete();
    if (!list) return;
    this.deleting.set(true);
    this.taskListService.deleteList(list.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.listToDelete.set(null);
        this.workspaceState.refreshWorkspace();
      },
      error: () => {
        this.deleting.set(false);
        this.notification.error('Failed to delete list');
      },
    });
  }
}
