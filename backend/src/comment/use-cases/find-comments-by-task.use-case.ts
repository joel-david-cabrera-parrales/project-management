import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Task } from 'src/task/entities/task.entity';
import { FindCommentsByTaskUseCase } from '../classes/find-comments-by-task.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class FindCommentsByTaskUseCaseImp implements FindCommentsByTaskUseCase {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(taskCode: string, userId: number): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({
      where: { code: taskCode, isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.authorizeWorkspaceMembership.execute(task.taskList.board.workspace.code, userId);
    return this.commentRepository.find({
      where: { task: { id: task.id }, isAvailable: true },
      relations: { author: { user: { profile: true } } },
      order: { createdAt: 'ASC' },
    });
  }
}
