import { ForbiddenException, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/notification.types';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { toPhotoUrl } from 'src/common/helpers/photo-url.helper';
import { Board } from '../entities/board.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { CreateBoardUseCase } from '../classes/create-board.class';
import { boardCreatedTemplate } from '../templates/board-created.template';

@Injectable()
export class CreateBoardUseCaseImp implements CreateBoardUseCase {
  private readonly logger = new Logger(CreateBoardUseCaseImp.name);

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(UserProfile)
    private readonly userRepository: Repository<UserProfile>,
    private readonly notificationService: NotificationService,
    private readonly mailerService: MailerService,
  ) {}

  async execute(workspaceCode: string, title: string, createdBy: AuthenticatedUserDto) {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) throw new BadRequestException('Board title is required');

    const workspace = await this.workspaceRepository.findOne({
      where: { code: workspaceCode, isAvailable: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    const members = await this.workspaceMemberRepository.find({
      where: { workspace: { id: workspace.id }, isAvailable: true },
      relations: { user: { profile: true } },
    });
    const creator = members.find((member) => member.user.id === createdBy.id)?.user;
    if (!creator) throw new ForbiddenException('You are not an active workspace member');

    const board = await this.boardRepository.save(this.boardRepository.create({
      workspace,
      title: normalizedTitle,
    }));
    const boardUrl = `${process.env.HOST_FRONTEND || 'http://localhost:4200'}/workspace/${workspace.code}/board/${board.code}`;
    const creatorName = `${creator.profile.firstName} ${creator.profile.firstSurname}`.trim();

    const notifications = members.map((member) => this.notificationService.create({
      userId: member.user.id,
      type: NotificationType.BOARD_CREATED,
      title: 'Nuevo tablero en el workspace',
      message: `${creatorName} creó el tablero «${normalizedTitle}» en «${workspace.title}».`,
      data: {
        boardId: board.id,
        boardCode: board.code,
        workspaceId: workspace.id,
        workspaceCode: workspace.code,
        actorId: creator.id,
        actor: {
          id: creator.id,
          name: creatorName,
          photoUrl: toPhotoUrl(creator.profile.photo, creator.profile.code),
          initials: `${creator.profile.firstName.charAt(0)}${creator.profile.firstSurname.charAt(0)}`.toUpperCase(),
        },
      },
    }, { force: true }));

    const emails = members.map((member) => this.mailerService.sendEmail(
      member.user.profile.email,
      `Nuevo tablero: ${normalizedTitle}`,
      boardCreatedTemplate({
        recipientName: `${member.user.profile.firstName} ${member.user.profile.firstSurname}`.trim(),
        creatorName,
        boardName: normalizedTitle,
        workspaceName: workspace.title,
        boardUrl,
        appName: process.env.APP_NAME || 'Task App',
      }),
    ));

    const [notificationResults, emailResults] = await Promise.all([
      Promise.allSettled(notifications),
      Promise.allSettled(emails),
    ]);
    this.logDeliveryFailures('in-app notification', notificationResults);
    this.logDeliveryFailures('email', emailResults);

    return {
      boardId: board.id,
      code: board.code,
      title: normalizedTitle,
      starred: board.starred,
      taskList: [],
    };
  }

  private logDeliveryFailures(kind: string, results: PromiseSettledResult<unknown>[]): void {
    const failures = results.filter((result) => result.status === 'rejected').length;
    if (failures) this.logger.warn(`Could not deliver ${kind} to ${failures} workspace member(s)`);
  }
}
