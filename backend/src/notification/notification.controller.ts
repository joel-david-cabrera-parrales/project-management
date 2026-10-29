import { Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List current user notifications' })
  list(@GetUser() user: AuthenticatedUserDto, @Query() query: ListNotificationsDto) {
    return this.service.findForUser(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count current user unread notifications' })
  async unreadCount(@GetUser() user: AuthenticatedUserDto) {
    const count = await this.service.countUnread(user.id);
    return ({ count });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  markAllAsRead(@GetUser() user: AuthenticatedUserDto) {
    return this.service.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@GetUser() user: AuthenticatedUserDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.markAsRead(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@GetUser() user: AuthenticatedUserDto, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(user.id, id);
    return { deleted: true };
  }
}
