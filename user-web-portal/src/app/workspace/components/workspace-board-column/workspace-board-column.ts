import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceDetailTaskList, WorkspaceTask, WorkspaceTaskDropEvent } from '../../models/workspace-detail.models';
import { WorkspaceTaskCard } from '../workspace-task-card/workspace-task-card';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-workspace-board-column',
  imports: [DragDropModule, TranslatePipe, WorkspaceTaskCard, TooltipDirective],
  templateUrl: './workspace-board-column.html',
  styleUrl: './workspace-board-column.css',
})
export class WorkspaceBoardColumn {
  readonly list = input.required<WorkspaceDetailTaskList>();
  readonly boardCode = input.required<string>();
  readonly canManage = input(false);
  readonly canDelete = input(false);
  readonly createTask = output<WorkspaceDetailTaskList>();
  readonly editTask = output<{ task: WorkspaceTask; list: WorkspaceDetailTaskList }>();
  readonly deleteTask = output<WorkspaceTask>();
  readonly toggleTaskCompleted = output<WorkspaceTask>();
  readonly renameList = output<{ listId: number; title: string }>();
  readonly deleteList = output<number>();
  readonly taskDropped = output<WorkspaceTaskDropEvent>();

  readonly editingTitle = signal(false);
  readonly titleDraft = signal('');
  readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  startEditTitle(): void {
    if (!this.canManage()) return;
    this.titleDraft.set(this.list().title);
    this.editingTitle.set(true);
    setTimeout(() => {
      const input = this.titleInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  cancelEditTitle(): void {
    this.editingTitle.set(false);
  }

  saveTitle(): void {
    if (!this.editingTitle()) return;
    const nextTitle = this.titleDraft().trim();
    const currentList = this.list();
    this.editingTitle.set(false);

    if (!nextTitle || nextTitle === currentList.title) return;
    this.renameList.emit({ listId: currentList.id, title: nextTitle });
  }

  onDrop(event: CdkDragDrop<WorkspaceDetailTaskList, WorkspaceDetailTaskList, WorkspaceTask>): void {
    if (!this.canManage()) return;
    const sourceListId = event.previousContainer.data.id;
    const targetListId = event.container.data.id;

    if (sourceListId === targetListId && event.previousIndex === event.currentIndex) {
      return;
    }

    this.taskDropped.emit({
      boardCode: this.boardCode(),
      sourceListId,
      targetListId,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }
}
