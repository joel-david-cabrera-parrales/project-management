import { Injectable, NotFoundException } from '@nestjs/common';
import { UploadAttachmentUseCase } from './classes/upload-attachment.class';
import { FindAttachmentsByTaskUseCase } from './classes/find-attachments-by-task.class';
import { FindAttachmentByCodeUseCase } from './classes/find-attachment-by-code.class';
import { DeleteAttachmentUseCase } from './classes/delete-attachment.class';
import { AttachmentResponse } from 'src/common/responses';
import { S3Service } from 'src/common/services/s3/s3.service';

@Injectable()
export class AttachmentService {
  constructor(
    private readonly uploadAttachmentUseCase: UploadAttachmentUseCase,
    private readonly findAttachmentsByTaskUseCase: FindAttachmentsByTaskUseCase,
    private readonly findAttachmentByCodeUseCase: FindAttachmentByCodeUseCase,
    private readonly deleteAttachmentUseCase: DeleteAttachmentUseCase,
    private readonly s3Service: S3Service,
  ) {}

  private mapToResponse(attachment: any): AttachmentResponse {
    return {
      id: attachment.id,
      code: attachment.code,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      url: `/api/v1/attachment/file/${attachment.code}`,
      createdAt: attachment.createdAt instanceof Date ? attachment.createdAt.toISOString() : attachment.createdAt,
    };
  }

  async upload(file: Express.Multer.File, taskCode: string, userId: number): Promise<AttachmentResponse> {
    const attachment = await this.uploadAttachmentUseCase.execute(file, taskCode, userId);
    return this.mapToResponse(attachment);
  }

  async findByTask(taskCode: string, userId: number): Promise<AttachmentResponse[]> {
    const attachments = await this.findAttachmentsByTaskUseCase.execute(taskCode, userId);
    return attachments.map((a) => this.mapToResponse(a));
  }

  async getFileInfo(code: string, userId: number) {
    return this.findAttachmentByCodeUseCase.execute(code, userId);
  }

  getObject(key: string) {
    return this.s3Service.getObject(key);
  }

  async remove(code: string, userId: number): Promise<AttachmentResponse> {
    const attachment = await this.deleteAttachmentUseCase.execute(code, userId);
    return this.mapToResponse(attachment);
  }
}
