import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { CreateWorkspaceHistoryUseCase } from 'src/workspace/classes/create-workspace-history.class';
import { FindOneWorkspaceUseCase } from 'src/workspace/classes/find-one-workspace.class';
import { Workspace } from 'src/workspace/entities/workspace.entity';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { Repository } from 'typeorm';
import { SendInvitationToJoinToWorkspaceUseCase } from './classes/send-invitation-to-join-to-workspace.class';
import { SendInvitationToJoinToWorkspaceDto } from './dto/send-invitation-to-join-to-workspace.dto';
import { GetWorkspaceInvitationsUseCase, InvitationItem } from './classes/get-workspace-invitations.class';
import { WorkspaceService } from 'src/workspace/workspace.service';
import { AuthService } from 'src/auth/auth.service';
import { GetWorkspaceInvitationUseCase } from './classes/get-workspace-invitation.class';
import { InvalidateWorkspaceInvitationUseCase } from './classes/invalidate-workspace-invitation.class';

@Injectable()
export class WorkspaceInvitationService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepository: Repository<WorkspaceInvitation>,
    private readonly workspaceHistory: CreateWorkspaceHistoryUseCase,
    private readonly findOneWorkspaceUseCase: FindOneWorkspaceUseCase,
    private readonly sendInvitationToJoinToWorkspaceUseCase: SendInvitationToJoinToWorkspaceUseCase,
    private readonly getWorkspaceInvitationsUseCase: GetWorkspaceInvitationsUseCase,

    private readonly authService: AuthService,
    private readonly workspaceService: WorkspaceService,
    private readonly getWorkspaceInvitationUseCase: GetWorkspaceInvitationUseCase,
    private readonly invalidateWorkspaceInvitationUseCase: InvalidateWorkspaceInvitationUseCase,
  ) {}

  async sendWorkspaceInvitation(dto: SendInvitationToJoinToWorkspaceDto, user: AuthenticatedUserDto) {
    const senderUser = await this.authService.isValidUser(user.code);
    const workspace = await this.workspaceService.findOneBySearchTerm(dto.workspaceCode, senderUser);
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    const useCase = await this.sendInvitationToJoinToWorkspaceUseCase.execute(workspace, dto);
    await this.workspaceHistory.sendWorkspaceInvitation(senderUser, workspace, workspace.code, EntityType.WORKSPACE);

    const frontend = process.env.HOST_FRONTEND;
    const inviteLink = `${frontend}/invite/${useCase.code}`;
    return { inviteLink };
  }

  async getInvitation(invitationCode: string, userId: number) {
    const invitation = await this.getWorkspaceInvitationUseCase.execute(invitationCode, userId);
    const workspace = await this.findOneWorkspaceUseCase.execute(invitation.workspace.code);
    return { workspace, invitationCode };
  }

  async getWorkspaceInvitations(workspaceCode: string, userId: number): Promise<InvitationItem[]> {
    return this.getWorkspaceInvitationsUseCase.execute(workspaceCode, userId);
  }

  async invalidateInvitation(invitationCode: string, userId: number) {
    await this.invalidateWorkspaceInvitationUseCase.execute(invitationCode, userId);
    return { message: 'Invitación invalidada' };
  }

  async resendWorkspaceInvitation(dto: SendInvitationToJoinToWorkspaceDto, user: AuthenticatedUserDto) {
    const senderUser = await this.authService.isValidUser(user.code);
    const workspace = await this.workspaceService.findOneBySearchTerm(dto.workspaceCode, senderUser);
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');
    const invitedUser = await this.authService.existCredential(dto.invitedEmail);

    await this.invitationRepository.update(
      { workspace: { id: workspace.id }, user: { id: invitedUser.id }, isAvailable: true },
      { isAvailable: false },
    );

    return this.sendWorkspaceInvitation(dto, user);
  }
}
