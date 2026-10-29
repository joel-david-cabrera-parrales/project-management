import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { Task } from '../entities/task.entity';
import { UserSettings } from 'src/profile/interfaces/settings.interface';
import { SendTaskAssignedEmailUseCase } from '../classes/send-task-assigned-email.class';
import { taskAssignedTemplate, TaskAssignedData } from '../templates/task-assigned.template';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/notification.types';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { toPhotoUrl } from 'src/common/helpers/photo-url.helper';

@Injectable()
export class SendTaskAssignedEmailUseCaseImp implements SendTaskAssignedEmailUseCase {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(UserProfile)
    private readonly userRepo: Repository<UserProfile>,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(workspaceMemberId: number, taskId: number, assignedByUserId?: number): Promise<void> {
    const wm = await this.workspaceMemberRepo.findOne({
      where: { id: workspaceMemberId },
      relations: { user: { profile: true }, workspace: true },
    });
    if (!wm) return;

    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { taskList: { board: true } },
    });
    if (!task) return;
    const actor = assignedByUserId
      ? await this.userRepo.findOne({ where: { id: assignedByUserId }, relations: { profile: true } })
      : null;

    await this.notificationService.create({
      userId: wm.user.id,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Te asignaron una tarea',
      message: `Te asignaron la tarea «${task.title}» en ${wm.workspace.title}.`,
      data: {
        taskId,
        taskCode: task.code,
        boardCode: task.taskList.board.code,
        workspaceCode: wm.workspace.code,
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

    const settings = wm.user.profile.settings as unknown as UserSettings;
    if (!settings.notifications?.email?.taskAssigned) return;

    const name = `${wm.user.profile.firstName} ${wm.user.profile.firstSurname}`;
    const data: TaskAssignedData = {
      name,
      taskTitle: task.title,
      taskUrl: `${process.env.HOST_FRONTEND || 'http://localhost:4200'}/workspace/${wm.workspace.code}/task/${taskId}`,
      workspaceName: wm.workspace.title,
      appName: process.env.APP_NAME || 'Task App',
    };
    const html = taskAssignedTemplate(data);

    this.mailerService.sendEmail(wm.user.profile.email, `Te asignaron: ${task.title}`, html).catch(() => {});
  }
}
