import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';
import { DeleteAttachmentUseCase } from '../classes/delete-attachment.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DeleteAttachmentUseCaseImp implements DeleteAttachmentUseCase {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
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

    const filePath = path.join(process.cwd(), 'uploads', 'attachments', attachment.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return saved;
  }
}
