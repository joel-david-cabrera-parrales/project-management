import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from 'src/auth/auth.service';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { UserSettings } from 'src/profile/interfaces/settings.interface';
import { Workspace } from '../entities/workspace.entity';
import { SendMemberJoinedEmailUseCase } from '../classes/send-member-joined-email.class';
import { memberJoinedWorkspaceTemplate, MemberJoinedWorkspaceData } from '../templates/member-joined-workspace.template';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/notification.types';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { toPhotoUrl } from 'src/common/helpers/photo-url.helper';

@Injectable()
export class SendMemberJoinedEmailUseCaseImp implements SendMemberJoinedEmailUseCase {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(UserProfile)
    private readonly userRepo: Repository<UserProfile>,
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(workspaceCode: string, newMemberCode: string): Promise<void> {
    const workspace = await this.workspaceRepo.findOne({
      where: { code: workspaceCode },
      relations: { user: { profile: true } },
    });
    if (!workspace) return;
    if (!workspace.user) return;

    const owner = workspace.user;
    const ownerSettings = owner.profile.settings as unknown as UserSettings;

    const newMember = await this.authService.isValidUser(newMemberCode);
    const newMemberUser = await this.userRepo.findOne({ where: { id: newMember.id }, relations: { profile: true } });
    const newMemberName = `${newMember.firstName} ${newMember.lastName}`;
    const ownerName = `${owner.profile.firstName} ${owner.profile.firstSurname}`;
    await this.notificationService.create({
      userId: owner.id,
      type: NotificationType.NEW_MEMBER,
      title: 'Nuevo miembro en el workspace',
      message: `${newMemberName} se unió a «${workspace.title}».`,
      data: {
        workspaceId: workspace.id,
        workspaceCode: workspace.code,
        actorId: newMember.id,
        ...(newMemberUser?.profile ? {
          actor: {
            id: newMember.id,
            name: newMemberName,
            photoUrl: toPhotoUrl(newMemberUser.profile.photo, newMemberUser.profile.code),
            initials: `${newMemberUser.profile.firstName.charAt(0)}${newMemberUser.profile.firstSurname.charAt(0)}`.toUpperCase(),
          },
        } : {}),
      },
    });
    if (!ownerSettings.notifications?.email?.newMember) return;

    const data: MemberJoinedWorkspaceData = {
      ownerName,
      newMemberName,
      workspaceName: workspace.title,
      workspaceUrl: `${process.env.HOST_FRONTEND || 'http://localhost:4200'}/workspace/${workspace.code}`,
      appName: process.env.APP_NAME || 'Task App',
    };
    const html = memberJoinedWorkspaceTemplate(data);

    this.mailerService
      .sendEmail(owner.profile.email, `${newMemberName} se unió a ${workspace.title}`, html)
      .catch(() => {});
  }
}
