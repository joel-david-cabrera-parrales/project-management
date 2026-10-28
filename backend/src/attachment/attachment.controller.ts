import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentService } from './attachment.service';
import { ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AttachmentResponse } from 'src/common/responses';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import * as path from 'path';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@Controller('attachment')
@UseGuards(AuthGuard('jwt'))
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('upload/:taskCode')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file attachment to a task' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded', type: AttachmentResponse })
  upload(@Param('taskCode') taskCode: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('File is required');
    return this.attachmentService.upload(file, taskCode, req.user.id);
  }

  @Get('task/:taskCode')
  @ApiOperation({ summary: 'Get all attachments for a task' })
  @ApiResponse({ status: 200, description: 'List of attachments', type: [AttachmentResponse] })
  findByTask(@Param('taskCode') taskCode: string, @GetUser() user: AuthenticatedUserDto) {
    return this.attachmentService.findByTask(taskCode, user.id);
  }

  @Get('file/:code')
  @ApiOperation({ summary: 'Download/serve an attachment file' })
  async getFile(@Param('code') code: string, @Res() res: Response, @GetUser() user: AuthenticatedUserDto) {
    const attachment = await this.attachmentService.getFileInfo(code, user.id);
    const filePath = path.join(process.cwd(), 'uploads', 'attachments', attachment.storedName);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
    res.setHeader('Content-Length', attachment.fileSize);
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Delete(':code')
  @ApiOperation({ summary: 'Soft delete an attachment' })
  @ApiResponse({ status: 200, description: 'Attachment deleted', type: AttachmentResponse })
  remove(@Param('code') code: string, @GetUser() user: AuthenticatedUserDto) {
    return this.attachmentService.remove(code, user.id);
  }
}
