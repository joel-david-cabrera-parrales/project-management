import { Injectable } from '@nestjs/common';
import { CreateCommentUseCase } from './classes/create-comment.class';
import { FindCommentsByTaskUseCase } from './classes/find-comments-by-task.class';
import { DeleteCommentUseCase } from './classes/delete-comment.class';
import { SendMentionedEmailUseCase } from './classes/send-mentioned-email.class';
import { CommentResponse } from 'src/common/responses';
import { toPhotoUrl } from '../common/helpers/photo-url.helper';

@Injectable()
export class CommentService {
  private readonly avatarColors = [
    '#ef4444',
    '#6366f1',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
    '#14b8a6',
  ];

  constructor(
    private readonly createCommentUseCase: CreateCommentUseCase,
    private readonly findCommentsByTaskUseCase: FindCommentsByTaskUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly sendMentionedEmailUseCase: SendMentionedEmailUseCase,
  ) {}

  private toAvatarColor(fullname: string): string {
    const index = fullname.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % this.avatarColors.length;
    return this.avatarColors[index];
  }

  private mapComment(comment: any): CommentResponse {
    const profile = comment.author?.user?.profile;
    const firstName = profile?.firstName ?? '';
    const firstSurname = profile?.firstSurname ?? '';
    const email = profile?.email ?? '';
    const fullname = `${firstName} ${firstSurname}`.trim() || 'Unknown';

    return {
      id: comment.id,
      code: comment.code,
      content: comment.content,
      parentId: comment.parentId,
      mentions: comment.mentions ?? [],
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
      author: {
        id: comment.author.id,
        fullname,
        email,
        photo: toPhotoUrl(profile?.photo, profile?.code),
        initials: `${firstName.charAt(0)}${firstSurname.charAt(0)}`.toUpperCase() || '?',
        avatarColor: this.toAvatarColor(fullname),
      },
    };
  }

  async create(
    content: string,
    taskCode: string,
    userId: number,
    parentId?: number,
    mentions?: number[],
  ): Promise<CommentResponse> {
    const comment = await this.createCommentUseCase.execute(content, taskCode, userId, parentId, mentions);
    if (comment.mentions?.length) {
      this.sendMentionedEmailUseCase.execute(comment).catch(() => {});
    }
    return this.mapComment(comment);
  }

  async findByTask(taskCode: string, userId: number): Promise<CommentResponse[]> {
    const comments = await this.findCommentsByTaskUseCase.execute(taskCode, userId);
    const mapped = comments.map((c) => this.mapComment(c));
    const topLevel = mapped.filter((c) => !c.parentId);
    const replies = mapped.filter((c) => c.parentId);
    return topLevel.map((c) => ({
      ...c,
      replies: replies.filter((r) => r.parentId === c.id),
    }));
  }

  async remove(code: string, userId: number): Promise<CommentResponse> {
    const comment = await this.deleteCommentUseCase.execute(code, userId);
    return this.mapComment(comment);
  }
}
