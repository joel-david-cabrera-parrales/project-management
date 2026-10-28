import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CommentService } from './comment.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommentResponse } from 'src/common/responses';
import { AuthGuard } from '@nestjs/passport';
import { CreateCommentDto } from './dto/create-comment.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@Controller('comment')
@UseGuards(AuthGuard('jwt'))
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('task/:taskCode')
  @ApiOperation({ summary: 'Create a comment on a task' })
  @ApiResponse({ status: 201, description: 'Comment created', type: CommentResponse })
  create(@Param('taskCode') taskCode: string, @Body() dto: CreateCommentDto, @Req() req: any) {
    return this.commentService.create(dto.content, taskCode, req.user.id, dto.parentId, dto.mentions);
  }

  @Get('task/:taskCode')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiResponse({ status: 200, description: 'List of comments', type: [CommentResponse] })
  findByTask(@Param('taskCode') taskCode: string, @GetUser() user: AuthenticatedUserDto) {
    return this.commentService.findByTask(taskCode, user.id);
  }

  @Delete(':code')
  @ApiOperation({ summary: 'Delete a comment (soft delete)' })
  @ApiResponse({ status: 200, description: 'Comment deleted', type: CommentResponse })
  remove(@Param('code') code: string, @Req() req: any) {
    return this.commentService.remove(code, req.user.id);
  }
}
