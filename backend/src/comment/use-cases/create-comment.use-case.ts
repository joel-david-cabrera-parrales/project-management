import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Task } from 'src/task/entities/task.entity';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { CreateCommentUseCase } from '../classes/create-comment.class';

@Injectable()
export class CreateCommentUseCaseImp implements CreateCommentUseCase {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async execute(
    content: string,
    taskCode: string,
    userId: number,
    parentId?: number,
    mentions?: number[],
  ): Promise<Comment> {
    const task = await this.taskRepository.findOne({
      where: { code: taskCode, isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const workspaceId = task.taskList.board.workspace.id;
    const member = await this.workspaceMemberRepository.findOne({
      where: { user: { id: userId }, workspace: { id: workspaceId }, isAvailable: true },
      relations: { user: { profile: true } },
    });
    if (!member) throw new NotFoundException('You are not a member of this workspace');

    if (parentId) {
      const parent = await this.commentRepository.findOneBy({ id: parentId, task: { id: task.id }, isAvailable: true });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    const comment = this.commentRepository.create({
      content,
      task,
      author: member,
      parentId: parentId ?? null,
      mentions: mentions ?? [],
    });
    return this.commentRepository.save(comment);
  }
}
