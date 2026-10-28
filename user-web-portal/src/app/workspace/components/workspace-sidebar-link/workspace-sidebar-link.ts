import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

export type WorkspaceSidebarIcon = 'board' | 'members' | 'labels' | 'settings';

@Component({
  selector: 'app-workspace-sidebar-link',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './workspace-sidebar-link.html',
  styleUrl: './workspace-sidebar-link.css',
})
export class WorkspaceSidebarLink {
  readonly label = input.required<string>();
  readonly route = input.required<string>();
  readonly icon = input<WorkspaceSidebarIcon>('board');
  readonly collapsed = input(false);
  readonly nested = input(false);
  readonly exact = input(true);
}
