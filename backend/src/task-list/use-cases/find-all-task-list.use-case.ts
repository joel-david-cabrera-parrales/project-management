import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskList } from '../entities/task-list.entity';
import { TaskListResponse } from 'src/common/responses/task-list.response';
import { FindAllTaskListUseCase } from '../classes/find-all-task-list.class';
import { TaskListMapper } from '../mappers/task-list.mapper';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { In } from 'typeorm';

@Injectable()
export class FindAllTaskListUseCaseImp implements FindAllTaskListUseCase {
  constructor(
    @InjectRepository(TaskList)
    private readonly taskListRepository: Repository<TaskList>,
    private readonly mapper: TaskListMapper,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async execute(userId: number): Promise<TaskListResponse[]> {
    const memberships = await this.workspaceMemberRepository.find({
      where: { user: { id: userId, isAvailable: true }, isAvailable: true, workspace: { isAvailable: true } },
      relations: { workspace: true },
    });
    const workspaceIds = memberships.map((membership) => membership.workspace.id);
    if (!workspaceIds.length) return [];

    const entities = await this.taskListRepository.find({
      where: { isAvailable: true, board: { workspace: { id: In(workspaceIds) } } },
      relations: {
        board: { workspace: true },
        tasks: {
          labels: {
            label: true,
          },
          assignments: {
            workspaceMember: {
              user: {
                profile: true,
              },
            },
          },
        },
      },
      order: { position: 'ASC', tasks: { position: 'ASC' } },
    });

    return this.mapper.toResponseList(entities);
  }
}
