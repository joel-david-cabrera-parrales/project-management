import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { WorkspaceDetailApiService } from '../data-access/workspace-detail-api.service';
import {
  CreateTaskListPayload,
  WorkspaceDetail,
  WorkspaceDetailTaskList,
  WorkspaceTaskDropEvent,
} from '../models/workspace-detail.models';

export interface OptimisticTaskDropResult {
  rollback: () => void;
  sourceTaskIds: number[];
  targetTaskIds: number[];
}

@Injectable()
export class WorkspaceDetailStore {
  private readonly api = inject(WorkspaceDetailApiService);

  readonly workspace = signal<WorkspaceDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly isOwner = computed(() => this.workspace()?.roleMember === 'owner');
  readonly isActive = computed(() => (this.workspace()?.status ?? 1) === 1);

  load(code: string): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.getWorkspace(code)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (workspace) => this.workspace.set(workspace),
        error: () => {
          this.workspace.set(null);
          this.loadError.set(true);
        },
      });
  }

  refresh(): void {
    const code = this.workspace()?.code;
    if (code) this.load(code);
  }

  setWorkspace(workspace: WorkspaceDetail): void {
    this.workspace.set(workspace);
  }

  updateBoardTitle(boardCode: string, title: string): (() => void) | null {
    const snapshot = this.workspace();
    if (!snapshot) return null;

    this.workspace.set({
      ...snapshot,
      boards: snapshot.boards.map((board) =>
        board.code === boardCode ? { ...board, title } : board,
      ),
    });

    return () => this.workspace.set(snapshot);
  }

  updateTaskListTitle(boardCode: string, listId: number, title: string): (() => void) | null {
    const snapshot = this.workspace();
    if (!snapshot) return null;

    this.workspace.set({
      ...snapshot,
      boards: snapshot.boards.map((board) => {
        if (board.code !== boardCode) return board;
        return {
          ...board,
          taskList: board.taskList.map((list) =>
            list.id === listId ? { ...list, title } : list,
          ),
        };
      }),
    });

    return () => this.workspace.set(snapshot);
  }

  updateTask(
    taskId: number,
    updates: Partial<WorkspaceDetail['boards'][number]['taskList'][number]['tasks'][number]>,
  ): (() => void) | null {
    const snapshot = this.workspace();
    if (!snapshot) return null;

    let found = false;
    const boards = snapshot.boards.map((board) => ({
      ...board,
      taskList: board.taskList.map((list) => ({
        ...list,
        tasks: list.tasks.map((task) => {
          if (task.taskId !== taskId) return task;
          found = true;
          return { ...task, ...updates };
        }),
      })),
    }));

    if (!found) return null;
    this.workspace.set({ ...snapshot, boards });
    return () => this.workspace.set(snapshot);
  }

  createTaskList(boardCode: string, title: string): void {
    const snapshot = this.workspace();
    if (!snapshot) return;

    const board = snapshot.boards.find((b) => b.code === boardCode);
    if (!board) return;

    const optimisticList: WorkspaceDetailTaskList = {
      id: -1,
      code: `temp-${Date.now()}`,
      title,
      position: board.taskList.length,
      isAvailable: true,
      tasks: [],
    };

    this.workspace.set({
      ...snapshot,
      boards: snapshot.boards.map((b) => {
        if (b.code !== boardCode) return b;
        return {
          ...b,
          taskList: [...b.taskList, optimisticList],
        };
      }),
    });

    const boardId = board.boardId;
    const position = board.taskList.length;
    this.api
      .createTaskList({ title, boardId, position })
      .subscribe({
        next: (saved) => {
          const current = this.workspace();
          if (!current) return;
          this.workspace.set({
            ...current,
            boards: current.boards.map((b) => {
              if (b.code !== boardCode) return b;
              return {
                ...b,
                taskList: b.taskList.map((list) =>
                  list.id === optimisticList.id ? saved : list,
                ),
              };
            }),
          });
        },
        error: () => {
          this.workspace.set(snapshot);
        },
      });
  }

  deleteTaskList(listId: number): void {
    const snapshot = this.workspace();
    if (!snapshot) return;

    this.workspace.set({
      ...snapshot,
      boards: snapshot.boards.map((b) => ({
        ...b,
        taskList: b.taskList.filter((list) => list.id !== listId),
      })),
    });

    this.api.deleteTaskList(listId).subscribe({
      error: () => {
        this.workspace.set(snapshot);
      },
    });
  }

  applyTaskDrop(event: WorkspaceTaskDropEvent): OptimisticTaskDropResult | null {
    const snapshot = this.workspace();
    if (!snapshot) return null;

    const board = snapshot.boards.find((b) => b.code === event.boardCode);
    if (!board) return null;

    const sourceList = board.taskList.find((l) => l.id === event.sourceListId);
    const targetList = board.taskList.find((l) => l.id === event.targetListId);
    if (!sourceList || !targetList) return null;

    let nextSourceTasks = [...sourceList.tasks];
    let nextTargetTasks = event.sourceListId === event.targetListId ? nextSourceTasks : [...targetList.tasks];

    if (event.previousIndex < 0 || event.previousIndex >= nextSourceTasks.length) return null;

    const [movedTask] = nextSourceTasks.splice(event.previousIndex, 1);
    const boundedTargetIndex = Math.max(0, Math.min(event.currentIndex, nextTargetTasks.length));
    nextTargetTasks.splice(boundedTargetIndex, 0, movedTask);

    nextSourceTasks = nextSourceTasks.map((task, idx) => ({ ...task, position: idx + 1 }));
    nextTargetTasks = nextTargetTasks.map((task, idx) => ({ ...task, position: idx + 1 }));

    const updatedWorkspace: WorkspaceDetail = {
      ...snapshot,
      boards: snapshot.boards.map((b) => {
        if (b.code !== event.boardCode) return b;
        return {
          ...b,
          taskList: b.taskList.map((list) => {
            if (list.id === event.targetListId) {
              return { ...list, tasks: nextTargetTasks };
            }
            if (list.id === event.sourceListId) {
              return { ...list, tasks: nextSourceTasks };
            }
            return list;
          }),
        };
      }),
    };

    this.workspace.set(updatedWorkspace);

    return {
      rollback: () => this.workspace.set(snapshot),
      sourceTaskIds: nextSourceTasks.map((t) => t.taskId),
      targetTaskIds: nextTargetTasks.map((t) => t.taskId),
    };
  }
}
