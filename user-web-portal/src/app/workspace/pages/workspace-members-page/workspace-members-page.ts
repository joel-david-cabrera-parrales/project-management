import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StorageService } from '../../../shared/services/storage.service';
import { WorkspaceAvatar } from '../../components/workspace-avatar/workspace-avatar';
import { WorkspaceConfirmDialog } from '../../components/workspace-confirm-dialog/workspace-confirm-dialog';
import { WorkspaceMembersApiService } from '../../data-access/workspace-members-api.service';
import { WorkspaceDetailMember, WorkspaceInvitation, WorkspaceMemberRole } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';
import { WorkspaceFilterInput } from '../../components/workspace-filter-input/workspace-filter-input';
import { WorkspaceDrawer } from '../../components/workspace-drawer/workspace-drawer';

type MemberDeleteTarget =
  | { kind: 'member'; member: WorkspaceDetailMember }
  | { kind: 'invitation'; invitation: WorkspaceInvitation };

@Component({
  selector: 'app-workspace-members-page',
  imports: [ReactiveFormsModule, TranslatePipe, WorkspaceAvatar, WorkspaceConfirmDialog, WorkspaceFilterInput, WorkspaceDrawer],
  templateUrl: './workspace-members-page.html',
  styleUrl: './workspace-members-page.css',
})
export class WorkspaceMembersPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceMembersApiService);
  private readonly storage = inject(StorageService);
  readonly store = inject(WorkspaceDetailStore);

  readonly members = computed(() => this.store.workspace()?.members ?? []);
  readonly searchQuery = signal('');
  readonly filteredMembers = computed(() => this.filterPeople(this.members()));
  readonly filteredInvitations = computed(() => this.filterPeople(this.invitations()));
  readonly isOwner = computed(() => this.store.isOwner() && this.store.isActive());
  readonly invitations = signal<WorkspaceInvitation[]>([]);
  readonly invitationsLoading = signal(false);
  readonly invitationsError = signal(false);
  readonly inviteOpen = signal(false);
  readonly inviteSaving = signal(false);
  readonly inviteError = signal(false);
  readonly invitationLink = signal('');
  readonly copySuccess = signal(false);
  readonly deleteTarget = signal<MemberDeleteTarget | null>(null);
  readonly deleting = signal(false);
  readonly actionError = signal(false);
  readonly roleEditTarget = signal<WorkspaceDetailMember | null>(null);
  readonly roleEditValue = signal<'member' | 'viewer'>('member');
  readonly roleEditSaving = signal(false);
  readonly roleEditError = signal(false);
  readonly inviteRole = signal<Exclude<WorkspaceMemberRole, 'owner'>>('member');
  readonly inviteForm = this.formBuilder.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  ngOnInit(): void {
    this.loadInvitations();
  }

  openInvite(): void {
    this.inviteForm.reset({ email: '' });
    this.inviteRole.set('member');
    this.inviteError.set(false);
    this.invitationLink.set('');
    this.copySuccess.set(false);
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    if (this.inviteSaving()) return;
    this.inviteOpen.set(false);
  }

  sendInvitation(): void {
    const workspace = this.store.workspace();
    const inviterEmail = this.storage.getProfile()?.email;
    if (!workspace || this.inviteForm.invalid || this.inviteSaving()) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    if (!inviterEmail) {
      this.inviteError.set(true);
      return;
    }

    this.inviteError.set(false);
    this.inviteSaving.set(true);
    this.api.sendInvitation({
      workspaceCode: workspace.code,
      invitedEmail: this.inviteForm.controls.email.value.trim(),
      inviterEmail,
      rolMember: this.inviteRole(),
    }).pipe(finalize(() => this.inviteSaving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.invitationLink.set(response.inviteLink);
        this.store.refresh();
        this.loadInvitations();
      },
      error: () => this.inviteError.set(true),
    });
  }

  async copyInvitationLink(): Promise<void> {
    const link = this.invitationLink();
    if (!link || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(link);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      this.inviteError.set(true);
    }
  }

  resendInvitation(invitation: WorkspaceInvitation): void {
    const workspace = this.store.workspace();
    const inviterEmail = this.storage.getProfile()?.email;
    if (!workspace || !inviterEmail) return;
    this.api.resendInvitation({
      workspaceCode: workspace.code,
      invitedEmail: invitation.invitedEmail,
      inviterEmail,
      rolMember: invitation.role === 'viewer' ? 'viewer' : 'member',
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadInvitations(),
      error: () => this.actionError.set(true),
    });
  }

  openRoleEditor(member: WorkspaceDetailMember): void {
    this.roleEditTarget.set(member);
    this.roleEditValue.set(member.roleMember === 'viewer' ? 'viewer' : 'member');
    this.roleEditError.set(false);
  }

  closeRoleEditor(): void {
    if (!this.roleEditSaving()) this.roleEditTarget.set(null);
  }

  saveMemberRole(): void {
    const workspace = this.store.workspace();
    const member = this.roleEditTarget();
    if (!workspace || !member || this.roleEditSaving()) return;
    this.roleEditSaving.set(true);
    this.roleEditError.set(false);
    this.api.updateMemberRole(workspace.code, member.workspaceMemberId, this.roleEditValue())
      .pipe(finalize(() => this.roleEditSaving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.roleEditTarget.set(null);
          this.store.refresh();
        },
        error: () => this.roleEditError.set(true),
      });
  }

  confirmRemoveMember(member: WorkspaceDetailMember): void {
    this.actionError.set(false);
    this.deleteTarget.set({ kind: 'member', member });
  }

  confirmInvalidateInvitation(invitation: WorkspaceInvitation): void {
    this.actionError.set(false);
    this.deleteTarget.set({ kind: 'invitation', invitation });
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) this.deleteTarget.set(null);
  }

  deleteTargetName(): string {
    const target = this.deleteTarget();
    return target?.kind === 'member' ? target.member.fullname : target?.invitation.invitedEmail ?? '';
  }

  deleteDescriptionKey(): string {
    return this.deleteTarget()?.kind === 'member' ? 'workspace.members.removeConfirm' : 'workspace.members.deleteInvConfirm';
  }

  deleteDescriptionParams(): Record<string, unknown> {
    const target = this.deleteTarget();
    if (!target) return {};
    return target.kind === 'member' ? { name: target.member.fullname } : { email: target.invitation.invitedEmail };
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    const workspace = this.store.workspace();
    if (!target || !workspace || this.deleting()) return;
    this.actionError.set(false);
    this.deleting.set(true);
    const request = target.kind === 'member'
      ? this.api.removeMember(workspace.code, target.member.workspaceMemberId)
      : this.api.invalidateInvitation(target.invitation.code);
    request.pipe(finalize(() => this.deleting.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        this.store.refresh();
        this.loadInvitations();
      },
      error: () => this.actionError.set(true),
    });
  }

  private loadInvitations(): void {
    const code = this.store.workspace()?.code;
    if (!code) return;
    this.invitationsLoading.set(true);
    this.invitationsError.set(false);
    this.api.getInvitations(code).pipe(finalize(() => this.invitationsLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.invitations.set(items.filter((item) => item.isAvailable)),
        error: () => this.invitationsError.set(true),
      });
  }

  private filterPeople<T extends { fullname?: string; invitedName?: string; email?: string; invitedEmail?: string }>(items: T[]): T[] {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => `${item.fullname ?? item.invitedName ?? ''} ${item.email ?? item.invitedEmail ?? ''}`
      .toLocaleLowerCase().includes(query));
  }
}
