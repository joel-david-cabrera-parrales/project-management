import { CreateDateColumn, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../notification.types';
import type { NotificationData } from '../notification.types';

@Entity({ schema: 'auth', name: 'notifications' })
@Index('IDX_notifications_user_created', ['userId', 'createdAt'])
@Index('IDX_notifications_user_read', ['userId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: NotificationData;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
