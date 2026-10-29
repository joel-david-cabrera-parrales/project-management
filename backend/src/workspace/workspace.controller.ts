import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { WorkspaceRoles } from 'src/auth/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/auth/guards/workspace-role.guard';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { AddMemberToWorkspaceDto } from './dto/add-member-to.workspace.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkspaceResponse } from '../common/responses/workspace.response';

@Controller('workspace')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {
    // this.workspaceService.resetData().then().catch();
  }

  // Ruta para crear un workspace
  @Post()
  @ApiOperation({ summary: 'Crear un workspace' })
  @ApiResponse({ status: 200, description: 'Workspace creado exitosamente', type: WorkspaceResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceService.create(createWorkspaceDto, user);
  }

  // Ruta para obtener todos los workspaces de un usuario
  @Get()
  @ApiOperation({ summary: 'Obtener todos los workspaces de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de workspaces', type: [WorkspaceResponse] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll(@GetUser() user: AuthenticatedUserDto) {
    return this.workspaceService.findAll(user);
  }

  // Ruta para obtener un workspace
  @Get(':term')
  @ApiOperation({ summary: 'Obtener un workspace' })
  @ApiResponse({ status: 200, description: 'Workspace encontrado exitosamente', type: WorkspaceResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findOne(@Param('term') term: string, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceService.findOneWorkspace(term, user);
  }

  // Ruta para actualizar un workspace
  @Patch(':code')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Actualizar un workspace' })
  @ApiResponse({ status: 200, description: 'Workspace actualizado exitosamente', type: WorkspaceResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  update(
    @Param('code', ParseUUIDPipe) code: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.workspaceService.update(code, updateWorkspaceDto, user);
  }

  // Ruta para eliminar un workspace
  @Delete(':code')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Eliminar un workspace' })
  @ApiResponse({ status: 200, description: 'Workspace eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  remove(@Param('code', ParseUUIDPipe) code: string, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceService.remove(code, user);
  }

  // Ruta para eliminar un miembro de un workspace
  @Delete(':code/members/:memberId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Eliminar un miembro de un workspace' })
  @ApiResponse({ status: 200, description: 'Miembro eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  removeMember(
    @Param('code', ParseUUIDPipe) code: string,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.workspaceService.removeMember(code, memberId, user);
  }

  @Patch(':code/members/:memberId/role')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Actualizar el rol de un miembro del workspace' })
  updateMemberRole(
    @Param('code', ParseUUIDPipe) code: string,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(code, memberId, dto.roleMember);
  }

  // Ruta para agregar un miembro a un workspace (aceptar invitación)
  @Post('add-member')
  @ApiOperation({ summary: 'Agregar un miembro a un workspace (aceptar invitación)' })
  @ApiResponse({ status: 200, description: 'Miembro agregado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  addMemberToWorkspace(@Body() body: AddMemberToWorkspaceDto, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceService.addMemberToWorkspace(body, user);
  }

  // Ruta para marcar como favorito un tablero
  @Patch(':workspaceCode/boards/:boardCode/star')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Marcar como favorito un tablero' })
  @ApiResponse({ status: 200, description: 'Tablero marcado como favorito exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  toggleBoardStar(
    @Param('boardCode', ParseUUIDPipe) boardCode: string,
    @Param('workspaceCode', ParseUUIDPipe) workspaceCode: string,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.workspaceService.toggleBoardStar(boardCode, workspaceCode, user);
  }

  // Ruta para actualizar el título de un tablero
  @Patch(':workspaceCode/boards/:boardCode')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Actualizar el título de un tablero' })
  @ApiResponse({ status: 200, description: 'Tablero actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  updateBoard(
    @Param('boardCode', ParseUUIDPipe) boardCode: string,
    @Param('workspaceCode', ParseUUIDPipe) workspaceCode: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.workspaceService.updateBoardTitle(boardCode, workspaceCode, dto.title);
  }
}
