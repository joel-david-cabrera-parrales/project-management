import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceDetailTaskList, WorkspaceTask } from '../../models/workspace-detail.models';
import { WorkspaceTaskCard } from '../workspace-task-card/workspace-task-card';

@Component({
  selector: 'app-workspace-board-column',
  imports: [TranslatePipe, WorkspaceTaskCard],
  templateUrl: './workspace-board-column.html',
  styleUrl: './workspace-board-column.css',
})
export class WorkspaceBoardColumn {
  readonly list = input.required<WorkspaceDetailTaskList>();
  readonly canManage = input(false);
  readonly canDelete = input(false);
  readonly createTask = output<WorkspaceDetailTaskList>();
  readonly editTask = output<{ task: WorkspaceTask; list: WorkspaceDetailTaskList }>();
  readonly deleteTask = output<WorkspaceTask>();
}
