import { Component, input, computed, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Workspace } from '../../models/workspace.models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-card',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './workspace-card.html',
  styleUrl: './workspace-card.css',
})
export class WorkspaceCard {
  readonly workspace = input.required<Workspace>();
  readonly edit = output<Workspace>();
  readonly delete = output<Workspace>();

  protected menuOpen = false;

  protected readonly visibleMembers = computed(() =>
    this.workspace().members.slice(0, 4),
  );

  protected readonly remainingMembers = computed(() =>
    Math.max(0, this.workspace().members.length - 4),
  );

  protected readonly boardCount = computed(() =>
    this.workspace().boards.length,
  );

  protected readonly memberCount = computed(() =>
    this.workspace().members.length,
  );

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = false;
    this.edit.emit(this.workspace());
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = false;
    this.delete.emit(this.workspace());
  }
}
