import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { WorkspaceDetail } from '../../models/workspace-detail.models';
import { WorkspaceSidebarLink } from '../workspace-sidebar-link/workspace-sidebar-link';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, TranslatePipe, WorkspaceSidebarLink],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.css',
})
export class WorkspaceSidebar {
  readonly workspace = input.required<WorkspaceDetail>();
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly toggleCollapsed = output<void>();
  readonly closeMobile = output<void>();

  readonly searchQuery = signal('');
  readonly boardsExpanded = signal(true);
  readonly filteredBoards = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return this.workspace().boards
      .map((board, index) => ({ ...board, label: this.boardLabel(index + 1) }))
      .filter((board) => !query || board.label.toLocaleLowerCase().includes(query) || board.code.toLocaleLowerCase().includes(query));
  });

  constructor(private readonly translation: TranslationService) {}

  boardLabel(number: number): string {
    return this.translation.translate('workspace.detail.boardNumber', { number });
  }

  showBoardNavigation(): boolean {
    return this.matchesNav('workspace.sidebar.board') || this.filteredBoards().length > 0;
  }

  matchesNav(key: string): boolean {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return !query || this.translation.translate(key).toLocaleLowerCase().includes(query);
  }
}
