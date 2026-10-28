import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskList } from '../entities/task-list.entity';
import { Board } from 'src/workspace/entities/board.entity';
import { CreateTaskListDto } from '../dto/create-task-list.dto';
import { TaskListResponse } from 'src/common/responses/task-list.response';
import { CreateTaskListUseCase } from '../classes/create-task-list.class';
import { TaskListMapper } from '../mappers/task-list.mapper';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class CreateTaskListUseCaseImp implements CreateTaskListUseCase {
  constructor(
    @InjectRepository(TaskList)
    private readonly taskListRepository: Repository<TaskList>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly mapper: TaskListMapper,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(dto: CreateTaskListDto, userId: number): Promise<TaskListResponse> {
    const board = await this.boardRepository.findOne({
      where: { id: dto.boardId, isAvailable: true },
      relations: { workspace: true },
    });
    if (!board) throw new NotFoundException('Board not found');
    await this.authorizeWorkspaceMembership.execute(board.workspace.code, userId, ['owner', 'member']);

    const entity = this.taskListRepository.create({
      title: dto.title,
      position: dto.position,
      board,
    });

    const saved = await this.taskListRepository.save(entity);
    const full = await this.taskListRepository.findOne({
      where: { id: saved.id },
      relations: {
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
