import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { UserSettings } from 'src/profile/interfaces/settings.interface';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { SendMemberRemovedEmailUseCase } from '../classes/send-member-removed-email.class';
import { memberRemovedWorkspaceTemplate, MemberRemovedWorkspaceData } from '../templates/member-removed-workspace.template';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/notification.types';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { toPhotoUrl } from 'src/common/helpers/photo-url.helper';

@Injectable()
export class SendMemberRemovedEmailUseCaseImp implements SendMemberRemovedEmailUseCase {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepo: Repository<WorkspaceMember>,
    @InjectRepository(UserProfile)
    private readonly userRepo: Repository<UserProfile>,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(memberId: number, removedByUserId?: number): Promise<void> {
    const member = await this.workspaceMemberRepo.findOne({
      where: { id: memberId },
      relations: { user: { profile: true }, workspace: true },
    });
    if (!member) return;

    const profile = member.user.profile;
    const settings = profile.settings as unknown as UserSettings;
    const actor = removedByUserId
      ? await this.userRepo.findOne({ where: { id: removedByUserId }, relations: { profile: true } })
      : null;
    await this.notificationService.create({
      userId: member.user.id,
      type: NotificationType.MEMBER_REMOVED,
      title: 'Te eliminaron de un workspace',
      message: `Ya no formas parte de «${member.workspace.title}».`,
      data: {
        workspaceId: member.workspace.id,
        workspaceCode: member.workspace.code,
        ...(actor?.profile ? {
          actor: {
            id: actor.id,
            name: `${actor.profile.firstName} ${actor.profile.firstSurname}`.trim(),
            photoUrl: toPhotoUrl(actor.profile.photo, actor.profile.code),
            initials: `${actor.profile.firstName.charAt(0)}${actor.profile.firstSurname.charAt(0)}`.toUpperCase(),
          },
        } : {}),
      },
    });
    if (!settings.notifications?.email?.newMember) return;

    const name = `${profile.firstName} ${profile.firstSurname}`;
    const data: MemberRemovedWorkspaceData = {
      name,
      workspaceName: member.workspace.title,
      appName: process.env.APP_NAME || 'Task App',
    };
    const html = memberRemovedWorkspaceTemplate(data);

    this.mailerService
      .sendEmail(profile.email, `Has sido eliminado de ${member.workspace.title}`, html)
      .catch(() => {});
  }
}
