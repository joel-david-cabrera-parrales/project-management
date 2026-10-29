import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';
import { Task } from 'src/task/entities/task.entity';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { UploadAttachmentUseCase } from '../classes/upload-attachment.class';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadAttachmentUseCaseImp implements UploadAttachmentUseCase {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(UserProfile)
    private readonly userRepository: Repository<UserProfile>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async execute(file: Express.Multer.File, taskCode: string, userId: number): Promise<Attachment> {
    const task = await this.taskRepository.findOne({
      where: { code: taskCode, isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.taskList.board.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    const user = await this.userRepository.findOneBy({ id: userId, isAvailable: true });
    if (!user) throw new NotFoundException('User not found');

    const workspaceId = task.taskList.board.workspace.id;
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspace: { id: workspaceId }, user: { id: userId }, isAvailable: true },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this workspace');

    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, storedName);
    fs.writeFileSync(filePath, file.buffer);

    const attachment = this.attachmentRepository.create({
      fileName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      fileSize: file.size,
      task,
      uploadedBy: user,
    });
    return this.attachmentRepository.save(attachment);
  }
}
