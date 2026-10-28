import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';
import { FindAttachmentByCodeUseCase } from '../classes/find-attachment-by-code.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class FindAttachmentByCodeUseCaseImp implements FindAttachmentByCodeUseCase {
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
    await this.authorizeWorkspaceMembership.execute(attachment.task.taskList.board.workspace.code, userId);
    return attachment;
  }
}
