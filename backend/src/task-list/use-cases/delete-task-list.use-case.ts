import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskList } from '../entities/task-list.entity';
import { DeleteTaskListUseCase } from '../classes/delete-task-list.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class DeleteTaskListUseCaseImp implements DeleteTaskListUseCase {
  constructor(
    @InjectRepository(TaskList)
    private readonly taskListRepository: Repository<TaskList>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(id: number, userId: number): Promise<void> {
    const entity = await this.taskListRepository.findOne({
      where: { id, isAvailable: true },
      relations: { board: { workspace: true } },
    });
    if (!entity) throw new NotFoundException('Task list not found');
    await this.authorizeWorkspaceMembership.execute(entity.board.workspace.code, userId, ['owner', 'member']);

    entity.isAvailable = false;
    await this.taskListRepository.save(entity);
  }
}
