import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { Workspace } from 'src/workspace/entities/workspace.entity';
import { CreateLabelDto } from '../dto/create-label.dto';
import { CreateLabelUseCase } from '../classes/create-label.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class CreateLabelUseCaseImp implements CreateLabelUseCase {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(dto: CreateLabelDto, userId: number): Promise<Label> {
    const workspace = await this.workspaceRepository.findOneBy({ code: dto.workspaceCode });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    await this.authorizeWorkspaceMembership.execute(workspace.code, userId, ['owner', 'member']);
    const label = this.labelRepository.create({ name: dto.name, color: dto.color, workspace });
    return this.labelRepository.save(label);
  }
}
