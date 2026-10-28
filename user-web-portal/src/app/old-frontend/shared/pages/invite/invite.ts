import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitationService } from '../../services/invitation.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Workspace } from '../../../workspace/models/workspace.models';

@Component({
  selector: 'app-invite',
  imports: [RouterLink],
  templateUrl: './invite.html',
  styleUrl: './invite.css',
})
export class Invite implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationService = inject(InvitationService);
  private readonly authService = inject(AuthService);

  invitationCode = signal<string | null>(null);
  workspace = signal<Workspace | null>(null);
  loading = signal(true);
  accepting = signal(false);
  accepted = signal(false);
  error = signal<string | null>(null);

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
    const code = this.route.snapshot.paramMap.get('code');
    if (!code) {
      this.error.set('Invalid invitation link');
      this.loading.set(false);
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
          this.error.set('This invitation is no longer valid.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load invitation.');
      },
    });
  }

  accept(): void {
    const ws = this.workspace();
    const code = this.invitationCode();
    const userCode = this.authService.userCode();

    if (!ws || !code || !userCode) return;

    this.accepting.set(true);
    this.invitationService
      .acceptInvitation({
        newMemberCode: userCode,
        workspaceCode: ws.id,
        workspaceInvitationCode: code,
      })
      .subscribe({
        next: (result) => {
          this.accepting.set(false);
          if (result !== null) {
            this.accepted.set(true);
            setTimeout(() => {
              this.router.navigate(['/workspace', ws.id]);
            }, 1200);
          }
        },
        error: () => {
          this.accepting.set(false);
        },
      });
  }
}
