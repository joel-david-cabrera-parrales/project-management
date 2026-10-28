import { Component, effect, inject, signal } from '@angular/core';
import { WorkspaceStateService } from '../../../../services/workspace-state-service';
import { AuthService } from '../../../../../auth/services/auth.service';
import { WorkspaceService } from '../../../../services/workspace-service';
import { WorkspaceInvitationService, SendInvitationResponse, SendInvitationPayload } from '../../../../services/workspace-invitation-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Member, InvitationItem } from '../../../../models/workspace.models';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-members',
  imports: [FormsModule, ModalComponent, TranslatePipe],
  templateUrl: './members.html',
  styleUrl: './members.css',
})
export class Members {
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly authService = inject(AuthService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly invitationService = inject(WorkspaceInvitationService);

  workspace = toSignal(this.workspaceState.workspace$);

  invitations = signal<InvitationItem[]>([]);

  constructor() {
    effect(() => {
      const ws = this.workspace();
      if (ws?.id) {
        this.loadInvitations(ws.id);
      } else {
        this.invitations.set([]);
      }
    });
  }

  slideOverOpen = signal(false);
  formSubmitting = signal(false);
  inviteResult = signal<SendInvitationResponse | null>(null);
  copySuccess = signal(false);

  deleteInvitationTarget = signal<InvitationItem | null>(null);
  removeMemberTarget = signal<Member | null>(null);
  deleting = signal(false);

  memberEmail = signal('');
  memberRole = signal<'member' | 'viewer'>('member');

  get members(): Member[] {
    return this.workspace()?.members ?? [];
  }

  get isOwner(): boolean {
    const email = this.authService.currentUserEmail();
    if (!email) return false;
    return this.workspace()?.members?.some((m) => m.email === email && m.roleMember === 'owner') ?? false;
  }

  get roleBadgeClass(): string {
    return this.memberRole() === 'member' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200';
  }

  openSlideOver(): void {
    this.memberEmail.set('');
    this.memberRole.set('member');
    this.inviteResult.set(null);
    this.copySuccess.set(false);
    this.slideOverOpen.set(true);
  }

  closeSlideOver(): void {
    this.slideOverOpen.set(false);
  }

  selectRole(role: 'member' | 'viewer'): void {
    this.memberRole.set(role);
  }

  onSubmit(): void {
    const workspaceCode = this.workspace()?.id;
    const inviterEmail = this.authService.currentUserEmail();
    const invitedEmail = this.memberEmail().trim();

    if (!workspaceCode || !inviterEmail || !invitedEmail) return;

    this.formSubmitting.set(true);
    this.inviteResult.set(null);

    this.invitationService
      .sendInvitation({
        workspaceCode,
        invitedEmail,
        inviterEmail,
        rolMember: this.memberRole(),
      })
      .subscribe({
        next: (result) => {
          this.formSubmitting.set(false);
          if (result) {
            this.inviteResult.set(result);
          }
        },
        error: () => {
          this.formSubmitting.set(false);
        },
      });
  }

  copyLink(): void {
    const link = this.inviteResult()?.inviteLink;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  closeResult(): void {
    this.inviteResult.set(null);
    this.slideOverOpen.set(false);
    this.workspaceState.refreshWorkspace();
  }

  private loadInvitations(workspaceCode: string): void {
    this.invitationService.getWorkspaceInvitations(workspaceCode).subscribe({
      next: (result) => {
        if (result) {
          this.invitations.set(result);
        }
      },
    });
  }

  resendInvitation(invitation: InvitationItem): void {
    const workspaceCode = this.workspace()?.id;
    const inviterEmail = this.authService.currentUserEmail();
    if (!workspaceCode || !inviterEmail) return;

    const payload: SendInvitationPayload = {
      workspaceCode,
      invitedEmail: invitation.invitedEmail,
      inviterEmail,
      rolMember: invitation.role as 'member' | 'viewer',
    };

    this.invitationService.resendInvitation(payload).subscribe();
  }

  openDeleteInvitationConfirm(invitation: InvitationItem): void {
    this.deleteInvitationTarget.set(invitation);
  }

  closeDeleteInvitationConfirm(): void {
    this.deleteInvitationTarget.set(null);
  }

  onConfirmDeleteInvitation(): void {
    const invitation = this.deleteInvitationTarget();
    if (!invitation) return;
    this.deleting.set(true);
    this.invitationService.deleteInvitation(invitation.code).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteInvitationTarget.set(null);
        const ws = this.workspace();
        if (ws?.id) this.loadInvitations(ws.id);
      },
      error: () => this.deleting.set(false),
    });
  }

  openRemoveMemberConfirm(member: Member): void {
    this.removeMemberTarget.set(member);
  }

  closeRemoveMemberConfirm(): void {
    this.removeMemberTarget.set(null);
  }

  onConfirmRemoveMember(): void {
    const member = this.removeMemberTarget();
    if (!member) return;
    const workspaceCode = this.workspace()?.id;
    if (!workspaceCode) return;
    this.deleting.set(true);
    this.workspaceService.removeMember(workspaceCode, member.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.removeMemberTarget.set(null);
        this.workspaceState.refreshWorkspace();
      },
      error: () => this.deleting.set(false),
    });
  }
}
