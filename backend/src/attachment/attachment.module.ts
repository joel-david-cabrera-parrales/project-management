import { forwardRef, Module } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { TaskModule } from 'src/task/task.module';
import { AuthModule } from 'src/auth/auth.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { UploadAttachmentUseCase } from './classes/upload-attachment.class';
import { UploadAttachmentUseCaseImp } from './use-cases/upload-attachment.use-case';
import { FindAttachmentsByTaskUseCase } from './classes/find-attachments-by-task.class';
import { FindAttachmentsByTaskUseCaseImp } from './use-cases/find-attachments-by-task.use-case';
import { FindAttachmentByCodeUseCase } from './classes/find-attachment-by-code.class';
import { FindAttachmentByCodeUseCaseImp } from './use-cases/find-attachment-by-code.use-case';
import { DeleteAttachmentUseCase } from './classes/delete-attachment.class';
import { DeleteAttachmentUseCaseImp } from './use-cases/delete-attachment.use-case';
import { CommonModule } from 'src/common/common.module';

@Module({
  controllers: [AttachmentController],
  providers: [
    AttachmentService,
    { provide: UploadAttachmentUseCase, useClass: UploadAttachmentUseCaseImp },
    { provide: FindAttachmentsByTaskUseCase, useClass: FindAttachmentsByTaskUseCaseImp },
    { provide: FindAttachmentByCodeUseCase, useClass: FindAttachmentByCodeUseCaseImp },
    { provide: DeleteAttachmentUseCase, useClass: DeleteAttachmentUseCaseImp },
  ],
  imports: [
    TypeOrmModule.forFeature([Attachment]),
    forwardRef(() => TaskModule),
    AuthModule,
    CommonModule,
    forwardRef(() => WorkspaceModule),
  ],
  exports: [TypeOrmModule, AttachmentService],
})
export class AttachmentModule {}
