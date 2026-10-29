import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { WorkspaceCreateModal } from '../../../workspace/components/workspace-create-modal/workspace-create-modal';
import { WorkspaceTopbar } from '../../../workspace/components/workspace-topbar/workspace-topbar';
import { WorkspaceListStore } from '../../../workspace/state/workspace-list.store';
import { TranslationService } from '../../services/translation.service';
import { NotificationCenterService } from '../../services/notification-center.service';
import { ChatbotWidget } from '../../../chatbot/components/chatbot-widget/chatbot-widget';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, WorkspaceTopbar, WorkspaceCreateModal, ChatbotWidget],
  templateUrl: './app-shell-layout.html',
  styleUrl: './app-shell-layout.css',
})
export class AppShellLayout {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly workspaceStore = inject(WorkspaceListStore);
  readonly isWorkspaceDetail = signal(false);
  private readonly translation = inject(TranslationService);
  private readonly notificationCenter = inject(NotificationCenterService);

  constructor() {
    void this.translation.setLanguage(this.translation.currentLang());
    this.notificationCenter.start();
    this.syncDetailLayout();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncDetailLayout());
  }

  onWorkspaceCreated(): void {
    void this.router.navigateByUrl('/workspace');
  }

  ngOnDestroy(): void {
    this.notificationCenter.disconnect();
  }

  private syncDetailLayout(): void {
    const path = this.router.url.split('?')[0];
    this.isWorkspaceDetail.set(path.startsWith('/workspace/') && path !== '/workspace');
  }
}
