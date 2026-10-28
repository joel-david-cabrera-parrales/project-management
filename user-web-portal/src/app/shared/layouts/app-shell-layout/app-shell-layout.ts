import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { WorkspaceCreateModal } from '../../../workspace/components/workspace-create-modal/workspace-create-modal';
import { WorkspaceTopbar } from '../../../workspace/components/workspace-topbar/workspace-topbar';
import { WorkspaceListStore } from '../../../workspace/state/workspace-list.store';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, WorkspaceTopbar, WorkspaceCreateModal],
  templateUrl: './app-shell-layout.html',
  styleUrl: './app-shell-layout.css',
})
export class AppShellLayout {
  private readonly router = inject(Router);
  readonly workspaceStore = inject(WorkspaceListStore);
  private readonly translation = inject(TranslationService);

  constructor() {
    void this.translation.setLanguage(this.translation.currentLang());
  }

  onWorkspaceCreated(): void {
    void this.router.navigateByUrl('/workspace');
  }
}
