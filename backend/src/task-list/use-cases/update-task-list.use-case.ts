import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskList } from '../entities/task-list.entity';
import { UpdateTaskListDto } from '../dto/update-task-list.dto';
import { TaskListResponse } from 'src/common/responses/task-list.response';
import { UpdateTaskListUseCase } from '../classes/update-task-list.class';
import { TaskListMapper } from '../mappers/task-list.mapper';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class UpdateTaskListUseCaseImp implements UpdateTaskListUseCase {
  constructor(
    @InjectRepository(TaskList)
    private readonly taskListRepository: Repository<TaskList>,
    private readonly mapper: TaskListMapper,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(id: number, dto: UpdateTaskListDto, userId: number): Promise<TaskListResponse> {
    const entity = await this.taskListRepository.findOne({
      where: { id, isAvailable: true },
      relations: { board: { workspace: true } },
    });
    if (!entity) throw new NotFoundException('Task list not found');
    if (entity.board.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    await this.authorizeWorkspaceMembership.execute(entity.board.workspace.code, userId, ['owner', 'member']);

    this.taskListRepository.merge(entity, dto);
    await this.taskListRepository.save(entity);

    const full = await this.taskListRepository.findOne({
      where: { id },
      relations: {
        board: { workspace: true },
        tasks: {
          labels: true,
          assignments: {
            workspaceMember: {
              user: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return this.mapper.toResponse(full!);
  }
}
