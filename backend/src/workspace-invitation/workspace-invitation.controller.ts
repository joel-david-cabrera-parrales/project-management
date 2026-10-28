import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { WorkspaceInvitationService } from './workspace-invitation.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { SendInvitationToJoinToWorkspaceDto } from './dto/send-invitation-to-join-to-workspace.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetInvitationResponse, SendInvitationResponse } from '../common/responses';

@Controller('workspace-invitation')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceInvitationController {
  constructor(private readonly workspaceInvitationService: WorkspaceInvitationService) {}

  // Ruta para traer la información de una invitación
  @Get(':invitationCode')
  @ApiOperation({ summary: 'Obtener información de una invitación' })
  @ApiResponse({
    status: 200,
    description: 'Informacion de la invitacion obtenida exitosamente',
    type: GetInvitationResponse,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getInvitation(@Param('invitationCode', ParseUUIDPipe) invitationCode: string, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceInvitationService.getInvitation(invitationCode, user.id);
  }

  // Ruta para enviar una invitación a un workspace
  @Post('send-invitation')
  @ApiOperation({ summary: 'Enviar una invitación a un usuario del sistema' })
  @ApiResponse({ status: 200, description: 'Invitacion enviada exitosamente', type: SendInvitationResponse })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  sendInvitation(@Body() body: SendInvitationToJoinToWorkspaceDto, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceInvitationService.sendWorkspaceInvitation(body, user);
  }

  @Get('workspace/:workspaceCode')
  @ApiOperation({ summary: 'Listar invitaciones de un workspace' })
  findByWorkspace(@Param('workspaceCode', ParseUUIDPipe) workspaceCode: string, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceInvitationService.getWorkspaceInvitations(workspaceCode, user.id);
  }

  @Post('resend')
  @ApiOperation({ summary: 'Reenviar invitación invalidando las anteriores' })
  resendInvitation(@Body() body: SendInvitationToJoinToWorkspaceDto, @GetUser() user: AuthenticatedUserDto) {
    return this.workspaceInvitationService.resendWorkspaceInvitation(body, user);
  }

  @Delete(':invitationCode')
  @ApiOperation({ summary: 'Invalidar una invitación' })
  invalidateInvitation(
    @Param('invitationCode', ParseUUIDPipe) invitationCode: string,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    return this.workspaceInvitationService.invalidateInvitation(invitationCode, user.id);
  }
}
