import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskList } from 'src/task-list/entities/task-list.entity';
import { ITask } from 'src/workspace/interfaces/workspace-response.interface';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { toPhotoUrl } from '../common/helpers/photo-url.helper';
import { AssignMemberUseCase } from './classes/assign-member.class';
import { CreateTaskLabelUseCase } from './classes/create-task-label.class';
import { DeleteTaskLabelUseCase } from './classes/delete-task-label.class';
import { ReorderTasksUseCase } from './classes/reorder-tasks.class';
import { UnassignMemberUseCase } from './classes/unassign-member.class';
import { SendTaskAssignedEmailUseCase } from './classes/send-task-assigned-email.class';
import { SendTaskCompletedEmailUseCase } from './classes/send-task-completed-email.class';
import { AssignMemberDto } from './dto/assign-member.dto';
import { CreateTaskLabelDto } from './dto/create-task-label.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { AuthorizeTaskAccessUseCase } from './classes/authorize-task-access.class';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskList)
    private readonly taskListRepository: Repository<TaskList>,
    private readonly createTaskLabelUseCase: CreateTaskLabelUseCase,
    private readonly deleteTaskLabelUseCase: DeleteTaskLabelUseCase,
    private readonly assignMemberUseCase: AssignMemberUseCase,
    private readonly unassignMemberUseCase: UnassignMemberUseCase,
    private readonly reorderTasksUseCase: ReorderTasksUseCase,
    private readonly sendTaskAssignedEmailUseCase: SendTaskAssignedEmailUseCase,
    private readonly sendTaskCompletedEmailUseCase: SendTaskCompletedEmailUseCase,
    private readonly authorizeTaskAccess: AuthorizeTaskAccessUseCase,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    const taskList = await this.taskListRepository.findOne({
      where: {
        id: createTaskDto.taskListId,
        board: {
          code: createTaskDto.boardCode,
          workspace: { code: createTaskDto.workspaceCode },
        },
      },
      relations: { board: { workspace: true } },
    });
    if (!taskList) throw new NotFoundException('Task list no encontrado');
    if (taskList.board.workspace.status !== 1) throw new ForbiddenException('Workspace is not active');

    const { taskListId, workspaceCode, boardCode, ...task } = createTaskDto;
    void taskListId;
    void workspaceCode;
    void boardCode;
    const $task = this.taskRepository.create({ taskList, ...task });
    const newTask = await this.taskRepository.save($task);
    return this.findOne(newTask.id);
  }

  findAll() {
    return `This action returns all tasks`;
  }

  async findOne(id: number, userId?: number): Promise<ITask> {
    if (userId !== undefined) await this.authorizeTaskAccess.execute(id, userId);
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.labels', 'taskLabel')
      .leftJoinAndSelect('taskLabel.label', 'label')
      .leftJoinAndSelect('task.assignments', 'assignment')
      .leftJoinAndSelect('assignment.workspaceMember', 'assigneeMember')
      .leftJoinAndSelect('assigneeMember.user', 'assigneeUser')
      .leftJoinAndSelect('assigneeUser.profile', 'assigneeProfile')
      .where('task.id = :id', { id })
      .getOne();
    if (!task) throw new NotFoundException('Tarea no encontrada');
    if (!task.isAvailable) throw new NotFoundException('Tarea no disponible');
    const labels = (task.labels ?? []).map((tl) => ({
      id: tl.label.id,
      code: tl.label.code,
      name: tl.label.name,
      color: tl.label.color,
    }));
    const assignees = (task.assignments ?? []).map((assignment) => {
      const profile = assignment.workspaceMember?.user?.profile;
      const firstName = profile?.firstName ?? '';
      const firstSurname = profile?.firstSurname ?? '';
      const email = profile?.email ?? '';
      const fullname = `${firstName} ${firstSurname}`;
      return {
        id: assignment.id,
        workspaceMemberId: assignment.workspaceMember.id,
        fullname,
        email,
        photo: toPhotoUrl(profile?.photo, profile?.code),
        initials: `${firstName.charAt(0)}${firstSurname.charAt(0)}`.toUpperCase(),
        avatarColor: ['#ef4444', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'][
          fullname.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 8
        ],
      };
    });
    return {
      taskId: task.id,
      code: task.code,
      title: task.title,
      description: task.description,
      dateInit: task.dateInit,
      dateEnd: task.dateEnd,
      completed: task.completed,
      position: task.position,
      isAvailable: task.isAvailable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      labels,
      assignees,
    };
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, user: AuthenticatedUserDto, workspaceCode: string) {
    const authorizedTask = await this.authorizeTaskAccess.execute(id, user.id, ['owner', 'member'], workspaceCode);
    const entity = await this.taskRepository.findOneBy({ id });
    if (!entity) throw new NotFoundException('Tarea no encontrada');
    if (!entity.isAvailable) throw new NotFoundException('Tarea no disponible');

    if (updateTaskDto.taskListId !== undefined) {
      const targetList = await this.taskListRepository.findOne({
        where: { id: updateTaskDto.taskListId, isAvailable: true },
        relations: { board: { workspace: true } },
      });
      if (!targetList) throw new NotFoundException('Task list not found');
      if (targetList.board.workspace.code !== authorizedTask.taskList.board.workspace.code) {
        throw new ForbiddenException('A task cannot be moved to another workspace');
      }
      entity.taskList = { id: updateTaskDto.taskListId } as TaskList;
    }

    const rest = { ...updateTaskDto };
    delete rest.taskListId;
    this.taskRepository.merge(entity, rest);
    await this.taskRepository.save(entity);

    if (!entity.completed && updateTaskDto.completed) {
      this.sendTaskCompletedEmailUseCase.execute(id, user.code).catch(() => {});
    }

    return this.findOne(id);
  }

  async remove(id: number, userId: number, workspaceCode: string) {
    await this.authorizeTaskAccess.execute(id, userId, ['owner'], workspaceCode);
    const entity = await this.taskRepository.findOneBy({ id });
    if (!entity) throw new NotFoundException('Tarea no encontrada');
    if (!entity.isAvailable) throw new NotFoundException('Tarea no disponible');
    entity.isAvailable = false;
    return this.taskRepository.save(entity);
  }

  async addLabel(taskId: number, dto: CreateTaskLabelDto, userId: number, workspaceCode: string) {
    await this.authorizeTaskAccess.execute(taskId, userId, ['owner', 'member'], workspaceCode);
    await this.createTaskLabelUseCase.execute(taskId, dto);
    return this.findOne(taskId);
  }

  async removeLabel(taskId: number, labelId: number, userId: number, workspaceCode: string) {
    await this.authorizeTaskAccess.execute(taskId, userId, ['owner'], workspaceCode);
    await this.deleteTaskLabelUseCase.execute(taskId, labelId);
    return this.findOne(taskId);
  }

  async assignMember(taskId: number, dto: AssignMemberDto, userId: number, workspaceCode: string) {
    await this.authorizeTaskAccess.execute(taskId, userId, ['owner', 'member'], workspaceCode);
    await this.assignMemberUseCase.execute(taskId, dto);
    this.sendTaskAssignedEmailUseCase.execute(dto.workspaceMemberId, taskId, userId).catch(() => {});
    return this.findOne(taskId);
  }

  async unassignMember(taskId: number, assignmentId: number, userId: number, workspaceCode: string) {
    await this.authorizeTaskAccess.execute(taskId, userId, ['owner'], workspaceCode);
    await this.unassignMemberUseCase.execute(assignmentId, taskId);
    return this.findOne(taskId);
  }

  async reorder(dto: ReorderTasksDto, userId: number, workspaceCode: string): Promise<void> {
    await this.reorderTasksUseCase.execute(dto, userId, workspaceCode);
  }
}
