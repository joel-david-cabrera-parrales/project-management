import { forwardRef, Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceHistory } from './entities/workspace-history.entity';
import { Board } from './entities/board.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Attachment } from 'src/attachment/entities/attachment.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { AddMemberToWorkspaceUseCaseImp } from './use-cases/add-member-to-worspace.use-case';
import { AddMemberToWorkspaceUseCase } from './classes/add-member-to-worspace.class';
import { RemoveMemberUseCase } from './classes/remove-member.class';
import { RemoveMemberUseCaseImp } from './use-cases/remove-member.use-case';
import { CreateWorkspaceUseCase } from './classes/create-workspace.class';
import { DeleteOneWorkspaceUseCase } from './classes/delete-one-workspace.class';
import { FindAllWorkspacesUseCase } from './classes/find-all-workspaces.class';
import { FindOneWorkspaceUseCase } from './classes/find-one-workspace.class';
import { DeleteOneWorkspaceUseCaseImp } from './use-cases/delete-one-workspace.use-case';
import { FindAllWorkspacesUseCaseImp } from './use-cases/find-all-workspaces.use-case';
import { FindOneWorkspaceUseCaseImp } from './use-cases/find-one-workspace.use-case';
import { CreateWorkspaceUseCaseImp } from './use-cases/create-workspace.use-case';
import { CreateWorkspaceHistoryUseCase } from './classes/create-workspace-history.class';
import { CreateWorkspaceHistoryUseCaseImp } from './use-cases/create-workspace-history.use-case';
import { SendNewMemberEmailUseCase } from './classes/send-new-member-email.class';
import { SendNewMemberEmailUseCaseImp } from './use-cases/send-new-member-email.use-case';
import { SendMemberJoinedEmailUseCase } from './classes/send-member-joined-email.class';
import { SendMemberJoinedEmailUseCaseImp } from './use-cases/send-member-joined-email.use-case';
import { SendMemberRemovedEmailUseCase } from './classes/send-member-removed-email.class';
import { SendMemberRemovedEmailUseCaseImp } from './use-cases/send-member-removed-email.use-case';
import { ResetWorkspaceDataUseCase } from './classes/reset-workspace-data.class';
import { ResetWorkspaceDataUseCaseImp } from './use-cases/reset-workspace-data.use-case';
import { WorkspaceInvitationModule } from 'src/workspace-invitation/workspace-invitation.module';
import { AuthModule } from 'src/auth/auth.module';
import { TaskListModule } from 'src/task-list/task-list.module';
import { TaskModule } from 'src/task/task.module';
import { CommonModule } from 'src/common/common.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    {
      provide: AddMemberToWorkspaceUseCase,
      useClass: AddMemberToWorkspaceUseCaseImp,
    },
    {
      provide: RemoveMemberUseCase,
      useClass: RemoveMemberUseCaseImp,
    },
    {
      provide: CreateWorkspaceUseCase,
      useClass: CreateWorkspaceUseCaseImp,
    },
    {
      provide: DeleteOneWorkspaceUseCase,
      useClass: DeleteOneWorkspaceUseCaseImp,
    },
    {
      provide: FindAllWorkspacesUseCase,
      useClass: FindAllWorkspacesUseCaseImp,
    },
    {
      provide: FindOneWorkspaceUseCase,
      useClass: FindOneWorkspaceUseCaseImp,
    },
    {
      provide: CreateWorkspaceHistoryUseCase,
      useClass: CreateWorkspaceHistoryUseCaseImp,
    },
    {
      provide: SendNewMemberEmailUseCase,
      useClass: SendNewMemberEmailUseCaseImp,
    },
    {
      provide: SendMemberJoinedEmailUseCase,
      useClass: SendMemberJoinedEmailUseCaseImp,
    },
    {
      provide: SendMemberRemovedEmailUseCase,
      useClass: SendMemberRemovedEmailUseCaseImp,
    },
    {
      provide: ResetWorkspaceDataUseCase,
      useClass: ResetWorkspaceDataUseCaseImp,
    },
  ],
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceHistory, Board, WorkspaceMember, Attachment, Comment]),
    forwardRef(() => WorkspaceInvitationModule),
    AuthModule,
    TaskListModule,
    TaskModule,
    CommonModule,
    NotificationModule,
  ],
  exports: [
    CreateWorkspaceHistoryUseCase,
    FindAllWorkspacesUseCase,
    FindOneWorkspaceUseCase,
    DeleteOneWorkspaceUseCase,
    CreateWorkspaceUseCase,
    AddMemberToWorkspaceUseCase,
    RemoveMemberUseCase,
    SendNewMemberEmailUseCase,
    SendMemberJoinedEmailUseCase,
    SendMemberRemovedEmailUseCase,
    TypeOrmModule,
    WorkspaceService,
    ResetWorkspaceDataUseCase,
  ],
})
export class WorkspaceModule {}
