import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceInvitation } from '../entities/workspace-invitation.entity';
import { GetWorkspaceInvitationUseCase } from '../classes/get-workspace-invitation.class';

@Injectable()
export class GetWorkspaceInvitationUseCaseImp implements GetWorkspaceInvitationUseCase {
  constructor(
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepository: Repository<WorkspaceInvitation>,
  ) {}

  async execute(invitationCode: string, userId: number): Promise<WorkspaceInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { code: invitationCode, isAvailable: true, workspace: { isAvailable: true } },
      relations: { user: true, workspace: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.user.id !== userId) throw new ForbiddenException('This invitation belongs to another user');
    return invitation;
  }
}
