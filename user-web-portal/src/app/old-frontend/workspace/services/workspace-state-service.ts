import { Injectable, inject } from '@angular/core';
import { Task, Workspace } from '../models/workspace.models';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceService } from './workspace-service';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceStateService {
  private workspace = new BehaviorSubject<Workspace | null>(null);
  public workspace$ = this.workspace.asObservable();

  private readonly workspaceService = inject(WorkspaceService);

  public get workspaceValue() {
    return this.workspace.getValue();
  }

  public setActiveWorkspace(workspace: Workspace) {
    this.workspace.next(workspace);
  }

  public clearWorkspace() {
    this.workspace.next(null);
  }

  public refreshWorkspace() {
    const workspace = this.workspace.getValue();
    if (workspace) {
      this.workspaceService.getAWorkspace(workspace.id).subscribe((response) => {
        console.log(response);

        if (response) this.setActiveWorkspace(response);
      });
    }
  }

  // Task STate
  // TODO: Create TaskStateService and move all task state to it

  selectedTask = new BehaviorSubject<Task | null>(null);
  selectedTask$ = this.selectedTask.asObservable();

  showTaskDetailModal = new BehaviorSubject<boolean>(false);
  showTaskDetailModal$ = this.showTaskDetailModal.asObservable();

  updateCurrentTask(task: Task): void {
    this.selectedTask.next(task);
  }

  openTaskDetailModal(task: Task) {
    this.selectedTask.next(task);
    this.showTaskDetailModal.next(true);
  }

  closeTaskDetailModal() {
    this.selectedTask.next(null);
    this.showTaskDetailModal.next(false);
  }

  incrementTaskComments(taskCode: string, delta: number = 1): void {
    const ws = this.workspace.getValue();
    if (!ws) return;
    const newBoards = ws.boards.map((b) => ({
      ...b,
      lists: b.lists.map((l) => ({
        ...l,
        tasks: l.tasks.map((t) =>
          t.code === taskCode ? { ...t, comments: (t.comments || 0) + delta } : t,
        ),
      })),
    }));
    this.workspace.next({ ...ws, boards: newBoards });
  }
}
