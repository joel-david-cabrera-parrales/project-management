import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';
import { DeleteAttachmentUseCase } from '../classes/delete-attachment.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';
import { S3Service } from 'src/common/services/s3/s3.service';
import { existsSync, unlinkSync } from 'fs';
import * as path from 'path';

@Injectable()
export class DeleteAttachmentUseCaseImp implements DeleteAttachmentUseCase {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
    private readonly s3Service: S3Service,
  ) {}

  async execute(code: string, userId: number): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { code, isAvailable: true },
      relations: { task: { taskList: { board: { workspace: true } } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.task.taskList.board.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    await this.authorizeWorkspaceMembership.execute(attachment.task.taskList.board.workspace.code, userId, [
      'owner',
      'member',
    ]);

    attachment.isAvailable = false;
    const saved = await this.attachmentRepository.save(attachment);

    if (attachment.storedName.includes('/')) {
      await this.s3Service.deleteObject(attachment.storedName);
    } else {
      const legacyPath = path.join(process.cwd(), 'uploads', 'attachments', attachment.storedName);
      if (existsSync(legacyPath)) unlinkSync(legacyPath);
    }

    return saved;
  }
}
