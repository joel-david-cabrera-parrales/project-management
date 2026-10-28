import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { CreateTaskLabelDto } from './dto/create-task-label.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TaskResponse } from 'src/common/responses';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRoles } from 'src/auth/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/auth/guards/workspace-role.guard';
@Controller('task')
@UseGuards(AuthGuard('jwt'))
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Crear una tarea' })
  @ApiResponse({ status: 201, description: 'Tarea creada exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto);
  }

  @Patch('reorder')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Reordenar tareas en una lista' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Tareas reordenadas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  reorder(@Query('ws') workspaceCode: string, @Body() dto: ReorderTasksDto, @GetUser() user: AuthenticatedUserDto) {
    return this.taskService.reorder(dto, user.id, workspaceCode);
  }

  // @Get()
  // @ApiOperation({ summary: 'Obtener todas las tareas' })
  // @ApiResponse({ status: 200, description: 'Lista de tareas', type: [TaskResponse] })
  // @ApiResponse({ status: 401, description: 'No autorizado' })
  // findAll() {
  //   return this.taskService.findAll();
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una tarea' })
  @ApiResponse({ status: 200, description: 'Tarea encontrada exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUserDto) {
    return this.taskService.findOne(+id, user.id);
  }

  @Patch(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Actualizar una tarea' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Tarea actualizada exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Query('ws') workspaceCode: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.taskService.update(id, updateTaskDto, user, workspaceCode);
  }

  @Delete(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Eliminar una tarea' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Tarea eliminada exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  remove(@Query('ws') workspaceCode: string, @Param('id') id: string, @GetUser() user: AuthenticatedUserDto) {
    return this.taskService.remove(+id, user.id, workspaceCode);
  }

  @Post(':id/labels')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Agregar una etiqueta a una tarea' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Etiqueta agregada exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  addLabel(
    @Query('ws') workspaceCode: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTaskLabelDto,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.taskService.addLabel(id, dto, user.id, workspaceCode);
  }

  @Delete(':id/labels/:labelId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Eliminar una etiqueta de una tarea' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Etiqueta eliminada exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  removeLabel(
    @Query('ws') workspaceCode: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('labelId', ParseIntPipe) labelId: number,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.taskService.removeLabel(id, labelId, user.id, workspaceCode);
  }

  @Post(':id/assign')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'member')
  @ApiOperation({ summary: 'Asignar un miembro a una tarea' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Miembro asignado exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  assignMember(
    @Query('ws') workspaceCode: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignMemberDto,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.taskService.assignMember(id, dto, user.id, workspaceCode);
  }

  @Delete(':id/assign/:assignmentId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles('owner')
  @ApiOperation({ summary: 'Desasignar un miembro de una tarea' })
  @ApiQuery({ name: 'ws', required: true, description: 'Workspace code' })
  @ApiResponse({ status: 200, description: 'Miembro desasignado exitosamente', type: TaskResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  unassignMember(
    @Query('ws') workspaceCode: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.taskService.unassignMember(id, assignmentId, user.id, workspaceCode);
  }
}
