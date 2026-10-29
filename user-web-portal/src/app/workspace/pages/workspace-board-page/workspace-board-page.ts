import { Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, finalize, forkJoin, map, Observable } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { WorkspaceConfirmDialog } from '../../components/workspace-confirm-dialog/workspace-confirm-dialog';
import { WorkspaceBoardColumn } from '../../components/workspace-board-column/workspace-board-column';
import { WorkspaceTaskDrawer } from '../../components/workspace-task-drawer/workspace-task-drawer';
import { WorkspaceDetailApiService } from '../../data-access/workspace-detail-api.service';
import { WorkspaceTasksApiService } from '../../data-access/workspace-tasks-api.service';
import { WorkspaceDetailTaskList, WorkspaceTask, WorkspaceTaskDropEvent } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';

@Component({
  selector: 'app-workspace-board-page',
  imports: [DragDropModule, RouterLink, TranslatePipe, WorkspaceBoardColumn, WorkspaceTaskDrawer, WorkspaceConfirmDialog],
  templateUrl: './workspace-board-page.html',
  styleUrl: './workspace-board-page.css',
})
export class WorkspaceBoardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detailApi = inject(WorkspaceDetailApiService);
  private readonly taskApi = inject(WorkspaceTasksApiService);
  private readonly notification = inject(NotificationService);
  private readonly translation = inject(TranslationService);
  readonly store = inject(WorkspaceDetailStore);
  readonly boardCode = signal<string | null>(null);
  private readonly notificationTaskCode = signal<string | null>(null);
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
  readonly boardTitle = computed(() => {
    const customTitle = this.selectedBoard()?.title?.trim();
    if (customTitle) return customTitle;
    return this.translation.translate('workspace.detail.boardNumber', { number: this.selectedBoardNumber() });
  });
  readonly taskLists = computed(() => this.selectedBoard()?.taskList.filter((list) => list.isAvailable) ?? []);
  readonly canManageTasks = computed(() => this.store.isActive() && ['owner', 'member'].includes(this.store.workspace()?.roleMember ?? ''));
  readonly canDeleteTasks = computed(() => this.store.isActive() && this.store.isOwner());
  readonly editingBoardTitle = signal(false);
  readonly boardTitleDraft = signal('');
  readonly boardTitleInput = viewChild<ElementRef<HTMLInputElement>>('boardTitleInput');
  readonly taskDrawerOpen = signal(false);
  readonly selectedList = signal<WorkspaceDetailTaskList | null>(null);
  readonly selectedTask = signal<WorkspaceTask | null>(null);
  readonly loadingTaskDetails = signal(false);
  readonly deleteTarget = signal<WorkspaceTask | null>(null);
  readonly deletingTask = signal(false);
  readonly deletingList = signal(false);
  readonly deleteError = signal(false);
  readonly creatingList = signal(false);
  readonly newListTitle = signal('');
  readonly deleteListTarget = signal<{ id: number; title: string } | null>(null);
  private editRequestVersion = 0;
  private deepLinkedTask: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('boardCode')), takeUntilDestroyed(this.destroyRef))
      .subscribe((code) => {
        this.editingBoardTitle.set(false);
        this.boardCode.set(code);
      });

    this.route.queryParamMap
      .pipe(map((params) => params.get('task')), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((taskCode) => this.notificationTaskCode.set(taskCode));

    effect(() => {
      const workspace = this.store.workspace();
      const taskCode = this.notificationTaskCode();
      if (!taskCode) {
        this.deepLinkedTask = null;
        return;
      }
      if (!workspace || this.deepLinkedTask === taskCode) return;

      const selectedBoardCode = this.boardCode();
      const boards = selectedBoardCode
        ? [...workspace.boards.filter((board) => board.code === selectedBoardCode), ...workspace.boards.filter((board) => board.code !== selectedBoardCode)]
        : workspace.boards;
      for (const board of boards) {
        for (const list of board.taskList) {
          const task = list.tasks.find((item) => item.code === taskCode);
          if (!task) continue;
          this.deepLinkedTask = taskCode;
          this.boardCode.set(board.code);
          this.openEditTask({ task, list });
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { task: null, comment: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
          return;
        }
      }
    });
  }

  startEditBoardTitle(): void {
    if (!this.canManageTasks() || !this.selectedBoard()) return;
    this.boardTitleDraft.set(this.boardTitle());
    this.editingBoardTitle.set(true);
    setTimeout(() => {
      const input = this.boardTitleInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  cancelEditBoardTitle(): void {
    this.editingBoardTitle.set(false);
  }

  saveBoardTitle(): void {
    if (!this.editingBoardTitle()) return;
    const workspaceCode = this.store.workspace()?.code;
    const board = this.selectedBoard();
    const nextTitle = this.boardTitleDraft().trim();
    const currentTitle = this.boardTitle();
    this.editingBoardTitle.set(false);

    if (!workspaceCode || !board || !nextTitle || nextTitle === currentTitle) return;

    const rollback = this.store.updateBoardTitle(board.code, nextTitle);
    this.detailApi.updateBoardTitle(workspaceCode, board.code, nextTitle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          rollback?.();
          this.notification.error('notifications.unexpectedError');
        },
      });
  }

  onRenameList(event: { listId: number; title: string }): void {
    const board = this.selectedBoard();
    if (!board || !this.canManageTasks()) return;

    const rollback = this.store.updateTaskListTitle(board.code, event.listId, event.title);
    this.detailApi.updateTaskListTitle(event.listId, event.title)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          rollback?.();
          this.notification.error('notifications.unexpectedError');
        },
      });
  }

  openCreateTask(list: WorkspaceDetailTaskList): void {
    this.editRequestVersion++;
    this.loadingTaskDetails.set(false);
    this.selectedList.set(list);
    this.selectedTask.set(null);
    this.taskDrawerOpen.set(true);
  }

  openCreateList(): void {
    if (!this.canManageTasks() || !this.selectedBoard()) return;
    this.newListTitle.set('');
    this.creatingList.set(true);
  }

  closeCreateList(): void {
    this.creatingList.set(false);
    this.newListTitle.set('');
  }

  createList(): void {
    const board = this.selectedBoard();
    const title = this.newListTitle().trim();
    if (!board || !title || this.creatingList() === false) return;

    this.store.createTaskList(board.code, title);
    this.closeCreateList();
  }

  confirmDeleteList(listId: number): void {
    if (!this.canDeleteTasks()) return;
    const list = this.taskLists().find((l) => l.id === listId);
    this.deleteListTarget.set(list ? { id: list.id, title: list.title } : { id: listId, title: '' });
  }

  deleteList(): void {
    const target = this.deleteListTarget();
    if (!target || this.deletingList()) return;
    this.deletingList.set(true);
    this.store.deleteTaskList(target.id);
    this.deleteListTarget.set(null);
    this.deletingList.set(false);
  }

  cancelDeleteList(): void {
    this.deleteListTarget.set(null);
  }

  openEditTask(data: { task: WorkspaceTask; list: WorkspaceDetailTaskList }): void {
    this.selectedList.set(data.list);
    const requestVersion = ++this.editRequestVersion;
    this.loadingTaskDetails.set(true);

    this.taskApi.getTask(data.task.taskId)
      .pipe(finalize(() => {
        if (requestVersion === this.editRequestVersion) this.loadingTaskDetails.set(false);
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (latestTask) => {
          if (requestVersion !== this.editRequestVersion) return;
          this.selectedTask.set({ ...data.task, ...latestTask });
          this.taskDrawerOpen.set(true);
        },
        error: () => {
          if (requestVersion !== this.editRequestVersion) return;
          // Keep editing available if the detail request fails; the board data is the fallback.
          this.selectedTask.set(data.task);
          this.taskDrawerOpen.set(true);
        },
      });
  }

  onTaskDropped(event: WorkspaceTaskDropEvent): void {
    const workspaceCode = this.store.workspace()?.code;
    if (!workspaceCode || !this.canManageTasks()) return;

    const optimistic = this.store.applyTaskDrop(event);
    if (!optimistic) return;

    const requests: Observable<void>[] = [
      this.taskApi.reorderTasks(workspaceCode, {
        listId: event.targetListId,
        taskIds: optimistic.targetTaskIds,
      }),
    ];

    if (event.sourceListId !== event.targetListId && optimistic.sourceTaskIds.length > 0) {
      requests.push(
        this.taskApi.reorderTasks(workspaceCode, {
          listId: event.sourceListId,
          taskIds: optimistic.sourceTaskIds,
        }),
      );
    }

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          optimistic.rollback();
          this.notification.error('notifications.unexpectedError');
        },
      });
  }

  closeTaskDrawer(): void {
    this.editRequestVersion++;
    this.loadingTaskDetails.set(false);
    this.taskDrawerOpen.set(false);
    this.selectedList.set(null);
    this.selectedTask.set(null);
  }

  onTaskSaved(): void {
    this.closeTaskDrawer();
    this.store.refresh();
  }

  toggleTaskCompleted(task: WorkspaceTask): void {
    const workspaceCode = this.store.workspace()?.code;
    if (!workspaceCode || !this.canManageTasks()) return;

    const completed = !task.completed;
    const rollback = this.store.updateTask(task.taskId, { completed });
    this.taskApi.updateTask(task.taskId, workspaceCode, { completed })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTask) => {
          this.store.updateTask(task.taskId, { completed: updatedTask.completed });
          this.notification.success(completed ? 'notifications.taskMarkedCompleted' : 'notifications.taskMarkedPending');
        },
        error: () => {
          rollback?.();
          this.notification.error('notifications.unexpectedError');
        },
      });
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
