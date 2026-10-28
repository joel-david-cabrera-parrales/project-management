import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task } from '../task/task';
import { BoardList } from '../../models/workspace.models';
import { TaskListService } from '../../services/task-list-service';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-task-list',
  imports: [Task, DragDropModule, TranslatePipe],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css',
})
export class TaskList {
  private readonly taskListService = inject(TaskListService);
  private workspaceState = inject(WorkspaceStateService);

  workspace = toSignal(this.workspaceState.workspace$);

  list = input.required<BoardList>();

  connectedLists = input<string[]>([]);

  createTask = output<{ listId: number; position: number }>();
  deleteList = output<BoardList>();
  taskMoved = output<{ movedTaskId: number; movedTaskPosition: number; sourceListId: number; sourceTaskIds: number[]; targetListId: number; targetTaskIds: number[] }>();
  taskReordered = output<{ listId: number; taskIds: number[] }>();

  protected menuOpen = signal(false);
  protected editingTitle = signal(false);
  protected editValue = signal('');

  readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  onTaskDropped(event: CdkDragDrop<BoardList['tasks']>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const taskIds = event.container.data.map((t) => t.id);
      this.taskReordered.emit({ listId: this.list().id, taskIds });
    } else {
      const sourceTaskIds = event.previousContainer.data.map((t) => t.id);
      const movedTaskId = sourceTaskIds[event.previousIndex];
      const sourceListId = Number(event.previousContainer.id.replace('task-list-', ''));
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      const targetTaskIds = event.container.data.map((t) => t.id);
      this.taskMoved.emit({
        movedTaskId,
        movedTaskPosition: event.currentIndex + 1,
        sourceListId,
        sourceTaskIds,
        targetListId: this.list().id,
        targetTaskIds,
      });
    }
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onDeleteList(): void {
    this.menuOpen.set(false);
    this.deleteList.emit(this.list());
  }

  onCreateTask() {
    this.createTask.emit({ listId: this.list().id, position: this.list().tasks.length + 1 });
  }

  onStartEdit(): void {
    this.menuOpen.set(false);
    this.editValue.set(this.list().title);
    this.editingTitle.set(true);
    setTimeout(() => {
      this.titleInput()?.nativeElement.focus();
      this.titleInput()?.nativeElement.select();
    });
  }

  onSaveTitle(): void {
    if (!this.editingTitle()) return;
    const value = this.editValue().trim();
    if (!value) {
      this.editingTitle.set(false);
      return;
    }
    if (value !== this.list().title) {
      this.taskListService.updateTitle(this.list().id, value).subscribe();
    }
    this.editingTitle.set(false);
  }

  onCancelEdit(): void {
    this.editingTitle.set(false);
  }
}
