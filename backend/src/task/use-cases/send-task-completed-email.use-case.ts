import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from 'src/auth/auth.service';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { UserSettings } from 'src/profile/interfaces/settings.interface';
import { Task } from '../entities/task.entity';
import { SendTaskCompletedEmailUseCase } from '../classes/send-task-completed-email.class';
import { taskCompletedTemplate, TaskCompletedData } from '../templates/task-completed.template';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/notification.types';
import { toPhotoUrl } from 'src/common/helpers/photo-url.helper';

@Injectable()
export class SendTaskCompletedEmailUseCaseImp implements SendTaskCompletedEmailUseCase {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(UserProfile)
    private readonly userRepo: Repository<UserProfile>,
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(taskId: number, completedByCode: string): Promise<void> {
    const task = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignments', 'assignment')
      .leftJoinAndSelect('assignment.workspaceMember', 'wm')
      .leftJoinAndSelect('wm.user', 'assigneeUser')
      .leftJoinAndSelect('assigneeUser.profile', 'assigneeProfile')
      .leftJoinAndSelect('task.taskList', 'taskList')
      .leftJoinAndSelect('taskList.board', 'board')
      .leftJoinAndSelect('board.workspace', 'workspace')
      .where('task.id = :id', { id: taskId })
      .getOne();
    if (!task) return;

    const completer = await this.authService.isValidUser(completedByCode);
    const completerUser = await this.userRepo.findOne({ where: { code: completedByCode }, relations: { profile: true } });
    const completedByName = `${completer.firstName} ${completer.lastName}`;
    const workspace = task.taskList.board.workspace;

    for (const assignment of task.assignments) {
      const profile = assignment.workspaceMember.user.profile;
      const settings = profile.settings as unknown as UserSettings;
      await this.notificationService.create({
        userId: assignment.workspaceMember.user.id,
        type: NotificationType.TASK_COMPLETED,
        title: 'Tarea completada',
        message: `La tarea «${task.title}» fue completada por ${completedByName}.`,
        data: {
          taskId,
          taskCode: task.code,
          boardCode: task.taskList.board.code,
          workspaceCode: workspace.code,
          ...(completerUser?.profile ? {
            actor: {
              id: completerUser.id,
              name: completedByName,
              photoUrl: toPhotoUrl(completerUser.profile.photo, completerUser.profile.code),
              initials: `${completerUser.profile.firstName.charAt(0)}${completerUser.profile.firstSurname.charAt(0)}`.toUpperCase(),
            },
          } : {}),
        },
      });
      if (!settings.notifications?.email?.taskCompleted) continue;

      const name = `${profile.firstName} ${profile.firstSurname}`;
      const data: TaskCompletedData = {
        name,
        taskTitle: task.title,
        taskUrl: `${process.env.HOST_FRONTEND || 'http://localhost:4200'}/workspace/${workspace.code}/task/${taskId}`,
        workspaceName: workspace.title,
        completedByName,
        appName: process.env.APP_NAME || 'Task App',
      };
      const html = taskCompletedTemplate(data);

      this.mailerService.sendEmail(profile.email, `Tarea completada: ${task.title}`, html).catch(() => {});
    }
  }
}
