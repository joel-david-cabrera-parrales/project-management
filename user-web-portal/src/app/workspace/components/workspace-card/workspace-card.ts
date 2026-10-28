import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceListItem } from '../../models/workspace-list.models';

@Component({
  selector: 'app-workspace-card',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './workspace-card.html',
  styleUrl: './workspace-card.css',
})
export class WorkspaceCard {
  readonly workspace = input.required<WorkspaceListItem>();
  readonly viewMode = input<'grid' | 'list'>('grid');

  readonly statusKey = computed(() => {
    switch (this.workspace().status) {
      case 1: return 'workspace.status.active';
      case 2: return 'workspace.status.closed';
      case 3: return 'workspace.status.archived';
      default: return 'workspace.status.active';
    }
  });
}
