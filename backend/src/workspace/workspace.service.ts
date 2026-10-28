import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { Workspace } from './entities/workspace.entity';
import { UuidManager } from 'src/common/classes/uuid-manager.class';
import { AddMemberToWorkspaceUseCase } from './classes/add-member-to-worspace.class';
import { RemoveMemberUseCase } from './classes/remove-member.class';
import { AddMemberToWorkspaceDto } from './dto/add-member-to.workspace.dto';
import { Board } from './entities/board.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
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

    await this.removeMemberUseCase.execute(workspace.id, memberId, validUser);
    await this.workspaceHistory.memberRemoved(validUser, workspace, workspace.code, EntityType.WORKSPACE_MEMBER);
    this.sendMemberRemovedEmailUseCase.execute(memberId).catch(() => {});
  }

  async resetData(): Promise<void> {
    await this.resetWorkspaceDataUseCase.execute();
  }

  async toggleBoardStar(boardCode: string, workspaceCode: string, user: AuthenticatedUserDto) {
    // Validacion de datos
    await this.authService.isValidUser(user.code);
    const workspace = await this.findOneBySearchTerm(workspaceCode, user);

    // Proceso de actualización
    const board = await this.boardRepository.findOne({ where: { code: boardCode } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.workspace.id !== workspace.id) throw new NotFoundException('Board not found in this workspace');
    board.starred = !board.starred;
    await this.boardRepository.save(board);
    return { starred: board.starred };
  }
}
