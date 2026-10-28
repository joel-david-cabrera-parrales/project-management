import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { WorkspaceConfirmDialog } from '../../components/workspace-confirm-dialog/workspace-confirm-dialog';
import { WorkspaceBoardColumn } from '../../components/workspace-board-column/workspace-board-column';
import { WorkspaceTaskDrawer } from '../../components/workspace-task-drawer/workspace-task-drawer';
import { WorkspaceTasksApiService } from '../../data-access/workspace-tasks-api.service';
import { WorkspaceDetailTaskList, WorkspaceTask } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';

@Component({
  selector: 'app-workspace-board-page',
  imports: [RouterLink, TranslatePipe, WorkspaceBoardColumn, WorkspaceTaskDrawer, WorkspaceConfirmDialog],
  templateUrl: './workspace-board-page.html',
  styleUrl: './workspace-board-page.css',
})
export class WorkspaceBoardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly taskApi = inject(WorkspaceTasksApiService);
  private readonly notification = inject(NotificationService);
  readonly store = inject(WorkspaceDetailStore);
  readonly boardCode = signal<string | null>(null);
  readonly selectedBoard = computed(() => {
    const boards = this.store.workspace()?.boards ?? [];
    const code = this.boardCode();
    return code ? boards.find((board) => board.code === code) ?? null : boards[0] ?? null;
  });
  readonly selectedBoardNumber = computed(() => {
    const board = this.selectedBoard();
    const boards = this.store.workspace()?.boards ?? [];
    return board ? boards.findIndex((item) => item.code === board.code) + 1 : 1;
  });
  readonly taskLists = computed(() => this.selectedBoard()?.taskList.filter((list) => list.isAvailable) ?? []);
  readonly canManageTasks = computed(() => ['owner', 'member'].includes(this.store.workspace()?.roleMember ?? ''));
  readonly canDeleteTasks = this.store.isOwner;
  readonly taskDrawerOpen = signal(false);
  readonly selectedList = signal<WorkspaceDetailTaskList | null>(null);
  readonly selectedTask = signal<WorkspaceTask | null>(null);
  readonly deleteTarget = signal<WorkspaceTask | null>(null);
  readonly deletingTask = signal(false);
  readonly deleteError = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('boardCode')), takeUntilDestroyed(this.destroyRef))
      .subscribe((code) => this.boardCode.set(code));
  }

  openCreateTask(list: WorkspaceDetailTaskList): void {
    this.selectedList.set(list);
    this.selectedTask.set(null);
    this.taskDrawerOpen.set(true);
  }

  openEditTask(data: { task: WorkspaceTask; list: WorkspaceDetailTaskList }): void {
    this.selectedList.set(data.list);
    this.selectedTask.set(data.task);
    this.taskDrawerOpen.set(true);
  }

  closeTaskDrawer(): void {
    this.taskDrawerOpen.set(false);
    this.selectedList.set(null);
    this.selectedTask.set(null);
  }

  onTaskSaved(): void {
    this.closeTaskDrawer();
    this.store.refresh();
  }

  confirmDeleteTask(task: WorkspaceTask): void {
    this.deleteError.set(false);
    this.deleteTarget.set(task);
  }

  deleteTask(): void {
    const task = this.deleteTarget();
    const workspaceCode = this.store.workspace()?.code;
    if (!task || !workspaceCode || this.deletingTask()) return;
    this.deleteError.set(false);
    this.deletingTask.set(true);
    this.taskApi.deleteTask(task.taskId, workspaceCode)
      .pipe(finalize(() => this.deletingTask.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.store.refresh();
          this.notification.success('workspace.task.taskDeleted');
        },
        error: () => this.deleteError.set(true),
      });
  }

}
