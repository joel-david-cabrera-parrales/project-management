import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskList } from 'src/task-list/entities/task-list.entity';
import { ReorderTasksDto } from '../dto/reorder-tasks.dto';
import { ReorderTasksUseCase } from '../classes/reorder-tasks.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class ReorderTasksUseCaseImp implements ReorderTasksUseCase {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskList)
    private readonly taskListRepository: Repository<TaskList>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(dto: ReorderTasksDto, userId: number, workspaceCode: string): Promise<void> {
    const list = await this.taskListRepository.findOne({
      where: { id: dto.listId, isAvailable: true },
      relations: { board: { workspace: true } },
    });
    if (!list) throw new NotFoundException('Task list not found');
    if (list.board.workspace.code !== workspaceCode)
      throw new ForbiddenException('Task list does not belong to the requested workspace');
    await this.authorizeWorkspaceMembership.execute(workspaceCode, userId, ['owner', 'member']);
    if (dto.taskIds.length === 0) return;

    const existing = await this.taskRepository.find({
      where: { id: In(dto.taskIds), isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (existing.length !== dto.taskIds.length) {
      throw new NotFoundException('Some tasks not found');
    }

    const taskMap = new Map(existing.map((t) => [t.id, t]));
    if (existing.some((task) => task.taskList.board.workspace.code !== workspaceCode)) {
      throw new ForbiddenException('All tasks must belong to the requested workspace');
    }

    const ordered = dto.taskIds.map((id, index) => {
      const task = taskMap.get(id)!;
      task.position = index + 1;
      task.taskList = { id: dto.listId } as TaskList;
      return task;
    });

    await this.taskRepository.save(ordered);
  }
}
