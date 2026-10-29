import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { UpdateLabelDto } from '../dto/update-label.dto';
import { UpdateLabelUseCase } from '../classes/update-label.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class UpdateLabelUseCaseImp implements UpdateLabelUseCase {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(id: number, dto: UpdateLabelDto, userId: number): Promise<Label> {
    const label = await this.labelRepository.findOne({
      where: { id, isAvailable: true },
      relations: { workspace: true },
    });
    if (!label) throw new NotFoundException('Label not found');
    if (dto.workspaceCode && dto.workspaceCode !== label.workspace.code)
      throw new ForbiddenException('Label does not belong to the requested workspace');
    if (label.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    await this.authorizeWorkspaceMembership.execute(label.workspace.code, userId, ['owner', 'member']);

    if (dto.name !== undefined) label.name = dto.name;
    if (dto.color !== undefined) label.color = dto.color;

    return this.labelRepository.save(label);
  }
}
