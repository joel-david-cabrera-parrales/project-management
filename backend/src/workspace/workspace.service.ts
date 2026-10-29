import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { Repository, FindOneOptions } from 'typeorm';
import { CreateWorkspaceHistoryUseCase } from './classes/create-workspace-history.class';
import { CreateWorkspaceUseCase } from './classes/create-workspace.class';
import { DeleteOneWorkspaceUseCase } from './classes/delete-one-workspace.class';
import { FindAllWorkspacesUseCase } from './classes/find-all-workspaces.class';
import { FindOneWorkspaceUseCase } from './classes/find-one-workspace.class';
import { SendNewMemberEmailUseCase } from './classes/send-new-member-email.class';
import { SendMemberJoinedEmailUseCase } from './classes/send-member-joined-email.class';
import { SendMemberRemovedEmailUseCase } from './classes/send-member-removed-email.class';
import { ResetWorkspaceDataUseCase } from './classes/reset-workspace-data.class';
import { CreateBoardUseCase } from './classes/create-board.class';
import { Workspace } from './entities/workspace.entity';
import { UuidManager } from 'src/common/classes/uuid-manager.class';
import { AddMemberToWorkspaceUseCase } from './classes/add-member-to-worspace.class';
import { RemoveMemberUseCase } from './classes/remove-member.class';
import { AddMemberToWorkspaceDto } from './dto/add-member-to.workspace.dto';
import { Board } from './entities/board.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly uuidService: UuidManager,
    private readonly authService: AuthService,
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    private readonly workspaceHistory: CreateWorkspaceHistoryUseCase,
    private readonly findAllWorkspacesUseCase: FindAllWorkspacesUseCase,
    private readonly findOneWorkspaceUseCase: FindOneWorkspaceUseCase,
    private readonly deleteOneWorkspaceUseCase: DeleteOneWorkspaceUseCase,
    private readonly addMemberToWorkspaceUseCase: AddMemberToWorkspaceUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
    private readonly sendNewMemberEmailUseCase: SendNewMemberEmailUseCase,
    private readonly sendMemberJoinedEmailUseCase: SendMemberJoinedEmailUseCase,
    private readonly sendMemberRemovedEmailUseCase: SendMemberRemovedEmailUseCase,
    private readonly resetWorkspaceDataUseCase: ResetWorkspaceDataUseCase,
    private readonly createBoardUseCase: CreateBoardUseCase,
  ) {}
  async create(createWorkspaceDto: CreateWorkspaceDto, createdBy: AuthenticatedUserDto) {
    const useCase = await this.createWorkspaceUseCase.execute(createWorkspaceDto, createdBy);
    return this.findOneWorkspaceUseCase.execute(useCase.code, createdBy.id);
  }

  async findAll(user: AuthenticatedUserDto) {
    return this.findAllWorkspacesUseCase.execute(user);
  }

  async findOneWorkspace(code: string, user?: AuthenticatedUserDto) {
    if (!this.uuidService.validate(code)) throw new BadRequestException('Invalid code');
    const workspace = await this.findOneWorkspaceUseCase.execute(code, user?.id);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(id: string, updateWorkspaceDto: UpdateWorkspaceDto, updatedBy: AuthenticatedUserDto) {
    // Validacion de la información
    const user = await this.authService.isValidUser(updatedBy.code);
    const workspace = await this.findOneBySearchTerm(id, updatedBy);

    const nextStatus = updateWorkspaceDto.status ?? workspace.status;
    if (workspace.status !== 1 && nextStatus !== 1 && updateWorkspaceDto.status === undefined) {
      throw new ForbiddenException('Workspace is read-only unless active');
    }

    // Proceso de actualización
    this.workspaceRepository.merge(workspace, updateWorkspaceDto);
    workspace.updatedAt = new Date();

    // Almacenar el resultado de la transacción
    const updatedWorkspace = await this.workspaceRepository.save(workspace);

    await this.workspaceHistory.updated(user, updatedWorkspace, updatedWorkspace.code, EntityType.WORKSPACE);
    return this.findOneWorkspace(updatedWorkspace.code, updatedBy);
  }

  public async findOneBySearchTerm(term: string, { id }: AuthenticatedUserDto) {
    const conditions: FindOneOptions<Workspace> = {};
    if (this.uuidService.validate(term)) {
      conditions.where = { code: term, user: { id } };
    } else {
      conditions.where = { slugCode: term, user: { id } };
    }

    const query = await this.workspaceRepository.findOne(conditions);

    if (!query) throw new NotFoundException('Workspace not found');
    if (!query.isAvailable) throw new NotFoundException('Workspace not available');
    return query;
  }

  async remove(id: string, deletedBy: AuthenticatedUserDto) {
    // Validacion de datos
    const user = await this.authService.isValidUser(deletedBy.code);
    const workspace = await this.findOneBySearchTerm(id, deletedBy);

    // Proceso de eliminación
    await this.deleteOneWorkspaceUseCase.execute(workspace, user);
    await this.workspaceHistory.deleted(user, workspace, workspace.code, EntityType.WORKSPACE);
    return true;
  }

  async addMemberToWorkspace(dto: AddMemberToWorkspaceDto, user: AuthenticatedUserDto) {
    // validacion de datos
    const validUser = await this.authService.isValidUser(user.code);
    const workspace = await this.workspaceRepository.findOneBy({ code: dto.workspaceCode });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (!workspace.isAvailable) throw new NotFoundException('Workspace not available');
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    // Proceso de añadir un miembro a un workspace
    const useCase = await this.addMemberToWorkspaceUseCase.execute(dto, user, workspace);
    await this.workspaceHistory.memberJoined(validUser, workspace, workspace.code, EntityType.WORKSPACE_MEMBER);
    const inviterFullname = `${validUser.firstName} ${validUser.lastName}`;
    this.sendNewMemberEmailUseCase.execute(dto.newMemberCode, inviterFullname, workspace).catch(() => {});
    this.sendMemberJoinedEmailUseCase.execute(dto.workspaceCode, dto.newMemberCode).catch(() => {});
    return useCase;
  }

  async removeMember(workspaceCode: string, memberId: number, user: AuthenticatedUserDto) {
    const validUser = await this.authService.isValidUser(user.code);
    const workspace = await this.workspaceRepository.findOneBy({ code: workspaceCode });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (!workspace.isAvailable) throw new NotFoundException('Workspace not available');
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    await this.removeMemberUseCase.execute(workspace.id, memberId, validUser);
    await this.workspaceHistory.memberRemoved(validUser, workspace, workspace.code, EntityType.WORKSPACE_MEMBER);
    this.sendMemberRemovedEmailUseCase.execute(memberId, validUser.id).catch(() => {});
  }

  async updateMemberRole(workspaceCode: string, memberId: number, roleMember: 'member' | 'viewer') {
    const workspace = await this.workspaceRepository.findOneBy({ code: workspaceCode, isAvailable: true });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    const member = await this.workspaceMemberRepository.findOne({
      where: { id: memberId, workspace: { id: workspace.id }, isAvailable: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.roleMember === 'owner' || member.isOwner || member.isOriginalOwner) {
      throw new ForbiddenException('The workspace owner role cannot be changed');
    }

    member.roleMember = roleMember;
    await this.workspaceMemberRepository.save(member);
    return { workspaceMemberId: member.id, roleMember: member.roleMember };
  }

  async resetData(): Promise<void> {
    await this.resetWorkspaceDataUseCase.execute();
  }

  async createBoard(workspaceCode: string, title: string, createdBy: AuthenticatedUserDto) {
    return this.createBoardUseCase.execute(workspaceCode, title, createdBy);
  }

  async toggleBoardStar(boardCode: string, workspaceCode: string, user: AuthenticatedUserDto) {
    // Validacion de datos
    await this.authService.isValidUser(user.code);
    const workspace = await this.findOneBySearchTerm(workspaceCode, user);
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    // Proceso de actualización
    const board = await this.boardRepository.findOne({ where: { code: boardCode } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.workspace.id !== workspace.id) throw new NotFoundException('Board not found in this workspace');
    board.starred = !board.starred;
    await this.boardRepository.save(board);
    return { starred: board.starred };
  }

  async updateBoardTitle(boardCode: string, workspaceCode: string, title: string) {
    const workspace = await this.workspaceRepository.findOneBy({ code: workspaceCode, isAvailable: true });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    const board = await this.boardRepository.findOne({
      where: { code: boardCode, isAvailable: true },
    });
    if (!board || board.workspace.id !== workspace.id) {
      throw new NotFoundException('Board not found in this workspace');
    }

    board.title = title.trim();
    await this.boardRepository.save(board);
    return { boardId: board.id, code: board.code, title: board.title, starred: board.starred };
  }
}
