import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
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
  readonly descriptionPreview = computed(() => {
    const description = this.task().description ?? '';
    const document = new DOMParser().parseFromString(description, 'text/html');
    return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  });
  readonly canEdit = input(false);
  readonly canDelete = input(false);
  readonly edit = output<WorkspaceTask>();
  readonly delete = output<WorkspaceTask>();
  readonly toggleCompleted = output<WorkspaceTask>();
  readonly today = new Date().toISOString().slice(0, 10);
}
