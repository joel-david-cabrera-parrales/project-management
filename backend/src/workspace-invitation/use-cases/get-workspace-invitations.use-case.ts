import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceInvitation } from '../entities/workspace-invitation.entity';
import { GetWorkspaceInvitationsUseCase, InvitationItem } from '../classes/get-workspace-invitations.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

const AVATAR_COLORS = ['#ef4444', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

function toInitials(firstName: string, firstSurname: string): string {
  return `${firstName.charAt(0)}${firstSurname.charAt(0)}`.toUpperCase();
}

function toAvatarColor(fullname: string): string {
  const index = fullname.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

@Injectable()
export class GetWorkspaceInvitationsUseCaseImp implements GetWorkspaceInvitationsUseCase {
  constructor(
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepo: Repository<WorkspaceInvitation>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(workspaceCode: string, userId: number): Promise<InvitationItem[]> {
    await this.authorizeWorkspaceMembership.execute(workspaceCode, userId, ['owner']);
    const invitations = await this.invitationRepo.find({
      where: { workspace: { code: workspaceCode }, accepted: false, isAvailable: true },
      relations: { user: { profile: true } },
      order: { createdAt: 'DESC' },
    });

    return invitations.map((inv) => {
      const fullname = `${inv.user.profile.firstName} ${inv.user.profile.firstSurname}`;
      return {
        code: inv.code,
        invitedEmail: inv.user.profile.email,
        invitedName: fullname,
        photo: inv.user.profile.photo ?? null,
        initials: toInitials(inv.user.profile.firstName, inv.user.profile.firstSurname),
        avatarColor: toAvatarColor(fullname),
        role: inv.rolMember,
        accepted: inv.accepted,
        isAvailable: inv.isAvailable,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        dateAcepted: inv.dateAcepted,
      };
    });
  }
}
