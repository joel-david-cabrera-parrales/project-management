import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { WorkspaceDetail } from '../../models/workspace-detail.models';
import { WorkspaceSidebarLink } from '../workspace-sidebar-link/workspace-sidebar-link';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, TranslatePipe, WorkspaceSidebarLink, TooltipDirective],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.css',
})
export class WorkspaceSidebar {
  readonly workspace = input.required<WorkspaceDetail>();
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly toggleCollapsed = output<void>();
  readonly closeMobile = output<void>();
  readonly createBoard = output<string>();
  readonly creatingBoard = input(false);

  readonly searchQuery = signal('');
  readonly boardsExpanded = signal(true);
  readonly createBoardFormOpen = signal(false);
  readonly newBoardTitle = signal('');
  readonly canCreateBoard = computed(() => this.workspace().status === 1
    && ['owner', 'member'].includes(this.workspace().roleMember ?? ''));
  readonly filteredBoards = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return this.workspace().boards
      .map((board, index) => ({ ...board, label: board.title?.trim() || this.boardLabel(index + 1) }))
      .filter((board) => !query || board.label.toLocaleLowerCase().includes(query) || board.code.toLocaleLowerCase().includes(query));
  });

  constructor(private readonly translation: TranslationService) {}

  boardLabel(number: number): string {
    return this.translation.translate('workspace.detail.boardNumber', { number });
  }

  startCreateBoard(): void {
    this.newBoardTitle.set('');
    this.createBoardFormOpen.set(true);
    this.boardsExpanded.set(true);
  }

  cancelCreateBoard(): void {
    this.createBoardFormOpen.set(false);
    this.newBoardTitle.set('');
  }

  submitCreateBoard(event: SubmitEvent): void {
    event.preventDefault();
    const title = this.newBoardTitle().trim();
    if (!title || this.creatingBoard()) return;
    this.createBoard.emit(title);
    this.cancelCreateBoard();
  }

  showBoardNavigation(): boolean {
    return this.matchesNav('workspace.sidebar.board') || this.filteredBoards().length > 0;
  }

  matchesNav(key: string): boolean {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return !query || this.translation.translate(key).toLocaleLowerCase().includes(query);
  }
}
