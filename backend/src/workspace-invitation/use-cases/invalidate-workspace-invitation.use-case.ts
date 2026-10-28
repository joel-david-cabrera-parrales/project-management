import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';
import { WorkspaceInvitation } from '../entities/workspace-invitation.entity';
import { InvalidateWorkspaceInvitationUseCase } from '../classes/invalidate-workspace-invitation.class';

@Injectable()
export class InvalidateWorkspaceInvitationUseCaseImp implements InvalidateWorkspaceInvitationUseCase {
  constructor(
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepository: Repository<WorkspaceInvitation>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(invitationCode: string, userId: number): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { code: invitationCode, isAvailable: true },
      relations: { workspace: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.authorizeWorkspaceMembership.execute(invitation.workspace.code, userId, ['owner']);
    invitation.isAvailable = false;
    await this.invitationRepository.save(invitation);
  }
}
