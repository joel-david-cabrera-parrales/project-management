import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Task } from 'src/task/entities/task.entity';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { UserSettings } from 'src/profile/interfaces/settings.interface';
import { SendMentionedEmailUseCase } from '../classes/send-mentioned-email.class';
import { mentionedInCommentTemplate, MentionedInCommentData } from '../templates/mentioned-in-comment.template';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/notification.types';
import { toPhotoUrl } from 'src/common/helpers/photo-url.helper';

@Injectable()
export class SendMentionedEmailUseCaseImp implements SendMentionedEmailUseCase {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(comment: Comment): Promise<void> {
    if (!comment.mentions?.length) return;

    const fullComment = await this.commentRepository.findOne({
      where: { id: comment.id },
      relations: { author: { user: { profile: true } }, task: { taskList: { board: { workspace: true } } } },
    });
    if (!fullComment) return;

    const task = fullComment.task;
    const board = task.taskList.board;
    const workspace = board.workspace;
    const authorProfile = fullComment.author.user.profile;
    const authorName = `${authorProfile.firstName} ${authorProfile.firstSurname}`.trim();
    const snippet = fullComment.content.length > 200
      ? fullComment.content.slice(0, 200) + '...'
      : fullComment.content;

    for (const wmId of fullComment.mentions) {
      try {
        const wm = await this.workspaceMemberRepository.findOne({
          where: { id: wmId },
          relations: { user: { profile: true } },
        });
        if (!wm) continue;

        const name = `${wm.user.profile.firstName} ${wm.user.profile.firstSurname}`.trim();
        await this.notificationService.create({
          userId: wm.user.id,
          type: NotificationType.COMMENT_MENTION,
          title: 'Te mencionaron en un comentario',
          message: `${authorName} te mencionó en «${task.title}»: ${snippet}`,
          data: {
            commentId: fullComment.id,
            commentCode: fullComment.code,
            taskCode: task.code,
            boardCode: board.code,
            workspaceCode: workspace.code,
            actor: {
              id: fullComment.author.user.id,
              name: authorName,
              photoUrl: toPhotoUrl(authorProfile.photo, authorProfile.code),
              initials: `${authorProfile.firstName.charAt(0)}${authorProfile.firstSurname.charAt(0)}`.toUpperCase(),
            },
          },
        });
        const settings = wm.user.profile.settings as unknown as UserSettings;
        if (!settings.notifications?.email?.commentMentioned) continue;

        const frontendUrl = process.env.HOST_FRONTEND || 'http://localhost:4200';
        const data: MentionedInCommentData = {
          name,
          authorName,
          taskTitle: task.title,
          taskUrl: `${frontendUrl}/workspace/${workspace.code}/board/${board.code}?task=${task.code}`,
          commentSnippet: snippet,
          workspaceName: workspace.title,
          appName: process.env.APP_NAME || 'Task App',
        };
        const html = mentionedInCommentTemplate(data);
        await this.mailerService.sendEmail(
          wm.user.profile.email,
          `${authorName} te mencionó en ${task.title}`,
          html,
        );
      } catch {
        continue;
      }
    }
  }
}
