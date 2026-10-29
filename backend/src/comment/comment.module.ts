import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { TaskModule } from 'src/task/task.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { CommonModule } from 'src/common/common.module';
import { CreateCommentUseCase } from './classes/create-comment.class';
import { CreateCommentUseCaseImp } from './use-cases/create-comment.use-case';
import { FindCommentsByTaskUseCase } from './classes/find-comments-by-task.class';
import { FindCommentsByTaskUseCaseImp } from './use-cases/find-comments-by-task.use-case';
import { DeleteCommentUseCase } from './classes/delete-comment.class';
import { DeleteCommentUseCaseImp } from './use-cases/delete-comment.use-case';
import { SendMentionedEmailUseCase } from './classes/send-mentioned-email.class';
import { SendMentionedEmailUseCaseImp } from './use-cases/send-mentioned-email.use-case';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  controllers: [CommentController],
  providers: [
    CommentService,
    { provide: CreateCommentUseCase, useClass: CreateCommentUseCaseImp },
    { provide: FindCommentsByTaskUseCase, useClass: FindCommentsByTaskUseCaseImp },
    { provide: DeleteCommentUseCase, useClass: DeleteCommentUseCaseImp },
    { provide: SendMentionedEmailUseCase, useClass: SendMentionedEmailUseCaseImp },
  ],
  imports: [
    TypeOrmModule.forFeature([Comment]),
    TaskModule,
    WorkspaceModule,
    CommonModule,
    NotificationModule,
  ],
  exports: [TypeOrmModule, CommentService],
})
export class CommentModule {}
