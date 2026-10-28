import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceTask } from '../../models/workspace-detail.models';
import { WorkspaceAvatar } from '../workspace-avatar/workspace-avatar';

@Component({
  selector: 'app-workspace-task-card',
  imports: [DatePipe, TranslatePipe, WorkspaceAvatar],
  templateUrl: './workspace-task-card.html',
  styleUrl: './workspace-task-card.css',
})
export class WorkspaceTaskCard {
  readonly task = input.required<WorkspaceTask>();
  readonly canEdit = input(false);
  readonly canDelete = input(false);
  readonly edit = output<WorkspaceTask>();
  readonly delete = output<WorkspaceTask>();
  readonly today = new Date().toISOString().slice(0, 10);
}
