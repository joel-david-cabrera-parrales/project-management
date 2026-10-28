import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';
import { Task } from 'src/task/entities/task.entity';
import { FindAttachmentsByTaskUseCase } from '../classes/find-attachments-by-task.class';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class FindAttachmentsByTaskUseCaseImp implements FindAttachmentsByTaskUseCase {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {}

  async execute(taskCode: string, userId: number): Promise<Attachment[]> {
    const task = await this.taskRepository.findOne({
      where: { code: taskCode, isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.authorizeWorkspaceMembership.execute(task.taskList.board.workspace.code, userId);
    return this.attachmentRepository.find({
      where: { task: { id: task.id }, isAvailable: true },
      order: { createdAt: 'DESC' },
    });
  }
}
