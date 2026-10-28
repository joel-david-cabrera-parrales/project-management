import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { AddMemberToWorkspaceUseCase } from '../classes/add-member-to-worspace.class';
import { AddMemberToWorkspaceDto } from '../dto/add-member-to.workspace.dto';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceInvitation } from '../../workspace-invitation/entities/workspace-invitation.entity';

@Injectable()
export class AddMemberToWorkspaceUseCaseImp extends AddMemberToWorkspaceUseCase {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(WorkspaceInvitation)
    private readonly workspaceInvitacionRepository: Repository<WorkspaceInvitation>,
    private readonly authService: AuthService,
  ) {
    super();
  }
  async execute(
    dto: AddMemberToWorkspaceDto,
    user: AuthenticatedUserDto,
    workspace: Workspace,
  ): Promise<WorkspaceMember> {
    await this.authService.isValidUser(user.code);
    const newMember = await this.authService.isValidUser(dto.newMemberCode);
    const invitation = await this.findInvitation(dto.workspaceInvitationCode, workspace.id, newMember.id);
    const existingMember = await this.workspaceMemberRepository.findOne({
      where: { user: { id: newMember.id }, workspace: { id: workspace.id } },
    });
    if (existingMember?.isAvailable) {
      throw new BadRequestException('The user is already assigned to this workspace');
    }
    // Transaccion para añadir o re-activar miembro
    const workspaceMember = await this.workspaceMemberRepository.manager.transaction(async (manager) => {
      // Aceptacion de la invitación
      invitation.accepted = true;
      invitation.isAvailable = false;
      invitation.updatedAt = new Date();
      invitation.dateAcepted = new Date();
      await manager.save(WorkspaceInvitation, invitation);
      if (existingMember) {
        existingMember.isAvailable = true;
        existingMember.departureDate = undefined;
        return manager.save(WorkspaceMember, existingMember);
      }
      // Registro del miembro
      const workspaceMember = this.workspaceMemberRepository.create({
        user: newMember,
        workspace,
        roleMember: invitation.rolMember,
        isOwner: false,
        isOriginalOwner: false,
      });
      return manager.save(WorkspaceMember, workspaceMember);
    });
    return workspaceMember;
  }

  private async findInvitation(code: string, workspaceId: number, invitedUserId: number) {
    const invitation = await this.workspaceInvitacionRepository.findOne({
      where: { code },
      relations: { workspace: true, user: true },
    });
    if (!invitation) throw new BadRequestException(`The invitation code is not valid`);
    if (invitation.accepted) throw new BadRequestException(`The invitation has already been accepted`);
    if (!invitation.isAvailable) throw new BadRequestException(`The invitation is not available`);
    if (invitation.workspace.id !== workspaceId || invitation.user.id !== invitedUserId) {
      throw new BadRequestException('Invitation does not match the workspace and invited user');
    }
    return invitation;
  }
}
