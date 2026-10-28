import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { AuthorizeWorkspaceMembershipUseCase } from '../classes/authorize-workspace-membership.class';

@Injectable()
export class AuthorizeWorkspaceMembershipUseCaseImp implements AuthorizeWorkspaceMembershipUseCase {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async execute(workspaceCode: string, userId: number, allowedRoles?: string[]): Promise<WorkspaceMember> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: {
        workspace: { code: workspaceCode, isAvailable: true },
        user: { id: userId, isAvailable: true },
        isAvailable: true,
      },
    });

    if (!membership) throw new ForbiddenException('You are not a member of this workspace');
    if (allowedRoles?.length && !allowedRoles.includes(membership.roleMember)) {
      throw new ForbiddenException('Insufficient workspace role');
    }

    return membership;
  }
}
