import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitationService, InviteWorkspace } from '../../services/invitation.service';
import { StorageService } from '../../services/storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-invite',
  imports: [RouterLink, TranslatePipe, TooltipDirective],
  templateUrl: './invite.html',
  styleUrl: './invite.css',
})
export class Invite implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationService = inject(InvitationService);
  private readonly storage = inject(StorageService);
  private readonly translation = inject(TranslationService);

  readonly invitationCode = signal<string | null>(null);
  readonly workspace = signal<InviteWorkspace | null>(null);
  readonly loading = signal(true);
  readonly accepting = signal(false);
  readonly accepted = signal(false);
  readonly error = signal<string | null>(null);

  get memberCount(): number {
    return this.workspace()?.members.length ?? 0;
  }

  get visibleMembers() {
    return this.workspace()?.members.slice(0, 3) ?? [];
  }

  get extraMemberCount(): number {
    return Math.max(0, this.memberCount - 3);
  }

  ngOnInit(): void {
    void this.translation.setLanguage(this.translation.currentLang());

    const code = this.route.snapshot.paramMap.get('code');
    if (!code) {
      this.error.set('invite.invalidLink');
      this.loading.set(false);
      return;
    }

    if (!this.storage.isAuthenticated()) {
      void this.router.navigate(['/auth', 'signin'], { queryParams: { returnUrl: `/invite/${code}` } });
      return;
    }

    this.loadInvitation(code);
  }

  private loadInvitation(code: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.invitationService.getInvitation(code).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result) {
          this.invitationCode.set(result.invitationCode);
          this.workspace.set(result.workspace);
        } else {
          this.error.set('invite.notValid');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('invite.loadError');
      },
    });
  }

  accept(): void {
    const ws = this.workspace();
    const code = this.invitationCode();
    const userCode = this.storage.getUserCode();

    if (!ws || !code || !userCode || this.accepting()) return;

    this.accepting.set(true);
    this.invitationService
      .acceptInvitation({
        newMemberCode: userCode,
        workspaceCode: ws.code,
        workspaceInvitationCode: code,
      })
      .subscribe({
        next: (result) => {
          this.accepting.set(false);
          if (result !== null) {
            this.accepted.set(true);
            setTimeout(() => {
              void this.router.navigate(['/workspace', ws.code]);
            }, 1200);
          } else {
            this.error.set('invite.acceptError');
          }
        },
        error: () => {
          this.accepting.set(false);
          this.error.set('invite.acceptError');
        },
      });
  }
}
