import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { Workspace } from 'src/workspace/entities/workspace.entity';
import { FindLabelsByWorkspaceUseCase } from '../classes/find-labels-by-workspace.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class FindLabelsByWorkspaceUseCaseImp implements FindLabelsByWorkspaceUseCase {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(workspaceCode: string, userId: number): Promise<Label[]> {
    const workspace = await this.workspaceRepository.findOneBy({ code: workspaceCode });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.authorizeWorkspaceMembership.execute(workspaceCode, userId);
    return this.labelRepository.find({
      where: { workspace: { id: workspace.id }, isAvailable: true },
      order: { name: 'ASC' },
    });
  }
}
