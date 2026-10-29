import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { DeleteLabelUseCase } from '../classes/delete-label.class';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class DeleteLabelUseCaseImp implements DeleteLabelUseCase {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(id: number, userId: number, workspaceCode: string): Promise<Label> {
    const label = await this.labelRepository.findOne({
      where: { id, isAvailable: true },
      relations: { workspace: true },
    });
    if (!label) throw new NotFoundException('Label not found');
    if (label.workspace.code !== workspaceCode)
      throw new ForbiddenException('Label does not belong to the requested workspace');
    if (label.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    await this.authorizeWorkspaceMembership.execute(label.workspace.code, userId, ['owner']);

    label.isAvailable = false;
    return this.labelRepository.save(label);
  }
}
