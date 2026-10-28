import { Module } from '@nestjs/common';
import { TaskListService } from './task-list.service';
import { TaskListController } from './task-list.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskList } from './entities/task-list.entity';
import { AuthModule } from 'src/auth/auth.module';
import { TaskModule } from 'src/task/task.module';
import { Board } from 'src/workspace/entities/board.entity';
import { CreateTaskListUseCase } from './classes/create-task-list.class';
import { FindAllTaskListUseCase } from './classes/find-all-task-list.class';
import { FindOneTaskListUseCase } from './classes/find-one-task-list.class';
import { UpdateTaskListUseCase } from './classes/update-task-list.class';
import { DeleteTaskListUseCase } from './classes/delete-task-list.class';
import { CreateTaskListUseCaseImp } from './use-cases/create-task-list.use-case';
import { FindAllTaskListUseCaseImp } from './use-cases/find-all-task-list.use-case';
import { FindOneTaskListUseCaseImp } from './use-cases/find-one-task-list.use-case';
import { UpdateTaskListUseCaseImp } from './use-cases/update-task-list.use-case';
import { DeleteTaskListUseCaseImp } from './use-cases/delete-task-list.use-case';
import { TaskListMapper } from './mappers/task-list.mapper';
import { CommonModule } from 'src/common/common.module';

@Module({
  controllers: [TaskListController],
  providers: [
    TaskListService,
    TaskListMapper,
    { provide: CreateTaskListUseCase, useClass: CreateTaskListUseCaseImp },
    { provide: FindAllTaskListUseCase, useClass: FindAllTaskListUseCaseImp },
    { provide: FindOneTaskListUseCase, useClass: FindOneTaskListUseCaseImp },
    { provide: UpdateTaskListUseCase, useClass: UpdateTaskListUseCaseImp },
    { provide: DeleteTaskListUseCase, useClass: DeleteTaskListUseCaseImp },
  ],
  imports: [TypeOrmModule.forFeature([TaskList, Board]), AuthModule, TaskModule, CommonModule],
  exports: [
    TypeOrmModule,
    CreateTaskListUseCase,
    FindAllTaskListUseCase,
    FindOneTaskListUseCase,
    UpdateTaskListUseCase,
    DeleteTaskListUseCase,
  ],
})
export class TaskListModule {}
