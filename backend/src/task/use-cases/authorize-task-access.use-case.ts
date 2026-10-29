import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';
import { Task } from '../entities/task.entity';
import { AuthorizeTaskAccessUseCase } from '../classes/authorize-task-access.class';

@Injectable()
export class AuthorizeTaskAccessUseCaseImp implements AuthorizeTaskAccessUseCase {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(
    taskId: number,
    userId: number,
    allowedRoles?: string[],
    expectedWorkspaceCode?: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const workspaceCode = task.taskList.board.workspace.code;
    if (expectedWorkspaceCode && expectedWorkspaceCode !== workspaceCode) {
      throw new ForbiddenException('Task does not belong to the requested workspace');
    }

    if (allowedRoles?.length && task.taskList.board.workspace.status !== undefined && task.taskList.board.workspace.status !== 1) {
      throw new ForbiddenException('Workspace is not active');
    }

    await this.authorizeWorkspaceMembership.execute(workspaceCode, userId, allowedRoles);
    return task;
  }
}
