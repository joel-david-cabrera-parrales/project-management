import { forwardRef, Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskLabel } from './entities/task-label.entity';
import { TaskAssignment } from './entities/task-assignment.entity';
import { UnassignMemberUseCase } from './classes/unassign-member.class';
import { UnassignMemberUseCaseImp } from './use-cases/unassign-member.use-case';
import { AssignMemberUseCase } from './classes/assign-member.class';
import { CreateTaskLabelUseCase } from './classes/create-task-label.class';
import { DeleteTaskLabelUseCase } from './classes/delete-task-label.class';
import { ReorderTasksUseCase } from './classes/reorder-tasks.class';
import { ReorderTasksUseCaseImp } from './use-cases/reorder-tasks.use-case';
import { AssignMemberUseCaseImp } from './use-cases/assign-member.use-case';
import { CreateTaskLabelUseCaseImp } from './use-cases/create-task-label.use-case';
import { DeleteTaskLabelUseCaseImp } from './use-cases/delete-task-label.use-case';
import { SendTaskAssignedEmailUseCase } from './classes/send-task-assigned-email.class';
import { SendTaskAssignedEmailUseCaseImp } from './use-cases/send-task-assigned-email.use-case';
import { SendTaskCompletedEmailUseCase } from './classes/send-task-completed-email.class';
import { SendTaskCompletedEmailUseCaseImp } from './use-cases/send-task-completed-email.use-case';
import { TaskListModule } from 'src/task-list/task-list.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { AuthModule } from 'src/auth/auth.module';
import { LabelModule } from 'src/label/label.module';
import { CommonModule } from 'src/common/common.module';
import { AuthorizeTaskAccessUseCase } from './classes/authorize-task-access.class';
import { AuthorizeTaskAccessUseCaseImp } from './use-cases/authorize-task-access.use-case';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  controllers: [TaskController],
  providers: [
    TaskService,
    { provide: AuthorizeTaskAccessUseCase, useClass: AuthorizeTaskAccessUseCaseImp },
    {
      provide: UnassignMemberUseCase,
      useClass: UnassignMemberUseCaseImp,
    },
    {
      provide: AssignMemberUseCase,
      useClass: AssignMemberUseCaseImp,
    },
    {
      provide: CreateTaskLabelUseCase,
      useClass: CreateTaskLabelUseCaseImp,
    },
    {
      provide: DeleteTaskLabelUseCase,
      useClass: DeleteTaskLabelUseCaseImp,
    },
    {
      provide: ReorderTasksUseCase,
      useClass: ReorderTasksUseCaseImp,
    },
    {
      provide: SendTaskAssignedEmailUseCase,
      useClass: SendTaskAssignedEmailUseCaseImp,
    },
    {
      provide: SendTaskCompletedEmailUseCase,
      useClass: SendTaskCompletedEmailUseCaseImp,
    },
  ],
  imports: [
    TypeOrmModule.forFeature([Task, TaskLabel, TaskAssignment]),
    forwardRef(() => TaskListModule),
    forwardRef(() => WorkspaceModule),
    AuthModule,
    LabelModule,
    CommonModule,
    NotificationModule,
  ],
  exports: [
    TaskService,
    TypeOrmModule,
    UnassignMemberUseCase,
    AssignMemberUseCase,
    CreateTaskLabelUseCase,
    DeleteTaskLabelUseCase,
    ReorderTasksUseCase,
    SendTaskAssignedEmailUseCase,
    SendTaskCompletedEmailUseCase,
  ],
})
export class TaskModule {}
