import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { CommonModule } from './common/common.module';
import { WorkspaceInvitationModule } from './workspace-invitation/workspace-invitation.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { TaskListModule } from './task-list/task-list.module';
import { TaskModule } from './task/task.module';
import { LabelModule } from './label/label.module';
import { AttachmentModule } from './attachment/attachment.module';
import { CommentModule } from './comment/comment.module';
import { NotificationModule } from './notification/notification.module';
import { CreateNotifications1761700000000 } from './database/migrations/1761700000000-CreateNotifications';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.TORM_PG_HOST,
      database: process.env.TORM_PG_DATABASE,
      username: process.env.TORM_PG_USER_DB,
      password: process.env.TORM_PG_PASSWORD_DB,
      port: Number(process.env.TORM_PG_PORT),
      autoLoadEntities: true,
      migrations: [CreateNotifications1761700000000],
      migrationsRun: true,
      synchronize: true, // change a false on production
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAILER_HOST,
        port: Number(process.env.MAILER_PORT),
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.MAILER_USER,
          pass: process.env.MAILER_SECRET,
        },
      },
      defaults: {
        from: `"Task App Support" <${process.env.MAILER_USER}>`,
      },
    }),
    AuthModule,
    ProfileModule,
    CommonModule,
    WorkspaceInvitationModule,
    WorkspaceModule,
    TaskListModule,
    TaskModule,
    LabelModule,
    AttachmentModule,
    CommentModule,
    NotificationModule,
    ChatbotModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
