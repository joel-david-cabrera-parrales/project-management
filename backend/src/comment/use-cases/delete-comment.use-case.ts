import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { DeleteCommentUseCase } from '../classes/delete-comment.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class DeleteCommentUseCaseImp implements DeleteCommentUseCase {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(code: string, userId: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { code, isAvailable: true },
      relations: { author: { user: true }, task: { taskList: { board: { workspace: true } } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.task.taskList.board.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    await this.authorizeWorkspaceMembership.execute(comment.task.taskList.board.workspace.code, userId);
    if (comment.author.user.id !== userId) throw new ForbiddenException('You can only delete your own comments');

    comment.isAvailable = false;
    return this.commentRepository.save(comment);
  }
}
