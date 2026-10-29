import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationData, NotificationType } from './notification.types';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    @InjectRepository(UserProfile)
    private readonly userRepository: Repository<UserProfile>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(input: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
  }, options: { force?: boolean } = {}): Promise<Notification | null> {
    const user = await this.userRepository.findOne({
      where: { id: input.userId },
      relations: { profile: true },
    });
    const settings = user?.profile.settings as any;
    const preferenceKey = this.preferenceKey(input.type);
    if (!user || (!options.force && preferenceKey && settings?.notifications?.inApp?.[preferenceKey] === false)) return null;
    const notification = await this.repository.save(this.repository.create({ ...input, read: false }));
    const unreadCount = await this.countUnread(input.userId);
    this.notificationGateway.emitNewNotification(input.userId, notification, unreadCount);
    return notification;
  }

  async findForUser(userId: number, query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { userId };
    if (query.read !== undefined) where.read = query.read;
    if (query.type) where.type = query.type;
    const [items, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  countUnread(userId: number): Promise<number> {
    return this.repository.countBy({ userId, read: false });
  }

  async markAsRead(userId: number, id: number): Promise<Notification> {
    const notification = await this.repository.findOneBy({ id, userId });
    if (!notification) throw new NotFoundException('Notification not found');
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await this.repository.save(notification);
      this.notificationGateway.emitRead(userId, notification, await this.countUnread(userId));
    }
    return notification;
  }

  async markAllAsRead(userId: number): Promise<{ affected: number }> {
    const result = await this.repository.createQueryBuilder()
      .update(Notification)
      .set({ read: true, readAt: new Date() })
      .where('"userId" = :userId AND "read" = false', { userId })
      .execute();
    this.notificationGateway.emitReadAll(userId);
    return { affected: result.affected ?? 0 };
  }

  async remove(userId: number, id: number): Promise<void> {
    const notification = await this.repository.findOneBy({ id, userId });
    if (!notification) throw new NotFoundException('Notification not found');
    const result = await this.repository.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Notification not found');
    const unreadCount = await this.countUnread(userId);
    this.notificationGateway.emitDeleted(userId, id, unreadCount);
  }

  private preferenceKey(type: NotificationType): string | null {
    switch (type) {
      case NotificationType.TASK_ASSIGNED: return 'taskAssigned';
      case NotificationType.TASK_COMPLETED: return 'taskCompleted';
      case NotificationType.COMMENT_MENTION: return 'commentMentioned';
      case NotificationType.NEW_MEMBER: return 'newMember';
      case NotificationType.MEMBER_REMOVED: return 'memberRemoved';
      case NotificationType.WORKSPACE_INVITATION: return 'workspaceInvitation';
      case NotificationType.BOARD_CREATED: return null;
    }
  }
}
